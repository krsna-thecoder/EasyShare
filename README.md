# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Supabase Security And Cleanup Setup

### What This Project Uses

- Private `shares` storage bucket (no anonymous public file reads).
- Signed download URLs created by an Edge Function after verifying share access rules.
- SQL helpers to fetch expired storage paths and delete expired shares.
- Scheduled DB cleanup via `pg_cron` every 10 minutes.

### Exact Deploy Commands

Run from the project root (`accesscode`):

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
supabase functions deploy share-ops --no-verify-jwt
supabase secrets set CLEANUP_SECRET=<YOUR_STRONG_RANDOM_SECRET>
```

### Cron Trigger For Full Cleanup (DB + Storage)

The migration already schedules DB row cleanup.
To also run storage cleanup through the Edge Function on a schedule, run this SQL in Supabase SQL editor after deployment:

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
