import { createClient } from 'jsr:@supabase/supabase-js@2'

type RequestPayload = {
    action: 'sign' | 'cleanup'
    accessCode?: string
    storagePath?: string
    password?: string | null
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const cleanupSecret = Deno.env.get('CLEANUP_SECRET') ?? ''

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for share-ops function')
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json'
        }
    })

const sha256Hex = async (value: string) => {
    const data = new TextEncoder().encode(value)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    let payload: RequestPayload
    try {
        payload = await req.json()
    } catch {
        return json({ error: 'Invalid JSON body' }, 400)
    }

    if (!payload?.action) {
        return json({ error: 'Missing action' }, 400)
    }

    if (payload.action === 'cleanup') {
        if (!cleanupSecret || req.headers.get('x-cleanup-secret') !== cleanupSecret) {
            return json({ error: 'Unauthorized cleanup request' }, 401)
        }

        let totalDeletedShares = 0
        let totalDeletedStorageObjects = 0

        for (let i = 0; i < 10; i += 1) {
            const { data: pathRows, error: pathError } = await supabaseAdmin.rpc('get_expired_storage_paths', {
                batch_size: 500
            })

            if (pathError) {
                return json({ error: `Failed to fetch expired storage paths: ${pathError.message}` }, 500)
            }

            const paths = (pathRows ?? [])
                .map((row: { storage_path?: string }) => row.storage_path)
                .filter((path): path is string => typeof path === 'string' && path.length > 0)

            if (paths.length > 0) {
                const { error: removeError } = await supabaseAdmin.storage.from('shares').remove(paths)
                if (removeError) {
                    return json({ error: `Failed to remove storage objects: ${removeError.message}` }, 500)
                }
                totalDeletedStorageObjects += paths.length
            }

            const { data: deletedShares, error: deleteError } = await supabaseAdmin.rpc('delete_expired_shares', {
                batch_size: 500
            })

            if (deleteError) {
                return json({ error: `Failed to delete expired shares: ${deleteError.message}` }, 500)
            }

            const deletedCount = Number(deletedShares ?? 0)
            totalDeletedShares += deletedCount

            if (deletedCount === 0) {
                break
            }
        }

        return json({
            ok: true,
            deletedShares: totalDeletedShares,
            deletedStorageObjects: totalDeletedStorageObjects
        })
    }

    if (payload.action === 'sign') {
        const accessCode = payload.accessCode?.trim().toUpperCase()
        const storagePath = payload.storagePath?.trim()
        const password = payload.password?.trim() ?? ''

        if (!accessCode || !storagePath) {
            return json({ error: 'Missing accessCode or storagePath' }, 400)
        }

        const { data: share, error: shareError } = await supabaseAdmin
            .from('shares')
            .select('id, expires_at, password_hash')
            .eq('access_code', accessCode)
            .single()

        if (shareError || !share) {
            return json({ error: 'Share not found' }, 404)
        }

        if (new Date(share.expires_at).getTime() <= Date.now()) {
            return json({ error: 'Share expired' }, 410)
        }

        if (share.password_hash) {
            if (!password) {
                return json({ error: 'Password required' }, 401)
            }
            const passwordHash = await sha256Hex(password)
            if (passwordHash !== share.password_hash) {
                return json({ error: 'Invalid password' }, 401)
            }
        }

        const { data: fileRow, error: fileError } = await supabaseAdmin
            .from('files')
            .select('id')
            .eq('share_id', share.id)
            .eq('storage_path', storagePath)
            .single()

        if (fileError || !fileRow) {
            return json({ error: 'File not found for this share' }, 404)
        }

        const expiresInSeconds = 60 * 5
        const { data: signedData, error: signedError } = await supabaseAdmin.storage
            .from('shares')
            .createSignedUrl(storagePath, expiresInSeconds)

        if (signedError || !signedData?.signedUrl) {
            return json({ error: signedError?.message ?? 'Failed to create signed URL' }, 500)
        }

        return json({
            signedUrl: signedData.signedUrl,
            expiresIn: expiresInSeconds
        })
    }

    return json({ error: 'Unsupported action' }, 400)
})