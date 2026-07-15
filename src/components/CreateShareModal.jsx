import { useState } from 'react'

export default function CreateShareModal({ onSubmit, onCancel, loading }) {
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [expiryHours, setExpiryHours] = useState(1)

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit({
            content: '',
            password: password.trim() || null,
            expiryHours
        })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm" onClick={onCancel}></div>

            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
                <div className="p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-[#136dec]/10 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[#136dec] text-3xl">add_circle</span>
                        </div>

                        <h2 className="text-2xl font-bold mb-2">Create New Share</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                            Set your preferences for the new access code.
                        </p>

                        <form onSubmit={handleSubmit} className="w-full space-y-6">
                            {/* Expiry Duration */}
                            <div className="text-left">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Expiry Duration
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 6, 12, 24, 48].map((hours) => (
                                        <button
                                            key={hours}
                                            type="button"
                                            onClick={() => setExpiryHours(hours)}
                                            className={`py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${expiryHours === hours
                                                    ? 'bg-[#136dec] text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {hours}h
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Maximum 48 hours</p>
                            </div>

                            {/* Password (Optional) */}
                            <div className="text-left">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Password Protection (Optional)
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#136dec] focus:border-transparent transition-all outline-none pr-12"
                                        placeholder="Leave empty for no password"
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
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#136dec] text-white py-3.5 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-[#136dec]/25 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">rocket_launch</span>
                                        Create Share
                                    </>
                                )}
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
