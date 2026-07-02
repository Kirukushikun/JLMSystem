import { useEffect, useRef, useState } from 'react';
import type { User } from '@/types/auth';

interface JlNotification {
    id: string;
    data: {
        entry_id: number;
        reference: string;
        event: string;
        title: string;
        body: string;
    };
    read_at: string | null;
    created_at: string;
}

const EVENT_ICON: Record<string, string> = {
    submitted:   '📋',
    reviewed:    '✅',
    approved:    '🎉',
    vp_rejected: '❌',
    on_hold:     '⏸',
    on_process:  '⚙️',
};

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)  return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({ user }: { user: User }) {
    const [open, setOpen]                   = useState(false);
    const [notifications, setNotifications] = useState<JlNotification[]>([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [loading, setLoading]             = useState(true);
    const dropdownRef                       = useRef<HTMLDivElement>(null);

    // Fetch existing notifications on mount
    useEffect(() => {
        fetch('/notifications', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then(({ notifications: list, unread_count }) => {
                setNotifications(list);
                setUnreadCount(unread_count);
            })
            .finally(() => setLoading(false));
    }, []);

    // Subscribe to real-time notifications
    useEffect(() => {
        const channel = (window as any).Echo
            ?.private(`App.Models.User.${user.id}`)
            .notification((notif: JlNotification) => {
                setNotifications((prev) => [notif, ...prev]);
                setUnreadCount((c) => c + 1);
            });

        return () => {
            (window as any).Echo?.leave(`private-App.Models.User.${user.id}`);
        };
    }, [user.id]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function markRead(id: string) {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        fetch(`/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrf() },
        });
    }

    function markAllRead() {
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
        setUnreadCount(0);
        fetch('/notifications/read-all', {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrf() },
        });
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="relative rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Notifications"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-10 z-50 w-80 rounded-xl bg-white shadow-xl ring-1 ring-black/5">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <span className="text-sm font-semibold text-gray-800">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <p className="px-4 py-6 text-center text-sm text-gray-400">Loading…</p>
                        ) : notifications.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet</p>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => !n.read_at && markRead(n.id)}
                                    className={[
                                        'flex cursor-pointer gap-3 px-4 py-3 transition hover:bg-gray-50',
                                        !n.read_at ? 'bg-blue-50/60' : '',
                                    ].join(' ')}
                                >
                                    <span className="mt-0.5 text-lg leading-none">
                                        {EVENT_ICON[n.data.event] ?? '🔔'}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={['text-sm', !n.read_at ? 'font-semibold text-gray-800' : 'text-gray-700'].join(' ')}>
                                            {n.data.title}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-gray-500">{n.data.body}</p>
                                        <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.created_at)}</p>
                                    </div>
                                    {!n.read_at && (
                                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function getCsrf(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}
