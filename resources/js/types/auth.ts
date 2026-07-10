export type UserRole = 'reviewer' | 'vp' | 'admin' | 'purchasing' | 'requestor';

export type User = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    company: string | null;
    dept: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
