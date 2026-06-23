import AppLayout from '@/layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';

interface Company {
    id: number;
    name: string;
    code: string;
}

interface Department {
    id: number;
    name: string;
}

interface PageProps {
    companies: Company[];
    departments: Department[];
    flash: { success?: string; error?: string };
    [key: string]: unknown;
}

const INPUT =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60';

export default function Maintenance() {
    const { companies, departments, flash } = usePage<PageProps>().props;

    const companyForm = useForm({ name: '', code: '' });
    const deptForm    = useForm({ name: '' });

    function addCompany() {
        companyForm.post('/admin/maintenance/companies', {
            preserveScroll: true,
            onSuccess: () => companyForm.reset(),
        });
    }

    function removeCompany(id: number, name: string) {
        if (!confirm(`Remove "${name}"? This cannot be undone.`)) return;
        router.delete(`/admin/maintenance/companies/${id}`, { preserveScroll: true });
    }

    function addDept() {
        deptForm.post('/admin/maintenance/departments', {
            preserveScroll: true,
            onSuccess: () => deptForm.reset(),
        });
    }

    function removeDept(id: number, name: string) {
        if (!confirm(`Remove "${name}"? This cannot be undone.`)) return;
        router.delete(`/admin/maintenance/departments/${id}`, { preserveScroll: true });
    }

    return (
        <AppLayout>
            <Head title="Maintenance" />

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Maintenance</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage the companies and departments available in the submit form.
                </p>
            </div>

            {(flash.success || flash.error) && (
                <div
                    className={`mb-5 rounded-xl border-l-4 p-4 text-sm font-medium ${
                        flash.success
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                    }`}
                >
                    {flash.success ?? flash.error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* ── Companies ── */}
                <div className="rounded-xl bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-4">
                        <h2 className="font-semibold" style={{ color: '#1e3a5f' }}>Company / Farm</h2>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Shown in the submit form dropdown. The serial code is used when generating JL serial numbers.
                        </p>
                    </div>

                    <div className="p-5">
                        {companies.length === 0 ? (
                            <p className="py-4 text-center text-sm text-gray-400">No companies added yet.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                            Name
                                        </th>
                                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                            Serial Code
                                        </th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map((c) => (
                                        <tr key={c.id} className="border-b border-gray-50 last:border-0">
                                            <td className="py-2.5 font-medium">{c.name}</td>
                                            <td className="py-2.5 font-mono text-xs text-gray-500">{c.code}</td>
                                            <td className="py-2.5 text-right">
                                                <button
                                                    onClick={() => removeCompany(c.id, c.name)}
                                                    className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div className="mt-4 border-t border-gray-100 pt-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Add Company
                            </p>
                            <div className="flex gap-2">
                                <input
                                    className={`${INPUT} flex-1`}
                                    placeholder="Name (e.g. BFC)"
                                    value={companyForm.data.name}
                                    onChange={(e) => companyForm.setData('name', e.target.value)}
                                    disabled={companyForm.processing}
                                    onKeyDown={(e) => e.key === 'Enter' && addCompany()}
                                />
                                <input
                                    className={`${INPUT} w-24`}
                                    placeholder="Code"
                                    value={companyForm.data.code}
                                    onChange={(e) =>
                                        companyForm.setData('code', e.target.value.toUpperCase())
                                    }
                                    disabled={companyForm.processing}
                                    maxLength={10}
                                    onKeyDown={(e) => e.key === 'Enter' && addCompany()}
                                />
                                <button
                                    onClick={addCompany}
                                    disabled={companyForm.processing}
                                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                                    style={{ background: '#1e3a5f' }}
                                >
                                    Add
                                </button>
                            </div>
                            {(companyForm.errors.name || companyForm.errors.code) && (
                                <p className="mt-1.5 text-xs text-red-500">
                                    {companyForm.errors.name ?? companyForm.errors.code}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Departments ── */}
                <div className="rounded-xl bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-4">
                        <h2 className="font-semibold" style={{ color: '#1e3a5f' }}>Department</h2>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Shown in the submit form dropdown.
                        </p>
                    </div>

                    <div className="p-5">
                        {departments.length === 0 ? (
                            <p className="py-4 text-center text-sm text-gray-400">No departments added yet.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                                            Name
                                        </th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {departments.map((d) => (
                                        <tr key={d.id} className="border-b border-gray-50 last:border-0">
                                            <td className="py-2.5 font-medium">{d.name}</td>
                                            <td className="py-2.5 text-right">
                                                <button
                                                    onClick={() => removeDept(d.id, d.name)}
                                                    className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div className="mt-4 border-t border-gray-100 pt-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Add Department
                            </p>
                            <div className="flex gap-2">
                                <input
                                    className={`${INPUT} flex-1`}
                                    placeholder="Department name"
                                    value={deptForm.data.name}
                                    onChange={(e) => deptForm.setData('name', e.target.value)}
                                    disabled={deptForm.processing}
                                    onKeyDown={(e) => e.key === 'Enter' && addDept()}
                                />
                                <button
                                    onClick={addDept}
                                    disabled={deptForm.processing}
                                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                                    style={{ background: '#1e3a5f' }}
                                >
                                    Add
                                </button>
                            </div>
                            {deptForm.errors.name && (
                                <p className="mt-1.5 text-xs text-red-500">{deptForm.errors.name}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
