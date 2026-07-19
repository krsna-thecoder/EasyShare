# 🔑 AccessCode

**Share text and files with anyone, anywhere — using nothing but a 6-character code.**

🌐 **Live at [accesscode.live](https://accesscode.live)**

No sign-up. No email. No tracking. Just create a share, get a code, and hand it off. When the timer runs out, everything vanishes — text, files, and all traces — automatically.

---

## ✨ Why AccessCode?

Ever needed to move a file or a block of text from one device to another — a lab PC, a friend's laptop, a phone — without logging into your accounts, emailing yourself, or installing anything? That's exactly the friction AccessCode removes.

> **Create → Share the code → It self-destructs.** That's the whole app.

---

## 🚀 How to Use It

Using AccessCode takes seconds and works from any browser:

### 1. Create a share
- Go to **[accesscode.live](https://accesscode.live)**.
- Click **Create Share**.
- Choose an **expiry duration** — `1h`, `6h`, `12h`, `24h`, or up to `48h`.
- *(Optional)* Add a **password** for an extra layer of protection.
- You instantly get a unique **6-character access code** (e.g. `K7P2QX`).

### 2. Add your content
- **Paste text** — notes, snippets, links, anything.
- **Upload files** — up to **50 MB total** per share.
- Everything is saved to your share automatically.

### 3. Share the code
- Copy the access code (there's a one-tap copy button) and send it however you like.
- On the other device, open **accesscode.live**, type the code, and you're in.
- If a password was set, the recipient enters it to unlock downloads.

### 4. It cleans up after itself
- When the expiry time is reached, the share and **all its files are permanently deleted** — no manual cleanup needed.
- Want it gone sooner? Anyone with the code (and password, if set) can **delete the session instantly**.

> 💡 The access code deliberately avoids confusing characters (no `0`/`O`, no `1`/`I`) so it's easy to read aloud and type on any keyboard.

---

## 🌟 Key Features

| | Feature | What it means for you |
|---|---|---|
| 🕵️ | **Anonymous by default** | No account, email, or phone number — ever. |
| 💥 | **Self-destructing shares** | Pick a lifespan (up to 48h); it wipes itself when time's up. |
| 📝 | **Text + file sharing** | Rich text notes and files up to 50 MB, all under one code. |
| ⚡ | **Instant cross-device access** | Retrieve from any browser — great for public/shared computers. |
| 🔒 | **Optional password protection** | Passwords are SHA-256 hashed; the plain text is never stored. |
| 🛡️ | **Server-side verification** | Password checks for downloads/deletes happen on the server, not just the browser. |
| 🔗 | **Private, signed downloads** | Files live in a private bucket and are served via short-lived signed URLs — never publicly listable. |
| 🗑️ | **You control deletion** | Purge a session on demand, before it expires. |

---

## 🏗️ How It Works Under the Hood

AccessCode is a **serverless single-page app** — a React front end talking directly to a hardened Supabase backend.

```
┌──────────────┐        ┌─────────────────────┐        ┌────────────────────┐
│  React (SPA) │──────▶ │  Supabase Postgres  │        │  Private Storage   │
│ accesscode.  │  RLS   │  shares / files     │        │  bucket "shares"   │
│    live      │◀────── │  (Row-Level Sec.)   │        └─────────┬──────────┘
└──────┬───────┘        └─────────┬───────────┘                  │
       │                          │                              │
       │  invoke                  │  RPC helpers                 │ signed URLs
       ▼                          ▼                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Edge Function  "share-ops"  (Deno, service-role)                        │
│  • sign  → verify code/password → return short-lived signed download URL │
│  • delete-session → verify → wipe files + share row                      │
│  • cleanup → purge everything past its expiry (called by cron)           │
└────────────────────────────────────────────────────────────────────────┘
```

### 🔧 Edge Function (`share-ops`)

The Edge Function is a **Deno** function running on Supabase's edge network with a **service-role key**, so it can safely perform privileged operations the anonymous browser client cannot. It exposes three actions:

- **`sign`** — The browser never gets a public file URL. Instead, it asks the function for one. The function:
  1. Looks up the share by access code.
  2. Rejects it if the share is **expired** (`410`) or the code is unknown (`404`).
  3. If the share is **password-protected**, hashes the submitted password (SHA-256) and compares it server-side.
  4. Only then generates a **signed URL valid for 5 minutes** for that specific file.

  This is the core of the security model: files sit in a **private bucket** and are only reachable through these short-lived, verified links.

- **`delete-session`** — Verifies the code (and password, if set) server-side, removes all associated storage objects, then deletes the share row (files cascade automatically).

- **`cleanup`** — Protected by a secret header (`x-cleanup-secret`). It walks expired shares in batches, deletes their storage objects, then deletes the rows. This is what the scheduled job calls.

### ⏰ Automatic Expiry & Cron Cleanup

Nothing lingers longer than its chosen lifetime. Cleanup happens on **two independent layers** so data is removed even if one layer is delayed:

1. **Database rows — `pg_cron` (every 10 minutes).**
   A `pg_cron` schedule (`cleanup-expired-shares-db`) runs `delete_expired_shares(500)`, deleting expired `shares` rows in batches. Thanks to `ON DELETE CASCADE`, their `files` records go with them.

2. **Storage files — Edge Function via cron HTTP call (every 10 minutes).**
   Since deleting a DB row doesn't remove the actual object from storage, a second `pg_cron` job (`cleanup-expired-shares-storage`) fires an HTTP `POST` to the `share-ops` function with `{"action":"cleanup"}` and the secret header. The function:
   - Calls `get_expired_storage_paths()` to list files whose parent share has expired.
   - Removes those objects from the private `shares` bucket.
   - Calls `delete_expired_shares()` to clear the rows.

Two Postgres helper functions power this, both `SECURITY DEFINER` and executable only by the `service_role`:

- `get_expired_storage_paths(batch_size)` → returns storage paths of files belonging to expired shares.
- `delete_expired_shares(batch_size)` → deletes expired share rows and returns how many were removed.

The result: a share you created for "1 hour" is **provably gone** — both its metadata and its bytes — within ~10 minutes of expiring, with zero user action.

---

## 🔐 Security & Privacy Model

- **Private storage bucket** — the `shares` bucket is *not* public; there's no anonymous read policy. The only way to fetch a file is a signed URL minted by the Edge Function after verification.
- **Row-Level Security (RLS)** — the anonymous client can only read shares/files that **haven't expired**, and can only insert new ones.
- **Server-side password checks** — passwords gate downloads and deletions on the server, not just in the UI, so they can't be bypassed by tampering with the browser.
- **XSS-safe rendering** — shared rich text is sanitized with **DOMPurify** before it's displayed.
- **No identity, no profiles** — shares aren't tied to any person; there are no accounts, emails, or analytics profiles.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Front end | **React 19**, **React Router 7** (`HashRouter`), **Vite 7** |
| Styling | **Tailwind CSS 4** |
| Icons | **Material Symbols**, **lucide-react** |
| Sanitization | **DOMPurify** |
| Backend | **Supabase** — Postgres, Storage, Edge Functions (**Deno**) |
| Scheduling | **pg_cron** + `pg_net` (HTTP from Postgres) |
| Hosting / CI | **GitHub Pages** via **GitHub Actions** |

---

## 💻 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then fill in:
#   VITE_SUPABASE_URL=your_supabase_project_url
#   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 3. Start the dev server
npm run dev

# Other scripts
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # run ESLint
```

---

## ☁️ Supabase Deployment

Run these from the project root (`accesscode`):

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
supabase functions deploy share-ops --no-verify-jwt
supabase secrets set CLEANUP_SECRET=<YOUR_STRONG_RANDOM_SECRET>
```

The `supabase db push` migration already:
- makes the `shares` bucket private,
- installs the cleanup helper functions, and
- schedules the **DB cleanup** cron job (every 10 minutes).

### Enable the storage cleanup cron

To also purge storage files on a schedule, run this once in the Supabase SQL editor after deploying:

```sql
select cron.schedule(
  'cleanup-expired-shares-storage',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.functions.supabase.co/share-ops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret', '<YOUR_STRONG_RANDOM_SECRET>'
    ),
    body := '{"action":"cleanup"}'::jsonb
  );
  $$
);
```

### Front-end CI/CD

Pushing to `main` triggers a **GitHub Actions** workflow that builds the Vite app (injecting the Supabase env secrets) and deploys the static bundle to **GitHub Pages**, which serves [accesscode.live](https://accesscode.live).

---

## 📁 Project Structure

```
accesscode/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx        # Create / retrieve a share + feature info
│   │   ├── WorkspacePage.jsx      # Text editor + file upload/download UI
│   │   └── ShareCreatedPage.jsx   # Success screen with the access code
│   ├── components/                # Modals: Create, Password, Confirm, Info
│   └── lib/
│       ├── supabase.js            # Supabase client
│       └── database.js            # Share/file CRUD + signed-URL helpers
├── supabase/
│   ├── functions/share-ops/       # Deno Edge Function (sign / delete / cleanup)
│   └── migrations/                # Schema, storage, security & cron setup
└── .github/workflows/deploy.yml   # GitHub Pages CI/CD
```

---

## ⚠️ Good to Know

- **Max file size:** 50 MB total per share.
- **Max lifetime:** 48 hours.
- Because expired data is **permanently deleted**, treat AccessCode as ephemeral transfer — not long-term storage or backup.
- Access codes are short and case-insensitive; anyone with the code (and password, if set) can access the share, so share codes only with people you trust.

---

<p align="center"><strong>AccessCode — share it, use it, forget it.</strong> 🔑</p>
