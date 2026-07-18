import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { getShare, updateShareContent, getShareFiles, uploadFile, getSignedFileUrl, canUploadFile, getShareStorageUsed, verifyPassword, deleteSession } from '../lib/database'
import PasswordModal from '../components/PasswordModal'
import ConfirmModal from '../components/ConfirmModal'

export default function WorkspacePage() {
    const navigate = useNavigate()

    // Shares created before the rich-text editor was introduced store plain
    // text in `content`. Detect that case and convert it to safe, escaped
    // HTML (preserving line breaks) so it still displays correctly inside
    // the contentEditable editor instead of collapsing onto one line.
    // All content (legacy plain text or rich HTML) is run through
    // DOMPurify since `content` can be written directly via the API and
    // is otherwise untrusted, anonymous, user-controlled HTML.
    const toDisplayHtml = (value) => {
        if (!value) return ''
        const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(value)
        const html = looksLikeHtml
            ? value
            : (() => {
                const div = document.createElement('div')
                div.textContent = value
                return div.innerHTML.replace(/\n/g, '<br>')
            })()
        return DOMPurify.sanitize(html)
    }
    const [accessCode] = useState(() => sessionStorage.getItem('accessCode'))
    const [share, setShare] = useState(null)
    const [files, setFiles] = useState([])
    const [content, setContent] = useState('')
    const [activeTab, setActiveTab] = useState('text')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const [saved, setSaved] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [storageUsed, setStorageUsed] = useState(0)
    const [timeLeft, setTimeLeft] = useState('')
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [sharePassword, setSharePassword] = useState(() => sessionStorage.getItem('sharePassword') || '')
    const [downloadingFileId, setDownloadingFileId] = useState(null)
    const [deletingSession, setDeletingSession] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [error, setError] = useState('')
    const editorRef = useRef(null)
    const editorSyncedRef = useRef(false)

    useEffect(() => {
        if (!accessCode) {
            navigate('/')
            return
        }
        loadShare(accessCode)
    }, [accessCode, navigate])

    useEffect(() => {
        if (!share) return

        const updateTimeLeft = () => {
            const now = new Date()
            const expires = new Date(share.expires_at)
            const diff = expires - now

            if (diff <= 0) {
                setTimeLeft('Expired')
                return
            }

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)
            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        }

        updateTimeLeft()
        const interval = setInterval(updateTimeLeft, 1000)
        return () => clearInterval(interval)
    }, [share])

    // Sync the contentEditable editor's HTML once after the share/content
    // finishes loading and the editor has mounted. We intentionally do this
    // only once per load (not on every `content` change) so we don't clobber
    // the user's cursor position or in-progress edits while typing.
    useEffect(() => {
        if (loading || showPasswordModal) return
        if (editorSyncedRef.current) return
        if (editorRef.current) {
            editorRef.current.innerHTML = content || ''
            editorSyncedRef.current = true
        }
    }, [loading, showPasswordModal, content])

    const loadShare = async (code) => {
        try {
            const shareData = await getShare(code)
            if (!shareData) {
                navigate('/')
                return
            }

            if (shareData.password_hash && !isAuthenticated) {
                // A password may already have been captured moments ago —
                // either by the creator setting one in CreateShareModal, or
                // by the user entering it in the landing page's retrieve
                // flow. Verify it silently instead of prompting again.
                const storedPassword = sessionStorage.getItem('sharePassword')
                if (storedPassword) {
                    const isValid = await verifyPassword(code, storedPassword)
                    if (isValid) {
                        setIsAuthenticated(true)
                        setSharePassword(storedPassword)
                        setShare(shareData)
                        setContent(toDisplayHtml(shareData.content))

                        const filesData = await getShareFiles(shareData.id)
                        setFiles(filesData)

                        const used = await getShareStorageUsed(shareData.id)
                        setStorageUsed(used)

                        setLoading(false)
                        return
                    }
                    // Stored password is stale/incorrect — fall through to prompt.
                    sessionStorage.removeItem('sharePassword')
                }

                setShowPasswordModal(true)
                setShare(shareData)
                setLoading(false)
                return
            }

            setShare(shareData)
            setContent(toDisplayHtml(shareData.content))

            const filesData = await getShareFiles(shareData.id)
            setFiles(filesData)

            const used = await getShareStorageUsed(shareData.id)
            setStorageUsed(used)

            setLoading(false)
        } catch (err) {
            console.error(err)
            setError('Failed to load share')
            setLoading(false)
        }
    }

    const handlePasswordSubmit = async (password) => {
        const isValid = await verifyPassword(accessCode, password)
        if (isValid) {
            setSharePassword(password)
            sessionStorage.setItem('sharePassword', password)
            setIsAuthenticated(true)
            setShowPasswordModal(false)
            loadShare(accessCode)
        } else {
            return 'Incorrect password'
        }
    }

    const handleSaveContent = async () => {
        setSaving(true)
        try {
            const rawHtml = editorRef.current ? editorRef.current.innerHTML : content
            const html = DOMPurify.sanitize(rawHtml)
            await updateShareContent(accessCode, html)
            setContent(html)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            console.error(err)
            setError('Failed to save content')
        } finally {
            setSaving(false)
        }
    }

    const handleCopyAll = async () => {
        try {
            const html = editorRef.current ? editorRef.current.innerHTML : content
            const plainText = editorRef.current ? editorRef.current.innerText : content

            if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
                const item = new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' })
                })
                await navigator.clipboard.write([item])
            } else {
                await navigator.clipboard.writeText(plainText)
            }

            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error(err)
            setError('Failed to copy content')
        }
    }

    const handleFormat = (command) => {
        if (editorRef.current) {
            editorRef.current.focus()
        }
        document.execCommand(command)
        if (editorRef.current) {
            setContent(editorRef.current.innerHTML)
        }
    }

    const handleEditorInput = (e) => {
        setContent(e.currentTarget.innerHTML)
    }

    const handleFileUpload = async (e) => {
        const uploadedFiles = Array.from(e.target.files)
        if (uploadedFiles.length === 0) return

        setUploading(true)
        setError('')

        try {
            for (const file of uploadedFiles) {
                const canUpload = await canUploadFile(share.id, file.size)
                if (!canUpload) {
                    setError(`Cannot upload ${file.name}: Storage limit exceeded (50MB max)`)
                    continue
                }

                await uploadFile(share.id, accessCode, file)
            }

            // Reload files
            const filesData = await getShareFiles(share.id)
            setFiles(filesData)

            const used = await getShareStorageUsed(share.id)
            setStorageUsed(used)
        } catch (err) {
            console.error(err)
            setError('Failed to upload files')
        } finally {
            setUploading(false)
        }
    }

    const handleDownloadFile = async (file) => {
        setError('')
        setDownloadingFileId(file.id)

        try {
            const requiresPassword = Boolean(share?.password_hash)
            const signedUrl = await getSignedFileUrl(
                accessCode,
                file.storage_path,
                requiresPassword ? sharePassword : null
            )

            // Fetch the file as a blob so we can force a real download
            // (a plain <a download> or window.open on a cross-origin signed
            // URL gets rendered inline by the browser instead of saved).
            const response = await fetch(signedUrl)
            if (!response.ok) {
                throw new Error(`Download request failed with status ${response.status}`)
            }
            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = blobUrl
            link.download = file.name
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(blobUrl)
        } catch (err) {
            console.error(err)
            setError('Failed to download file. Please verify access and try again.')
        } finally {
            setDownloadingFileId(null)
        }
    }

    const handleDeleteSession = () => {
        setShowDeleteConfirm(true)
    }

    const handleConfirmDeleteSession = async () => {
        setError('')
        setDeletingSession(true)

        try {
            const requiresPassword = Boolean(share?.password_hash)
            await deleteSession(accessCode, requiresPassword ? sharePassword : null)
            sessionStorage.removeItem('accessCode')
            sessionStorage.removeItem('sharePassword')
            navigate('/')
        } catch (err) {
            console.error(err)
            setError('Failed to delete session. Please try again.')
            setShowDeleteConfirm(false)
        } finally {
            setDeletingSession(false)
        }
    }

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getTimeProgress = () => {
        if (!share) return 0
        const created = new Date(share.created_at)
        const expires = new Date(share.expires_at)
        const now = new Date()
        const total = expires - created
        const elapsed = now - created
        return Math.min(100, Math.max(0, ((total - elapsed) / total) * 100))
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#136dec] border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (showPasswordModal) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <PasswordModal
                    onSubmit={handlePasswordSubmit}
                    onCancel={() => navigate('/')}
                />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            {/* Header */}
            <header className="h-16 flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 text-[#136dec]">
                            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"></path>
                            </svg>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-bold leading-none">AccessCode</h1>
                            <span className="px-3 py-1 rounded-md bg-[#136dec] text-base font-mono font-extrabold text-white uppercase tracking-wider shadow-sm">
                                ID: {accessCode}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Time Progress */}
                <div className="hidden lg:flex items-center gap-4 flex-1 max-w-md px-12">
                    <div className="w-full flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Time Left</span>
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#136dec] transition-all" style={{ width: `${getTimeProgress()}%` }}></div>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#136dec]">{timeLeft}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/share-created')}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-200 transition"
                    >
                        <span className="material-symbols-outlined text-lg">share</span>
                        Share Code
                    </button>
                    <button
                        onClick={handleDeleteSession}
                        disabled={deletingSession}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                        {deletingSession ? 'Deleting...' : 'Delete Session'}
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 flex-none bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                    <nav className="flex-1 py-4">
                        <div className="px-4 mb-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Workspace Content</p>
                        </div>
                        <ul className="space-y-1">
                            <li>
                                <button
                                    onClick={() => setActiveTab('text')}
                                    className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition ${activeTab === 'text'
                                            ? 'bg-[#136dec]/10 text-[#136dec] border-r-4 border-[#136dec]'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl">article</span>
                                    Text Content
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab('files')}
                                    className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition ${activeTab === 'files'
                                            ? 'bg-[#136dec]/10 text-[#136dec] border-r-4 border-[#136dec]'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl">cloud_upload</span>
                                    File Upload
                                    {files.length > 0 && (
                                        <span className="ml-auto bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] px-1.5 py-0.5 rounded">
                                            {files.length}
                                        </span>
                                    )}
                                </button>
                            </li>
                        </ul>
                    </nav>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Storage Used</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#136dec]"
                                        style={{ width: `${(storageUsed / 52428800) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs font-semibold">{formatBytes(storageUsed)} / 50MB</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
                    <div className="max-w-5xl mx-auto">
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        {activeTab === 'text' && (
                            <>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Shared Text</h2>
                                        <p className="text-sm text-slate-500">Share rich text notes instantly.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {copied && (
                                            <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm font-bold">
                                                <span className="material-symbols-outlined text-lg">check</span>
                                                Copied
                                            </span>
                                        )}
                                        <button
                                            onClick={handleCopyAll}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 transition shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-lg">content_copy</span>
                                            Copy All
                                        </button>
                                        <button
                                            onClick={handleSaveContent}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#136dec] text-white text-sm font-bold shadow-md hover:bg-[#136dec]/90 transition disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-lg">save</span>
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        {saved && (
                                            <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm font-bold">
                                                <span className="material-symbols-outlined text-lg">check</span>
                                                Saved
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px] flex flex-col">
                                    <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-1">
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleFormat('bold')}
                                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                            title="Bold"
                                        >
                                            <span className="material-symbols-outlined">format_bold</span>
                                        </button>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleFormat('italic')}
                                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                            title="Italic"
                                        >
                                            <span className="material-symbols-outlined">format_italic</span>
                                        </button>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleFormat('insertUnorderedList')}
                                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                            title="Bullet List"
                                        >
                                            <span className="material-symbols-outlined">format_list_bulleted</span>
                                        </button>
                                    </div>
                                    <div
                                        ref={editorRef}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={handleEditorInput}
                                        data-placeholder="Start typing your content here..."
                                        className="flex-1 p-8 bg-transparent focus:outline-none text-slate-800 dark:text-slate-200 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 overflow-y-auto"
                                    />
                                </div>
                            </>
                        )}

                        {activeTab === 'files' && (
                            <>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">File Upload</h2>
                                        <p className="text-sm text-slate-500">Upload and share files up to 50MB total.</p>
                                    </div>
                                </div>

                                {/* Upload Area */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 mb-6">
                                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#136dec] transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">cloud_upload</span>
                                            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-slate-400">Any file type (max 50MB total)</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                    </label>
                                    {uploading && (
                                        <div className="mt-4 flex items-center justify-center gap-2 text-[#136dec]">
                                            <div className="animate-spin w-4 h-4 border-2 border-[#136dec] border-t-transparent rounded-full"></div>
                                            Uploading...
                                        </div>
                                    )}
                                </div>

                                {/* File List */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                                        <h3 className="font-semibold">Uploaded Files</h3>
                                    </div>
                                    {files.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <span className="material-symbols-outlined text-4xl mb-2">folder_off</span>
                                            <p>No files uploaded yet</p>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {files.map((file) => (
                                                <li key={file.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                    <div className="flex items-center gap-4">
                                                        <span className="material-symbols-outlined text-slate-400">description</span>
                                                        <div>
                                                            <p className="font-medium">{file.name}</p>
                                                            <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDownloadFile(file)}
                                                        disabled={downloadingFileId === file.id}
                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#136dec]/10 text-[#136dec] text-sm font-semibold hover:bg-[#136dec]/20 transition"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">download</span>
                                                        {downloadingFileId === file.id ? 'Preparing...' : 'Download'}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>

            {showDeleteConfirm && (
                <ConfirmModal
                    title="Delete this session?"
                    message="This will permanently delete the shared text and all uploaded files. This action cannot be undone."
                    confirmLabel="Yes, Delete"
                    cancelLabel="No, Cancel"
                    loading={deletingSession}
                    onConfirm={handleConfirmDeleteSession}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    )
}
