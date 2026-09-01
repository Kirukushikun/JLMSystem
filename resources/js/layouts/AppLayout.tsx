import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import NotificationBell from '@/components/NotificationBell';
import { registerFcmToken, listenForeground } from '@/firebase';
import type { User } from '@/types/auth';

const NAV_ITEMS = [
    { label: 'Submit Form', href: '/', roles: ['requestor', 'admin'] },
    {
        label: 'My Requests',
        href: '/my-requests',
        roles: ['requestor', 'admin'],
    },
    {
        label: 'Division Head',
        href: '/division-head',
        roles: ['division_head', 'admin'],
    },
    {
        label: 'Reviewer Dashboard',
        href: '/reviewer',
        roles: ['reviewer', 'admin'],
    },
    { label: 'VP Approver', href: '/vp', roles: ['vp', 'admin'] },
    {
        label: 'Purchasing',
        href: '/purchasing',
        roles: ['purchasing', 'purchasing_viewer', 'admin'],
    },
    { label: 'User Management', href: '/admin/users', roles: ['admin'] },
    { label: 'Maintenance', href: '/admin/maintenance', roles: ['admin'] },
    {
        label: 'Audit Trail',
        href: '/admin/audit-trail',
        roles: ['vp', 'admin'],
    },
] as const;

type PageProps = { auth: { user: User | null }; [key: string]: unknown };

export default function AppLayout({ children }: { children: ReactNode }) {
    const { url, props } = usePage<PageProps>();
    const pathname = url.split('?')[0];
    const user = props.auth?.user ?? null;
    const roles = user?.roles ?? [];

    const [mobileOpen, setMobileOpen] = useState(false);
    const [toast, setToast] = useState<{ title: string; body: string } | null>(
        null,
    );
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!user) {
            return;
        }

        registerFcmToken();
        listenForeground((title, body) => {
            setToast({ title, body });

            if (toastTimer.current) {
                clearTimeout(toastTimer.current);
            }

            toastTimer.current = setTimeout(() => setToast(null), 5000);
        });
    }, [user?.id]);

    const roleStrings = roles as readonly string[];
    const visibleItems = NAV_ITEMS.filter((item) =>
        (item.roles as readonly string[]).some((r) => roleStrings.includes(r)),
    );

    function handleLogout() {
        router.post('/logout');
    }

    return (
        <div className="min-h-screen bg-[#f0f4f8]">
            <nav
                className="relative flex h-14 items-center justify-between px-4 shadow-md sm:px-6"
                style={{ background: '#1e3a5f' }}
            >
                <span className="text-sm font-bold tracking-wide text-white">
                    JL Monitoring System
                </span>

                {/* Desktop nav */}
                <div className="hidden items-center gap-1 md:flex">
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

                    {user && (
                        <>
                            <div className="mx-2 h-5 w-px bg-white/20" />
                            <NotificationBell user={user} />
                            <span className="mr-1 ml-1 text-xs text-white/60">
                                {user.name}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="rounded-md px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                            >
                                Logout
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile right side */}
                <div className="flex items-center gap-1 md:hidden">
                    {user && <NotificationBell user={user} />}
                    {visibleItems.length > 0 && (
                        <button
                            onClick={() => setMobileOpen((o) => !o)}
                            className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                            aria-label="Menu"
                        >
                            {mobileOpen ? (
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </nav>

            {/* Mobile menu dropdown */}
            {mobileOpen && (
                <div
                    className="shadow-lg md:hidden"
                    style={{ background: '#1e3a5f' }}
                >
                    <div className="flex flex-col px-4 py-2">
                        {visibleItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={[
                                    'rounded-md px-3 py-2.5 text-sm transition',
                                    pathname === item.href
                                        ? 'bg-white/20 font-semibold text-white'
                                        : 'font-medium text-white/70 hover:bg-white/10 hover:text-white',
                                ].join(' ')}
                            >
                                {item.label}
                            </Link>
                        ))}
                        {user && (
                            <div className="mt-1 border-t border-white/10 pt-2 pb-1">
                                <p className="px-3 py-1 text-xs text-white/40">
                                    {user.name}
                                </p>
                                <button
                                    onClick={() => {
                                        setMobileOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
                {children}
            </main>

            {toast && (
                <div className="fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] rounded-lg bg-[#1e3a5f] px-5 py-3.5 text-white shadow-xl sm:max-w-sm">
                    <p className="text-sm font-semibold">{toast.title}</p>
                    <p className="mt-0.5 text-xs text-white/80">{toast.body}</p>
                </div>
            )}
        </div>
    );
}
