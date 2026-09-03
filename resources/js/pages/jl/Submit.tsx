import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import InfoPanel from '@/components/InfoPanel';
import CostBreakdownTable, {
    newCostRow,
} from '@/components/jl/CostBreakdownTable';
import type { CostRow } from '@/components/jl/CostBreakdownTable';
import ItemsTable, { newItemRow } from '@/components/jl/ItemsTable';
import type { JlItemRow } from '@/components/jl/ItemsTable';
import StructuredSummaryModal from '@/components/jl/StructuredSummaryModal';
import AppLayout from '@/layouts/AppLayout';
import { uid } from '@/lib/utils';
import type { Auth } from '@/types/auth';
import type { JlEntry } from '@/types/jl';

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

    const isRequestor = auth.user.roles.includes('requestor');
    const isEdit = !!editEntry;

    // Company/Farm and Department are locked to the requestor's own account —
    // pre-filled, not editable — for anyone else (e.g. admin submitting on
    // someone's behalf) they're a free choice.
    function defaultState() {
        return {
            subject: editEntry?.title ?? '',
            company:
                editEntry?.company ??
                (isRequestor ? (auth.user.company ?? '') : ''),
            dept:
                editEntry?.dept ?? (isRequestor ? (auth.user.dept ?? '') : ''),
            manager: editEntry?.manager ?? '',
            dateNeeded: editEntry?.date ?? '',
            body: editEntry?.body ?? '',
            reason: editEntry?.justification ?? '',
            items:
                editEntry?.items && editEntry.items.length > 0
                    ? editEntry.items.map((i) => ({
                          id: uid(),
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
                          id: uid(),
                          description: r.description,
                          quantity: r.quantity,
                          unitCost: r.unit_cost,
                      }))
                    : [newCostRow()],
        };
    }

    const defaults = defaultState();
    const [subject, setSubject] = useState(defaults.subject);
    const [company, setCompany] = useState(defaults.company);
    const [dept, setDept] = useState(defaults.dept);
    const [manager, setManager] = useState(defaults.manager);
    const [dateNeeded, setDateNeeded] = useState(defaults.dateNeeded);
    const [body, setBody] = useState(defaults.body);
    const [reason, setReason] = useState(defaults.reason);
    const [items, setItems] = useState<JlItemRow[]>(defaults.items);
    const [costRows, setCostRows] = useState<CostRow[]>(defaults.costRows);
    const [image, setImage] = useState<File | null>(null);
    const [fileKey, setFileKey] = useState(0);

    const [showSummary, setShowSummary] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function resetForm() {
        const d = defaultState();
        setSubject(d.subject);
        setCompany(d.company);
        setDept(d.dept);
        setManager(d.manager);
        setDateNeeded(d.dateNeeded);
        setBody(d.body);
        setReason(d.reason);
        setItems(d.items);
        setCostRows(d.costRows);
        setImage(null);
        setFileKey((k) => k + 1);
    }

    function doSubmit() {
        const payload = {
            subject,
            company,
            dept,
            manager,
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
            attachment: image,
        };

        const url = isEdit ? `/jl/${editEntry!.id}/resubmit` : '/jl';
        const data = isEdit ? { ...payload, _method: 'patch' } : payload;

        router.post(url, data, {
            forceFormData: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                setShowSummary(false);
                setErrors({});

                if (!isEdit) {
                    resetForm();
                }
            },
            onError: (errs) => {
                setErrors(errs as Record<string, string>);
                setShowSummary(false);
            },
        });
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
                        Fill in the details below and click{' '}
                        <strong>Submit Form</strong> when ready. Your entry will
                        be queued for review.
                    </p>
                )}
                <ul className="mt-2 list-disc pl-4">
                    <li>
                        <strong>Subject</strong> — brief description of the
                        request.
                    </li>
                    <li>
                        <strong>Company / Farm</strong> —{' '}
                        {isRequestor
                            ? 'pre-filled from your account.'
                            : 'select from the available options.'}
                    </li>
                    <li>
                        <strong>Department</strong> —{' '}
                        {isRequestor
                            ? 'pre-filled from your account.'
                            : 'select from the available options.'}
                    </li>
                    <li>
                        <strong>Items</strong> — add a row per item, with
                        quantity, purpose, and an optional photo.
                    </li>
                    <li>
                        <strong>Estimated Cost Breakdown</strong> — add a row
                        per cost item; the total is calculated for you and used
                        as the request's estimated amount.
                    </li>
                    <li>
                        <strong>Supporting Image</strong> — optional, images
                        only (no PDFs or other file types).
                    </li>
                    <li>
                        Before submitting you'll see a quick summary to review —
                        catch mistakes there before they go out.
                    </li>
                </ul>
                {!isEdit && (
                    <p className="mt-2">
                        After submission you will receive a reference number. A
                        serial number is only assigned once the VP approves.
                    </p>
                )}
            </InfoPanel>

            <div className="mb-5">
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
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
                {Object.keys(errors).length > 0 && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                        {Object.values(errors).map((e) => (
                            <p key={e}>{e}</p>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Label>Subject *</Label>
                        <input
                            className={INPUT}
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g. Purchase of Farm Tools for Q2 Maintenance"
                            maxLength={255}
                            disabled={processing}
                        />
                    </div>

                    <div>
                        <Label>Company / Farm *</Label>
                        {isRequestor ? (
                            <input className={INPUT} value={company} disabled />
                        ) : (
                            <select
                                className={INPUT}
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                disabled={processing}
                            >
                                <option value="">— Select company —</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <Label>Farm Manager / Supervisor *</Label>
                        <input
                            className={INPUT}
                            value={manager}
                            onChange={(e) => setManager(e.target.value)}
                            placeholder="Full name"
                            maxLength={255}
                            disabled={processing}
                        />
                    </div>

                    <div>
                        <Label>Department *</Label>
                        {isRequestor ? (
                            <input className={INPUT} value={dept} disabled />
                        ) : (
                            <select
                                className={INPUT}
                                value={dept}
                                onChange={(e) => setDept(e.target.value)}
                                disabled={processing}
                            >
                                <option value="">— Select department —</option>
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
                            disabled={processing}
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
                            disabled={processing}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Items</Label>
                        <ItemsTable
                            rows={items}
                            onChange={setItems}
                            disabled={processing}
                        />
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
                            disabled={processing}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Estimated Cost Breakdown</Label>
                        <CostBreakdownTable
                            rows={costRows}
                            onChange={setCostRows}
                            disabled={processing}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Supporting Image (optional)</Label>
                        {isEdit && editEntry!.attachment_name && (
                            <p className="mb-1.5 text-xs text-gray-400">
                                Current:{' '}
                                <span className="font-medium text-gray-600">
                                    {editEntry!.attachment_name}
                                </span>{' '}
                                — choose a new image below to replace it, or
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
                            accept="image/*"
                            onChange={(e) =>
                                setImage(e.target.files?.[0] ?? null)
                            }
                            disabled={processing}
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Images only (JPG, PNG, etc.) — max 5 MB
                        </p>
                        {errors.attachment && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.attachment}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-7 flex justify-end gap-4">
                    <div className="flex gap-3">
                        <button
                            onClick={resetForm}
                            disabled={processing}
                            className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                        >
                            ↺ Clear
                        </button>
                        <button
                            onClick={() => setShowSummary(true)}
                            disabled={processing}
                            className="rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                            style={{ background: '#1e3a5f' }}
                        >
                            {processing
                                ? 'Submitting…'
                                : isEdit
                                  ? '➤ Review & Resubmit'
                                  : '➤ Submit Form'}
                        </button>
                    </div>
                </div>
            </div>

            <StructuredSummaryModal
                open={showSummary}
                data={{
                    subject,
                    company,
                    dept,
                    manager,
                    dateNeeded,
                    body,
                    reason,
                    items,
                    costRows,
                    attachment: image,
                }}
                processing={processing}
                onClose={() => setShowSummary(false)}
                onConfirm={doSubmit}
            />
        </AppLayout>
    );
}
