import { useMemo, useState } from 'react';

export function usePagination<T>(items: T[], initialPageSize = 10) {
    const [page, setPage]         = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage   = Math.min(page, totalPages);

    const pageItems = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, safePage, pageSize]);

    function changePageSize(size: number) {
        setPageSize(size);
        setPage(1);
    }

    return {
        page: safePage,
        setPage,
        pageSize,
        setPageSize: changePageSize,
        pageItems,
        totalItems,
        totalPages,
    };
}
