import { useEffect } from 'react';
import type { JlEntry } from '@/types/jl';
import StatusBadge from './StatusBadge';

interface Props {
    entry: JlEntry | null;
    context:
        | 'division_head'
        | 'reviewer'
        | 'vp'
        | 'purchasing'
        | 'requestor'
        | 'viewer';
    onClose: () => void;
    onProcess?: (id: number) => void;
    onCheckClick?: () => void;
    showCheckBox?: boolean;
    checkRemarks?: string;
    onCheckRemarksChange?: (v: string) => void;
    onConfirmCheck?: () => void;
    onApproveClick?: () => void;
    showApproveBox?: boolean;
    approveRemarks?: string;
    onApproveRemarksChange?: (v: string) => void;
    onConfirmApprove?: () => void;
    onRejectClick?: () => void;
    showRejectBox?: boolean;
    rejectReason?: string;
    onRejectReasonChange?: (v: string) => void;
    onConfirmReject?: () => void;
    onHoldClick?: () => void;
    showHoldBox?: boolean;
    holdReason?: string;
    onHoldReasonChange?: (v: string) => void;
    onConfirmHold?: () => void;
}

type WfState = 'idle' | 'active' | 'done';

const WF_STYLES: Record<WfState, string> = {
    idle: 'border-gray-200 bg-gray-50 text-gray-400',
    active: 'border-blue-500 bg-blue-50 text-blue-600',
    done: 'border-green-500 bg-green-50 text-green-600',
};

function WfStep({ label, state }: { label: string; state: WfState }) {
    const icons: Record<WfState, string> = {
        idle: '○',
        active: '◎',
        done: '✓',
    };

    return (
        <div className="flex flex-1 flex-col items-center gap-1.5">
            <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold ${WF_STYLES[state]}`}
            >
                {icons[state]}
            </div>
            <span className="text-center text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                {label}
            </span>
        </div>
    );
}

function DetailItem({
    label,
    value,
    full,
}: {
    label: string;
    value: React.ReactNode;
    full?: boolean;
}) {
    return (
        <div className={full ? 'sm:col-span-2' : ''}>
            <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                {label}
            </p>
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
    onProcess,
    onCheckClick,
    showCheckBox,
    checkRemarks,
    onCheckRemarksChange,
    onConfirmCheck,
    onApproveClick,
    showApproveBox,
    approveRemarks,
    onApproveRemarksChange,
    onConfirmApprove,
    onRejectClick,
    showRejectBox,
    rejectReason,
    onRejectReasonChange,
    onConfirmReject,
    onHoldClick,
    showHoldBox,
    holdReason,
    onHoldReasonChange,
    onConfirmHold,
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

    if (!entry) {
        return null;
    }

    const s = entry.status;
    const effective = s === 'On Hold' ? (entry.held_at ?? 'Pending') : s;

    const endorsedState: WfState = [
        'Endorsed',
        'Reviewed',
        'Approved',
        'Rejected',
        'VP Rejected',
        'On Process',
    ].includes(effective)
        ? 'done'
        : 'active';
    const reviewedState: WfState = [
        'Reviewed',
        'Approved',
        'Rejected',
        'VP Rejected',
        'On Process',
    ].includes(effective)
        ? 'done'
        : 'active';
    const approvedState: WfState = ['Approved', 'On Process'].includes(
        effective,
    )
        ? 'done'
        : effective === 'Reviewed'
          ? 'active'
          : 'idle';

    const canEndorse =
        context === 'division_head' &&
        (s === 'Pending' || (s === 'On Hold' && entry.held_at === 'Pending'));
    const canCheck =
        context === 'reviewer' &&
        (s === 'Endorsed' || (s === 'On Hold' && entry.held_at === 'Endorsed'));
    // Both Division Head's "Endorse" and Reviewer's "Mark as Reviewed" share
    // the same remarks-box UI below (open box → optional remarks → confirm),
    // just at different stages — canMarkStage drives that shared UI.
    const canMarkStage = canEndorse || canCheck;
    const canApprove =
        context === 'vp' &&
        (s === 'Reviewed' || (s === 'On Hold' && entry.held_at === 'Reviewed'));
    const canReapprove =
        context === 'vp' &&
        (s === 'VP Rejected' ||
            (s === 'On Hold' && entry.held_at === 'VP Rejected'));
    const canRejectApproved = context === 'vp' && s === 'Approved';
    const canProcess =
        context === 'purchasing' &&
        (s === 'Approved' ||
            (s === 'On Hold' &&
                (entry.held_at === 'Approved' ||
                    entry.held_at === 'On Process')));

    const canReject = canMarkStage || canApprove || canRejectApproved;
    const canHold =
        canMarkStage ||
        canApprove ||
        canRejectApproved ||
        canReapprove ||
        (context === 'purchasing' && (s === 'Approved' || s === 'On Process'));

    // VP viewing something that was on the approved track but has since moved past
    // the reject-eligible window — the instant literal status leaves 'Approved'
    // (On Process, or held at either stage), that window is closed for good.
    const wasApprovedTrack =
        effective === 'Approved' || effective === 'On Process';
    const rejectWindowClosed =
        context === 'vp' && wasApprovedTrack && s !== 'Approved';

    const showingBox =
        showRejectBox || showHoldBox || showApproveBox || showCheckBox;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
            onClick={onClose}
        >
            <div
                className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-8"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-200"
                >
                    ✕
                </button>

                <h2
                    className="mb-5 text-lg font-bold"
                    style={{ color: '#1e3a5f' }}
                >
                    JL Form — {entry.reference}
                </h2>

                {/* Workflow indicator */}
                <div className="mb-6 flex items-center rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                    <WfStep label="Submitted" state="done" />
                    <div className="h-0.5 flex-1 bg-gray-200" />
                    <WfStep label="Endorsed" state={endorsedState} />
                    <div className="h-0.5 flex-1 bg-gray-200" />
                    <WfStep label="Reviewed" state={reviewedState} />
                    <div className="h-0.5 flex-1 bg-gray-200" />
                    <WfStep label="VP Approved" state={approvedState} />
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <DetailItem
                        label={
                            entry.entry_type === 'structured'
                                ? 'Subject'
                                : 'JL Title'
                        }
                        value={entry.title}
                        full
                    />
                    <DetailItem
                        label={
                            entry.entry_type === 'structured'
                                ? 'Date Needed'
                                : 'Date Prepared'
                        }
                        value={entry.date}
                    />
                    <DetailItem
                        label="Status"
                        value={<StatusBadge status={entry.status} />}
                    />
                    <DetailItem label="Company / Farm" value={entry.company} />
                    <DetailItem
                        label="Manager / Supervisor"
                        value={entry.manager}
                    />
                    <DetailItem label="Department" value={entry.dept} />
                    <DetailItem
                        label="Estimated Amount"
                        value={fmtAmt(entry.amount)}
                    />
                    <DetailItem
                        label="Submitted On"
                        value={entry.submitted_at || '—'}
                    />
                    <DetailItem
                        label="Endorsed On"
                        value={entry.endorsed_at || '—'}
                    />
                    <DetailItem
                        label="Reviewed On"
                        value={entry.reviewed_at || '—'}
                    />
                    <DetailItem
                        label="Approved On"
                        value={entry.approved_at || '—'}
                    />
                    <DetailItem
                        label="Serial Number"
                        value={
                            entry.serial ? (
                                <strong style={{ color: '#1e3a5f' }}>
                                    {entry.serial}
                                </strong>
                            ) : (
                                <em className="text-gray-400">
                                    Not yet assigned
                                </em>
                            )
                        }
                    />
                    {entry.entry_type === 'structured' && (
                        <>
                            {entry.body && (
                                <DetailItem
                                    label="Body"
                                    value={
                                        <span className="whitespace-pre-wrap">
                                            {entry.body}
                                        </span>
                                    }
                                    full
                                />
                            )}
                            {entry.justification && (
                                <DetailItem
                                    label="Reason for Justification"
                                    value={
                                        <span className="whitespace-pre-wrap">
                                            {entry.justification}
                                        </span>
                                    }
                                    full
                                />
                            )}
                            {entry.items && entry.items.length > 0 && (
                                <DetailItem
                                    label="Items"
                                    value={
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="w-full min-w-[420px] border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50 text-left tracking-wide text-gray-400 uppercase">
                                                        <th className="px-2.5 py-2">
                                                            Item
                                                        </th>
                                                        <th className="px-2.5 py-2">
                                                            Qty
                                                        </th>
                                                        <th className="px-2.5 py-2">
                                                            Purpose
                                                        </th>
                                                        <th className="px-2.5 py-2">
                                                            Image
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {entry.items.map(
                                                        (item, i) => (
                                                            <tr
                                                                key={i}
                                                                className="border-t border-gray-100"
                                                            >
                                                                <td className="px-2.5 py-2">
                                                                    {
                                                                        item.item_name
                                                                    }
                                                                </td>
                                                                <td className="px-2.5 py-2">
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                </td>
                                                                <td className="px-2.5 py-2">
                                                                    {
                                                                        item.purpose
                                                                    }
                                                                </td>
                                                                <td className="px-2.5 py-2">
                                                                    {item.image_url ? (
                                                                        <a
                                                                            href={
                                                                                item.image_url
                                                                            }
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                        >
                                                                            <img
                                                                                src={
                                                                                    item.image_url
                                                                                }
                                                                                alt=""
                                                                                className="h-8 w-8 rounded object-cover"
                                                                            />
                                                                        </a>
                                                                    ) : (
                                                                        '—'
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    }
                                    full
                                />
                            )}
                            {entry.cost_breakdown &&
                                entry.cost_breakdown.length > 0 && (
                                    <DetailItem
                                        label="Cost Breakdown"
                                        value={
                                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                <table className="w-full min-w-[360px] border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-left tracking-wide text-gray-400 uppercase">
                                                            <th className="px-2.5 py-2">
                                                                Description
                                                            </th>
                                                            <th className="px-2.5 py-2">
                                                                Qty
                                                            </th>
                                                            <th className="px-2.5 py-2">
                                                                Unit Cost
                                                            </th>
                                                            <th className="px-2.5 py-2">
                                                                Subtotal
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {entry.cost_breakdown.map(
                                                            (row, i) => (
                                                                <tr
                                                                    key={i}
                                                                    className="border-t border-gray-100"
                                                                >
                                                                    <td className="px-2.5 py-2">
                                                                        {
                                                                            row.description
                                                                        }
                                                                    </td>
                                                                    <td className="px-2.5 py-2">
                                                                        {
                                                                            row.quantity
                                                                        }
                                                                    </td>
                                                                    <td className="px-2.5 py-2">
                                                                        {fmtAmt(
                                                                            Number(
                                                                                row.unit_cost,
                                                                            ) ||
                                                                                0,
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2.5 py-2 font-medium">
                                                                        {fmtAmt(
                                                                            (Number(
                                                                                row.quantity,
                                                                            ) ||
                                                                                0) *
                                                                                (Number(
                                                                                    row.unit_cost,
                                                                                ) ||
                                                                                    0),
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        }
                                        full
                                    />
                                )}
                        </>
                    )}
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
                                    📎{' '}
                                    {entry.attachment_name ?? 'View Attachment'}
                                </a>
                            }
                            full
                        />
                    )}
                    {entry.status === 'On Hold' && entry.hold_reason && (
                        <DetailItem
                            label="Hold Reason"
                            value={
                                <span className="text-amber-700">
                                    {entry.hold_reason}
                                </span>
                            }
                            full
                        />
                    )}
                    {entry.reject_reason && (
                        <DetailItem
                            label="Rejection Reason"
                            value={
                                <span className="text-red-600">
                                    {entry.reject_reason}
                                </span>
                            }
                            full
                        />
                    )}
                    {entry.endorse_remarks && (
                        <DetailItem
                            label="Endorsement Remarks"
                            value={
                                <span className="text-indigo-700">
                                    {entry.endorse_remarks}
                                </span>
                            }
                            full
                        />
                    )}
                    {entry.review_remarks && (
                        <DetailItem
                            label="Review Remarks"
                            value={
                                <span className="text-blue-700">
                                    {entry.review_remarks}
                                </span>
                            }
                            full
                        />
                    )}
                    {entry.approve_remarks && (
                        <DetailItem
                            label="Approval Remarks"
                            value={
                                <span className="text-green-700">
                                    {entry.approve_remarks}
                                </span>
                            }
                            full
                        />
                    )}
                </div>

                {rejectWindowClosed && (
                    <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        ⚠ This request has already moved on with Purchasing and
                        can no longer be rejected.
                    </div>
                )}

                {/* Reject reason textarea */}
                {showRejectBox && (
                    <div className="mt-4">
                        <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Reason for Rejection
                        </label>
                        <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={(e) =>
                                onRejectReasonChange?.(e.target.value)
                            }
                            placeholder="Provide a reason…"
                            className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                )}

                {/* Hold reason textarea */}
                {showHoldBox && (
                    <div className="mt-4">
                        <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Reason for Hold (optional)
                        </label>
                        <textarea
                            rows={3}
                            value={holdReason}
                            onChange={(e) =>
                                onHoldReasonChange?.(e.target.value)
                            }
                            placeholder="Note why this is being held…"
                            className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                        />
                    </div>
                )}

                {/* Check (review) remarks textarea */}
                {showCheckBox && (
                    <div className="mt-4">
                        <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Remarks (optional)
                        </label>
                        <textarea
                            rows={3}
                            value={checkRemarks}
                            onChange={(e) =>
                                onCheckRemarksChange?.(e.target.value)
                            }
                            placeholder={
                                canEndorse
                                    ? 'Add a comment about this endorsement…'
                                    : 'Add a comment about this review…'
                            }
                            className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                )}

                {/* Approve remarks textarea */}
                {showApproveBox && (
                    <div className="mt-4">
                        <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Remarks (optional)
                        </label>
                        <textarea
                            rows={3}
                            value={approveRemarks}
                            onChange={(e) =>
                                onApproveRemarksChange?.(e.target.value)
                            }
                            placeholder="Add a comment about this approval…"
                            className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                        />
                    </div>
                )}

                {/* Action buttons */}
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    {!showingBox ? (
                        <>
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                            >
                                Close
                            </button>
                            {canHold && (
                                <button
                                    onClick={onHoldClick}
                                    className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    <i class="fa-solid fa-pause"></i> On Hold
                                </button>
                            )}
                            {canReject && (
                                <button
                                    onClick={onRejectClick}
                                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    ✕ Reject
                                </button>
                            )}
                            {canMarkStage && (
                                <button
                                    onClick={onCheckClick}
                                    className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    <i class="fa-solid fa-check"></i>{' '}
                                    {canEndorse
                                        ? 'Endorse'
                                        : 'Mark as Reviewed'}
                                </button>
                            )}
                            {(canApprove || canReapprove) && (
                                <button
                                    onClick={onApproveClick}
                                    className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    <i class="fa-solid fa-check"></i>{' '}
                                    {canReapprove ? 'Re-Approve' : 'Approve'}
                                </button>
                            )}
                            {canProcess && (
                                <button
                                    onClick={() => {
                                        onProcess?.(entry.id);
                                        onClose();
                                    }}
                                    className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    <i class="fa-solid fa-play"></i> On Process
                                </button>
                            )}
                        </>
                    ) : showRejectBox ? (
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
                    ) : showApproveBox ? (
                        <>
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirmApprove}
                                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                            >
                                <i class="fa-solid fa-check"></i> Confirm
                                Approval
                            </button>
                        </>
                    ) : showCheckBox ? (
                        <>
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirmCheck}
                                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                            >
                                <i class="fa-solid fa-check"></i>{' '}
                                {context === 'division_head'
                                    ? 'Confirm Endorsement'
                                    : 'Confirm Review'}
                            </button>
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
                                onClick={onConfirmHold}
                                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                            >
                                <i class="fa-solid fa-pause"></i> Confirm On
                                Hold
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
