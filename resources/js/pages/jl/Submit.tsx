import AppLayout from '@/layouts/AppLayout';
import { Head, useForm, usePage } from '@inertiajs/react';

const COMPANIES = ['BFC', 'BDL', 'PFC', 'RH', 'Feedmill'];
const DEPTS = ['Operations', 'Finance', 'Human Resources', 'Maintenance', 'Logistics', 'Harvesting', 'Other'];

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
    [key: string]: unknown;
}

export default function Submit() {
    const { flash } = usePage<PageProps>().props;

    const form = useForm({
        title:   '',
        date:    new Date().toISOString().slice(0, 10),
        company: '',
        manager: '',
        dept:    '',
        amount:  '',
    });

    function handleSubmit() {
        form.post('/jl', {
            onSuccess: () => form.reset(),
        });
    }

    return (
        <AppLayout>
            <Head title="Submit Form" />

            <div className="mb-7">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
                    JL Monitoring Form
                </h1>
                <p className="mt-1 text-sm text-gray-500">Fill in all required fields and submit for review.</p>
            </div>

            {/* Success banner */}
            {flash.success && (
                <div className="mb-5 rounded-xl border-l-4 border-green-500 bg-green-50 p-5">
                    <p className="font-semibold text-green-700">✓ {flash.success}</p>
                    <p className="mt-1 text-sm text-green-800">
                        Your submission is now pending review. A serial number will be assigned after VP approval.
                    </p>
                </div>
            )}

            <div className="rounded-xl bg-white p-7 shadow-sm">
                {/* Server-side validation errors */}
                {Object.keys(form.errors).length > 0 && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                        {Object.values(form.errors).map((e) => (
                            <p key={e}>{e}</p>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
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
                        <select
                            className={INPUT}
                            value={form.data.company}
                            onChange={(e) => form.setData('company', e.target.value)}
                            disabled={form.processing}
                        >
                            <option value="">— Select company —</option>
                            {COMPANIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
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
                        <select
                            className={INPUT}
                            value={form.data.dept}
                            onChange={(e) => form.setData('dept', e.target.value)}
                            disabled={form.processing}
                        >
                            <option value="">— Select department —</option>
                            {DEPTS.map((d) => <option key={d}>{d}</option>)}
                        </select>
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
                </div>

                <div className="mt-7 flex justify-end gap-3">
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
        </AppLayout>
    );
}
