import { cn } from '@/lib/utils';
import type { JlStatus } from '@/types/jl';

const STYLES: Record<JlStatus, string> = {
    Pending:      'bg-yellow-100 text-yellow-800',
    Reviewed:     'bg-blue-100 text-blue-700',
    Rejected:     'bg-red-100 text-red-700',
    Approved:     'bg-green-100 text-green-700',
    'VP Rejected':'bg-red-100 text-red-700',
    'On Hold':    'bg-amber-100 text-amber-700',
    'On Process': 'bg-purple-100 text-purple-700',
    Cancelled:    'bg-gray-200 text-gray-600',
};

const LABELS: Record<JlStatus, string> = {
    Pending:      'Pending',
    Reviewed:     'Reviewed',
    Rejected:     'Reviewer Rejected',
    Approved:     'Approved',
    'VP Rejected':'VP Rejected',
    'On Hold':    'On Hold',
    'On Process': 'On Process',
    Cancelled:    'Cancelled',
};

export default function StatusBadge({ status }: { status: JlStatus }) {
    return (
        <span
            className={cn(
                'inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
                STYLES[status],
            )}
        >
            {LABELS[status]}
        </span>
    );
}
