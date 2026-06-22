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

export default function Vp({ entries }: Props) {
    const [search, setSearch]               = useState('');
    const [statusFilter, setStatusFilter]   = useState('');
    const [modal, setModal]                 = useState<JlEntry | null>(null);
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [rejectReason, setRejectReason]   = useState('');
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

    function handleReject(entry: JlEntry) {
        setModal(entry);
        setShowRejectBox(true);
    }

    function handleConfirmReject() {
        if (!modal) return;
        router.patch(`/jl/${modal.id}/reject`, { reject_reason: rejectReason }, {
            preserveScroll: true,
            onSuccess: () => { closeModal(); showToast('Form rejected by VP.'); },
        });
    }

    const filtered = entries.filter((e) => {
        const q = search.toLowerCase();
        return (
            (!q || `${e.title} ${e.company} ${e.manager}`.toLowerCase().includes(q)) &&
            (!statusFilter || e.status === statusFilter)
        );
    });

    const forwarded = entries.length;
    const pending   = entries.filter((e) => e.status === 'Checked').length;
    const approved  = entries.filter((e) => e.status === 'Approved').length;
    const rejected  = entries.filter((e) => e.status === 'VP Rejected').length;

    return (
        <AppLayout>
            <Head title="VP Approver" />

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>VP Approver Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Review checked forms and approve or reject. Approved entries receive a serial number.
                </p>
            </div>

            <div className="mb-7 grid grid-cols-4 gap-4">
                <StatCard label="Forwarded to VP"  value={forwarded} color="#1e3a5f" />
                <StatCard label="Awaiting Approval" value={pending}   color="#d97706" />
                <StatCard label="Approved"          value={approved}  color="#16a34a" />
                <StatCard label="Rejected by VP"    value={rejected}  color="#dc2626" />
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
                    <option value="Checked">Checked (Pending VP)</option>
                    <option value="Approved">Approved</option>
                    <option value="VP Rejected">VP Rejected</option>
                </select>
            </div>

            <div className="rounded-xl bg-white shadow-sm" style={{ overflow: 'clip' }}>
                <JlTable
                    entries={filtered}
                    context="vp"
                    onView={(e) => { setModal(e); setShowRejectBox(false); setRejectReason(''); }}
                    onCheck={() => {}}
                    onApprove={handleApprove}
                    onReject={handleReject}
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
