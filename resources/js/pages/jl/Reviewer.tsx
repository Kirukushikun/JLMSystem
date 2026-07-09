import AppLayout from '@/layouts/AppLayout';
import InfoPanel from '@/components/InfoPanel';
import ExportModal from '@/components/jl/ExportModal';
import HoldModal from '@/components/jl/HoldModal';
import JlModal from '@/components/jl/JlModal';
import JlTable from '@/components/jl/JlTable';
import RejectModal from '@/components/jl/RejectModal';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import type { JlEntry } from '@/types/jl';

interface Props {
    entries: JlEntry[];
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="rounded-xl bg-white p-5 shadow-sm" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="text-3xl font-extrabold text-gray-900">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{label}</div>
        </div>
    );
}

export default function Reviewer({ entries }: Props) {
    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modal, setModal]               = useState<JlEntry | null>(null);
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectEntry, setRejectEntry]   = useState<JlEntry | null>(null);
    const [holdEntry, setHoldEntry]       = useState<JlEntry | null>(null);
    const [showExport, setShowExport]     = useState(false);
    const [toast, setToast]               = useState('');

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    function closeModal() {
        setModal(null); setShowRejectBox(false); setRejectReason('');
    }

    function handleCheck(id: number) {
        router.patch(`/jl/${id}/review`, {}, {
            preserveScroll: true,
            onSuccess: () => showToast('Marked as Reviewed — forwarded to VP Approver.'),
        });
    }

    function handleConfirmReject() {
        if (!modal) return;
        router.patch(`/jl/${modal.id}/reject`, { reject_reason: rejectReason }, {
            preserveScroll: true,
            onSuccess: () => { closeModal(); showToast('Form rejected.'); },
        });
    }

    function handleDirectReject(id: number, reason: string) {
        router.patch(`/jl/${id}/reject`, { reject_reason: reason }, {
            preserveScroll: true,
            onSuccess: () => { setRejectEntry(null); showToast('Form rejected.'); },
        });
    }

    function handleDirectHold(id: number, reason: string) {
        router.patch(`/jl/${id}/hold`, { reason }, {
            preserveScroll: true,
            onSuccess: () => { setHoldEntry(null); showToast('Entry put on hold.'); },
        });
    }

    const filtered = entries.filter((e) => {
        const q = search.toLowerCase();
        return (
            (!q || `${e.title} ${e.company} ${e.manager}`.toLowerCase().includes(q)) &&
            (!statusFilter || e.status === statusFilter)
        );
    });

    const total            = entries.length;
    const pending          = entries.filter((e) => e.status === 'Pending').length;
    const checked          = entries.filter((e) => e.status === 'Reviewed').length;
    const approved         = entries.filter((e) => e.status === 'Approved').length;
    const reviewerRejected = entries.filter((e) => e.status === 'Rejected').length;
    const vpRejected       = entries.filter((e) => e.status === 'VP Rejected').length;
    const onHold           = entries.filter((e) => e.status === 'On Hold').length;

    return (
        <AppLayout>
            <Head title="Reviewer Dashboard" />

            <InfoPanel type="overview" title="Reviewer Dashboard">
                <p>This is your queue of all submitted JL forms. You are the first approval step before forms reach the VP Approver.</p>
                <ul className="mt-2 list-disc pl-4">
                    <li>Forms with status <strong>Pending</strong> require your action — use the kebab menu (⋮) to act.</li>
                    <li><strong>For Review</strong> — opens the form details for you to inspect before marking as Reviewed.</li>
                    <li><strong>Reject</strong> — opens a quick confirmation where you can enter an optional rejection reason.</li>
                    <li><strong>On Hold</strong> — pauses the form with an optional reason so you can come back to it later. Use <strong>View Details</strong> on any held entry to see why it was held.</li>
                    <li>Once marked as Reviewed, the form moves to the VP Approver's queue automatically.</li>
                </ul>
            </InfoPanel>

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Reviewer Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Review submitted JL forms, mark as checked or reject before forwarding to VP Approver.
                </p>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-4">
                <StatCard label="Total Submissions"    value={total}    color="#1e3a5f" />
                <StatCard label="Pending Review"       value={pending}  color="#d97706" />
                <StatCard label="Reviewed / Forwarded" value={checked}  color="#2563eb" />
                <StatCard label="VP Approved"          value={approved} color="#16a34a" />
            </div>
            <div className="mb-7 grid grid-cols-3 gap-4">
                <StatCard label="Rejected by Reviewer" value={reviewerRejected} color="#dc2626" />
                <StatCard label="Rejected by VP"       value={vpRejected}       color="#dc2626" />
                <StatCard label="On Hold"              value={onHold}           color="#d97706" />
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
                    <option>Reviewed</option>
                    <option value="Rejected">Reviewer Rejected</option>
                    <option>Approved</option>
                    <option value="VP Rejected">VP Rejected</option>
                    <option value="On Hold">On Hold</option>
                    <option value="On Process">On Process</option>
                </select>
                <button
                    onClick={() => setShowExport(true)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                    ↓ Export
                </button>
            </div>

            <div className="rounded-xl bg-white shadow-sm" style={{ overflow: 'clip' }}>
                <JlTable
                    entries={filtered}
                    context="reviewer"
                    onView={(e) => { setModal(e); setShowRejectBox(false); setRejectReason(''); }}
                    onReject={setRejectEntry}
                    onHold={setHoldEntry}
                />
            </div>

            <JlModal
                entry={modal}
                context="reviewer"
                onClose={closeModal}
                onCheck={handleCheck}
                onRejectClick={() => setShowRejectBox(true)}
                showRejectBox={showRejectBox}
                rejectReason={rejectReason}
                onRejectReasonChange={setRejectReason}
                onConfirmReject={handleConfirmReject}
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
                allowedStatuses={['Pending', 'Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Hold', 'On Process']}
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
