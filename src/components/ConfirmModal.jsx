export default function ConfirmModal({
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmLabel = 'Yes, Continue',
    cancelLabel = 'Cancel',
    loading = false,
    onConfirm,
    onCancel
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm" onClick={onCancel}></div>

            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
                <div className="p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">warning</span>
                        </div>

                        <h2 className="text-2xl font-bold mb-2">{title}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                            {message}
                        </p>

                        <div className="w-full space-y-4">
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={loading}
                                className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    confirmLabel
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={loading}
                                className="w-full text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
