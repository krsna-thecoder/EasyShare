import { supabase } from './supabase'

/**
 * Generate a random 6-character alphanumeric access code
 * Case-insensitive, uses uppercase for consistency
 */
export function generateAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars: 0, O, 1, I
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

/**
 * Create a new share with the given options
 */
export async function createShare({ content = '', password = null, expiryHours = 24 }) {
    const accessCode = generateAccessCode()
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()

    // Hash password if provided (simple hash for demo - use bcrypt in production)
    let passwordHash = null
    if (password) {
        // Using SubtleCrypto for password hashing
        const encoder = new TextEncoder()
        const data = encoder.encode(password)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    const { data, error } = await supabase
        .from('shares')
        .insert({
            access_code: accessCode,
            content,
            password_hash: passwordHash,
            expires_at: expiresAt
        })
        .select()
        .single()

    if (error) {
        // If code collision, retry with new code
        if (error.code === '23505') {
            return createShare({ content, password, expiryHours })
        }
        throw error
    }

    return { ...data, accessCode }
}

/**
 * Get a share by access code
 */
export async function getShare(accessCode) {
    const { data, error } = await supabase
        .from('shares')
        .select('*')
        .eq('access_code', accessCode.toUpperCase())
        .single()

    if (error) {
        if (error.code === 'PGRST116') {
            return null // Not found or expired
        }
        throw error
    }

    return data
}

/**
 * Update share content
 */
export async function updateShareContent(accessCode, content) {
    const { data, error } = await supabase
        .from('shares')
        .update({ content })
        .eq('access_code', accessCode.toUpperCase())
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Verify password for a share
 */
export async function verifyPassword(accessCode, password) {
    const share = await getShare(accessCode)
    if (!share || !share.password_hash) return true // No password set

    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return passwordHash === share.password_hash
}

/**
 * Get files for a share
 */
export async function getShareFiles(shareId) {
    const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('share_id', shareId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

/**
 * Upload a file to a share
 */
export async function uploadFile(shareId, accessCode, file) {
    const storagePath = `${accessCode}/${Date.now()}_${file.name}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
        .from('shares')
        .upload(storagePath, file)

    if (uploadError) throw uploadError

    // Create file record
    const { data, error } = await supabase
        .from('files')
        .insert({
            share_id: shareId,
            name: file.name,
            size: file.size,
            type: file.type,
            storage_path: storagePath
        })
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Get public URL for a file
 */
export function getFileUrl(storagePath) {
    const { data } = supabase.storage
        .from('shares')
        .getPublicUrl(storagePath)

    return data.publicUrl
}

/**
 * Delete a file
 */
export async function deleteFile(fileId, storagePath) {
    // Delete from storage
    await supabase.storage
        .from('shares')
        .remove([storagePath])

    // Delete record
    const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)

    if (error) throw error
}

/**
 * Get total storage used by a share
 */
export async function getShareStorageUsed(shareId) {
    const files = await getShareFiles(shareId)
    return files.reduce((total, file) => total + file.size, 0)
}

/**
 * Check if adding a file would exceed storage limit
 */
export async function canUploadFile(shareId, fileSize, maxBytes = 52428800) {
    const used = await getShareStorageUsed(shareId)
    return (used + fileSize) <= maxBytes
}
