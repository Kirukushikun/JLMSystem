import AppLayout from '@/layouts/AppLayout';
import InfoPanel from '@/components/InfoPanel';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface AuditLog {
    id: number;
    jl_entry_id: number;
    event: 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'vp_rejected' | 'on_hold' | 'on_process';
    actor: string | null;
    notes: string | null;
    created_at: string;
    entry: {
        reference: string;
        title: string;
        company: string;
    } | null;
}

interface Props {
    logs: AuditLog[];
}

const EVENT_META: Record<AuditLog['event'], { label: string; bg: string; color: string }> = {
    submitted:   { label: 'Submitted',      bg: '#fef3c7', color: '#92400e' },
    reviewed:    { label: 'Reviewed',        bg: '#dbeafe', color: '#1e40af' },
    approved:    { label: 'Approved',        bg: '#dcfce7', color: '#166534' },
    rejected:    { label: 'Rejected',        bg: '#fee2e2', color: '#991b1b' },
    vp_rejected: { label: 'Rejected by VP',  bg: '#fce7f3', color: '#9d174d' },
    on_hold:     { label: 'On Hold',         bg: '#fef3c7', color: '#92400e' },
    on_process:  { label: 'On Process',      bg: '#ede9fe', color: '#5b21b6' },
};

function EventBadge({ event }: { event: AuditLog['event'] }) {
    const { label, bg, color } = EVENT_META[event];
    return (
        <span
            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
            style={{ background: bg, color }}
        >
            {label}
        </span>
    );
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const TH = 'whitespace-nowrap bg-gray-50 px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400';

export default function AuditTrail({ logs }: Props) {
    const [search, setSearch]           = useState('');
    const [eventFilter, setEventFilter] = useState('');

    const filtered = logs.filter((log) => {
        const q = search.toLowerCase();
        const haystack = [
            log.entry?.reference ?? '',
            log.entry?.title ?? '',
            log.entry?.company ?? '',
            log.actor ?? '',
        ].join(' ').toLowerCase();

        return (
            (!q || haystack.includes(q)) &&
            (!eventFilter || log.event === eventFilter)
        );
    });

    const total      = logs.length;
    const todayStr   = new Date().toLocaleDateString('en-CA');
    const todayCount = logs.filter((l) => l.created_at.startsWith(todayStr)).length;

    return (
        <AppLayout>
            <Head title="Audit Trail" />

            <InfoPanel type="overview" title="Audit Trail">
                <p>A complete, chronological log of every action taken on JL forms across the entire system.</p>
                <ul className="mt-2 list-disc pl-4">
                    <li><strong>Submitted</strong> — recorded when a form is submitted via the public link (no actor).</li>
                    <li><strong>Reviewed</strong> — recorded when a Reviewer marks a form as Reviewed.</li>
                    <li><strong>Approved</strong> — recorded when the VP Approver gives final approval.</li>
                    <li><strong>Rejected / Rejected by VP</strong> — recorded with the actor and rejection reason (if provided).</li>
                </ul>
                <p className="mt-2">Use the search and filter to narrow down by reference, company, actor, or event type.</p>
            </InfoPanel>

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Audit Trail</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Complete log of all actions taken on JL forms — submissions, reviews, approvals, and rejections.
                </p>
            </div>

            {/* Summary strip */}
            <div className="mb-6 flex flex-wrap gap-4">
                <div className="rounded-xl bg-white px-5 py-4 shadow-sm" style={{ borderLeft: '4px solid #1e3a5f' }}>
                    <div className="text-3xl font-extrabold text-gray-900">{total}</div>
                    <div className="mt-1 text-xs text-gray-500">Total Events</div>
                </div>
                <div className="rounded-xl bg-white px-5 py-4 shadow-sm" style={{ borderLeft: '4px solid #2563eb' }}>
                    <div className="text-3xl font-extrabold text-gray-900">{todayCount}</div>
                    <div className="mt-1 text-xs text-gray-500">Events Today</div>
                </div>
                <div className="rounded-xl bg-white px-5 py-4 shadow-sm" style={{ borderLeft: '4px solid #16a34a' }}>
                    <div className="text-3xl font-extrabold text-gray-900">
                        {logs.filter((l) => l.event === 'approved').length}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Total Approved</div>
                </div>
                <div className="rounded-xl bg-white px-5 py-4 shadow-sm" style={{ borderLeft: '4px solid #dc2626' }}>
                    <div className="text-3xl font-extrabold text-gray-900">
                        {logs.filter((l) => l.event === 'rejected' || l.event === 'vp_rejected').length}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Total Rejections</div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
                <input
                    className="min-w-[200px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="Search by reference, title, company, or actor…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                >
                    <option value="">All Events</option>
                    <option value="submitted">Submitted</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="vp_rejected">Rejected by VP</option>
                    <option value="on_hold">On Hold</option>
                    <option value="on_process">On Process</option>
                </select>
                {(search || eventFilter) && (
                    <button
                        onClick={() => { setSearch(''); setEventFilter(''); }}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-xl bg-white shadow-sm" style={{ overflow: 'clip' }}>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className={TH}>Timestamp</th>
                                <th className={TH}>Reference</th>
                                <th className={TH}>JL Title</th>
                                <th className={TH}>Company</th>
                                <th className={TH}>Event</th>
                                <th className={TH}>Actor</th>
                                <th className={TH}>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                                        No audit records found.
                                    </td>
                                </tr>
                            )}
                            {filtered.map((log) => (
                                <tr
                                    key={log.id}
                                    className="border-b border-gray-100 hover:bg-gray-50"
                                >
                                    <td className="whitespace-nowrap px-3.5 py-3 text-xs text-gray-500">
                                        {fmtDate(log.created_at)}
                                    </td>
                                    <td className="whitespace-nowrap px-3.5 py-3">
                                        <span className="font-mono text-xs font-bold" style={{ color: '#1e3a5f' }}>
                                            {log.entry?.reference ?? '—'}
                                        </span>
                                    </td>
                                    <td className="max-w-[200px] truncate px-3.5 py-3 font-medium text-gray-800">
                                        {log.entry?.title ?? '—'}
                                    </td>
                                    <td className="whitespace-nowrap px-3.5 py-3 text-gray-600">
                                        {log.entry?.company ?? '—'}
                                    </td>
                                    <td className="whitespace-nowrap px-3.5 py-3">
                                        <EventBadge event={log.event} />
                                    </td>
                                    <td className="whitespace-nowrap px-3.5 py-3 text-gray-600">
                                        {log.actor ?? (
                                            <span className="italic text-gray-400">Public</span>
                                        )}
                                    </td>
                                    <td className="max-w-[220px] px-3.5 py-3 text-xs text-gray-500">
                                        {log.notes ? (
                                            <span className="line-clamp-2">{log.notes}</span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filtered.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-2.5 text-right text-xs text-gray-400">
                        Showing {filtered.length} of {total} events
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
