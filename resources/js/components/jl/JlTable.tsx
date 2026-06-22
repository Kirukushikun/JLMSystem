import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { JlEntry } from '@/types/jl';
import StatusBadge from './StatusBadge';

interface KebabState {
    entry: JlEntry;
    rect: DOMRect;
}

interface Props {
    entries: JlEntry[];
    context: 'reviewer' | 'vp';
    onView: (entry: JlEntry) => void;
    onCheck: (id: string) => void;
    onApprove: (id: string) => void;
    onReject: (entry: JlEntry) => void;
}

function fmtAmt(n: number) {
    return '₱ ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

const HEADERS = [
    'Serial No.',
    'JL Title',
    'Date',
    'Company / Farm',
    'Manager / Supervisor',
    'Department',
    'Est. Amount',
    'Status',
    'Action',
];

const TH_BASE =
    'whitespace-nowrap px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50';

export default function JlTable({ entries, context, onView, onCheck, onApprove, onReject }: Props) {
    const [kebab, setKebab] = useState<KebabState | null>(null);

    useEffect(() => {
        function close() { setKebab(null); }
        document.addEventListener('click', close);
        document.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('click', close);
            document.removeEventListener('scroll', close, true);
        };
    }, []);

    function toggleKebab(e: React.MouseEvent<HTMLButtonElement>, entry: JlEntry) {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setKebab((prev) => (prev?.entry.id === entry.id ? null : { entry, rect }));
    }

    function canAct(e: JlEntry) {
        return (context === 'reviewer' && e.status === 'Pending') ||
               (context === 'vp' && e.status === 'Checked');
    }

    return (
        <>
            <div className="scrollbar-brand overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                            {HEADERS.map((h, i) => (
                                <th
                                    key={h}
                                    className={cn(
                                        TH_BASE,
                                        i === 0 &&
                                            'sticky left-0 z-[3] [box-shadow:2px_0_5px_rgba(0,0,0,.06)]',
                                        i === HEADERS.length - 1 &&
                                            'sticky right-0 z-[3] [box-shadow:-2px_0_5px_rgba(0,0,0,.06)]',
                                    )}
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
                                    No records found.
                                </td>
                            </tr>
                        )}
                        {entries.map((e) => (
                            <tr
                                key={e.id}
                                className="group border-b border-gray-100 transition hover:bg-gray-50"
                            >
                                {/* ── STICKY FIRST: Serial No. ── */}
                                <td
                                    className={cn(
                                        'sticky left-0 z-[3] whitespace-nowrap px-3.5 py-3',
                                        'bg-white [box-shadow:2px_0_5px_rgba(0,0,0,.06)]',
                                        'group-hover:bg-gray-50',
                                    )}
                                >
                                    {e.serial ? (
                                        <span
                                            className="font-mono text-xs font-bold"
                                            style={{ color: '#1e3a5f' }}
                                        >
                                            {e.serial}
                                        </span>
                                    ) : (
                                        <span className="text-xs italic text-gray-400">
                                            Pending approval
                                        </span>
                                    )}
                                </td>

                                <td className="max-w-xs truncate whitespace-nowrap px-3.5 py-3 font-medium">
                                    {e.title}
                                </td>
                                <td className="whitespace-nowrap px-3.5 py-3 text-gray-500">{e.date}</td>
                                <td className="whitespace-nowrap px-3.5 py-3">{e.company}</td>
                                <td className="whitespace-nowrap px-3.5 py-3">{e.manager}</td>
                                <td className="whitespace-nowrap px-3.5 py-3">{e.dept}</td>
                                <td className="whitespace-nowrap px-3.5 py-3 tabular-nums">
                                    {fmtAmt(e.amount)}
                                </td>
                                <td className="whitespace-nowrap px-3.5 py-3">
                                    <StatusBadge status={e.status} />
                                </td>

                                {/* ── STICKY LAST: Action ── */}
                                <td
                                    className={cn(
                                        'sticky right-0 z-[3] whitespace-nowrap px-3.5 py-3 text-center',
                                        'bg-white [box-shadow:-2px_0_5px_rgba(0,0,0,.06)]',
                                        'group-hover:bg-gray-50',
                                    )}
                                >
                                    <button
                                        onClick={(ev) => toggleKebab(ev, e)}
                                        className="rounded-md border border-gray-200 px-2.5 py-1 text-base text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                                    >
                                        ⋮
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Kebab menu — position:fixed escapes all overflow/stacking containers */}
            {kebab && (
                <div
                    style={{
                        position: 'fixed',
                        top: kebab.rect.bottom + 6,
                        right: window.innerWidth - kebab.rect.right,
                        zIndex: 9999,
                    }}
                    className="min-w-[160px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                >
                    <KebabItem onClick={() => { onView(kebab.entry); setKebab(null); }}>
                        👁 View Details
                    </KebabItem>
                    {canAct(kebab.entry) && (
                        <>
                            <div className="mx-1 h-px bg-gray-100" />
                            {context === 'reviewer' ? (
                                <KebabItem
                                    color="green"
                                    onClick={() => { onCheck(kebab.entry.id); setKebab(null); }}
                                >
                                    ✓ Mark as Checked
                                </KebabItem>
                            ) : (
                                <KebabItem
                                    color="green"
                                    onClick={() => { onApprove(kebab.entry.id); setKebab(null); }}
                                >
                                    ✓ Approve
                                </KebabItem>
                            )}
                            <KebabItem
                                color="red"
                                onClick={() => { onReject(kebab.entry); setKebab(null); }}
                            >
                                ✕ Reject
                            </KebabItem>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

function KebabItem({
    children,
    onClick,
    color,
}: {
    children: React.ReactNode;
    onClick: () => void;
    color?: 'red' | 'green';
}) {
    const cls =
        color === 'red'
            ? 'text-red-600 hover:bg-red-50'
            : color === 'green'
              ? 'text-green-700 hover:bg-green-50'
              : 'text-gray-700 hover:bg-gray-50';
    return (
        <button
            onClick={onClick}
            className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm ${cls}`}
        >
            {children}
        </button>
    );
}
