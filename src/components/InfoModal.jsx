import { useEffect } from 'react'

export default function InfoModal({ icon = 'info', title, items = [], children, onClose }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
                <div className="p-8">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-[#136dec]/10 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[#136dec] text-3xl">{icon}</span>
                        </div>

                        <h2 className="text-2xl font-bold mb-6">{title}</h2>

                        <ul className="w-full space-y-5 text-left">
                            {items.map(({ icon: itemIcon, heading, description }) => (
                                <li key={heading} className="flex gap-4">
                                    <div className="w-10 h-10 flex-none rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#136dec] text-lg">{itemIcon}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{heading}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {children && (
                            <div className="w-full mt-6">
                                {children}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full mt-8 bg-[#136dec] text-white py-3.5 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-[#136dec]/25"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
