import { useEffect } from 'react';
import type { JlEntry } from '@/types/jl';

interface Props {
    entry: JlEntry | null;
    onClose: () => void;
    onConfirm: (id: number) => void;
}

export default function CancelModal({ entry, onClose, onConfirm }: Props) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!entry) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-200"
                >
                    ✕
                </button>

                <h2 className="mb-0.5 text-lg font-bold text-red-600">Cancel Request?</h2>
                <p className="mb-5 text-sm text-gray-400">
                    {entry.reference} — {entry.title}
                </p>

                <p className="text-sm text-gray-600">
                    This pulls the request back before any reviewer sees it. You can edit and resubmit it
                    afterward from My Requests — nothing is permanently lost.
                </p>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                    >
                        Never Mind
                    </button>
                    <button
                        onClick={() => onConfirm(entry.id)}
                        className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                        Yes, Cancel Request
                    </button>
                </div>
            </div>
        </div>
    );
}
