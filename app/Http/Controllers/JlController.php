<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreJlRequest;
use App\Models\Company;
use App\Models\Department;
use App\Models\FcmToken;
use App\Models\JlAuditLog;
use App\Models\JlEntry;
use App\Models\User;
use App\Notifications\JlNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JlController extends Controller
{
    public function submit(): Response
    {
        return Inertia::render('jl/Submit', [
            'companies' => Company::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function divisionHead(): Response
    {
        $user = auth()->user();
        $query = JlEntry::latest();

        // A Division Head only sees their own department's queue; admins acting
        // through this view see everything, same as they do on every dashboard.
        if (! $user->hasRole('admin')) {
            $query->where('dept', $user->dept);
        }

        return Inertia::render('jl/DivisionHead', ['entries' => $query->get()]);
    }

    public function reviewer(): Response
    {
        return Inertia::render('jl/Reviewer', [
            'entries' => JlEntry::latest()->get(),
        ]);
    }

    public function vp(): Response
    {
        $entries = JlEntry::where(function ($q) {
            $q->whereIn('status', ['Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Process'])
                ->orWhere(function ($q2) {
                    // On Hold entries held at Reviewer or VP stage (not Division Head or Purchasing)
                    $q2->where('status', 'On Hold')
                        ->whereNotIn('held_at', ['Pending', 'Endorsed']);
                });
        })->latest()->get();

        return Inertia::render('jl/Vp', ['entries' => $entries]);
    }

    public function purchasing(): Response
    {
        $entries = JlEntry::where(function ($q) {
            $q->whereIn('status', ['Approved', 'On Process'])
                ->orWhere(function ($q2) {
                    $q2->where('status', 'On Hold')
                        ->whereIn('held_at', ['Approved', 'On Process']);
                });
        })->latest()->get();

        return Inertia::render('jl/Purchasing', ['entries' => $entries]);
    }

    public function auditTrail(): Response
    {
        $logs = JlAuditLog::with('entry:id,title,company,submitted_at')
            ->latest()
            ->get();

        return Inertia::render('jl/AuditTrail', ['logs' => $logs]);
    }

    public function myRequests(): Response
    {
        $entries = JlEntry::where('user_id', auth()->id())->latest()->get();

        return Inertia::render('jl/MyRequests', ['entries' => $entries]);
    }

    public function store(StoreJlRequest $request): RedirectResponse
    {
        $user = auth()->user();

        $data = $this->buildStructuredEntryFields($request);

        $data['company'] = $request->input('company');
        $data['manager'] = $request->input('manager');
        $data['dept'] = $request->input('dept');

        // Company/Farm and Department are locked to the account for
        // requestors — disabled client-side, but that's UX only, so the
        // account's value always wins here regardless of what was sent.
        if ($user->hasRole('requestor')) {
            $data['company'] = $user->company;
            $data['dept'] = $user->dept;
        }

        $entry = JlEntry::create([
            ...$data,
            'user_id' => $user->id,
            'status' => 'Pending',
            'submitted_at' => now()->toDateString(),
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => 'submitted',
            'actor' => null,
        ]);

        $this->notifyDivisionHead($entry, 'submitted',
            'New JL Form Submitted',
            "{$entry->reference} — {$entry->company} ({$entry->dept})"
        );

        return back()->with('success', "Form submitted! Reference: {$entry->reference}");
    }

    public function cancel(JlEntry $entry): RedirectResponse
    {
        abort_if($entry->user_id !== auth()->id(), 403);

        if ($entry->status !== 'Pending') {
            return back()->with('error', 'Only pending requests can be cancelled.');
        }

        $entry->update(['status' => 'Cancelled']);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => 'cancelled',
            'actor' => auth()->user()->name,
        ]);

        return back()->with('success', "{$entry->reference} has been cancelled. Edit and resubmit it anytime from My Requests.");
    }

    public function edit(JlEntry $entry): Response|RedirectResponse
    {
        abort_if($entry->user_id !== auth()->id(), 403);

        if ($entry->status !== 'Cancelled') {
            return redirect()->route('jl.myRequests')->with('error', 'Only cancelled requests can be edited.');
        }

        return Inertia::render('jl/Submit', [
            'companies' => Company::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'editEntry' => $entry,
        ]);
    }

    public function resubmit(StoreJlRequest $request, JlEntry $entry): RedirectResponse
    {
        abort_if($entry->user_id !== auth()->id(), 403);

        if ($entry->status !== 'Cancelled') {
            return back()->with('error', 'Only cancelled requests can be resubmitted.');
        }

        $user = auth()->user();

        $data = $this->buildStructuredEntryFields($request, $entry);

        $data['company'] = $request->input('company');
        $data['manager'] = $request->input('manager');
        $data['dept'] = $request->input('dept');

        if ($user->hasRole('requestor')) {
            $data['company'] = $user->company;
            $data['dept'] = $user->dept;
        }

        $entry->update([
            ...$data,
            'status' => 'Pending',
            'submitted_at' => now()->toDateString(),
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => 'resubmitted',
            'actor' => null,
        ]);

        $this->notifyDivisionHead($entry, 'submitted',
            'JL Form Resubmitted',
            "{$entry->reference} — {$entry->company} ({$entry->dept})"
        );

        return redirect()->route('jl.myRequests')->with('success', "Corrected and resubmitted! Reference: {$entry->reference}");
    }

    /**
     * Stopgap: lets a requestor attach a supporting file to their own request
     * regardless of its current status, as long as it doesn't already have one.
     * For entries that reached this system via migration/import without a file.
     */
    public function uploadAttachment(Request $request, JlEntry $entry): RedirectResponse
    {
        abort_if($entry->user_id !== auth()->id(), 403);

        if ($entry->attachment) {
            return back()->with('error', 'This request already has an attachment.');
        }

        $request->validate([
            'attachment' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx'],
        ]);

        $file = $request->file('attachment');

        $entry->update([
            'attachment' => $file->store('jl-attachments', 'local'),
            'attachment_name' => $file->getClientOriginalName(),
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => 'attachment_added',
            'actor' => auth()->user()->name,
        ]);

        return back()->with('success', "Attachment added to {$entry->reference}.");
    }

    public function attachment(JlEntry $entry): StreamedResponse
    {
        abort_if(! $entry->attachment, 404);
        abort_if(! Storage::disk('local')->exists($entry->attachment), 404);

        return Storage::disk('local')->response(
            $entry->attachment,
            $entry->attachment_name,
        );
    }

    public function itemImage(JlEntry $entry, int $index): StreamedResponse
    {
        $item = $entry->items[$index] ?? null;

        abort_if(! $item || empty($item['image']), 404);
        abort_if(! Storage::disk('local')->exists($item['image']), 404);

        return Storage::disk('local')->response(
            $item['image'],
            $item['image_name'] ?? null,
        );
    }

    /** @return array<string, mixed> */
    private function buildStructuredEntryFields(Request $request, ?JlEntry $existingEntry = null): array
    {
        $costBreakdown = collect((array) $request->input('cost_breakdown', []))
            ->map(fn ($row) => [
                'description' => $row['description'] ?? '',
                'quantity' => $row['quantity'] ?? '',
                'unit_cost' => $row['unit_cost'] ?? '',
            ])
            ->values()
            ->all();

        // The total is always derived server-side from the breakdown, never
        // trusted from the client, so it can't drift from what's displayed.
        $amount = collect($costBreakdown)->sum(
            fn ($row) => (float) ($row['quantity'] ?: 0) * (float) ($row['unit_cost'] ?: 0)
        );

        $items = collect((array) $request->input('items', []))
            ->values()
            ->map(function ($row, $index) use ($request) {
                $image = $request->file("items.{$index}.image");

                // ->file() is typed to allow an array (for a plain `name[]` field),
                // but a dot-notation single index like this always resolves to one
                // file or none — narrow it explicitly rather than trust the union.
                if (! $image instanceof UploadedFile) {
                    $image = null;
                }

                return [
                    'item_name' => $row['item_name'] ?? '',
                    'quantity' => $row['quantity'] ?? '',
                    'purpose' => $row['purpose'] ?? '',
                    'image' => $image ? $image->store('jl-item-images', 'local') : null,
                    'image_name' => $image ? $image->getClientOriginalName() : null,
                ];
            })
            ->all();

        $data = [
            'entry_type' => 'structured',
            'title' => $request->input('subject'),
            'date' => $request->input('date_needed'),
            'amount' => $amount,
            'body' => $request->input('body') ?: null,
            'justification' => $request->input('justification'),
            'items' => $items,
            'cost_breakdown' => $costBreakdown,
        ];

        if ($request->hasFile('attachment')) {
            if ($existingEntry?->attachment) {
                Storage::disk('local')->delete($existingEntry->attachment);
            }

            $file = $request->file('attachment');
            $data['attachment'] = $file->store('jl-attachments', 'local');
            $data['attachment_name'] = $file->getClientOriginalName();
        }

        return $data;
    }

    public function endorse(Request $request, JlEntry $entry): RedirectResponse
    {
        $effective = $entry->status === 'On Hold' ? $entry->held_at : $entry->status;

        if ($effective !== 'Pending') {
            return back()->with('error', 'This entry is no longer pending — it may have already been endorsed.');
        }

        $remarks = $request->input('endorse_remarks') ?: null;

        $entry->update([
            'status' => 'Endorsed',
            'held_at' => null,
            'hold_reason' => null,
            'endorsed_at' => now()->toDateString(),
            'endorse_remarks' => $remarks,
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => 'endorsed',
            'actor' => auth()->user()->name,
            'notes' => $remarks,
        ]);

        $this->notifyRoles(['reviewer', 'admin'], $entry, 'endorsed',
            'JL Form Ready for Review',
            "{$entry->reference} has been endorsed by the Division Head and is awaiting review"
        );

        $this->notifyOwner($entry, 'endorsed',
            'Your JL Request Was Endorsed',
            "{$entry->reference} has been endorsed by your Division Head and forwarded to the Reviewer"
        );

        return back();
    }

    public function review(Request $request, JlEntry $entry): RedirectResponse
    {
        $effective = $entry->status === 'On Hold' ? $entry->held_at : $entry->status;

        if ($effective !== 'Endorsed') {
            return back()->with('error', 'This entry is no longer awaiting review — it may have already been reviewed.');
        }

        $remarks = $request->input('review_remarks') ?: null;

        $entry->update([
            'status' => 'Reviewed',
            'held_at' => null,
            'hold_reason' => null,
            'reviewed_at' => now()->toDateString(),
            'review_remarks' => $remarks,
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => 'reviewed',
            'actor' => auth()->user()->name,
            'notes' => $remarks,
        ]);

        $this->notifyRoles(['vp', 'admin'], $entry, 'reviewed',
            'JL Form Ready for VP Approval',
            "{$entry->reference} has been reviewed and is awaiting your approval"
        );

        $this->notifyOwner($entry, 'reviewed',
            'Your JL Request Was Reviewed',
            "{$entry->reference} has been reviewed and forwarded to the VP Approver"
        );

        $this->notifyVpApprovalWebhook($entry);

        return back();
    }

    public function approve(Request $request, JlEntry $entry): RedirectResponse
    {
        $effective = $entry->status === 'On Hold' ? $entry->held_at : $entry->status;

        // VP Rejected is included so the VP can re-approve their own past rejection —
        // this is the only re-entry point into Approved besides the normal Reviewed path.
        if (! in_array($effective, ['Reviewed', 'VP Rejected'])) {
            return back()->with('error', 'This entry is no longer reviewed — it may have already been approved.');
        }

        $isReapproval = $effective === 'VP Rejected';
        $remarks = $request->input('approve_remarks') ?: null;

        $entry->update([
            'status' => 'Approved',
            'held_at' => null,
            'hold_reason' => null,
            'reject_reason' => null,
            'approved_at' => now()->toDateString(),
            'serial' => $this->generateSerial($entry),
            'approve_remarks' => $remarks,
        ]);

        $notes = $isReapproval ? 'Re-approved after a previous VP rejection.' : null;
        if ($remarks) {
            $notes = trim(($notes ? $notes.' ' : '').$remarks);
        }

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => 'approved',
            'actor' => auth()->user()->name,
            'notes' => $notes,
        ]);

        $this->notifyRoles(['purchasing', 'admin'], $entry, 'approved',
            'JL Form Approved — Ready for Processing',
            "{$entry->reference} has been approved by VP and is ready for processing"
        );

        $this->notifyOwner($entry, 'approved',
            'Your JL Request Was Approved',
            "{$entry->reference} has been approved".($entry->serial ? " — serial {$entry->serial}" : '')
        );

        return back();
    }

    public function reject(Request $request, JlEntry $entry): RedirectResponse
    {
        $effective = $entry->status === 'On Hold' ? $entry->held_at : $entry->status;
        $user = auth()->user();

        // VP can walk back their own approval, but only while it's still plainly
        // Approved — the instant Purchasing does anything to it (On Process, On Hold,
        // whatever), that window closes. This is a separate, VP-only reject path,
        // distinct from the normal Pending/Reviewed rejection every role above can do.
        $canRejectApproved = $user->hasAnyRole(['vp', 'admin']) && $entry->status === 'Approved';

        if (! in_array($effective, ['Pending', 'Endorsed', 'Reviewed'], true) && ! $canRejectApproved) {
            return back()->with('error', 'This entry can no longer be rejected — its status may have already changed.');
        }

        $isVpReject = $canRejectApproved || $effective === 'Reviewed';
        $reason = $request->input('reject_reason') ?: 'No reason provided.';

        $updateData = [
            'status' => $isVpReject ? 'VP Rejected' : 'Rejected',
            'held_at' => null,
            'hold_reason' => null,
            'reviewed_at' => $entry->reviewed_at ?? now()->toDateString(),
            'reject_reason' => $reason,
        ];

        if ($canRejectApproved) {
            // Undoing a finalized approval — the serial slot and approval date go
            // with it, so generateSerial()'s per-company count doesn't keep counting
            // an approval that no longer stands.
            $updateData['serial'] = null;
            $updateData['approved_at'] = null;
        }

        $entry->update($updateData);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => $isVpReject ? 'vp_rejected' : 'rejected',
            'actor' => auth()->user()->name,
            'notes' => $canRejectApproved
                ? 'Rejected after approval, before Purchasing action.'.($request->input('reject_reason') ? ' '.$request->input('reject_reason') : '')
                : ($request->input('reject_reason') ?: null),
        ]);

        if ($isVpReject) {
            $this->notifyRoles(['reviewer', 'admin'], $entry, 'vp_rejected',
                'JL Form Rejected by VP',
                "{$entry->reference} was rejected".($reason !== 'No reason provided.' ? ": {$reason}" : '')
            );
        } elseif ($effective === 'Endorsed') {
            // A Reviewer rejecting something the Division Head already endorsed —
            // let them know their endorsement didn't make it past the next stage.
            $this->notifyDivisionHead($entry, 'rejected',
                'JL Form Rejected by Reviewer',
                "{$entry->reference} was rejected".($reason !== 'No reason provided.' ? ": {$reason}" : '')
            );
        }

        $this->notifyOwner($entry, $isVpReject ? 'vp_rejected' : 'rejected',
            $isVpReject ? 'Your JL Request Was Rejected by VP' : 'Your JL Request Was Rejected',
            "{$entry->reference} was rejected".($reason !== 'No reason provided.' ? ": {$reason}" : '')
        );

        return back();
    }

    public function hold(Request $request, JlEntry $entry): RedirectResponse
    {
        if ($entry->status === 'On Hold') {
            return back()->with('error', 'This entry is already on hold.');
        }

        $previousStatus = $entry->status;

        $entry->update([
            'status' => 'On Hold',
            'held_at' => $previousStatus,
            'hold_reason' => $request->input('reason') ?: null,
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => 'on_hold',
            'actor' => auth()->user()->name,
            'notes' => $request->input('reason') ?: null,
        ]);

        // Which message fires is driven by the stage the entry was held at, not
        // the actor's role — a role check here would be ambiguous now that a
        // user can hold more than one role (e.g. requestor + purchasing).
        if ($previousStatus === 'Endorsed') {
            $this->notifyDivisionHead($entry, 'on_hold',
                'JL Form Put On Hold by Reviewer',
                "{$entry->reference} has been put on hold"
            );
        } elseif ($previousStatus === 'Reviewed') {
            $this->notifyRoles(['reviewer', 'admin'], $entry, 'on_hold',
                'JL Form Put On Hold by VP',
                "{$entry->reference} has been put on hold"
            );
        } elseif (in_array($previousStatus, ['Approved', 'On Process'], true)) {
            $this->notifyRoles(['reviewer', 'vp', 'admin'], $entry, 'on_hold',
                'JL Form Put On Hold by Purchasing',
                "{$entry->reference} has been put on hold by Purchasing"
            );
        }

        $this->notifyOwner($entry, 'on_hold',
            'Your JL Request Was Put On Hold',
            "{$entry->reference} has been put on hold".($entry->hold_reason ? ": {$entry->hold_reason}" : '')
        );

        return back();
    }

    public function process(Request $request, JlEntry $entry): RedirectResponse
    {
        $effective = $entry->status === 'On Hold' ? $entry->held_at : $entry->status;

        if (! in_array($effective, ['Approved', 'On Process'])) {
            return back()->with('error', 'This entry cannot be marked as On Process — its status may have already changed.');
        }

        $remarks = $request->input('process_remarks') ?: null;

        $entry->update([
            'status' => 'On Process',
            'held_at' => null,
            'hold_reason' => null,
            'processed_at' => now()->toDateString(),
            // Unlike the earlier stages, this action can legitimately fire twice
            // (Approved -> On Process, then again after a hold at that stage), so
            // an empty remarks box on the second pass keeps what was already noted
            // rather than silently erasing it.
            'process_remarks' => $remarks ?? $entry->process_remarks,
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event' => 'on_process',
            'actor' => auth()->user()->name,
            'notes' => $remarks,
        ]);

        $this->notifyRoles(['reviewer', 'vp', 'admin'], $entry, 'on_process',
            'JL Form Now On Process',
            "{$entry->reference} is currently being processed by Purchasing"
        );

        $this->notifyOwner($entry, 'on_process',
            'Your JL Request Is Now Being Processed',
            "{$entry->reference} is now being processed by Purchasing"
        );

        return back();
    }

    public function export(Request $request): StreamedResponse
    {
        $user = auth()->user();
        $allowed = collect($user->roles)
            ->flatMap(fn ($role) => $this->allowedExportStatuses($role))
            ->unique()
            ->values()
            ->all();

        $requested = $request->input('statuses', $allowed);
        $statuses = array_values(array_filter($requested, fn ($s) => in_array($s, $allowed)));

        if (empty($statuses)) {
            $statuses = $allowed;
        }

        $query = JlEntry::whereIn('status', $statuses);

        // Division Head is dept-scoped everywhere else — an unscoped export
        // would leak other divisions' data through the CSV, so scope it here
        // too, unless another one of the user's roles is meant to see everything.
        if ($user->hasRole('division_head') && ! $user->hasAnyRole(['admin', 'reviewer', 'vp', 'purchasing', 'purchasing_viewer'])) {
            $query->where('dept', $user->dept);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('submitted_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('submitted_at', '<=', $request->date_to);
        }

        $entries = $query->orderBy('submitted_at', 'desc')->get();
        $filename = 'jl-export-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($entries) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'Reference', 'Entry Type', 'Title', 'Date Prepared', 'Company', 'Department',
                'Manager', 'Est. Amount', 'Status', 'Held At', 'Serial No.',
                'Submitted', 'Endorsed', 'Reviewed', 'Approved', 'Reject Reason', 'Endorsement Remarks', 'Review Remarks', 'Approval Remarks',
            ]);
            foreach ($entries as $e) {
                fputcsv($out, [
                    $e->reference,
                    $e->entry_type,
                    $e->title,
                    $e->date,
                    $e->company,
                    $e->dept,
                    $e->manager,
                    $e->amount,
                    $e->status,
                    $e->held_at ?? '',
                    $e->serial ?? '',
                    $e->submitted_at,
                    $e->endorsed_at ?? '',
                    $e->reviewed_at ?? '',
                    $e->approved_at ?? '',
                    $e->reject_reason ?? '',
                    $e->endorse_remarks ?? '',
                    $e->review_remarks ?? '',
                    $e->approve_remarks ?? '',
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function storeFcmToken(Request $request): JsonResponse
    {
        $request->validate(['token' => 'required|string']);

        FcmToken::updateOrCreate(
            ['token' => $request->token],
            ['user_id' => auth()->id()],
        );

        return response()->json(['ok' => true]);
    }

    public function notifications(): JsonResponse
    {
        $user = auth()->user();

        return response()->json([
            'notifications' => $user->notifications()->latest()->take(20)->get(),
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    public function markRead(string $id): JsonResponse
    {
        auth()->user()->notifications()->where('id', $id)->first()?->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function markAllRead(): JsonResponse
    {
        auth()->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    private function notifyVpApprovalWebhook(JlEntry $entry): void
    {
        $url = config('services.vp_approval_webhook.url');
        if (! $url) {
            return;
        }

        $vpEmail = User::where('role', 'vp')->value('email');
        if (! $vpEmail) {
            return;
        }

        try {
            Http::withHeaders([
                'x-api-key' => config('services.vp_approval_webhook.api_key'),
                'Accept' => 'application/json',
            ])->post($url, [
                'email' => $vpEmail,
                'platform' => 'JL Monitoring',
                'url' => route('jl.vp'),
            ]);
        } catch (\Exception $e) {
            // Webhook failures must never block the actual review action.
        }
    }

    private function notifyRoles(array $roles, JlEntry $entry, string $event, string $title, string $body): void
    {
        // Recipients are resolved from role_user, not the legacy `role` column —
        // that column only reflects a user's highest-priority role since users
        // can hold more than one, so a role held secondarily would be missed.
        $users = User::whereHas('roleRows', fn ($q) => $q->whereIn('role', $roles))->get();
        if ($users->isNotEmpty()) {
            Notification::send($users, new JlNotification($entry, $event, $title, $body));
        }

        $userIds = User::whereHas('roleRows', fn ($q) => $q->whereIn('role', $roles))->pluck('id');
        $this->sendFcmToUserIds($userIds->all(), $title, $body);
    }

    /**
     * Notify the requestor who owns this entry — a role blast never reaches
     * them since "requestor" isn't one of the pipeline roles any event fans
     * out to, so every status change needs an explicit owner notification.
     */
    private function notifyOwner(JlEntry $entry, string $event, string $title, string $body): void
    {
        $owner = $entry->user;

        if (! $owner) {
            return;
        }

        Notification::send($owner, new JlNotification($entry, $event, $title, $body));
        $this->sendFcmToUserIds([$owner->id], $title, $body);
    }

    /**
     * Notify the Division Head(s) for this entry's department — unlike every
     * other role, Division Head is scoped to a single dept, so a blanket
     * notifyRoles(['division_head']) call would leak the notification to
     * every division's head instead of just the one this entry belongs to.
     */
    private function notifyDivisionHead(JlEntry $entry, string $event, string $title, string $body): void
    {
        $divisionHeads = User::whereHas('roleRows', fn ($q) => $q->where('role', 'division_head'))
            ->where('dept', $entry->dept)
            ->get();
        $admins = User::whereHas('roleRows', fn ($q) => $q->where('role', 'admin'))->get();
        $users = $divisionHeads->merge($admins)->unique('id');

        if ($users->isNotEmpty()) {
            Notification::send($users, new JlNotification($entry, $event, $title, $body));
        }

        $this->sendFcmToUserIds($users->pluck('id')->all(), $title, $body);
    }

    private function sendFcmToUserIds(array $userIds, string $title, string $body): void
    {
        $tokens = FcmToken::whereIn('user_id', $userIds)->pluck('token')->toArray();

        if (empty($tokens)) {
            return;
        }

        $projectId = config('services.firebase.project_id');
        $clientEmail = config('services.firebase.client_email');
        $privateKey = config('services.firebase.private_key');

        if (! $projectId || ! $clientEmail || ! $privateKey) {
            return;
        }

        try {
            $accessToken = $this->getFcmAccessToken($clientEmail, $privateKey);

            foreach ($tokens as $token) {
                Http::withToken($accessToken)
                    ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                        'message' => [
                            'token' => $token,
                            'notification' => ['title' => $title, 'body' => $body],
                        ],
                    ]);
            }
        } catch (\Throwable) {
            // FCM is best-effort — never block the main workflow
        }
    }

    private function getFcmAccessToken(string $clientEmail, string $privateKey): string
    {
        $now = time();
        $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claim = base64_encode(json_encode([
            'iss' => $clientEmail,
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $unsigned = $header.'.'.$claim;
        openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        $jwt = $unsigned.'.'.base64_encode($signature);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        return $response->json('access_token');
    }

    private function allowedExportStatuses(string $role): array
    {
        return match ($role) {
            'reviewer' => ['Pending', 'Endorsed', 'Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Hold', 'On Process', 'Cancelled'],
            'vp' => ['Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Hold', 'On Process'],
            'purchasing' => ['Approved', 'On Process', 'On Hold'],
            'purchasing_viewer' => ['Approved', 'On Process', 'On Hold'],
            'division_head' => ['Pending', 'Endorsed', 'Rejected', 'On Hold'],
            'admin' => ['Pending', 'Endorsed', 'Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Hold', 'On Process', 'Cancelled'],
            default => [],
        };
    }

    private function generateSerial(JlEntry $entry): string
    {
        $year = now()->year;
        $company = Company::where('name', $entry->company)->first();
        $prefix = $company?->code ?? strtoupper(substr($entry->company, 0, 3));

        $count = JlEntry::where('company', $entry->company)
            ->whereYear('approved_at', $year)
            ->whereNotNull('serial')
            ->count();

        return $prefix.'-JL-'.str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT).'-'.$year;
    }
}
