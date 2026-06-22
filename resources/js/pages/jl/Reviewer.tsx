import AppLayout from '@/layouts/AppLayout';
import JlModal from '@/components/jl/JlModal';
import JlTable from '@/components/jl/JlTable';
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
    const [toast, setToast]               = useState('');

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    function closeModal() {
        setModal(null); setShowRejectBox(false); setRejectReason('');
    }

    function handleCheck(id: number) {
        router.patch(`/jl/${id}/check`, {}, {
            preserveScroll: true,
            onSuccess: () => showToast('Marked as Checked — forwarded to VP Approver.'),
        });
    }

    function handleReject(entry: JlEntry) {
        setModal(entry);
        setShowRejectBox(true);
    }

    function handleConfirmReject() {
        if (!modal) return;
        router.patch(`/jl/${modal.id}/reject`, { reject_reason: rejectReason }, {
            preserveScroll: true,
            onSuccess: () => { closeModal(); showToast('Form rejected.'); },
        });
    }

    const filtered = entries.filter((e) => {
        const q = search.toLowerCase();
        return (
            (!q || `${e.title} ${e.company} ${e.manager}`.toLowerCase().includes(q)) &&
            (!statusFilter || e.status === statusFilter)
        );
    });

    const total    = entries.length;
    const pending  = entries.filter((e) => e.status === 'Pending').length;
    const checked  = entries.filter((e) => e.status === 'Checked').length;
    const approved = entries.filter((e) => e.status === 'Approved').length;

    return (
        <AppLayout>
            <Head title="Reviewer Dashboard" />

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Reviewer Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Review submitted JL forms, mark as checked or reject before forwarding to VP Approver.
                </p>
            </div>

            <div className="mb-7 grid grid-cols-4 gap-4">
                <StatCard label="Total Submissions"   value={total}    color="#1e3a5f" />
                <StatCard label="Pending Review"       value={pending}  color="#d97706" />
                <StatCard label="Checked / Forwarded"  value={checked}  color="#2563eb" />
                <StatCard label="VP Approved"          value={approved} color="#16a34a" />
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
                    <option>Checked</option>
                    <option>Rejected</option>
                    <option>Approved</option>
                </select>
            </div>

            <div className="rounded-xl bg-white shadow-sm" style={{ overflow: 'clip' }}>
                <JlTable
                    entries={filtered}
                    context="reviewer"
                    onView={(e) => { setModal(e); setShowRejectBox(false); setRejectReason(''); }}
                    onCheck={handleCheck}
                    onApprove={() => {}}
                    onReject={handleReject}
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
