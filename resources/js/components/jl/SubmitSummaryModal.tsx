import { useEffect } from 'react';

interface SummaryData {
    title: string;
    date: string;
    company: string;
    manager: string;
    dept: string;
    amount: string;
    attachment: File | null;
}

interface Props {
    open: boolean;
    data: SummaryData;
    processing: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

function fmtAmt(n: string) {
    const num = Number(n) || 0;
    return '₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="text-right font-medium text-gray-800">{value || '—'}</span>
        </div>
    );
}

export default function SubmitSummaryModal({ open, data, processing, onClose, onConfirm }: Props) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 sm:p-7 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-200"
                >
                    ✕
                </button>

                <h2 className="mb-0.5 text-lg font-bold" style={{ color: '#1e3a5f' }}>
                    Review Before Submitting
                </h2>
                <p className="mb-4 text-sm text-gray-400">
                    Please double-check these details — you can still go back and fix anything.
                </p>

                <div className="divide-y divide-gray-100 rounded-xl bg-gray-50 px-4">
                    <Row label="JL Title" value={data.title} />
                    <Row label="Date Prepared" value={data.date} />
                    <Row label="Company / Farm" value={data.company} />
                    <Row label="Department" value={data.dept} />
                    <Row label="Manager / Supervisor" value={data.manager} />
                    <Row label="Estimated Amount" value={fmtAmt(data.amount)} />
                    <Row label="Attachment" value={data.attachment?.name ?? 'None'} />
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                    >
                        ← Go Back &amp; Edit
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={processing}
                        className="rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        style={{ background: '#1e3a5f' }}
                    >
                        {processing ? 'Submitting…' : '✓ Confirm & Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
}
