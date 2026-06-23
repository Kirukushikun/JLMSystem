import { useEffect } from 'react';
import type { JlEntry } from '@/types/jl';
import StatusBadge from './StatusBadge';

interface Props {
    entry: JlEntry | null;
    context: 'reviewer' | 'vp';
    onClose: () => void;
    onCheck?: (id: number) => void;
    onApprove?: (id: number) => void;
    onRejectClick?: () => void;
    showRejectBox?: boolean;
    rejectReason?: string;
    onRejectReasonChange?: (v: string) => void;
    onConfirmReject?: () => void;
}

type WfState = 'idle' | 'active' | 'done';

const WF_STYLES: Record<WfState, string> = {
    idle: 'border-gray-200 bg-gray-50 text-gray-400',
    active: 'border-blue-500 bg-blue-50 text-blue-600',
    done: 'border-green-500 bg-green-50 text-green-600',
};

function WfStep({ label, state }: { label: string; state: WfState }) {
    const icons: Record<WfState, string> = { idle: '○', active: '◎', done: '✓' };
    return (
        <div className="flex flex-1 flex-col items-center gap-1.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold ${WF_STYLES[state]}`}>
                {icons[state]}
            </div>
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {label}
            </span>
        </div>
    );
}

function DetailItem({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
    return (
        <div className={full ? 'col-span-2' : ''}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <div className="mt-0.5 font-medium text-gray-900">{value}</div>
        </div>
    );
}

function fmtAmt(n: number) {
    return '₱ ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export default function JlModal({
    entry,
    context,
    onClose,
    onCheck,
    onApprove,
    onRejectClick,
    showRejectBox,
    rejectReason,
    onRejectReasonChange,
    onConfirmReject,
}: Props) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!entry) return null;

    const s = entry.status;
    const reviewedState: WfState = ['Checked', 'Approved', 'Rejected', 'VP Rejected'].includes(s) ? 'done' : 'active';
    const approvedState: WfState = s === 'Approved' ? 'done' : s === 'Checked' ? 'active' : 'idle';

    const canCheck  = context === 'reviewer' && s === 'Pending';
    const canApprove = context === 'vp' && s === 'Checked';
    const canReject  = canCheck || canApprove;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-200"
                >
                    ✕
                </button>

                <h2 className="mb-5 text-lg font-bold" style={{ color: '#1e3a5f' }}>
                    JL Form — {entry.reference}
                </h2>

                {/* Workflow indicator */}
                <div className="mb-6 flex items-center rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                    <WfStep label="Submitted" state="done" />
                    <div className="h-0.5 flex-1 bg-gray-200" />
                    <WfStep label="Reviewed" state={reviewedState} />
                    <div className="h-0.5 flex-1 bg-gray-200" />
                    <WfStep label="VP Approved" state={approvedState} />
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <DetailItem label="JL Title" value={entry.title} full />
                    <DetailItem label="Date Prepared" value={entry.date} />
                    <DetailItem label="Status" value={<StatusBadge status={entry.status} />} />
                    <DetailItem label="Company / Farm" value={entry.company} />
                    <DetailItem label="Manager / Supervisor" value={entry.manager} />
                    <DetailItem label="Department" value={entry.dept} />
                    <DetailItem label="Estimated Amount" value={fmtAmt(entry.amount)} />
                    <DetailItem label="Submitted On" value={entry.submitted_at || '—'} />
                    <DetailItem label="Reviewed On" value={entry.reviewed_at || '—'} />
                    <DetailItem label="Approved On" value={entry.approved_at || '—'} />
                    <DetailItem
                        label="Serial Number"
                        value={
                            entry.serial
                                ? <strong style={{ color: '#1e3a5f' }}>{entry.serial}</strong>
                                : <em className="text-gray-400">Not yet assigned</em>
                        }
                    />
                    {entry.attachment_url && (
                        <DetailItem
                            label="Attachment"
                            value={
                                <a
                                    href={entry.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline"
                                >
                                    📎 {entry.attachment_name ?? 'View Attachment'}
                                </a>
                            }
                            full
                        />
                    )}
                    {entry.reject_reason && (
                        <DetailItem
                            label="Rejection Reason"
                            value={<span className="text-red-600">{entry.reject_reason}</span>}
                            full
                        />
                    )}
                </div>

                {/* Reject reason textarea */}
                {showRejectBox && (
                    <div className="mt-4">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Reason for Rejection
                        </label>
                        <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={(e) => onRejectReasonChange?.(e.target.value)}
                            placeholder="Provide a reason…"
                            className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                )}

                {/* Action buttons */}
                <div className="mt-6 flex justify-end gap-2">
                    {!showRejectBox ? (
                        <>
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                            >
                                Close
                            </button>
                            {canReject && (
                                <button
                                    onClick={onRejectClick}
                                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    ✕ Reject
                                </button>
                            )}
                            {canCheck && (
                                <button
                                    onClick={() => { onCheck?.(entry.id); onClose(); }}
                                    className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    ✓ Mark as Checked
                                </button>
                            )}
                            {canApprove && (
                                <button
                                    onClick={() => { onApprove?.(entry.id); onClose(); }}
                                    className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    ✓ Approve
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirmReject}
                                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                            >
                                ⚠ Confirm Rejection
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
