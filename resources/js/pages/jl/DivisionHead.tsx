import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import InfoPanel from '@/components/InfoPanel';
import ExportModal from '@/components/jl/ExportModal';
import HoldModal from '@/components/jl/HoldModal';
import JlModal from '@/components/jl/JlModal';
import JlTable from '@/components/jl/JlTable';
import RejectModal from '@/components/jl/RejectModal';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import AppLayout from '@/layouts/AppLayout';
import type { JlEntry } from '@/types/jl';

interface Props {
    entries: JlEntry[];
}

function StatCard({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div
            className="rounded-xl bg-white p-5 shadow-sm"
            style={{ borderLeft: `4px solid ${color}` }}
        >
            <div className="text-3xl font-extrabold text-gray-900">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{label}</div>
        </div>
    );
}

export default function DivisionHead({ entries }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modal, setModal] = useState<JlEntry | null>(null);
    const [showCheckBox, setShowCheckBox] = useState(false);
    const [checkRemarks, setCheckRemarks] = useState('');
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectEntry, setRejectEntry] = useState<JlEntry | null>(null);
    const [holdEntry, setHoldEntry] = useState<JlEntry | null>(null);
    const [showHoldBox, setShowHoldBox] = useState(false);
    const [holdReasonModal, setHoldReasonModal] = useState('');
    const [showExport, setShowExport] = useState(false);
    const [toast, setToast] = useState('');

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    // A guard rejected on the server (e.g. the entry was already acted on by
    // someone else) still comes back as a normal redirect, not a failed
    // request — so onSuccess always fires. Check flash.error first so we
    // don't show a false "success" toast when the action didn't happen.
    function onFlash(successMsg: string, after?: () => void) {
        return (page: { props: Record<string, unknown> }) => {
            const flash = page.props.flash as { error?: string } | undefined;
            after?.();
            showToast(flash?.error ?? successMsg);
        };
    }

    function closeModal() {
        setModal(null);
        setShowCheckBox(false);
        setCheckRemarks('');
        setShowRejectBox(false);
        setRejectReason('');
        setShowHoldBox(false);
        setHoldReasonModal('');
    }

    function handleConfirmCheck() {
        if (!modal) {
            return;
        }

        router.patch(
            `/jl/${modal.id}/endorse`,
            { endorse_remarks: checkRemarks },
            {
                preserveScroll: true,
                onSuccess: onFlash(
                    'Endorsed — forwarded to the Reviewer.',
                    closeModal,
                ),
            },
        );
    }

    function handleConfirmReject() {
        if (!modal) {
            return;
        }

        router.patch(
            `/jl/${modal.id}/reject`,
            { reject_reason: rejectReason },
            {
                preserveScroll: true,
                onSuccess: onFlash('Form rejected.', closeModal),
            },
        );
    }

    function handleConfirmHoldModal() {
        if (!modal) {
            return;
        }

        router.patch(
            `/jl/${modal.id}/hold`,
            { reason: holdReasonModal },
            {
                preserveScroll: true,
                onSuccess: onFlash('Entry put on hold.', closeModal),
            },
        );
    }

    function handleDirectReject(id: number, reason: string) {
        router.patch(
            `/jl/${id}/reject`,
            { reject_reason: reason },
            {
                preserveScroll: true,
                onSuccess: onFlash('Form rejected.', () =>
                    setRejectEntry(null),
                ),
            },
        );
    }

    function handleDirectHold(id: number, reason: string) {
        router.patch(
            `/jl/${id}/hold`,
            { reason },
            {
                preserveScroll: true,
                onSuccess: onFlash('Entry put on hold.', () =>
                    setHoldEntry(null),
                ),
            },
        );
    }

    const filtered = entries.filter((e) => {
        const q = search.toLowerCase();

        return (
            (!q ||
                `${e.title} ${e.company} ${e.manager}`
                    .toLowerCase()
                    .includes(q)) &&
            (!statusFilter || e.status === statusFilter)
        );
    });

    const {
        page,
        setPage,
        pageSize,
        setPageSize,
        pageItems,
        totalItems,
        totalPages,
    } = usePagination(filtered);

    const total = entries.length;
    const pending = entries.filter((e) => e.status === 'Pending').length;
    const endorsed = entries.filter((e) => e.status === 'Endorsed').length;
    const onHold = entries.filter((e) => e.status === 'On Hold').length;

    return (
        <AppLayout>
            <Head title="Division Head Dashboard" />

            <InfoPanel type="overview" title="Division Head Dashboard">
                <p>
                    This is your department's queue of submitted JL forms. You
                    are the first approval step, before forms reach the
                    Reviewer.
                </p>
                <ul className="mt-2 list-disc pl-4">
                    <li>
                        Forms with status <strong>Pending</strong> require your
                        action — use the kebab menu (⋮) to act.
                    </li>
                    <li>
                        <strong>For Endorsement</strong> — opens the form
                        details for you to inspect and endorse, with optional
                        remarks visible to every role.
                    </li>
                    <li>
                        <strong>Reject</strong> — opens a quick confirmation
                        where you can enter an optional rejection reason.
                    </li>
                    <li>
                        <strong>On Hold</strong> — pauses the form with an
                        optional reason so you can come back to it later. Use{' '}
                        <strong>View Details</strong> on any held entry to see
                        why it was held.
                    </li>
                    <li>
                        Once endorsed, the form moves to the Reviewer's queue
                        automatically.
                    </li>
                </ul>
            </InfoPanel>

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
                    Division Head Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Endorse submitted JL forms from your department, or reject
                    before forwarding to the Reviewer.
                </p>
            </div>

            <div className="mb-7 grid grid-cols-4 gap-4">
                <StatCard
                    label="Total Submissions"
                    value={total}
                    color="#1e3a5f"
                />
                <StatCard
                    label="Awaiting My Endorsement"
                    value={pending}
                    color="#d97706"
                />
                <StatCard
                    label="Endorsed / Forwarded"
                    value={endorsed}
                    color="#4f46e5"
                />
                <StatCard label="On Hold" value={onHold} color="#d97706" />
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3">
                <input
                    className="min-w-[180px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="Search by title, company, manager…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option>Pending</option>
                    <option>Endorsed</option>
                    <option value="Rejected">Rejected</option>
                    <option value="On Hold">On Hold</option>
                </select>
                <button
                    onClick={() => setShowExport(true)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                    ↓ Export
                </button>
            </div>

            <div
                className="rounded-xl bg-white shadow-sm"
                style={{ overflow: 'clip' }}
            >
                <JlTable
                    entries={pageItems}
                    context="division_head"
                    onView={(e) => {
                        setModal(e);
                        setShowCheckBox(false);
                        setCheckRemarks('');
                        setShowRejectBox(false);
                        setRejectReason('');
                        setShowHoldBox(false);
                        setHoldReasonModal('');
                    }}
                    onReject={setRejectEntry}
                    onHold={setHoldEntry}
                />
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                />
            </div>

            <JlModal
                entry={modal}
                context="division_head"
                onClose={closeModal}
                onCheckClick={() => setShowCheckBox(true)}
                showCheckBox={showCheckBox}
                checkRemarks={checkRemarks}
                onCheckRemarksChange={setCheckRemarks}
                onConfirmCheck={handleConfirmCheck}
                onRejectClick={() => setShowRejectBox(true)}
                showRejectBox={showRejectBox}
                rejectReason={rejectReason}
                onRejectReasonChange={setRejectReason}
                onConfirmReject={handleConfirmReject}
                onHoldClick={() => setShowHoldBox(true)}
                showHoldBox={showHoldBox}
                holdReason={holdReasonModal}
                onHoldReasonChange={setHoldReasonModal}
                onConfirmHold={handleConfirmHoldModal}
            />

            <RejectModal
                entry={rejectEntry}
                onClose={() => setRejectEntry(null)}
                onConfirm={handleDirectReject}
            />

            <HoldModal
                entry={holdEntry}
                onClose={() => setHoldEntry(null)}
                onConfirm={handleDirectHold}
            />

            <ExportModal
                open={showExport}
                onClose={() => setShowExport(false)}
                allowedStatuses={['Pending', 'Endorsed', 'Rejected', 'On Hold']}
            />

            {toast && (
                <div
                    className="fixed right-7 bottom-7 z-50 rounded-xl px-5 py-3.5 text-sm font-medium text-white shadow-lg"
                    style={{ background: '#1e3a5f' }}
                >
                    {toast}
                </div>
            )}
        </AppLayout>
    );
}
