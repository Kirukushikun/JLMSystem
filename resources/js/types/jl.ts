export type JlStatus =
    | 'Pending'
    | 'Endorsed'
    | 'Reviewed'
    | 'Rejected'
    | 'Approved'
    | 'VP Rejected'
    | 'On Hold'
    | 'On Process'
    | 'Cancelled';

export type JlEntryType = 'document' | 'structured';

export interface JlServerItem {
    item_name: string;
    quantity: string;
    purpose: string;
    image: string | null;
    image_name: string | null;
    image_url: string | null;
}

export interface JlCostBreakdownRow {
    description: string;
    quantity: string;
    unit_cost: string;
}

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
    entry_type: JlEntryType;
    held_at: string | null;
    hold_reason: string | null;
    serial: string | null;
    submitted_at: string;
    endorsed_at: string | null;
    reviewed_at: string | null;
    approved_at: string | null;
    reject_reason?: string | null;
    endorse_remarks?: string | null;
    review_remarks?: string | null;
    approve_remarks?: string | null;
    attachment: string | null;
    attachment_name: string | null;
    attachment_url: string | null;
    body: string | null;
    justification: string | null;
    items: JlServerItem[] | null;
    cost_breakdown: JlCostBreakdownRow[] | null;
}
