export type UserRole =
    | 'reviewer'
    | 'vp'
    | 'admin'
    | 'purchasing'
    | 'purchasing_viewer'
    | 'requestor';

export type User = {
    id: number;
    name: string;
    email: string;
    /** Legacy primary role — kept for display; prefer `roles` for access checks. */
    role: UserRole;
    /** Every role this user currently holds; a user can have more than one. */
    roles: UserRole[];
    company: string | null;
    dept: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
