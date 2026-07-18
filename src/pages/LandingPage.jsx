import { useState } from 'react'
import accessCodeBadge from '../assets/accesscode-badge1.png'
import { useNavigate } from 'react-router-dom'
import { createShare, getShare, verifyPassword } from '../lib/database'
import PasswordModal from '../components/PasswordModal'
import CreateShareModal from '../components/CreateShareModal'
import InfoModal from '../components/InfoModal'

const FEATURES_INFO = {
    icon: 'stars',
    title: 'Features',
    items: [
        {
            icon: 'visibility_off',
            heading: 'Anonymous by default',
            description: 'No sign-up, no email, no phone number. Just open the site, create a share, and get a 6-character access code.'
        },
        {
            icon: 'auto_delete',
            heading: 'Self-destructing shares',
            description: 'Every share expires automatically after the duration you choose (up to 48 hours) — text and files are deleted for good.'
        },
        {
            icon: 'description',
            heading: 'Text and file sharing',
            description: 'Paste rich text notes or upload files up to 50MB total per share, then access them from any device using the code.'
        },
        {
            icon: 'bolt',
            heading: 'Instant access, anywhere',
            description: 'Retrieve your share from any browser by entering the access code — perfect for public or shared computers.'
        }
    ]
}

const SECURITY_INFO = {
    icon: 'shield_lock',
    title: 'Security',
    items: [
        {
            icon: 'lock',
            heading: 'Optional password protection',
            description: 'You can add a password when creating a share. It is hashed with SHA-256 before storage — the plain password is never saved.'
        },
        {
            icon: 'verified_user',
            heading: 'Server-side verification',
            description: 'Password checks for downloading files or deleting a session are verified server-side, not just in the browser.'
        },
        {
            icon: 'timer',
            heading: 'Automatic expiry',
            description: 'All shares and their files are permanently deleted once the expiry time is reached, limiting how long data is exposed.'
        },
        {
            icon: 'no_accounts',
            heading: 'No account, no tracking',
            description: 'Shares are not tied to any personal identity — no accounts, emails, or profiles are created or stored.'
        }
    ]
}

const PRIVACY_INFO = {
    icon: 'privacy_tip',
    title: 'Privacy',
    items: [
        {
            icon: 'visibility_off',
            heading: 'No personal information required',
            description: 'Creating or retrieving a share never asks for your name, email, or phone number. Access is only through a temporary access code.'
        },
        {
            icon: 'inventory_2',
            heading: 'Files stored only for the share duration',
            description: 'Uploaded files and text are kept only until the share expires (max 48 hours), after which they are permanently removed from storage.'
        },
        {
            icon: 'lock',
            heading: 'Access-code gated storage',
            description: 'Files are only reachable through short-lived signed URLs generated after the access code (and password, if set) is verified — they are not publicly listable.'
        },
        {
            icon: 'delete_forever',
            heading: 'You control deletion',
            description: 'Anyone with the access code (and password, if set) can delete a session immediately, removing its text and files before the expiry time.'
        }
    ]
}

const TERMS_INFO = {
    icon: 'gavel',
    title: 'Terms',
    items: [
        {
            icon: 'block',
            heading: 'Acceptable use',
            description: 'AccessCode is meant for temporary, legitimate sharing of text and files. Do not use it to store or distribute illegal, harmful, or infringing content.'
        },
        {
            icon: 'schedule',
            heading: 'Temporary storage only',
            description: 'AccessCode is not a backup or long-term storage service. All shares automatically expire and are deleted, at most 48 hours after creation.'
        },
        {
            icon: 'shield',
            heading: 'No warranty',
            description: 'The service is provided "as is" without guarantees of availability, and is not a substitute for secure, audited storage of sensitive data.'
        },
        {
            icon: 'account_circle',
            heading: 'Shared responsibility',
            description: 'Since access codes and passwords act as the only credential, anyone you share them with can view, edit, or delete the content — share them carefully.'
        }
    ]
}

export default function LandingPage() {
    const navigate = useNavigate()
    const [accessCode, setAccessCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [pendingShare, setPendingShare] = useState(null)
    const [infoModal, setInfoModal] = useState(null)
    const [showSupportModal, setShowSupportModal] = useState(false)

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
                sessionStorage.setItem('accessCode', share.access_code)
                sessionStorage.removeItem('sharePassword')
                navigate('/workspace')
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
            sessionStorage.setItem('accessCode', pendingShare.access_code)
            sessionStorage.setItem('sharePassword', password)
            navigate('/workspace')
        } else {
            return 'Incorrect password'
        }
    }

    const handleCreateShare = async (options) => {
        setLoading(true)
        try {
            const share = await createShare(options)
            setShowCreateModal(false)
            sessionStorage.setItem('accessCode', share.access_code)
            sessionStorage.setItem('sharePassword', options.password || '')
            navigate('/workspace')
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
                            <button
                                type="button"
                                onClick={() => setInfoModal(FEATURES_INFO)}
                                className="text-sm font-medium hover:text-[#136dec] transition-colors"
                            >
                                Features
                            </button>
                            <button
                                type="button"
                                onClick={() => setInfoModal(SECURITY_INFO)}
                                className="text-sm font-medium hover:text-[#136dec] transition-colors"
                            >
                                Security
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
                                <div className="rounded-[32px] shadow-2xl h-full overflow-hidden">
                                    <img src={accessCodeBadge} alt="AccessCode badge" className="w-full h-full object-cover" />
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
                        <button type="button" onClick={() => setInfoModal(PRIVACY_INFO)} className="hover:text-[#136dec]">Privacy</button>
                        <button type="button" onClick={() => setInfoModal(TERMS_INFO)} className="hover:text-[#136dec]">Terms</button>
                        <button type="button" onClick={() => setShowSupportModal(true)} className="hover:text-[#136dec]">Support</button>
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

            {infoModal && (
                <InfoModal
                    icon={infoModal.icon}
                    title={infoModal.title}
                    items={infoModal.items}
                    onClose={() => setInfoModal(null)}
                />
            )}

            {showSupportModal && (
                <InfoModal
                    icon="support_agent"
                    title="Support"
                    items={[]}
                    onClose={() => setShowSupportModal(false)}
                >
                    <div className="text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                            For feedback or support, reach out to
                        </p>
                        <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">Krishna Kumar</p>
                        <a
                            href="mailto:krsna.thecoder@gmail.com"
                            className="text-sm font-semibold text-[#136dec] hover:underline break-all"
                        >
                            krsna.thecoder@gmail.com
                        </a>

                        <div className="flex items-center justify-center gap-4 mt-6">
                            <a
                                href="https://www.linkedin.com/in/krishna-kumar-7b821b365/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="LinkedIn profile"
                                className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-[#136dec] hover:text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.368-1.85 3.598 0 4.268 2.368 4.268 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </a>
                            <a
                                href="https://github.com/krsna-thecoder"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="GitHub profile"
                                className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.755-1.333-1.755-1.089-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.955-.266 1.98-.398 3-.403 1.02.005 2.045.137 3 .403 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </InfoModal>
            )}
        </div>
    )
}
