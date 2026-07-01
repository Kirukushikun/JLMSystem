import { useEffect, useState } from 'react';
import type { JlStatus } from '@/types/jl';

interface Props {
    open: boolean;
    onClose: () => void;
    allowedStatuses: JlStatus[];
}

export default function ExportModal({ open, onClose, allowedStatuses }: Props) {
    const [selected, setSelected] = useState<JlStatus[]>([...allowedStatuses]);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo]     = useState('');

    useEffect(() => {
        setSelected([...allowedStatuses]);
    }, [open]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!open) return null;

    function toggle(s: JlStatus) {
        setSelected((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
        );
    }

    function handleExport() {
        const params = new URLSearchParams();
        selected.forEach((s) => params.append('statuses[]', s));
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo)   params.set('date_to', dateTo);
        window.location.href = `/jl/export?${params.toString()}`;
        onClose();
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
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <h2 className="mb-1 text-lg font-bold" style={{ color: '#1e3a5f' }}>Export to CSV</h2>
                <p className="mb-5 text-sm text-gray-400">
                    Filter entries before downloading. The file opens in Excel.
                </p>

                {/* Status checkboxes */}
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Include Statuses</p>
                <div className="mb-5 grid grid-cols-2 gap-y-2 gap-x-4">
                    {allowedStatuses.map((s) => (
                        <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={selected.includes(s)}
                                onChange={() => toggle(s)}
                                className="h-4 w-4 rounded border-gray-300 accent-[#1e3a5f]"
                            />
                            {s}
                        </label>
                    ))}
                </div>

                {/* Date range */}
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Submission Date Range</p>
                <div className="mb-6 flex gap-3">
                    <div className="flex-1">
                        <label className="mb-1 block text-xs text-gray-400">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="mb-1 block text-xs text-gray-400">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={selected.length === 0}
                        className="rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                        style={{ background: '#1e3a5f' }}
                    >
                        ↓ Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
