import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import InfoPanel from '@/components/InfoPanel';
import CostBreakdownTable, {
    newCostRow,
} from '@/components/jl/CostBreakdownTable';
import type { CostRow } from '@/components/jl/CostBreakdownTable';
import ItemsTable, { newItemRow } from '@/components/jl/ItemsTable';
import type { JlItemRow } from '@/components/jl/ItemsTable';
import StructuredSummaryModal from '@/components/jl/StructuredSummaryModal';
import SubmitSummaryModal from '@/components/jl/SubmitSummaryModal';
import AppLayout from '@/layouts/AppLayout';
import type { Auth } from '@/types/auth';
import type { JlEntry } from '@/types/jl';

type Mode = 'document' | 'structured';

const INPUT =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60';

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
            {children}
        </label>
    );
}

interface PageProps {
    flash: { success?: string };
    companies: Array<{ id: number; name: string }>;
    departments: Array<{ id: number; name: string }>;
    auth: Auth;
    editEntry?: JlEntry;
    [key: string]: unknown;
}

export default function Submit() {
    const { flash, companies, departments, auth, editEntry } =
        usePage<PageProps>().props;
    const [fileKey, setFileKey] = useState(0);
    const [showSummary, setShowSummary] = useState(false);

    const isRequestor = auth.user.roles.includes('requestor');
    const isEdit = !!editEntry;

    const [mode, setMode] = useState<Mode>(
        editEntry?.entry_type === 'structured' ? 'structured' : 'document',
    );

    const form = useForm({
        title: editEntry?.title ?? '',
        date: editEntry?.date ?? new Date().toISOString().slice(0, 10),
        company:
            editEntry?.company ??
            (isRequestor ? (auth.user.company ?? '') : ''),
        manager: editEntry?.manager ?? '',
        dept: editEntry?.dept ?? (isRequestor ? (auth.user.dept ?? '') : ''),
        amount: editEntry ? String(editEntry.amount) : '',
        attachment: null as File | null,
    });

    // Structured-entry mode. Kept as separate local state (not Inertia's
    // useForm) since it's posted with `router.post` directly — see
    // doStructuredSubmit().
    function defaultStructuredState() {
        return {
            subject: editEntry?.title ?? '',
            structCompany:
                editEntry?.company ??
                (isRequestor ? (auth.user.company ?? '') : ''),
            structDept:
                editEntry?.dept ?? (isRequestor ? (auth.user.dept ?? '') : ''),
            structManager: editEntry?.manager ?? '',
            dateNeeded: editEntry?.date ?? '',
            body: editEntry?.body ?? '',
            reason: editEntry?.justification ?? '',
            items:
                editEntry?.items && editEntry.items.length > 0
                    ? editEntry.items.map((i) => ({
                          id: crypto.randomUUID(),
                          itemName: i.item_name,
                          quantity: i.quantity,
                          purpose: i.purpose,
                          // Existing images stay on the server unless a new
                          // one is picked — a File can't be rehydrated from
                          // a stored URL, so this starts blank on edit.
                          image: null as File | null,
                      }))
                    : [newItemRow()],
            costRows:
                editEntry?.cost_breakdown && editEntry.cost_breakdown.length > 0
                    ? editEntry.cost_breakdown.map((r) => ({
                          id: crypto.randomUUID(),
                          description: r.description,
                          quantity: r.quantity,
                          unitCost: r.unit_cost,
                      }))
                    : [newCostRow()],
        };
    }

    const structDefaults = defaultStructuredState();
    const [subject, setSubject] = useState(structDefaults.subject);
    const [structCompany, setStructCompany] = useState(
        structDefaults.structCompany,
    );
    const [structDept, setStructDept] = useState(structDefaults.structDept);
    const [structManager, setStructManager] = useState(
        structDefaults.structManager,
    );
    const [dateNeeded, setDateNeeded] = useState(structDefaults.dateNeeded);
    const [body, setBody] = useState(structDefaults.body);
    const [reason, setReason] = useState(structDefaults.reason);
    const [items, setItems] = useState<JlItemRow[]>(structDefaults.items);
    const [costRows, setCostRows] = useState<CostRow[]>(
        structDefaults.costRows,
    );
    const [showStructuredSummary, setShowStructuredSummary] = useState(false);
    const [structProcessing, setStructProcessing] = useState(false);
    const [structErrors, setStructErrors] = useState<Record<string, string>>(
        {},
    );

    function resetStructured() {
        const defaults = defaultStructuredState();
        setSubject(defaults.subject);
        setStructCompany(defaults.structCompany);
        setStructDept(defaults.structDept);
        setStructManager(defaults.structManager);
        setDateNeeded(defaults.dateNeeded);
        setBody(defaults.body);
        setReason(defaults.reason);
        setItems(defaults.items);
        setCostRows(defaults.costRows);
    }

    function doStructuredSubmit() {
        const payload = {
            entry_type: 'structured',
            subject,
            company: structCompany,
            dept: structDept,
            manager: structManager,
            date_needed: dateNeeded,
            body,
            justification: reason,
            items: items
                .filter((i) => i.itemName.trim() !== '')
                .map((i) => ({
                    item_name: i.itemName,
                    quantity: i.quantity,
                    purpose: i.purpose,
                    image: i.image,
                })),
            cost_breakdown: costRows
                .filter((r) => r.description.trim() !== '')
                .map((r) => ({
                    description: r.description,
                    quantity: r.quantity,
                    unit_cost: r.unitCost,
                })),
        };

        const url = isEdit ? `/jl/${editEntry!.id}/resubmit` : '/jl';
        const data = isEdit ? { ...payload, _method: 'patch' } : payload;

        router.post(url, data, {
            forceFormData: true,
            onStart: () => setStructProcessing(true),
            onFinish: () => setStructProcessing(false),
            onSuccess: () => {
                setShowStructuredSummary(false);
                setStructErrors({});

                if (!isEdit) {
                    resetStructured();
                }
            },
            onError: (errors) => {
                setStructErrors(errors as Record<string, string>);
                setShowStructuredSummary(false);
            },
        });
    }

    function doSubmit() {
        if (isEdit) {
            // PHP never parses multipart/form-data bodies on PATCH/PUT/DELETE — only
            // on POST. So this must go out as a real POST with a _method override
            // field; Laravel then routes it to the PATCH handler while still parsing
            // the file upload correctly.
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(`/jl/${editEntry!.id}/resubmit`, {
                forceFormData: true,
                onSuccess: () => setShowSummary(false),
            });
        } else {
            form.post('/jl', {
                forceFormData: true,
                onSuccess: () => {
                    form.reset();
                    setFileKey((k) => k + 1);
                    setShowSummary(false);
                },
            });
        }
    }

    return (
        <AppLayout>
            <Head title={isEdit ? 'Edit & Resubmit' : 'Submit Form'} />

            <InfoPanel
                type="help"
                title={
                    isEdit
                        ? 'Editing a Cancelled Request'
                        : 'Submitting a JL Form'
                }
            >
                {isEdit ? (
                    <p>
                        You're correcting{' '}
                        <strong>{editEntry!.reference}</strong>. Fix whatever
                        was wrong and resubmit — it keeps the same reference
                        number and goes back into the review queue as Pending.
                    </p>
                ) : (
                    <p>
                        Choose whether you have a prepared JL document to
                        upload, or want to fill in the details directly — then
                        click <strong>Submit Form</strong> when ready. Your
                        entry will be queued for reviewer approval.
                    </p>
                )}
                {mode === 'document' ? (
                    <ul className="mt-2 list-disc pl-4">
                        <li>
                            <strong>Title</strong> — brief description of the
                            job labor cost.
                        </li>
                        <li>
                            <strong>Date Prepared</strong> — the date the cost
                            was incurred.
                        </li>
                        <li>
                            <strong>Company / Farm</strong> —{' '}
                            {isRequestor
                                ? 'pre-filled from your account, but you can pick a different farm if this request is for one.'
                                : 'select from the available options.'}
                        </li>
                        <li>
                            <strong>Department</strong> —{' '}
                            {isRequestor
                                ? 'pre-filled from your account and locked to prevent mistakes.'
                                : 'select from the available options.'}
                        </li>
                        <li>
                            <strong>Manager / Supervisor</strong> — name of the
                            person responsible.
                        </li>
                        <li>
                            <strong>Estimated Amount</strong> — must be greater
                            than zero.
                        </li>
                        <li>
                            <strong>Attachment</strong> — optional supporting
                            document (PDF, image, or Office file, max 10 MB).
                        </li>
                        <li>
                            Before submitting you'll see a quick summary to
                            review — catch mistakes there before they go out.
                        </li>
                    </ul>
                ) : (
                    <ul className="mt-2 list-disc pl-4">
                        <li>
                            <strong>No document needed</strong> — fill in the
                            same details a JL document would normally carry,
                            directly in the form below.
                        </li>
                        <li>
                            <strong>Items</strong> — add a row per item, with
                            quantity, purpose, and an optional photo.
                        </li>
                        <li>
                            <strong>Estimated Cost Breakdown</strong> — add a
                            row per cost item; the total is calculated for you
                            and used as the request's estimated amount.
                        </li>
                        <li>
                            Before submitting you'll see a quick summary to
                            review — catch mistakes there before they go out.
                        </li>
                    </ul>
                )}
                {!isEdit && (
                    <p className="mt-2">
                        After submission you will receive a reference number. A
                        serial number is only assigned once the VP approves.
                    </p>
                )}
            </InfoPanel>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1
                        className="text-2xl font-bold"
                        style={{ color: '#1e3a5f' }}
                    >
                        {isEdit
                            ? `Edit & Resubmit — ${editEntry!.reference}`
                            : 'JL Monitoring Form'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {isEdit
                            ? 'Fix the mistake and resubmit for review.'
                            : 'Fill in all required fields and submit for review.'}
                    </p>
                </div>

                {!isEdit && (
                    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                        <button
                            type="button"
                            onClick={() => setMode('document')}
                            className="rounded-md px-4 py-2 text-sm font-semibold transition"
                            style={
                                mode === 'document'
                                    ? { background: '#1e3a5f', color: '#fff' }
                                    : { color: '#6b7280' }
                            }
                        >
                            📎 Upload JL Document
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('structured')}
                            className="rounded-md px-4 py-2 text-sm font-semibold transition"
                            style={
                                mode === 'structured'
                                    ? { background: '#1e3a5f', color: '#fff' }
                                    : { color: '#6b7280' }
                            }
                        >
                            📝 No Document — Fill In Details
                        </button>
                    </div>
                )}
            </div>

            {flash.success && (
                <div className="mb-5 rounded-xl border-l-4 border-green-500 bg-green-50 p-5">
                    <p className="font-semibold text-green-700">
                        <i class="fa-solid fa-check"></i> {flash.success}
                    </p>
                    <p className="mt-1 text-sm text-green-800">
                        Your submission is now pending review. A serial number
                        will be assigned after VP approval.
                    </p>
                </div>
            )}

            <div className="rounded-xl bg-white p-4 shadow-sm sm:p-7">
                {mode === 'document'
                    ? Object.keys(form.errors).length > 0 && (
                          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                              {Object.values(form.errors).map((e) => (
                                  <p key={e}>{e}</p>
                              ))}
                          </div>
                      )
                    : Object.keys(structErrors).length > 0 && (
                          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                              {Object.values(structErrors).map((e) => (
                                  <p key={e}>{e}</p>
                              ))}
                          </div>
                      )}

                {mode === 'document' ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Label>JL Title *</Label>
                            <input
                                className={INPUT}
                                value={form.data.title}
                                onChange={(e) =>
                                    form.setData('title', e.target.value)
                                }
                                placeholder="e.g. Farm Operation Labor Monitoring — Q2 2026"
                                maxLength={255}
                                disabled={form.processing}
                            />
                        </div>

                        <div>
                            <Label>Date Prepared *</Label>
                            <input
                                className={INPUT}
                                type="date"
                                value={form.data.date}
                                onChange={(e) =>
                                    form.setData('date', e.target.value)
                                }
                                disabled={form.processing}
                            />
                        </div>

                        <div>
                            <Label>Company / Farm *</Label>
                            <select
                                className={INPUT}
                                value={form.data.company}
                                onChange={(e) =>
                                    form.setData('company', e.target.value)
                                }
                                disabled={form.processing}
                            >
                                <option value="">— Select company —</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label>Farm Manager / Supervisor *</Label>
                            <input
                                className={INPUT}
                                value={form.data.manager}
                                onChange={(e) =>
                                    form.setData('manager', e.target.value)
                                }
                                placeholder="Full name"
                                maxLength={255}
                                disabled={form.processing}
                            />
                        </div>

                        <div>
                            <Label>Department *</Label>
                            {isRequestor ? (
                                <input
                                    className={INPUT}
                                    value={form.data.dept}
                                    disabled
                                />
                            ) : (
                                <select
                                    className={INPUT}
                                    value={form.data.dept}
                                    onChange={(e) =>
                                        form.setData('dept', e.target.value)
                                    }
                                    disabled={form.processing}
                                >
                                    <option value="">
                                        — Select department —
                                    </option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.name}>
                                            {d.name}
                                        </option>
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
                                onChange={(e) =>
                                    form.setData('amount', e.target.value)
                                }
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                disabled={form.processing}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <Label>
                                Supporting Document {isEdit ? '' : '(optional)'}
                            </Label>
                            {isEdit && editEntry!.attachment_name && (
                                <p className="mb-1.5 text-xs text-gray-400">
                                    Current:{' '}
                                    <span className="font-medium text-gray-600">
                                        {editEntry!.attachment_name}
                                    </span>{' '}
                                    — choose a new file below to replace it, or
                                    leave blank to keep it.
                                </p>
                            )}
                            <input
                                key={fileKey}
                                className={
                                    INPUT +
                                    ' file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-gray-600 hover:file:bg-gray-200'
                                }
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                onChange={(e) =>
                                    form.setData(
                                        'attachment',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                disabled={form.processing}
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                PDF, image, or Office document — max 10 MB
                            </p>
                            {form.errors.attachment && (
                                <p className="mt-1 text-xs text-red-500">
                                    {form.errors.attachment}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Label>Subject *</Label>
                            <input
                                className={INPUT}
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g. Purchase of Farm Tools for Q2 Maintenance"
                                maxLength={255}
                            />
                        </div>

                        <div>
                            <Label>Company / Farm *</Label>
                            <select
                                className={INPUT}
                                value={structCompany}
                                onChange={(e) =>
                                    setStructCompany(e.target.value)
                                }
                            >
                                <option value="">— Select company —</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label>Farm Manager / Supervisor *</Label>
                            <input
                                className={INPUT}
                                value={structManager}
                                onChange={(e) =>
                                    setStructManager(e.target.value)
                                }
                                placeholder="Full name"
                                maxLength={255}
                            />
                        </div>

                        <div>
                            <Label>Department *</Label>
                            {isRequestor ? (
                                <input
                                    className={INPUT}
                                    value={structDept}
                                    disabled
                                />
                            ) : (
                                <select
                                    className={INPUT}
                                    value={structDept}
                                    onChange={(e) =>
                                        setStructDept(e.target.value)
                                    }
                                >
                                    <option value="">
                                        — Select department —
                                    </option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.name}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <Label>Date Needed *</Label>
                            <input
                                className={INPUT}
                                type="date"
                                value={dateNeeded}
                                onChange={(e) => setDateNeeded(e.target.value)}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <Label>Body</Label>
                            <textarea
                                className={INPUT}
                                rows={4}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Describe the request in detail…"
                                maxLength={2000}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <Label>Items</Label>
                            <ItemsTable rows={items} onChange={setItems} />
                        </div>

                        <div className="sm:col-span-2">
                            <Label>Reason for Justification *</Label>
                            <textarea
                                className={INPUT}
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Why is this needed?"
                                maxLength={2000}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <Label>Estimated Cost Breakdown</Label>
                            <CostBreakdownTable
                                rows={costRows}
                                onChange={setCostRows}
                            />
                        </div>
                    </div>
                )}

                <div className="mt-7 flex justify-end gap-4">
                    <div className="flex gap-3">
                        <button
                            onClick={() =>
                                mode === 'document'
                                    ? form.reset()
                                    : resetStructured()
                            }
                            disabled={
                                mode === 'document'
                                    ? form.processing
                                    : structProcessing
                            }
                            className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                        >
                            ↺ Clear
                        </button>
                        <button
                            onClick={() =>
                                mode === 'document'
                                    ? setShowSummary(true)
                                    : setShowStructuredSummary(true)
                            }
                            disabled={
                                mode === 'document'
                                    ? form.processing
                                    : structProcessing
                            }
                            className="rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                            style={{ background: '#1e3a5f' }}
                        >
                            {(
                                mode === 'document'
                                    ? form.processing
                                    : structProcessing
                            )
                                ? 'Submitting…'
                                : isEdit
                                  ? '➤ Review & Resubmit'
                                  : '➤ Submit Form'}
                        </button>
                    </div>
                </div>
            </div>

            <SubmitSummaryModal
                open={showSummary}
                data={form.data}
                processing={form.processing}
                onClose={() => setShowSummary(false)}
                onConfirm={doSubmit}
            />

            <StructuredSummaryModal
                open={showStructuredSummary}
                data={{
                    subject,
                    company: structCompany,
                    dept: structDept,
                    manager: structManager,
                    dateNeeded,
                    body,
                    reason,
                    items,
                    costRows,
                }}
                processing={structProcessing}
                onClose={() => setShowStructuredSummary(false)}
                onConfirm={doStructuredSubmit}
            />
        </AppLayout>
    );
}
