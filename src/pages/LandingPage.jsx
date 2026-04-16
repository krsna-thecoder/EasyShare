import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createShare, getShare, verifyPassword } from '../lib/database'
import PasswordModal from '../components/PasswordModal'
import CreateShareModal from '../components/CreateShareModal'

export default function LandingPage() {
    const navigate = useNavigate()
    const [accessCode, setAccessCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [pendingShare, setPendingShare] = useState(null)

    const handleRetrieve = async () => {
        if (!accessCode.trim()) {
            setError('Please enter an access code')
            return
        }

        setLoading(true)
        setError('')

        try {
            const share = await getShare(accessCode)
            if (!share) {
                setError('Access code not found or expired')
                setLoading(false)
                return
            }

            if (share.password_hash) {
                setPendingShare(share)
                setShowPasswordModal(true)
            } else {
                navigate(`/workspace/${share.access_code}`)
            }
        } catch (err) {
            setError('Failed to retrieve share. Please try again.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordSubmit = async (password) => {
        if (!pendingShare) return

        const isValid = await verifyPassword(pendingShare.access_code, password)
        if (isValid) {
            setShowPasswordModal(false)
            navigate(`/workspace/${pendingShare.access_code}`)
        } else {
            return 'Incorrect password'
        }
    }

    const handleCreateShare = async (options) => {
        setLoading(true)
        try {
            const share = await createShare(options)
            setShowCreateModal(false)
            navigate(`/share-created/${share.access_code}`)
        } catch (err) {
            console.error(err)
            setError('Failed to create share. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#136dec] rounded-lg flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-sm">grid_view</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight">AccessCode</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a className="text-sm font-medium hover:text-[#136dec] transition-colors" href="#features">Features</a>
                            <a className="text-sm font-medium hover:text-[#136dec] transition-colors" href="#security">Security</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-5 py-2 text-sm font-semibold border-2 border-[#136dec] text-[#136dec] hover:bg-[#136dec] hover:text-white rounded-full transition-all"
                            >
                                Start New Share
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative pt-32 pb-20 overflow-hidden">
                {/* Background blurs */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-[#136dec]/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#136dec]/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left Column - Text */}
                        <div className="z-10 text-center lg:text-left">
                            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
                                The fastest way to move data on <span className="text-[#136dec]">public computers</span>
                            </h1>
                            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 font-medium">
                                Anonymous. Secure. Self-destructing. No login required.
                            </p>

                            {/* Access Code Input */}
                            <div className="max-w-md mx-auto lg:mx-0 space-y-6">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-[#136dec] to-blue-400 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200"></div>
                                    <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2">
                                        <span className="material-symbols-outlined text-slate-400 ml-3">key</span>
                                        <input
                                            type="text"
                                            value={accessCode}
                                            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRetrieve()}
                                            className="w-full bg-transparent border-none focus:ring-0 text-lg font-semibold py-3 px-4 placeholder:text-slate-400 dark:placeholder:text-slate-500 uppercase"
                                            placeholder="Enter Access Code"
                                            maxLength={6}
                                        />
                                        <button
                                            onClick={handleRetrieve}
                                            disabled={loading}
                                            className="bg-[#136dec] text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-[#136dec]/30 disabled:opacity-50"
                                        >
                                            {loading ? 'Loading...' : 'Retrieve'}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-red-500 text-sm text-center lg:text-left">{error}</p>
                                )}

                                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-all"
                                    >
                                        <span className="material-symbols-outlined">add_circle</span>
                                        Start New Share
                                    </button>
                                    <span className="text-slate-400 text-sm font-medium">No account needed</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Visual */}
                        <div className="relative z-10 lg:pl-10">
                            <div className="relative w-full aspect-square max-w-[500px] mx-auto">
                                <div className="glass-card rounded-[32px] shadow-2xl p-8 h-full flex flex-col items-center justify-center border border-white/40 dark:border-slate-700/50">
                                    <div className="w-24 h-24 bg-[#136dec]/10 rounded-3xl flex items-center justify-center mb-8">
                                        <span className="material-symbols-outlined text-[#136dec] text-5xl">description</span>
                                    </div>
                                    <div className="w-full space-y-4">
                                        <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto"></div>
                                        <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto"></div>
                                        <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto"></div>
                                    </div>
                                </div>

                                {/* Floating cards */}
                                <div className="absolute -top-6 -right-6 glass-card p-5 rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">timer</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Time</p>
                                        <p className="text-lg font-extrabold text-orange-600 dark:text-orange-400">48 hrs</p>
                                    </div>
                                </div>

                                <div className="absolute -bottom-10 -left-6 glass-card p-5 rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#136dec]/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#136dec]">cloud_upload</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Storage</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className="text-lg font-extrabold">50</p>
                                            <p className="text-sm font-bold text-slate-500">MB</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Section */}
            <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="p-8 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-[#136dec]/30 transition-colors">
                        <span className="material-symbols-outlined text-[#136dec] mb-4 block">visibility_off</span>
                        <h3 className="text-lg font-bold mb-2">Anonymous</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">No emails, no phone numbers, no tracking. Just upload and get your unique access code.</p>
                    </div>
                    <div className="p-8 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-[#136dec]/30 transition-colors">
                        <span className="material-symbols-outlined text-[#136dec] mb-4 block">auto_delete</span>
                        <h3 className="text-lg font-bold mb-2">Self-Destructing</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Files are automatically deleted after a set duration. Maximum 48 hours.</p>
                    </div>
                    <div className="p-8 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-[#136dec]/30 transition-colors">
                        <span className="material-symbols-outlined text-[#136dec] mb-4 block">public</span>
                        <h3 className="text-lg font-bold mb-2">Built for Public</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Perfect for library computers, print shops, and shared office environments.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-800 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 opacity-50">
                        <div className="w-6 h-6 bg-[#136dec] rounded flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-[12px]">grid_view</span>
                        </div>
                        <span className="font-bold">AccessCode</span>
                    </div>
                    <div className="flex gap-8 text-sm text-slate-500 dark:text-slate-400">
                        <a className="hover:text-[#136dec]" href="#">Privacy</a>
                        <a className="hover:text-[#136dec]" href="#">Terms</a>
                        <a className="hover:text-[#136dec]" href="#">Support</a>
                    </div>
                    <div className="text-sm text-slate-400">
                        © 2024 AccessCode. No account, no worries.
                    </div>
                </div>
            </footer>

            {/* Modals */}
            {showPasswordModal && (
                <PasswordModal
                    onSubmit={handlePasswordSubmit}
                    onCancel={() => {
                        setShowPasswordModal(false)
                        setPendingShare(null)
                    }}
                />
            )}

            {showCreateModal && (
                <CreateShareModal
                    onSubmit={handleCreateShare}
                    onCancel={() => setShowCreateModal(false)}
                    loading={loading}
                />
            )}
        </div>
    )
}
