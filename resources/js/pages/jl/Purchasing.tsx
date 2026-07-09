import AppLayout from '@/layouts/AppLayout';
import InfoPanel from '@/components/InfoPanel';
import ExportModal from '@/components/jl/ExportModal';
import HoldModal from '@/components/jl/HoldModal';
import JlModal from '@/components/jl/JlModal';
import JlTable from '@/components/jl/JlTable';
import Pagination from '@/components/Pagination';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
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

export default function Purchasing({ entries }: Props) {
    const [search, setSearch]           = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewEntry, setViewEntry]     = useState<JlEntry | null>(null);
    const [holdEntry, setHoldEntry]     = useState<JlEntry | null>(null);
    const [showExport, setShowExport]   = useState(false);
    const [toast, setToast]             = useState('');

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }

    function handleProcess(entry: JlEntry) {
        router.patch(`/jl/${entry.id}/process`, {}, {
            preserveScroll: true,
            onSuccess: () => showToast('Marked as On Process.'),
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

    const { page, setPage, pageSize, setPageSize, pageItems, totalItems, totalPages } = usePagination(filtered);

    const approved   = entries.filter((e) => e.status === 'Approved').length;
    const onProcess  = entries.filter((e) => e.status === 'On Process').length;
    const onHold     = entries.filter((e) => e.status === 'On Hold').length;

    return (
        <AppLayout>
            <Head title="Purchasing" />

            <InfoPanel type="overview" title="Purchasing Dashboard">
                <p>This is your queue of VP-approved JL forms ready for purchasing action.</p>
                <ul className="mt-2 list-disc pl-4">
                    <li>Forms with status <strong>Approved</strong> are ready for you to act on — use the kebab menu (⋮).</li>
                    <li><strong>On Process</strong> — marks the form as actively being processed by purchasing.</li>
                    <li><strong>On Hold</strong> — pauses the form with an optional reason; you can resume it anytime.</li>
                    <li>Use <strong>View Details</strong> to inspect the full form, attachments, and serial number.</li>
                </ul>
            </InfoPanel>

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Purchasing Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage VP-approved JL forms — mark them as On Process or put them On Hold.
                </p>
            </div>

            <div className="mb-7 grid grid-cols-3 gap-4">
                <StatCard label="Approved (Queued)"  value={approved}  color="#16a34a" />
                <StatCard label="On Process"          value={onProcess} color="#7c3aed" />
                <StatCard label="On Hold"             value={onHold}    color="#d97706" />
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
                    <option value="Approved">Approved</option>
                    <option value="On Process">On Process</option>
                    <option value="On Hold">On Hold</option>
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
                    entries={pageItems}
                    context="purchasing"
                    onView={setViewEntry}
                    onHold={setHoldEntry}
                    onProcess={handleProcess}
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
                entry={viewEntry}
                context="purchasing"
                onClose={() => setViewEntry(null)}
            />

            <HoldModal
                entry={holdEntry}
                onClose={() => setHoldEntry(null)}
                onConfirm={handleDirectHold}
            />

            <ExportModal
                open={showExport}
                onClose={() => setShowExport(false)}
                allowedStatuses={['Approved', 'On Process', 'On Hold']}
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
