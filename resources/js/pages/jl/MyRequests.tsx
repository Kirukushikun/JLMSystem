import AppLayout from '@/layouts/AppLayout';
import InfoPanel from '@/components/InfoPanel';
import AttachmentUploadModal from '@/components/jl/AttachmentUploadModal';
import CancelModal from '@/components/jl/CancelModal';
import JlModal from '@/components/jl/JlModal';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/jl/StatusBadge';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import type { JlEntry } from '@/types/jl';

interface Props {
    entries: JlEntry[];
}

function fmtAmt(n: number) {
    return '₱ ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export default function MyRequests({ entries }: Props) {
    const { props } = usePage<{ flash: { success?: string }; [key: string]: unknown }>();
    const [modal, setModal]             = useState<JlEntry | null>(null);
    const [cancelEntry, setCancelEntry] = useState<JlEntry | null>(null);
    const [attachEntry, setAttachEntry] = useState<JlEntry | null>(null);
    const { page, setPage, pageSize, setPageSize, pageItems, totalItems, totalPages } = usePagination(entries);

    function handleCancel(id: number) {
        router.patch(`/jl/${id}/cancel`, {}, {
            preserveScroll: true,
            onSuccess: () => setCancelEntry(null),
        });
    }

    return (
        <AppLayout>
            <Head title="My Requests" />

            <InfoPanel type="help" title="My Requests">
                <p>This is a list of every JL form you've submitted, along with its current status.</p>
                <ul className="mt-2 list-disc pl-4">
                    <li>Click <strong>View</strong> on any row to see full details, including the assigned serial number once approved.</li>
                    <li><strong>Cancel</strong> — pull back a request while it's still Pending, before a reviewer has acted on it.</li>
                    <li><strong>Edit &amp; Resubmit</strong> — fix a cancelled request and send it back for review, keeping the same reference number.</li>
                    <li><strong>Add Attachment</strong> — available on any request that doesn't have a file yet, regardless of its status.</li>
                    <li>Statuses update automatically as your form moves through review, approval, and processing.</li>
                </ul>
            </InfoPanel>

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>My Requests</h1>
                <p className="mt-1 text-sm text-gray-500">Track the status of the JL forms you've submitted.</p>
            </div>

            {props.flash?.success && (
                <div className="mb-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                    {props.flash.success}
                </div>
            )}

            <div className="rounded-xl bg-white shadow-sm" style={{ overflow: 'clip' }}>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                                {['Serial No.', 'JL Title', 'Status', 'Company / Farm', 'Department', 'Manager', 'Cost', 'Date', ''].map((h) => (
                                    <th
                                        key={h}
                                        className="whitespace-nowrap px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                                        You haven't submitted any JL forms yet.
                                    </td>
                                </tr>
                            )}
                            {pageItems.map((e) => (
                                <tr key={e.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-3.5 py-3">
                                        {e.serial ? (
                                            <span className="font-mono text-xs font-bold" style={{ color: '#1e3a5f' }}>
                                                {e.serial}
                                            </span>
                                        ) : (
                                            <span className="text-xs italic text-gray-400">Pending approval</span>
                                        )}
                                    </td>
                                    <td className="max-w-xs truncate whitespace-nowrap px-3.5 py-3 font-medium">{e.title}</td>
                                    <td className="whitespace-nowrap px-3.5 py-3">
                                        <StatusBadge status={e.status} />
                                    </td>
                                    <td className="whitespace-nowrap px-3.5 py-3">{e.company}</td>
                                    <td className="whitespace-nowrap px-3.5 py-3">{e.dept}</td>
                                    <td className="whitespace-nowrap px-3.5 py-3">{e.manager}</td>
                                    <td className="whitespace-nowrap px-3.5 py-3 tabular-nums">{fmtAmt(e.amount)}</td>
                                    <td className="whitespace-nowrap px-3.5 py-3 text-gray-500">{e.date}</td>
                                    <td className="whitespace-nowrap px-3.5 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {e.status === 'Pending' && (
                                                <button
                                                    onClick={() => setCancelEntry(e)}
                                                    className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {e.status === 'Cancelled' && (
                                                <Link
                                                    href={`/jl/${e.id}/edit`}
                                                    className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                                >
                                                    Edit &amp; Resubmit
                                                </Link>
                                            )}
                                            {!e.attachment && (
                                                <button
                                                    onClick={() => setAttachEntry(e)}
                                                    className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                                >
                                                    Add Attachment
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setModal(e)}
                                                className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                            >
                                                View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                />
            </div>

            <JlModal entry={modal} context="purchasing" onClose={() => setModal(null)} />

            <CancelModal
                entry={cancelEntry}
                onClose={() => setCancelEntry(null)}
                onConfirm={handleCancel}
            />

            <AttachmentUploadModal
                entry={attachEntry}
                onClose={() => setAttachEntry(null)}
            />
        </AppLayout>
    );
}
