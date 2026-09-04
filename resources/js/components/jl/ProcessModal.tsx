import { useEffect, useState } from 'react';
import type { JlEntry } from '@/types/jl';

interface Props {
    entry: JlEntry | null;
    onClose: () => void;
    onConfirm: (id: number, remarks: string) => void;
}

/**
 * Purchasing's "On Process" confirmation, opened from the table's kebab menu.
 * Mounted with a `key` of the entry id so each entry gets a fresh, empty
 * remarks box rather than inheriting the last one's text.
 */
export default function ProcessModal({ entry, onClose, onConfirm }: Props) {
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
            }
        }
        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!entry) {
        return null;
    }

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
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <h2 className="mb-0.5 text-lg font-bold text-purple-700">
                    Mark As On Process
                </h2>
                <p className="mb-5 text-sm text-gray-400">
                    {entry.reference} — {entry.title}
                </p>

                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Remarks (optional)
                </label>
                <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add a note for everyone following this request…"
                    autoFocus
                    className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(entry.id, remarks)}
                        className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                        <i className="fa-solid fa-play"></i> Mark On Process
                    </button>
                </div>
            </div>
        </div>
    );
}
