import { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import type { JlEntry } from '@/types/jl';

interface Props {
    entry: JlEntry | null;
    onClose: () => void;
}

export default function AttachmentUploadModal({ entry, onClose }: Props) {
    const [fileKey, setFileKey] = useState(0);
    const form = useForm<{ attachment: File | null }>({ attachment: null });

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        form.reset();
        form.clearErrors();
        setFileKey((k) => k + 1);
    }, [entry?.id]);

    if (!entry) return null;

    function handleUpload() {
        form.post(`/jl/${entry!.id}/upload-attachment`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-200"
                >
                    ✕
                </button>

                <h2 className="mb-0.5 text-lg font-bold" style={{ color: '#1e3a5f' }}>Add Attachment</h2>
                <p className="mb-5 text-sm text-gray-400">
                    {entry.reference} — {entry.title}
                </p>

                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Supporting Document
                </label>
                <input
                    key={fileKey}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-gray-600 hover:file:bg-gray-200 disabled:opacity-60"
                    onChange={(e) => form.setData('attachment', e.target.files?.[0] ?? null)}
                    disabled={form.processing}
                />
                <p className="mt-1 text-xs text-gray-400">PDF, image, or Office document — max 10 MB</p>
                {form.errors.attachment && (
                    <p className="mt-1 text-xs text-red-500">{form.errors.attachment}</p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={form.processing}
                        className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={form.processing || !form.data.attachment}
                        className="rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        style={{ background: '#1e3a5f' }}
                    >
                        {form.processing ? 'Uploading…' : '⬆ Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}
