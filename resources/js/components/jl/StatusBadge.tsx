import { cn } from '@/lib/utils';
import type { JlEntry, JlStatus } from '@/types/jl';

const STYLES: Record<JlStatus, string> = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Endorsed: 'bg-indigo-100 text-indigo-700',
    Reviewed: 'bg-blue-100 text-blue-700',
    Rejected: 'bg-red-100 text-red-700',
    Approved: 'bg-green-100 text-green-700',
    'VP Rejected': 'bg-red-100 text-red-700',
    'On Hold': 'bg-amber-100 text-amber-700',
    'On Process': 'bg-purple-100 text-purple-700',
    Cancelled: 'bg-gray-200 text-gray-600',
};

const LABELS: Record<JlStatus, string> = {
    Pending: 'Pending',
    Endorsed: 'Endorsed',
    Reviewed: 'Reviewed',
    Rejected: 'Reviewer Rejected',
    Approved: 'Approved',
    'VP Rejected': 'VP Rejected',
    'On Hold': 'On Hold',
    'On Process': 'On Process',
    Cancelled: 'Cancelled',
};

/** Stage an entry was held at -> the role that holds it, for rows saved before
 *  `held_by` was recorded. 'Approved' can be either the VP or Purchasing; it
 *  resolves to Purchasing here, matching what the hold notifications assume. */
const HOLDER_BY_STAGE: Record<string, string> = {
    Pending: 'Division Head',
    Endorsed: 'Reviewer',
    Reviewed: 'VP',
    'VP Rejected': 'VP',
    Approved: 'Purchasing',
    'On Process': 'Purchasing',
};

/** Who currently holds this entry, or null if it isn't on hold. */
export function holdHolder(
    entry: Pick<JlEntry, 'status' | 'held_at' | 'held_by'>,
): string | null {
    if (entry.status !== 'On Hold') {
        return null;
    }

    return entry.held_by ?? HOLDER_BY_STAGE[entry.held_at ?? ''] ?? null;
}

export default function StatusBadge({
    status,
    heldBy,
}: {
    status: JlStatus;
    /** Role holding the entry, shown alongside an "On Hold" badge. */
    heldBy?: string | null;
}) {
    const label =
        status === 'On Hold' && heldBy
            ? `${LABELS[status]} · ${heldBy}`
            : LABELS[status];

    return (
        <span
            className={cn(
                'inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase',
                STYLES[status],
            )}
        >
            {label}
        </span>
    );
}
