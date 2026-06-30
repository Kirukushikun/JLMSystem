import AppLayout from '@/layouts/AppLayout';
import InfoPanel from '@/components/InfoPanel';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { UserRole } from '@/types/auth';

type ApiUser = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
};

type LocalUsers = Record<string, { role: UserRole }>;

interface Props {
    apiUsers: ApiUser[];
    localUsers: LocalUsers;
}

const ROLE_LABELS: Record<string, string> = {
    reviewer:   'Reviewer',
    vp:         'VP Approver',
    purchasing: 'Purchasing',
    admin:      'Admin',
    '':         'No Access',
};

const BADGE: Record<string, string> = {
    reviewer:   'bg-blue-100 text-blue-700',
    vp:         'bg-purple-100 text-purple-700',
    purchasing: 'bg-amber-100 text-amber-700',
    admin:      'bg-red-100 text-red-700',
    '':         'bg-gray-100 text-gray-400',
};

function UserRow({
    user,
    localRole,
}: {
    user: ApiUser;
    localRole: string;
}) {
    const [selected, setSelected] = useState(localRole);
    const [busy, setBusy]         = useState(false);

    // Sync when parent data refreshes after Inertia visit
    useEffect(() => {
        setSelected(localRole);
    }, [localRole]);

    const changed  = selected !== localRole;
    const hasAccess = localRole !== '';
    const fullName  = `${user.first_name} ${user.last_name}`;

    function save() {
        if (!selected) return; // treat empty as revoke
        router.post(
            '/admin/users/assign',
            { id: user.id, name: fullName, email: user.email, role: selected },
            { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) },
        );
    }

    function revoke() {
        if (! confirm(`Remove ${fullName}'s access?`)) return;
        router.delete(`/admin/users/${user.id}`, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
        });
    }

    return (
        <tr className="border-t border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-3 text-sm font-medium text-gray-800">{fullName}</td>
            <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
            <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[localRole] ?? BADGE['']}`}>
                    {ROLE_LABELS[localRole] ?? 'No Access'}
                </span>
            </td>
            <td className="px-4 py-3">
                <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    disabled={busy}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                >
                    <option value="">No Access</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="vp">VP Approver</option>
                    <option value="purchasing">Purchasing</option>
                    <option value="admin">Admin</option>
                </select>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    {changed && selected !== '' && (
                        <button
                            onClick={save}
                            disabled={busy}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                            style={{ background: '#1e3a5f' }}
                        >
                            {hasAccess ? 'Update' : 'Grant'}
                        </button>
                    )}
                    {changed && selected === '' && hasAccess && (
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

export default function Users({ apiUsers, localUsers }: Props) {
    const { props } = usePage<{ flash: { success?: string; error?: string }; [key: string]: unknown }>();
    const [search, setSearch] = useState('');

    const filtered = apiUsers.filter(({ first_name, last_name, email }) => {
        const q = search.toLowerCase();
        return ! q || `${first_name} ${last_name} ${email}`.toLowerCase().includes(q);
    });

    const grantedCount = Object.keys(localUsers).length;

    return (
        <AppLayout>
            <Head title="User Management" />

            <InfoPanel type="about" title="User Management">
                <p>Control who has access to the JL Monitoring System and what they can do. All organization employees are loaded from the central HR system.</p>
                <ul className="mt-2 list-disc pl-4">
                    <li><strong>Reviewer</strong> — can view all submitted forms, mark as Reviewed, reject, or put on hold.</li>
                    <li><strong>VP Approver</strong> — sees Reviewed forms; can give final approval, reject, or put on hold.</li>
                    <li><strong>Purchasing</strong> — sees VP-approved forms; can mark as On Process or put on hold.</li>
                    <li><strong>Admin</strong> — full access including User Management, Maintenance, and Audit Trail.</li>
                    <li>Each user can only have one role. Revoking access takes effect immediately.</li>
                </ul>
            </InfoPanel>

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>User Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Grant or revoke system access for organization users. Changes take effect immediately.
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
                    { label: 'Total Org Users',   value: apiUsers.length,  color: '#1e3a5f' },
                    { label: 'With System Access', value: grantedCount,     color: '#16a34a' },
                    { label: 'No Access Yet',      value: apiUsers.length - grantedCount, color: '#9ca3af' },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white p-5 shadow-sm" style={{ borderLeft: `4px solid ${s.color}` }}>
                        <div className="text-3xl font-extrabold text-gray-900">{s.value}</div>
                        <div className="mt-1 text-xs text-gray-500">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table card */}
            <div className="rounded-xl bg-white shadow-sm" style={{ overflow: 'clip' }}>
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
                        No users loaded — check that USER_API_ENDPOINT and USER_API_KEY are set in .env.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Current Access</th>
                                    <th className="px-4 py-3">Assign Role</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((user) => (
                                    <UserRow
                                        key={user.id}
                                        user={user}
                                        localRole={localUsers[user.id]?.role ?? ''}
                                    />
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                                            No users match your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
