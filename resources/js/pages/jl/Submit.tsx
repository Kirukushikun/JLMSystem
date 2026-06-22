import AppLayout from '@/layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

const COMPANIES = ['BFC', 'BDL', 'PFC', 'RH', 'Feedmill'];
const DEPTS = ['Operations', 'Finance', 'Human Resources', 'Maintenance', 'Logistics', 'Harvesting', 'Other'];

const INPUT =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            {children}
        </label>
    );
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

export default function Submit() {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(today);
    const [company, setCompany] = useState('');
    const [manager, setManager] = useState('');
    const [dept, setDept] = useState('');
    const [amount, setAmount] = useState('');
    const [submitted, setSubmitted] = useState<string | null>(null);
    const [error, setError] = useState('');

    function handleClear() {
        setTitle(''); setDate(today()); setCompany('');
        setManager(''); setDept(''); setAmount('');
        setError(''); setSubmitted(null);
    }

    function handleSubmit() {
        if (!title || !date || !company || !manager || !dept || !amount) {
            setError('Please fill in all required fields.');
            return;
        }
        setError('');
        // TODO: replace with Inertia router.post('/jl') when backend is wired
        const ref = `JL-00${Math.floor(Math.random() * 9) + 6}-${new Date().getFullYear()}`;
        setSubmitted(ref);
        setTitle(''); setDate(today()); setCompany('');
        setManager(''); setDept(''); setAmount('');
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

            <div className="rounded-xl bg-white p-7 shadow-sm">
                {error && (
                    <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
                )}

                <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                        <Label>JL Title *</Label>
                        <input
                            className={INPUT}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Farm Operation Labor Monitoring — Q2 2026"
                        />
                    </div>

                    <div>
                        <Label>Date Prepared *</Label>
                        <input
                            className={INPUT}
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Company / Farm *</Label>
                        <select className={INPUT} value={company} onChange={(e) => setCompany(e.target.value)}>
                            <option value="">— Select company —</option>
                            {COMPANIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <Label>Farm Manager / Supervisor *</Label>
                        <input
                            className={INPUT}
                            value={manager}
                            onChange={(e) => setManager(e.target.value)}
                            placeholder="Full name"
                        />
                    </div>

                    <div>
                        <Label>Department *</Label>
                        <select className={INPUT} value={dept} onChange={(e) => setDept(e.target.value)}>
                            <option value="">— Select department —</option>
                            {DEPTS.map((d) => <option key={d}>{d}</option>)}
                        </select>
                    </div>

                    <div>
                        <Label>Estimated Amount (JL) *</Label>
                        <input
                            className={INPUT}
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>

                <div className="mt-7 flex justify-end gap-3">
                    <button
                        onClick={handleClear}
                        className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                    >
                        ↺ Clear
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                        style={{ background: '#1e3a5f' }}
                    >
                        ➤ Submit Form
                    </button>
                </div>
            </div>

            {submitted && (
                <div className="mt-5 rounded-xl border-l-4 border-green-500 bg-green-50 p-5">
                    <p className="font-semibold text-green-700">✓ Form submitted successfully!</p>
                    <p className="mt-1.5 text-sm text-green-800">
                        Your submission is now pending review. A serial number will be assigned after VP approval.
                    </p>
                    <p className="mt-1 text-sm text-green-800">
                        Reference: <strong>{submitted}</strong>
                    </p>
                </div>
            )}
        </AppLayout>
    );
}
