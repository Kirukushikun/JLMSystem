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

/** The status word on its own, before any "- ROLE" suffix is appended. */
const BASE_LABELS: Record<JlStatus, string> = {
    Pending: 'Pending',
    Endorsed: 'Endorsed',
    Reviewed: 'Reviewed',
    Rejected: 'Rejected',
    Approved: 'Approved',
    'VP Rejected': 'Rejected',
    'On Hold': 'On Hold',
    'On Process': 'On Process',
    Cancelled: 'Cancelled',
};

/** Statuses where exactly one role can ever be responsible — the suffix is
 *  fixed and doesn't need to be read off the entry. 'Pending', 'Endorsed' and
 *  'Cancelled' are left bare (no single approver/reviewer to name, or not
 *  part of this pattern). 'Rejected' and 'On Hold' are the two ambiguous
 *  ones and are resolved dynamically below instead. */
const FIXED_ROLE: Partial<Record<JlStatus, string>> = {
    Reviewed: 'FOC Head',
    Approved: 'VP',
    'On Process': 'Purchasing',
    'VP Rejected': 'VP',
};

/** Stage an entry was held at / rejected from -> the role responsible, for
 *  rows saved before `held_by`/`rejected_by` were recorded. */
const ROLE_BY_STAGE: Record<string, string> = {
    Pending: 'Division Head',
    Endorsed: 'FOC Head',
    Reviewed: 'VP',
    'VP Rejected': 'VP',
    Approved: 'Purchasing',
    'On Process': 'Purchasing',
};

/** A handful of rows may still carry the pre-rename 'Reviewer' string in
 *  `held_by`/`rejected_by` — normalize it to the current wording. */
function normalizeRole(role: string): string {
    return role === 'Reviewer' ? 'FOC Head' : role;
}

/** Who currently holds this entry, or null if it isn't on hold. */
export function holdHolder(
    entry: Pick<JlEntry, 'status' | 'held_at' | 'held_by'>,
): string | null {
    if (entry.status !== 'On Hold') {
        return null;
    }

    if (entry.held_by) {
        return normalizeRole(entry.held_by);
    }

    return ROLE_BY_STAGE[entry.held_at ?? ''] ?? null;
}

/** Who rejected this entry, or null if it wasn't. */
export function rejectHolder(
    entry: Pick<JlEntry, 'status' | 'rejected_by' | 'endorsed_at'>,
): string | null {
    if (entry.status !== 'Rejected' && entry.status !== 'VP Rejected') {
        return null;
    }

    if (entry.rejected_by) {
        return normalizeRole(entry.rejected_by);
    }

    if (entry.status === 'VP Rejected') {
        return 'VP';
    }

    // Rows saved before `rejected_by` was recorded: reject() never sets
    // `endorsed_at` itself, only endorse() does — so its presence means the
    // request made it to Endorsed (and so was rejected by the FOC Head), and
    // its absence means it was rejected straight from Pending (Division Head).
    return entry.endorsed_at ? 'FOC Head' : 'Division Head';
}

/** "FOC Head" reads as "FOC" in the compact badge; every other role's badge
 *  text is identical to its trail text. */
function badgeRole(role: string): string {
    return role === 'FOC Head' ? 'FOC' : role;
}

interface Props {
    entry: Pick<
        JlEntry,
        'status' | 'held_at' | 'held_by' | 'rejected_by' | 'endorsed_at'
    >;
}

export default function StatusBadge({ entry }: Props) {
    const { status } = entry;
    const role =
        status === 'On Hold'
            ? holdHolder(entry)
            : (FIXED_ROLE[status] ?? rejectHolder(entry));

    const label = role
        ? `${BASE_LABELS[status]} - ${badgeRole(role)}`
        : BASE_LABELS[status];

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
