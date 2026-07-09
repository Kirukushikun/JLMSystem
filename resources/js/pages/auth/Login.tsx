import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const INPUT =
    'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60';

interface PageProps {
    turnstileSiteKey: string;
    [key: string]: unknown;
}

export default function Login() {
    const { turnstileSiteKey } = usePage<PageProps>().props;
    const [showPassword, setShowPassword] = useState(false);
    const turnstileRef      = useRef<HTMLDivElement>(null);
    const turnstileTokenRef = useRef('');

    useEffect(() => {
        (window as any).onTurnstileReady = () => {
            const ts = (window as any).turnstile;
            if (ts && turnstileRef.current) {
                ts.render(turnstileRef.current, {
                    sitekey:            turnstileSiteKey,
                    callback:           (token: string) => { turnstileTokenRef.current = token; },
                    'expired-callback': () => { turnstileTokenRef.current = ''; },
                });
            }
        };
        const script = document.createElement('script');
        script.src   = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileReady&render=explicit';
        script.async = true;
        document.head.appendChild(script);
        return () => {
            delete (window as any).onTurnstileReady;
            if (document.head.contains(script)) document.head.removeChild(script);
        };
    }, []);

    const form = useForm({
        email:           '',
        password:        '',
        turnstile_token: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.transform((data) => ({ ...data, turnstile_token: turnstileTokenRef.current }));
        form.post('/login');
    }

    return (
        <>
            <Head title="Login" />

            <div
                className="flex min-h-screen items-center justify-center px-4"
                style={{ background: '#f0f4f8' }}
            >
                <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">

                    {/* Brand */}
                    <div className="mb-8 text-center">
                        <div
                            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white text-xl font-bold"
                            style={{ background: '#1e3a5f' }}
                        >
                            JL
                        </div>
                        <h1 className="text-lg font-bold" style={{ color: '#1e3a5f' }}>
                            JL Monitoring System
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
                    </div>

                    {/* Error */}
                    {form.errors.email && (
                        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                            {form.errors.email}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Email
                            </label>
                            <input
                                type="email"
                                className={INPUT}
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                                disabled={form.processing}
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={INPUT + ' pr-10'}
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    disabled={form.processing}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        /* eye-slash */
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        /* eye */
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div class="flex items-center justify-center">
                            <div ref={turnstileRef} />
                            {form.errors.turnstile_token && (
                                <p className="mt-1 text-xs text-red-500">{form.errors.turnstile_token}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                            style={{ background: '#1e3a5f' }}
                        >
                            {form.processing ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-gray-400">
                        Forgot your password? Contact{' '}
                        <span className="font-medium text-gray-600">IT Department</span>.
                    </p>
                </div>
            </div>
        </>
    );
}
