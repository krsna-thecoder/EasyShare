import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getShare } from '../lib/database'

export default function ShareCreatedPage() {
    const { accessCode } = useParams()
    const navigate = useNavigate()
    const [share, setShare] = useState(null)
    const [copied, setCopied] = useState(false)
    const [timeLeft, setTimeLeft] = useState('')

    useEffect(() => {
        loadShare()
    }, [accessCode])

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
            setTimeLeft(`${hours}h ${minutes}m`)
        }

        updateTimeLeft()
        const interval = setInterval(updateTimeLeft, 60000)
        return () => clearInterval(interval)
    }, [share])

    const loadShare = async () => {
        try {
            const shareData = await getShare(accessCode)
            if (!shareData) {
                navigate('/')
                return
            }
            setShare(shareData)
        } catch (err) {
            console.error(err)
            navigate('/')
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(accessCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (!share) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#136dec] border-t-transparent rounded-full"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-slate-200 dark:border-b-slate-800 px-4 lg:px-10 py-3">
                <Link to="/" className="flex items-center gap-4">
                    <div className="w-6 h-6 text-[#136dec]">
                        <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"></path>
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">AccessCode</h2>
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
                {/* Background blurs */}
                <div className="absolute inset-0 z-0 opacity-10 dark:opacity-20 pointer-events-none">
                    <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#136dec] rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#136dec] rounded-full blur-[120px]"></div>
                </div>

                <div className="flex flex-col max-w-[560px] w-full flex-1 z-10 justify-center">
                    {/* Success Icon */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#136dec]/10 rounded-full mb-4 text-[#136dec]">
                            <span className="material-symbols-outlined text-4xl">check_circle</span>
                        </div>
                        <h1 className="text-slate-900 dark:text-white tracking-light text-[32px] font-bold leading-tight px-4">
                            Share Created Successfully
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Your secure access code is ready for distribution
                        </p>
                    </div>

                    {/* Code Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Access Code Display */}
                        <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-widest mb-4">
                                Access Code
                            </p>
                            <div className="flex items-center justify-center gap-4">
                                <span className="font-mono text-5xl lg:text-6xl font-bold tracking-wider text-slate-900 dark:text-white">
                                    {accessCode}
                                </span>
                                <button
                                    onClick={copyToClipboard}
                                    className="flex items-center justify-center w-12 h-12 bg-[#136dec]/10 hover:bg-[#136dec]/20 text-[#136dec] rounded-lg transition-colors"
                                    title="Copy Code"
                                >
                                    <span className="material-symbols-outlined">
                                        {copied ? 'check' : 'content_copy'}
                                    </span>
                                </button>
                            </div>
                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-4">
                                {copied ? 'Copied to clipboard!' : 'Click to copy the access code'}
                            </p>
                        </div>

                        {/* Visual Icons */}
                        <div className="p-12 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                            <div className="relative w-full max-w-[300px] h-32 flex items-center justify-center gap-6">
                                <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-[#136dec]">
                                    <span className="material-symbols-outlined text-4xl">description</span>
                                </div>
                                <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-[#136dec] transform scale-110 z-10">
                                    <span className="material-symbols-outlined text-5xl">cloud_upload</span>
                                </div>
                                <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-[#136dec]">
                                    <span className="material-symbols-outlined text-4xl">folder</span>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-8 font-medium">
                                Securely sharing documents, folders, and cloud assets
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="flex flex-1 flex-col gap-1 p-6 border-r border-slate-100 dark:border-slate-800 min-w-[150px]">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    Expires in
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500 text-lg">timer</span>
                                    <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">
                                        {timeLeft}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-1 flex-col gap-1 p-6 min-w-[150px]">
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    Security
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#136dec] text-lg">
                                        {share.password_hash ? 'lock' : 'lock_open'}
                                    </span>
                                    <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">
                                        {share.password_hash ? 'Protected' : 'Open'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex px-4 py-8 justify-center gap-3 flex-wrap">
                        <Link
                            to={`/workspace/${accessCode}`}
                            className="flex min-w-[240px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-8 bg-[#136dec] hover:bg-[#136dec]/90 text-white gap-3 text-base font-bold leading-normal tracking-[0.015em] transition-all shadow-lg shadow-[#136dec]/20"
                        >
                            <span className="material-symbols-outlined">arrow_forward</span>
                            <span className="truncate">Go to Workspace</span>
                        </Link>
                        <Link
                            to="/"
                            className="flex min-w-[140px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 gap-2 text-base font-bold leading-normal transition-all"
                        >
                            <span className="material-symbols-outlined">close</span>
                            <span className="truncate">Close</span>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-10 text-center">
                <p className="text-slate-400 dark:text-slate-600 text-sm">
                    This access code will be permanently deleted after expiration.
                </p>
            </footer>
        </div>
    )
}
