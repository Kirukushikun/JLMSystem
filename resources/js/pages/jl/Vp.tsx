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

export default function Vp({ entries }: Props) {
    const [search, setSearch]               = useState('');
    const [statusFilter, setStatusFilter]   = useState('');
    const [modal, setModal]                 = useState<JlEntry | null>(null);
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [rejectReason, setRejectReason]   = useState('');
    const [rejectEntry, setRejectEntry]     = useState<JlEntry | null>(null);
    const [holdEntry, setHoldEntry]         = useState<JlEntry | null>(null);
    const [showExport, setShowExport]       = useState(false);
    const [toast, setToast]                 = useState('');

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    function closeModal() {
        setModal(null); setShowRejectBox(false); setRejectReason('');
    }

    function handleApprove(id: number) {
        router.patch(`/jl/${id}/approve`, {}, {
            preserveScroll: true,
            onSuccess: () => showToast('Entry approved and serial number assigned.'),
        });
    }

    function handleConfirmReject() {
        if (!modal) return;
        router.patch(`/jl/${modal.id}/reject`, { reject_reason: rejectReason }, {
            preserveScroll: true,
            onSuccess: () => { closeModal(); showToast('Form rejected by VP.'); },
        });
    }

    function handleDirectReject(id: number, reason: string) {
        router.patch(`/jl/${id}/reject`, { reject_reason: reason }, {
            preserveScroll: true,
            onSuccess: () => { setRejectEntry(null); showToast('Form rejected by VP.'); },
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

    const forwarded        = entries.filter((e) => e.status !== 'Rejected').length;
    const pending          = entries.filter((e) => e.status === 'Reviewed' || (e.status === 'On Hold' && e.held_at === 'Reviewed')).length;
    const approved         = entries.filter((e) => e.status === 'Approved').length;
    const vpRejected       = entries.filter((e) => e.status === 'VP Rejected').length;
    const reviewerRejected = entries.filter((e) => e.status === 'Rejected').length;
    const onHold           = entries.filter((e) => e.status === 'On Hold' && e.held_at === 'Reviewed').length;

    return (
        <AppLayout>
            <Head title="VP Approver" />

            <InfoPanel type="overview" title="VP Approver Dashboard">
                <p>This is your final-approval queue. Only forms already reviewed by the Reviewer appear here as actionable.</p>
                <ul className="mt-2 list-disc pl-4">
                    <li>Forms with status <strong>Reviewed</strong> are waiting for your action — use the kebab menu (⋮).</li>
                    <li><strong>For Approval</strong> — opens the full form details before you confirm approval.</li>
                    <li><strong>Approve</strong> — grants final approval and triggers the auto-generated serial number.</li>
                    <li><strong>Reject</strong> — opens a confirmation with an optional reason; status becomes VP Rejected.</li>
                    <li>Forms rejected by the Reviewer are also visible here for reference but require no action.</li>
                </ul>
            </InfoPanel>

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>VP Approver Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Review checked forms and approve or reject. Approved entries receive a serial number.
                </p>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-4">
                <StatCard label="Forwarded to VP"   value={forwarded}  color="#1e3a5f" />
                <StatCard label="Awaiting Approval" value={pending}    color="#d97706" />
                <StatCard label="Approved"          value={approved}   color="#16a34a" />
                <StatCard label="Rejected by VP"    value={vpRejected} color="#dc2626" />
            </div>
            <div className="mb-7 grid grid-cols-2 gap-4">
                <StatCard label="On Hold"                                                           value={onHold}           color="#d97706" />
                <StatCard label="Rejected by Reviewer (visible for reference — no action required)" value={reviewerRejected} color="#94a3b8" />
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3">
                <input
                    className="min-w-[180px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="Reviewed">Reviewed (Pending VP)</option>
                    <option value="Approved">Approved</option>
                    <option value="VP Rejected">VP Rejected</option>
                    <option value="Rejected">Rejected by Reviewer</option>
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
                    context="vp"
                    onView={(e) => { setModal(e); setShowRejectBox(false); setRejectReason(''); }}
                    onReject={setRejectEntry}
                    onHold={setHoldEntry}
                />
            </div>

            <JlModal
                entry={modal}
                context="vp"
                onClose={closeModal}
                onApprove={handleApprove}
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
                allowedStatuses={['Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Hold', 'On Process']}
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
