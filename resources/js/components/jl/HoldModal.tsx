import { useEffect, useState } from 'react';
import type { JlEntry } from '@/types/jl';

interface Props {
    entry: JlEntry | null;
    onClose: () => void;
    onConfirm: (id: number, reason: string) => void;
}

export default function HoldModal({ entry, onClose, onConfirm }: Props) {
    const [reason, setReason] = useState('');

    useEffect(() => { setReason(''); }, [entry?.id]);

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

                <h2 className="mb-0.5 text-lg font-bold text-amber-600">Put On Hold</h2>
                <p className="mb-5 text-sm text-gray-400">
                    {entry.reference} — {entry.title}
                </p>

                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Reason (optional)
                </label>
                <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Note why this is being held…"
                    autoFocus
                    className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(entry.id, reason)}
                        className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                        ⏸ Put On Hold
                    </button>
                </div>
            </div>
        </div>
    );
}
