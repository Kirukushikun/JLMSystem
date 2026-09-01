import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import InfoPanel from '@/components/InfoPanel';
import Pagination from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';
import AppLayout from '@/layouts/AppLayout';
import type { UserRole } from '@/types/auth';

type ApiUser = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
};

type LocalUsers = Record<
    string,
    { roles: UserRole[]; company: string | null; dept: string | null }
>;

interface Props {
    apiUsers: ApiUser[];
    localUsers: LocalUsers;
    companies: string[];
    departments: string[];
}

const ROLE_LABELS: Record<string, string> = {
    reviewer: 'Reviewer',
    vp: 'VP Approver',
    purchasing: 'Purchasing',
    purchasing_viewer: 'Purchasing (View Only)',
    division_head: 'Division Head',
    admin: 'Admin',
    requestor: 'Requestor',
    '': 'No Access',
};

const BADGE: Record<string, string> = {
    reviewer: 'bg-blue-100 text-blue-700',
    vp: 'bg-purple-100 text-purple-700',
    purchasing: 'bg-amber-100 text-amber-700',
    purchasing_viewer: 'bg-amber-50 text-amber-600',
    division_head: 'bg-indigo-100 text-indigo-700',
    admin: 'bg-red-100 text-red-700',
    requestor: 'bg-teal-100 text-teal-700',
    '': 'bg-gray-100 text-gray-400',
};

const ASSIGNABLE_ROLES: UserRole[] = [
    'requestor',
    'division_head',
    'reviewer',
    'vp',
    'purchasing',
    'purchasing_viewer',
    'admin',
];

function sameRoles(a: string[], b: string[]) {
    return a.length === b.length && a.every((r) => b.includes(r));
}

function UserRow({
    user,
    localRoles,
    localCompany,
    localDept,
    companies,
    departments,
}: {
    user: ApiUser;
    localRoles: string[];
    localCompany: string | null;
    localDept: string | null;
    companies: string[];
    departments: string[];
}) {
    const [selected, setSelected] = useState<string[]>(localRoles);
    const [company, setCompany] = useState(localCompany ?? '');
    const [dept, setDept] = useState(localDept ?? '');
    const [busy, setBusy] = useState(false);

    // Sync when parent data refreshes after Inertia visit
    useEffect(() => {
        setSelected(localRoles);
        setCompany(localCompany ?? '');
        setDept(localDept ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localRoles.join(','), localCompany, localDept]);

    const isRequestor = selected.includes('requestor');
    const isDivisionHead = selected.includes('division_head');
    const needsDept = isRequestor || isDivisionHead;
    const changed =
        !sameRoles(selected, localRoles) ||
        (isRequestor && company !== (localCompany ?? '')) ||
        (needsDept && dept !== (localDept ?? ''));
    const hasAccess = localRoles.length > 0;
    const fullName = `${user.first_name} ${user.last_name}`;

    function toggleRole(role: string) {
        setSelected((prev) =>
            prev.includes(role)
                ? prev.filter((r) => r !== role)
                : [...prev, role],
        );
    }

    function save() {
        if (selected.length === 0) {
            return;
        } // treat empty as revoke

        router.post(
            '/admin/users/assign',
            {
                id: user.id,
                name: fullName,
                email: user.email,
                roles: selected,
                company: isRequestor ? company : null,
                dept: needsDept ? dept : null,
            },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
            },
        );
    }

    function revoke() {
        if (!confirm(`Remove ${fullName}'s access?`)) {
            return;
        }

        router.delete(`/admin/users/${user.id}`, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
        });
    }

    return (
        <tr className="border-t border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-3 text-sm font-medium text-gray-800">
                {fullName}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
            <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                    {hasAccess ? (
                        localRoles.map((r) => (
                            <span
                                key={r}
                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[r] ?? BADGE['']}`}
                            >
                                {ROLE_LABELS[r] ?? r}
                            </span>
                        ))
                    ) : (
                        <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE['']}`}
                        >
                            No Access
                        </span>
                    )}
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {ASSIGNABLE_ROLES.map((r) => (
                            <label
                                key={r}
                                className="flex items-center gap-1.5 text-xs text-gray-600"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(r)}
                                    onChange={() => toggleRole(r)}
                                    disabled={busy}
                                />
                                {ROLE_LABELS[r]}
                            </label>
                        ))}
                    </div>
                    {isRequestor && (
                        <select
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            disabled={busy}
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 disabled:opacity-50"
                        >
                            <option value="">— Farm —</option>
                            {companies.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    )}
                    {needsDept && (
                        <select
                            value={dept}
                            onChange={(e) => setDept(e.target.value)}
                            disabled={busy}
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 disabled:opacity-50"
                        >
                            <option value="">— Department —</option>
                            {departments.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    {changed && selected.length > 0 && (
                        <button
                            onClick={save}
                            disabled={
                                busy ||
                                (isRequestor && !company) ||
                                (needsDept && !dept)
                            }
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                            style={{ background: '#1e3a5f' }}
                        >
                            {hasAccess ? 'Update' : 'Grant'}
                        </button>
                    )}
                    {changed && selected.length === 0 && hasAccess && (
                        <button
                            onClick={revoke}
                            disabled={busy}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                            Revoke
                        </button>
                    )}
                    {!changed && hasAccess && (
                        <button
                            onClick={revoke}
                            disabled={busy}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                            Revoke
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

export default function Users({
    apiUsers,
    localUsers,
    companies,
    departments,
}: Props) {
    const { props } = usePage<{
        flash: { success?: string; error?: string };
        [key: string]: unknown;
    }>();
    const [search, setSearch] = useState('');

    const filtered = apiUsers.filter(({ first_name, last_name, email }) => {
        const q = search.toLowerCase();

        return (
            !q ||
            `${first_name} ${last_name} ${email}`.toLowerCase().includes(q)
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

    const grantedCount = Object.keys(localUsers).length;

    return (
        <AppLayout>
            <Head title="User Management" />

            <InfoPanel type="about" title="User Management">
                <p>
                    Control who has access to the JL Monitoring System and what
                    they can do. All organization employees are loaded from the
                    central HR system.
                </p>
                <ul className="mt-2 list-disc pl-4">
                    <li>
                        <strong>Requestor</strong> — can submit JL forms and
                        view the status of their own requests. Requires a Farm
                        and Department, which get locked into their submit form
                        automatically.
                    </li>
                    <li>
                        <strong>Division Head</strong> — the first approval
                        step, one stage before Reviewer. Only sees and acts on
                        requests from their own Department (Endorse, Reject, or
                        put on Hold). Requires a Department.
                    </li>
                    <li>
                        <strong>Reviewer</strong> — sees Division-Head-endorsed
                        forms across every department, mark as Reviewed, reject,
                        or put on hold.
                    </li>
                    <li>
                        <strong>VP Approver</strong> — sees Reviewed forms; can
                        give final approval, reject, or put on hold.
                    </li>
                    <li>
                        <strong>Purchasing</strong> — sees VP-approved forms;
                        can mark as On Process or put on hold.
                    </li>
                    <li>
                        <strong>Purchasing (View Only)</strong> — sees the same
                        VP-approved forms as Purchasing, but cannot change
                        status; useful for auditors or oversight staff who only
                        need visibility.
                    </li>
                    <li>
                        <strong>Admin</strong> — full access including User
                        Management, Maintenance, and Audit Trail.
                    </li>
                    <li>
                        A user can hold more than one role at once (e.g.
                        Requestor + Purchasing) — check every box that applies.
                        Revoking access takes effect immediately.
                    </li>
                </ul>
            </InfoPanel>

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
                    User Management
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Grant or revoke system access for organization users.
                    Changes take effect immediately.
                </p>
            </div>

            {/* Flash */}
            {props.flash?.success && (
                <div className="mb-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                    {props.flash.success}
                </div>
            )}
            {props.flash?.error && (
                <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    {props.flash.error}
                </div>
            )}

            {/* Stats */}
            <div className="mb-6 grid grid-cols-3 gap-4">
                {[
                    {
                        label: 'Total Org Users',
                        value: apiUsers.length,
                        color: '#1e3a5f',
                    },
                    {
                        label: 'With System Access',
                        value: grantedCount,
                        color: '#16a34a',
                    },
                    {
                        label: 'No Access Yet',
                        value: apiUsers.length - grantedCount,
                        color: '#9ca3af',
                    },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="rounded-xl bg-white p-5 shadow-sm"
                        style={{ borderLeft: `4px solid ${s.color}` }}
                    >
                        <div className="text-3xl font-extrabold text-gray-900">
                            {s.value}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Table card */}
            <div
                className="rounded-xl bg-white shadow-sm"
                style={{ overflow: 'clip' }}
            >
                <div className="border-b border-gray-100 px-5 py-4">
                    <input
                        className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                        placeholder="Search by name or email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {apiUsers.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-400">
                        No users loaded — check that USER_API_ENDPOINT and
                        USER_API_KEY are set in .env.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-400 uppercase">
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">
                                        Current Access
                                    </th>
                                    <th className="px-4 py-3">Assign Role</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((user) => (
                                    <UserRow
                                        key={user.id}
                                        user={user}
                                        localRoles={
                                            localUsers[user.id]?.roles ?? []
                                        }
                                        localCompany={
                                            localUsers[user.id]?.company ?? null
                                        }
                                        localDept={
                                            localUsers[user.id]?.dept ?? null
                                        }
                                        companies={companies}
                                        departments={departments}
                                    />
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-10 text-center text-sm text-gray-400"
                                        >
                                            No users match your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                />
            </div>
        </AppLayout>
    );
}
