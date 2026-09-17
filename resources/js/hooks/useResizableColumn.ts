import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_WIDTH = 140;
const MAX_WIDTH = 640;

function clamp(width: number): number {
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

function readStored(key: string, fallback: number): number {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? Number(raw) : NaN;

        return Number.isFinite(parsed) ? clamp(parsed) : fallback;
    } catch {
        // Private browsing / storage disabled — fall back silently, this is
        // a per-browser convenience only, never something to fail loudly over.
        return fallback;
    }
}

/**
 * A table column width the user can drag wider or narrower, remembered per
 * browser under `storageKey` so a resize made once sticks on later visits.
 *
 * Returns the current width in px and a pointer-down handler to wire onto a
 * drag handle sitting at the column's right edge.
 */
export function useResizableColumn(storageKey: string, defaultWidth: number) {
    const [width, setWidth] = useState(() =>
        readStored(storageKey, defaultWidth),
    );

    // Read inside the drag session without needing `width` in onResizeStart's
    // deps — the pointer handlers below are recreated fresh per drag anyway.
    // Updated in an effect, not during render, so it stays a pure commit-phase
    // side effect rather than a render-time mutation.
    const widthRef = useRef(width);
    useEffect(() => {
        widthRef.current = width;
    }, [width]);

    // Each drag session's own cleanup, so an unmount mid-drag can still
    // detach its listeners (the pointerup that would normally do it never
    // fires once the component — and its handle — is gone).
    const activeCleanup = useRef<(() => void) | null>(null);

    useEffect(() => {
        return () => activeCleanup.current?.();
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, String(width));
        } catch {
            // Same as above — nothing to do if storage isn't available.
        }
    }, [storageKey, width]);

    const onResizeStart = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = widthRef.current;

        function onMove(ev: PointerEvent) {
            setWidth(clamp(startWidth + (ev.clientX - startX)));
        }

        function onUp() {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.body.style.removeProperty('cursor');
            document.body.style.removeProperty('user-select');
            activeCleanup.current = null;
        }

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        activeCleanup.current = onUp;
    }, []);

    return { width, onResizeStart };
}
