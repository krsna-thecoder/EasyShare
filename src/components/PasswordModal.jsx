import { useState } from 'react'

export default function PasswordModal({ onSubmit, onCancel }) {
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!password.trim()) {
            setError('Please enter a password')
            return
        }

        setLoading(true)
        setError('')

        const result = await onSubmit(password)
        if (result) {
            setError(result)
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm" onClick={onCancel}></div>

            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
                <div className="p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[#136dec] text-3xl">lock</span>
                        </div>

                        <h2 className="text-2xl font-bold mb-2">Password Required</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                            This access code is password protected. Please enter the password to view its contents.
                        </p>

                        <form onSubmit={handleSubmit} className="w-full space-y-4">
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#136dec] focus:border-transparent transition-all outline-none pr-12"
                                    placeholder="Enter session password"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <span className="material-symbols-outlined text-xl">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>

                            {error && (
                                <p className="text-red-500 text-sm">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#136dec] text-white py-3.5 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-[#136dec]/25 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Confirm'}
                            </button>

                            <button
                                type="button"
                                onClick={onCancel}
                                className="w-full text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
