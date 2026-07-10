import AppLayout from '@/layouts/AppLayout';
import InfoPanel from '@/components/InfoPanel';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

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

const FILE_INPUT =
    'flex-1 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 outline-none file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-gray-600 hover:file:bg-gray-200 disabled:opacity-60';

function ImportExportRow({
    label,
    exportHref,
    file,
    onFileChange,
    onImport,
    processing,
    error,
    fileKey,
}: {
    label: string;
    exportHref: string;
    file: File | null;
    onFileChange: (f: File | null) => void;
    onImport: () => void;
    processing: boolean;
    error?: string;
    fileKey: number;
}) {
    return (
        <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Import / Export
            </p>
            <div className="flex flex-wrap items-center gap-2">
                <a
                    href={exportHref}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                    ⬇ Export CSV
                </a>
                <input
                    key={fileKey}
                    type="file"
                    accept=".csv,text/csv"
                    className={FILE_INPUT}
                    disabled={processing}
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
                <button
                    onClick={onImport}
                    disabled={processing || !file}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                    ⬆ Import {label}
                </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export default function Maintenance() {
    const { companies, departments, flash } = usePage<PageProps>().props;

    const companyForm = useForm({ name: '', code: '' });
    const deptForm    = useForm({ name: '' });

    const companyImportForm = useForm<{ file: File | null }>({ file: null });
    const deptImportForm    = useForm<{ file: File | null }>({ file: null });
    const jlImportForm      = useForm<{ file: File | null }>({ file: null });

    const [companyFileKey, setCompanyFileKey] = useState(0);
    const [deptFileKey, setDeptFileKey]        = useState(0);
    const [jlFileKey, setJlFileKey]            = useState(0);

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

    function importCompanies() {
        companyImportForm.post('/admin/maintenance/companies/import', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { companyImportForm.reset(); setCompanyFileKey((k) => k + 1); },
        });
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

    function importDepartments() {
        deptImportForm.post('/admin/maintenance/departments/import', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { deptImportForm.reset(); setDeptFileKey((k) => k + 1); },
        });
    }

    function importJlEntries() {
        jlImportForm.post('/admin/maintenance/jl-entries/import', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { jlImportForm.reset(); setJlFileKey((k) => k + 1); },
        });
    }

    return (
        <AppLayout>
            <Head title="Maintenance" />

            <InfoPanel type="about" title="Maintenance">
                <p>Manage the dynamic lookup values used across the system. Changes here are reflected immediately in the submission form.</p>
                <ul className="mt-2 list-disc pl-4">
                    <li><strong>Companies / Farms</strong> — each entry has a name and a short serial code (e.g. BFC) used when generating JL serial numbers on approval.</li>
                    <li><strong>Departments</strong> — the list of departments selectable on the submission form.</li>
                    <li>Entries that are already referenced by existing JL forms cannot be deleted to protect data integrity.</li>
                    <li><strong>Import / Export</strong> — each section can export its data as CSV and re-import it, useful when redeploying the system to a new server. See <strong>JL Entries — Redeployment Import</strong> below for bulk-loading historical records.</li>
                </ul>
            </InfoPanel>

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
                            <div className="max-h-72 overflow-y-auto">
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
                            </div>
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

                        <ImportExportRow
                            label="Companies"
                            exportHref="/admin/maintenance/companies/export"
                            file={companyImportForm.data.file}
                            onFileChange={(f) => companyImportForm.setData('file', f)}
                            onImport={importCompanies}
                            processing={companyImportForm.processing}
                            error={companyImportForm.errors.file}
                            fileKey={companyFileKey}
                        />
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
                            <div className="max-h-72 overflow-y-auto">
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
                            </div>
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

                        <ImportExportRow
                            label="Departments"
                            exportHref="/admin/maintenance/departments/export"
                            file={deptImportForm.data.file}
                            onFileChange={(f) => deptImportForm.setData('file', f)}
                            onImport={importDepartments}
                            processing={deptImportForm.processing}
                            error={deptImportForm.errors.file}
                            fileKey={deptFileKey}
                        />
                    </div>
                </div>
            </div>

            {/* ── JL Entries (historical data / redeployment) ── */}
            <div className="mt-6 rounded-xl bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                    <h2 className="font-semibold" style={{ color: '#1e3a5f' }}>JL Entries — Redeployment Import / Export</h2>
                    <p className="mt-0.5 text-xs text-gray-400">
                        Export every JL entry as CSV (all statuses, no filtering) to seed a new deployment, or bulk-import
                        that same CSV here when setting up this system on a new server. Make sure every Company and
                        Department referenced in the file already exists above before importing.
                    </p>
                </div>

                <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href="/jl/export"
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                            ⬇ Export CSV
                        </a>
                        <input
                            key={jlFileKey}
                            type="file"
                            accept=".csv,text/csv"
                            className={FILE_INPUT}
                            disabled={jlImportForm.processing}
                            onChange={(e) => jlImportForm.setData('file', e.target.files?.[0] ?? null)}
                        />
                        <button
                            onClick={importJlEntries}
                            disabled={jlImportForm.processing || !jlImportForm.data.file}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                            style={{ background: '#1e3a5f' }}
                        >
                            {jlImportForm.processing ? 'Importing…' : '⬆ Import JL Entries'}
                        </button>
                    </div>
                    {jlImportForm.errors.file && (
                        <p className="mt-1.5 text-xs text-red-500">{jlImportForm.errors.file}</p>
                    )}
                    <p className="mt-3 text-xs text-gray-400">
                        Only run the import on a fresh deployment — importing the same file twice will create duplicate
                        entries. Reference numbers are regenerated from the new row IDs; assigned Serial Numbers are
                        preserved as-is.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
