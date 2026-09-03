import { useEffect, useMemo } from 'react';
import { uid } from '@/lib/utils';

export interface JlItemRow {
    id: string;
    itemName: string;
    quantity: string;
    purpose: string;
    image: File | null;
}

interface Props {
    rows: JlItemRow[];
    onChange: (rows: JlItemRow[]) => void;
    disabled?: boolean;
}

const CELL_INPUT =
    'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60';

export function newItemRow(): JlItemRow {
    return {
        id: uid(),
        itemName: '',
        quantity: '',
        purpose: '',
        image: null,
    };
}

function ImageCell({
    file,
    onChange,
    disabled,
}: {
    file: File | null;
    onChange: (file: File | null) => void;
    disabled?: boolean;
}) {
    const previewUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );

    // Revoke the previous object URL once we've moved past it, so
    // switching or clearing the image doesn't leak blob URLs.
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    if (file && previewUrl) {
        return (
            <div className="flex items-center gap-2">
                <img
                    src={previewUrl}
                    alt=""
                    className="h-9 w-9 rounded-md border border-gray-200 object-cover"
                />
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    disabled={disabled}
                    className="text-xs font-medium text-gray-400 hover:text-red-600"
                >
                    Remove
                </button>
            </div>
        );
    }

    return (
        <input
            type="file"
            accept="image/*"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            disabled={disabled}
            className="w-full text-xs text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-gray-600 hover:file:bg-gray-200"
        />
    );
}

export default function ItemsTable({ rows, onChange, disabled }: Props) {
    function update(id: string, patch: Partial<JlItemRow>) {
        onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }

    function addRow() {
        onChange([...rows, newItemRow()]);
    }

    function removeRow(id: string) {
        onChange(rows.filter((r) => r.id !== id));
    }

    return (
        <div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-400 uppercase">
                            <th className="px-3 py-2.5">Item Name</th>
                            <th className="w-24 px-3 py-2.5">Quantity</th>
                            <th className="px-3 py-2.5">Purpose</th>
                            <th className="w-40 px-3 py-2.5">
                                Image (optional)
                            </th>
                            <th className="w-10 px-3 py-2.5" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.id}
                                className="border-t border-gray-100"
                            >
                                <td className="px-3 py-2">
                                    <input
                                        className={CELL_INPUT}
                                        value={row.itemName}
                                        onChange={(e) =>
                                            update(row.id, {
                                                itemName: e.target.value,
                                            })
                                        }
                                        placeholder="e.g. Steel pipe"
                                        maxLength={255}
                                        disabled={disabled}
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        className={CELL_INPUT}
                                        type="number"
                                        min="0"
                                        value={row.quantity}
                                        onChange={(e) =>
                                            update(row.id, {
                                                quantity: e.target.value,
                                            })
                                        }
                                        placeholder="0"
                                        disabled={disabled}
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        className={CELL_INPUT}
                                        value={row.purpose}
                                        onChange={(e) =>
                                            update(row.id, {
                                                purpose: e.target.value,
                                            })
                                        }
                                        placeholder="What is this for?"
                                        maxLength={255}
                                        disabled={disabled}
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <ImageCell
                                        file={row.image}
                                        onChange={(image) =>
                                            update(row.id, { image })
                                        }
                                        disabled={disabled}
                                    />
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        disabled={disabled || rows.length === 1}
                                        className="rounded-md px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                        aria-label="Remove row"
                                    >
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                type="button"
                onClick={addRow}
                disabled={disabled}
                className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
                + Add Item
            </button>
        </div>
    );
}
