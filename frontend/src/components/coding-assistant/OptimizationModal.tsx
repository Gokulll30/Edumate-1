import React from "react";

type Props = {
    isOpen: boolean;
    message: string;
    onApply: () => void;
    onNotNow: () => void;
};

export default function OptimizationModal({ isOpen, message, onApply, onNotNow }: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 border border-purple-500/30 rounded-lg p-6 max-w-md w-full shadow-2xl transform transition-all scale-100">
                <h3 className="text-xl font-bold text-white mb-2">Optimization Check</h3>

                <div className="bg-purple-900/20 text-purple-200 p-4 rounded mb-6 border border-purple-500/20">
                    <p className="text-sm">{message}</p>
                </div>

                <div className="flex gap-4 justify-end">
                    <button
                        onClick={onNotNow}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                    >
                        Not Now (Score: 5)
                    </button>
                    <button
                        onClick={onApply}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded transition-colors shadow-lg shadow-purple-500/20"
                    >
                        Apply (Keep Editing)
                    </button>
                </div>
            </div>
        </div>
    );
}
