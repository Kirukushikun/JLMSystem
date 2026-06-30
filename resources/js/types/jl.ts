export type JlStatus =
    | 'Pending'
    | 'Reviewed'
    | 'Rejected'
    | 'Approved'
    | 'VP Rejected'
    | 'On Hold'
    | 'On Process';

export interface JlEntry {
    id: number;
    reference: string;
    title: string;
    date: string;
    company: string;
    manager: string;
    dept: string;
    amount: number;
    status: JlStatus;
    held_at: string | null;
    serial: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    approved_at: string | null;
    reject_reason?: string | null;
    attachment: string | null;
    attachment_name: string | null;
    attachment_url: string | null;
}
