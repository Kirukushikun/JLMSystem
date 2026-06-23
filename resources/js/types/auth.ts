export type UserRole = 'reviewer' | 'vp' | 'admin';

export type User = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
