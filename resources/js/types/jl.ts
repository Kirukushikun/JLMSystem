export type JlStatus = 'Pending' | 'Checked' | 'Rejected' | 'Approved' | 'VP Rejected';

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
    serial: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    approved_at: string | null;
    reject_reason?: string | null;
    attachment: string | null;
    attachment_name: string | null;
    attachment_url: string | null;
}
