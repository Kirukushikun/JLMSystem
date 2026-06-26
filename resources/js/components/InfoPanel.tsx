import { useState } from 'react';

type PanelType = 'overview' | 'help' | 'about';

const LABELS: Record<PanelType, string> = {
    overview: 'What am I looking at?',
    help:     'Help / Required Fields',
    about:    'About this Module',
};

interface Props {
    type: PanelType;
    title: string;
    children: React.ReactNode;
}

export default function InfoPanel({ type, title, children }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className="mb-5">
            <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
            >
                <span className="text-sm">ℹ</span>
                {LABELS[type]}
            </button>

            {open && (
                <div className="mt-2 rounded-lg border-l-4 border-cyan-400 bg-cyan-50 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="mb-1 flex items-center gap-1.5 font-bold text-cyan-900">
                                <span>ℹ</span> {title}
                            </p>
                            <div className="text-sm leading-relaxed text-cyan-800">
                                {children}
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-lg font-bold leading-none text-cyan-400 hover:text-cyan-700"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
