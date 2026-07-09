const DEFAULT_SIZES = [10, 25, 50, 100];

interface Props {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    pageSizeOptions?: number[];
}

export default function Pagination({
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = DEFAULT_SIZES,
}: Props) {
    if (totalItems === 0) return null;

    const start = (page - 1) * pageSize + 1;
    const end   = Math.min(page * pageSize, totalItems);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <select
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                    {pageSizeOptions.map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-3">
                <span>{start}–{end} of {totalItems}</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        className="rounded-md border border-gray-200 px-2.5 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                        ‹ Prev
                    </button>
                    <span className="px-2">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="rounded-md border border-gray-200 px-2.5 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                        Next ›
                    </button>
                </div>
            </div>
        </div>
    );
}
