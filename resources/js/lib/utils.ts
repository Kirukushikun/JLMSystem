import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * A local-only identifier — for React keys and local state, never sent to
 * the server or used for anything security-sensitive. crypto.randomUUID()
 * only exists in "secure contexts" (https, or http on localhost/127.0.0.1);
 * plain http on a real host or IP — e.g. a staging box reached over
 * http://10.x.x.x — doesn't count, and the call throws there. Fall back to
 * a plain pseudo-random string instead of crashing on those origins.
 */
export function uid(): string {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
