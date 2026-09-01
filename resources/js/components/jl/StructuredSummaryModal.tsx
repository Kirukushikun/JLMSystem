import { useEffect } from 'react';
import type { CostRow } from './CostBreakdownTable';
import { costRowsTotal } from './CostBreakdownTable';
import type { JlItemRow } from './ItemsTable';

interface StructuredData {
    subject: string;
    company: string;
    dept: string;
    manager: string;
    dateNeeded: string;
    body: string;
    reason: string;
    items: JlItemRow[];
    costRows: CostRow[];
}

interface Props {
    open: boolean;
    data: StructuredData;
    processing: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

function fmtAmt(n: number) {
    return '₱ ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="max-w-[65%] text-right font-medium text-gray-800">
                {value || '—'}
            </span>
        </div>
    );
}

export default function StructuredSummaryModal({
    open,
    data,
    processing,
    onClose,
    onConfirm,
}: Props) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
            }
        }
        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!open) {
        return null;
    }

    const filledItems = data.items.filter((i) => i.itemName.trim() !== '');

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
            onClick={onClose}
        >
            <div
                className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl sm:p-7"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-200"
                >
                    ✕
                </button>

                <h2
                    className="mb-0.5 text-lg font-bold"
                    style={{ color: '#1e3a5f' }}
                >
                    Review Before Submitting
                </h2>
                <p className="mb-4 text-sm text-gray-400">
                    Please double-check these details — you can still go back
                    and fix anything.
                </p>

                <div className="divide-y divide-gray-100 rounded-xl bg-gray-50 px-4">
                    <Row label="Subject" value={data.subject} />
                    <Row label="Company / Farm" value={data.company} />
                    <Row label="Department" value={data.dept} />
                    <Row label="Manager / Supervisor" value={data.manager} />
                    <Row label="Date Needed" value={data.dateNeeded} />
                    <Row label="Body" value={data.body} />
                    <Row
                        label="Items"
                        value={`${filledItems.length} item(s)`}
                    />
                    <Row
                        label="Estimated Cost"
                        value={fmtAmt(costRowsTotal(data.costRows))}
                    />
                    <Row label="Reason for Justification" value={data.reason} />
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
