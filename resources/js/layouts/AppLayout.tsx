import { Link, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import type { User } from '@/types/auth';

const NAV_ITEMS = [
    { label: 'Submit Form',        href: '/',                    roles: ['reviewer', 'vp', 'admin'] },
    { label: 'Reviewer Dashboard', href: '/reviewer',            roles: ['reviewer', 'admin'] },
    { label: 'VP Approver',        href: '/vp',                  roles: ['vp', 'admin'] },
    { label: 'Purchasing',         href: '/purchasing',          roles: ['purchasing', 'admin'] },
    { label: 'User Management',    href: '/admin/users',         roles: ['admin'] },
    { label: 'Maintenance',        href: '/admin/maintenance',   roles: ['admin'] },
    { label: 'Audit Trail',        href: '/admin/audit-trail',   roles: ['admin'] },
] as const;

type PageProps = { auth: { user: User | null }; [key: string]: unknown };

export default function AppLayout({ children }: { children: ReactNode }) {
    const { url, props } = usePage<PageProps>();
    const pathname = url.split('?')[0];
    const user = props.auth?.user ?? null;
    const role = user?.role ?? '';

    const visibleItems = NAV_ITEMS.filter((item) =>
        (item.roles as readonly string[]).includes(role),
    );

    function handleLogout() {
        router.post('/logout');
    }

    return (
        <div className="min-h-screen bg-[#f0f4f8]">
            <nav
                className="flex h-14 items-center justify-between px-6 shadow-md"
                style={{ background: '#1e3a5f' }}
            >
                <span className="text-sm font-bold tracking-wide text-white">
                    JL Monitoring System
                </span>

                <div className="flex items-center gap-1">
                    {visibleItems.map((item) => (
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

                    {user ? (
                        <>
                            <div className="mx-2 h-5 w-px bg-white/20" />
                            <span className="mr-1 text-xs text-white/60">{user.name}</span>
                            <button
                                onClick={handleLogout}
                                className="rounded-md px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="rounded-md px-4 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            Admin Login
                        </Link>
                    )}
                </div>
            </nav>
            <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
    );
}
