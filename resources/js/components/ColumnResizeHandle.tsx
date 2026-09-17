interface Props {
    onPointerDown: (e: React.PointerEvent) => void;
}

/**
 * A draggable grip pinned to a table header's right edge, for resizing that
 * column's width. Shows a small always-visible bar (not just a hover state)
 * so the column reads as resizable at a glance, not just to someone who
 * happens to hover the exact right pixel. The header cell must be
 * `position: relative`.
 */
export default function ColumnResizeHandle({ onPointerDown }: Props) {
    return (
        <span
            onPointerDown={onPointerDown}
            onClick={(e) => e.stopPropagation()}
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize"
            className="group absolute top-0 right-0 z-10 flex h-full w-3 cursor-col-resize touch-none items-center justify-center select-none"
        >
            <span className="h-4 w-[3px] rounded-full bg-gray-300 transition-colors group-hover:bg-blue-400 group-active:bg-blue-500" />
        </span>
    );
}
