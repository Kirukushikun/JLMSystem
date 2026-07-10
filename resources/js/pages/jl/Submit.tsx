import AppLayout from '@/layouts/AppLayout';
import InfoPanel from '@/components/InfoPanel';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { Auth } from '@/types/auth';

const INPUT =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60';

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            {children}
        </label>
    );
}

interface PageProps {
    flash: { success?: string };
    companies: Array<{ id: number; name: string }>;
    departments: Array<{ id: number; name: string }>;
    auth: Auth;
    [key: string]: unknown;
}

export default function Submit() {
    const { flash, companies, departments, auth } = usePage<PageProps>().props;
    const [fileKey, setFileKey] = useState(0);

    const isRequestor = auth.user.role === 'requestor';

    const form = useForm({
        title:      '',
        date:       new Date().toISOString().slice(0, 10),
        company:    isRequestor ? (auth.user.company ?? '') : '',
        manager:    '',
        dept:       isRequestor ? (auth.user.dept ?? '') : '',
        amount:     '',
        attachment: null as File | null,
    });

    function handleSubmit() {
        form.post('/jl', {
            forceFormData: true,
            onSuccess: () => { form.reset(); setFileKey((k) => k + 1); },
        });
    }

    return (
        <AppLayout>
            <Head title="Submit Form" />

            <InfoPanel type="help" title="Submitting a JL Form">
                <p>Fill in all required fields and click <strong>Submit Form</strong> when ready. Your entry will be queued for reviewer approval.</p>
                <ul className="mt-2 list-disc pl-4">
                    <li><strong>Title</strong> — brief description of the job labor cost.</li>
                    <li><strong>Date Prepared</strong> — the date the cost was incurred.</li>
                    <li>
                        <strong>Company / Farm</strong> and <strong>Department</strong> —{' '}
                        {isRequestor ? 'pre-filled from your account and locked to prevent mistakes.' : 'select from the available options.'}
                    </li>
                    <li><strong>Manager / Supervisor</strong> — name of the person responsible.</li>
                    <li><strong>Estimated Amount</strong> — must be greater than zero.</li>
                    <li><strong>Attachment</strong> — optional supporting document (PDF, image, or Office file, max 10 MB).</li>
                </ul>
                <p className="mt-2">After submission you will receive a reference number. A serial number is only assigned once the VP approves.</p>
            </InfoPanel>

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
                    JL Monitoring Form
                </h1>
                <p className="mt-1 text-sm text-gray-500">Fill in all required fields and submit for review.</p>
            </div>

            {flash.success && (
                <div className="mb-5 rounded-xl border-l-4 border-green-500 bg-green-50 p-5">
                    <p className="font-semibold text-green-700"><i class="fa-solid fa-check"></i> {flash.success}</p>
                    <p className="mt-1 text-sm text-green-800">
                        Your submission is now pending review. A serial number will be assigned after VP approval.
                    </p>
                </div>
            )}

            <div className="rounded-xl bg-white p-4 sm:p-7 shadow-sm">
                {Object.keys(form.errors).length > 0 && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                        {Object.values(form.errors).map((e) => (
                            <p key={e}>{e}</p>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                        <Label>JL Title *</Label>
                        <input
                            className={INPUT}
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            placeholder="e.g. Farm Operation Labor Monitoring — Q2 2026"
                            disabled={form.processing}
                        />
                    </div>

                    <div>
                        <Label>Date Prepared *</Label>
                        <input
                            className={INPUT}
                            type="date"
                            value={form.data.date}
                            onChange={(e) => form.setData('date', e.target.value)}
                            disabled={form.processing}
                        />
                    </div>

                    <div>
                        <Label>Company / Farm *</Label>
                        {isRequestor ? (
                            <input className={INPUT} value={form.data.company} disabled />
                        ) : (
                            <select
                                className={INPUT}
                                value={form.data.company}
                                onChange={(e) => form.setData('company', e.target.value)}
                                disabled={form.processing}
                            >
                                <option value="">— Select company —</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <Label>Farm Manager / Supervisor *</Label>
                        <input
                            className={INPUT}
                            value={form.data.manager}
                            onChange={(e) => form.setData('manager', e.target.value)}
                            placeholder="Full name"
                            disabled={form.processing}
                        />
                    </div>

                    <div>
                        <Label>Department *</Label>
                        {isRequestor ? (
                            <input className={INPUT} value={form.data.dept} disabled />
                        ) : (
                            <select
                                className={INPUT}
                                value={form.data.dept}
                                onChange={(e) => form.setData('dept', e.target.value)}
                                disabled={form.processing}
                            >
                                <option value="">— Select department —</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <Label>Estimated Amount (JL) *</Label>
                        <input
                            className={INPUT}
                            type="number"
                            value={form.data.amount}
                            onChange={(e) => form.setData('amount', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            disabled={form.processing}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Supporting Document (optional)</Label>
                        <input
                            key={fileKey}
                            className={INPUT + ' file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-gray-600 hover:file:bg-gray-200'}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => form.setData('attachment', e.target.files?.[0] ?? null)}
                            disabled={form.processing}
                        />
                        <p className="mt-1 text-xs text-gray-400">PDF, image, or Office document — max 10 MB</p>
                        {form.errors.attachment && (
                            <p className="mt-1 text-xs text-red-500">{form.errors.attachment}</p>
                        )}
                    </div>
                </div>

                <div className="mt-7 flex justify-end gap-4">
                    <div className="flex gap-3">
                        <button
                            onClick={() => form.reset()}
                            disabled={form.processing}
                            className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                        >
                            ↺ Clear
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={form.processing}
                            className="rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                            style={{ background: '#1e3a5f' }}
                        >
                            {form.processing ? 'Submitting…' : '➤ Submit Form'}
                        </button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
