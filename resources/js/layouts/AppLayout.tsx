import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
    { label: 'Submit Form', href: '/' },
    { label: 'Reviewer Dashboard', href: '/reviewer' },
    { label: 'VP Approver', href: '/vp' },
] as const;

export default function AppLayout({ children }: { children: ReactNode }) {
    const { url } = usePage();
    const pathname = url.split('?')[0];

    return (
        <div className="min-h-screen bg-[#f0f4f8]">
            <nav
                className="flex h-14 items-center justify-between px-6 shadow-md"
                style={{ background: '#1e3a5f' }}
            >
                <span className="text-sm font-bold tracking-wide text-white">
                    JL Monitoring System
                </span>
                <div className="flex gap-1">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                                'rounded-md px-4 py-1.5 text-sm transition',
                                pathname === item.href
                                    ? 'bg-white/20 font-semibold text-white'
                                    : 'font-medium text-white/70 hover:bg-white/10 hover:text-white',
                            ].join(' ')}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </nav>
            <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
    );
}
