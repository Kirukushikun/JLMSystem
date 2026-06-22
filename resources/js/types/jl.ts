export type JlStatus = 'Pending' | 'Checked' | 'Rejected' | 'Approved' | 'VP Rejected';

export interface JlEntry {
    id: string;
    title: string;
    date: string;
    company: string;
    manager: string;
    dept: string;
    amount: number;
    status: JlStatus;
    serial: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    approvedAt: string | null;
    rejectReason?: string | null;
}
