export interface CostRow {
    id: string;
    description: string;
    quantity: string;
    unitCost: string;
}

interface Props {
    rows: CostRow[];
    onChange: (rows: CostRow[]) => void;
    disabled?: boolean;
}

const CELL_INPUT =
    'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60';

export function newCostRow(): CostRow {
    return {
        id: crypto.randomUUID(),
        description: '',
        quantity: '1',
        unitCost: '',
    };
}

export function costRowSubtotal(row: CostRow): number {
    return (Number(row.quantity) || 0) * (Number(row.unitCost) || 0);
}

export function costRowsTotal(rows: CostRow[]): number {
    return rows.reduce((sum, r) => sum + costRowSubtotal(r), 0);
}

function fmtAmt(n: number) {
    return '₱ ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export default function CostBreakdownTable({
    rows,
    onChange,
    disabled,
}: Props) {
    function update(id: string, patch: Partial<CostRow>) {
        onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }

    function addRow() {
        onChange([...rows, newCostRow()]);
    }

    function removeRow(id: string) {
        onChange(rows.filter((r) => r.id !== id));
    }

    return (
        <div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-400 uppercase">
                            <th className="px-3 py-2.5">Description</th>
                            <th className="w-24 px-3 py-2.5">Quantity</th>
                            <th className="w-32 px-3 py-2.5">Unit Cost</th>
                            <th className="w-32 px-3 py-2.5">Subtotal</th>
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
                                        value={row.description}
                                        onChange={(e) =>
                                            update(row.id, {
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="e.g. Materials"
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
                                        placeholder="1"
                                        disabled={disabled}
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        className={CELL_INPUT}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={row.unitCost}
                                        onChange={(e) =>
                                            update(row.id, {
                                                unitCost: e.target.value,
                                            })
                                        }
                                        placeholder="0.00"
                                        disabled={disabled}
                                    />
                                </td>
                                <td className="px-3 py-2 font-medium text-gray-600">
                                    {fmtAmt(costRowSubtotal(row))}
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
                    <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                            <td
                                colSpan={3}
                                className="px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase"
                            >
                                Total Estimated Cost
                            </td>
                            <td
                                className="px-3 py-2.5 font-bold"
                                style={{ color: '#1e3a5f' }}
                            >
                                {fmtAmt(costRowsTotal(rows))}
                            </td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>
            <button
                type="button"
                onClick={addRow}
                disabled={disabled}
                className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
                + Add Cost Item
            </button>
        </div>
    );
}
