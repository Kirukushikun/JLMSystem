<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreJlRequest;
use App\Models\Company;
use App\Models\Department;
use App\Models\JlAuditLog;
use App\Models\JlEntry;
use App\Models\FcmToken;
use App\Models\User;
use App\Notifications\JlNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            'companies'   => Company::orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
        ]);
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
                  // On Hold entries held at Reviewer or VP stage (not Purchasing)
                  $q2->where('status', 'On Hold')
                     ->where('held_at', '!=', 'Pending');
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
        $data = $request->safe()->except(['attachment']);
        $user = auth()->user();

        // Requestors submit for their own assigned farm/department only — the
        // fields are disabled client-side, but that's not a security boundary,
        // so the account's values always win over whatever was posted.
        if ($user->role === 'requestor') {
            $data['company'] = $user->company;
            $data['dept']    = $user->dept;
        }

        $path         = null;
        $originalName = null;

        if ($request->hasFile('attachment')) {
            $file         = $request->file('attachment');
            $originalName = $file->getClientOriginalName();
            $path         = $file->store('jl-attachments', 'local');
        }

        $entry = JlEntry::create([
            ...$data,
            'user_id'         => $user->id,
            'attachment'      => $path,
            'attachment_name' => $originalName,
            'status'          => 'Pending',
            'submitted_at'    => now()->toDateString(),
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event'       => 'submitted',
            'actor'       => null,
        ]);

        $this->notifyRoles(['reviewer', 'admin'], $entry, 'submitted',
            'New JL Form Submitted',
            "{$entry->reference} — {$entry->company} ({$entry->dept})"
        );

        return back()->with('success', "Form submitted! Reference: {$entry->reference}");
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

    public function review(JlEntry $entry): RedirectResponse
    {
        $effective = $entry->status === 'On Hold' ? $entry->held_at : $entry->status;
        abort_if($effective !== 'Pending', 422, 'Entry is not pending.');

        $entry->update([
            'status'      => 'Reviewed',
            'held_at'     => null,
            'hold_reason' => null,
            'reviewed_at' => now()->toDateString(),
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event'       => 'reviewed',
            'actor'       => auth()->user()->name,
        ]);

        $this->notifyRoles(['vp', 'admin'], $entry, 'reviewed',
            'JL Form Ready for VP Approval',
            "{$entry->reference} has been reviewed and is awaiting your approval"
        );

        return back();
    }

    public function approve(JlEntry $entry): RedirectResponse
    {
        $effective = $entry->status === 'On Hold' ? $entry->held_at : $entry->status;
        abort_if($effective !== 'Reviewed', 422, 'Entry is not reviewed.');

        $entry->update([
            'status'      => 'Approved',
            'held_at'     => null,
            'hold_reason' => null,
            'approved_at' => now()->toDateString(),
            'serial'      => $this->generateSerial($entry),
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event'       => 'approved',
            'actor'       => auth()->user()->name,
        ]);

        $this->notifyRoles(['purchasing', 'admin'], $entry, 'approved',
            'JL Form Approved — Ready for Processing',
            "{$entry->reference} has been approved by VP and is ready for processing"
        );

        return back();
    }

    public function reject(Request $request, JlEntry $entry): RedirectResponse
    {
        $effective  = $entry->status === 'On Hold' ? $entry->held_at : $entry->status;
        abort_if(! in_array($effective, ['Pending', 'Reviewed']), 422, 'Entry cannot be rejected.');

        $isVpReject = $effective === 'Reviewed';
        $reason     = $request->input('reject_reason') ?: 'No reason provided.';

        $entry->update([
            'status'        => $isVpReject ? 'VP Rejected' : 'Rejected',
            'held_at'       => null,
            'hold_reason'   => null,
            'reviewed_at'   => $entry->reviewed_at ?? now()->toDateString(),
            'reject_reason' => $reason,
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event'       => $isVpReject ? 'vp_rejected' : 'rejected',
            'actor'       => auth()->user()->name,
            'notes'       => $request->input('reject_reason') ?: null,
        ]);

        if ($isVpReject) {
            $this->notifyRoles(['reviewer', 'admin'], $entry, 'vp_rejected',
                'JL Form Rejected by VP',
                "{$entry->reference} was rejected" . ($reason !== 'No reason provided.' ? ": {$reason}" : '')
            );
        }

        return back();
    }

    public function hold(Request $request, JlEntry $entry): RedirectResponse
    {
        abort_if($entry->status === 'On Hold', 422, 'Entry is already on hold.');

        $previousStatus = $entry->status;

        $entry->update([
            'status'      => 'On Hold',
            'held_at'     => $previousStatus,
            'hold_reason' => $request->input('reason') ?: null,
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event'       => 'on_hold',
            'actor'       => auth()->user()->name,
            'notes'       => $request->input('reason') ?: null,
        ]);

        $actorRole = auth()->user()->role;

        if ($actorRole === 'vp') {
            $this->notifyRoles(['reviewer', 'admin'], $entry, 'on_hold',
                'JL Form Put On Hold by VP',
                "{$entry->reference} has been put on hold"
            );
        } elseif ($actorRole === 'purchasing') {
            $this->notifyRoles(['reviewer', 'vp', 'admin'], $entry, 'on_hold',
                'JL Form Put On Hold by Purchasing',
                "{$entry->reference} has been put on hold by Purchasing"
            );
        }

        return back();
    }

    public function process(JlEntry $entry): RedirectResponse
    {
        $effective = $entry->status === 'On Hold' ? $entry->held_at : $entry->status;
        abort_if(! in_array($effective, ['Approved', 'On Process']), 422, 'Entry cannot be marked as On Process.');

        $entry->update([
            'status'      => 'On Process',
            'held_at'     => null,
            'hold_reason' => null,
        ]);

        JlAuditLog::create([
            'jl_entry_id' => $entry->id,
            'event'       => 'on_process',
            'actor'       => auth()->user()->name,
        ]);

        $this->notifyRoles(['reviewer', 'vp', 'admin'], $entry, 'on_process',
            'JL Form Now On Process',
            "{$entry->reference} is currently being processed by Purchasing"
        );

        return back();
    }

    public function export(Request $request): StreamedResponse
    {
        $user = auth()->user();
        $allowed = $this->allowedExportStatuses($user->role);

        $requested = $request->input('statuses', $allowed);
        $statuses  = array_values(array_filter($requested, fn ($s) => in_array($s, $allowed)));

        if (empty($statuses)) {
            $statuses = $allowed;
        }

        $query = JlEntry::whereIn('status', $statuses);

        if ($request->filled('date_from')) {
            $query->whereDate('submitted_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('submitted_at', '<=', $request->date_to);
        }

        $entries  = $query->orderBy('submitted_at', 'desc')->get();
        $filename = 'jl-export-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($entries) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'Reference', 'Title', 'Date Prepared', 'Company', 'Department',
                'Manager', 'Est. Amount', 'Status', 'Held At', 'Serial No.',
                'Submitted', 'Reviewed', 'Approved', 'Reject Reason',
            ]);
            foreach ($entries as $e) {
                fputcsv($out, [
                    $e->reference,
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
                    $e->reviewed_at ?? '',
                    $e->approved_at ?? '',
                    $e->reject_reason ?? '',
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function storeFcmToken(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate(['token' => 'required|string']);

        FcmToken::updateOrCreate(
            ['token'   => $request->token],
            ['user_id' => auth()->id()],
        );

        return response()->json(['ok' => true]);
    }

    public function notifications(): \Illuminate\Http\JsonResponse
    {
        $user = auth()->user();
        return response()->json([
            'notifications' => $user->notifications()->latest()->take(20)->get(),
            'unread_count'  => $user->unreadNotifications()->count(),
        ]);
    }

    public function markRead(string $id): \Illuminate\Http\JsonResponse
    {
        auth()->user()->notifications()->where('id', $id)->first()?->markAsRead();
        return response()->json(['ok' => true]);
    }

    public function markAllRead(): \Illuminate\Http\JsonResponse
    {
        auth()->user()->unreadNotifications()->update(['read_at' => now()]);
        return response()->json(['ok' => true]);
    }

    private function notifyRoles(array $roles, JlEntry $entry, string $event, string $title, string $body): void
    {
        $users = User::whereIn('role', $roles)->get();
        if ($users->isNotEmpty()) {
            Notification::send($users, new JlNotification($entry, $event, $title, $body));
        }

        $this->sendFcmToRoles($roles, $title, $body);
    }

    private function sendFcmToRoles(array $roles, string $title, string $body): void
    {
        $userIds = User::whereIn('role', $roles)->pluck('id');
        $tokens  = FcmToken::whereIn('user_id', $userIds)->pluck('token')->toArray();

        if (empty($tokens)) return;

        $projectId   = config('services.firebase.project_id');
        $clientEmail = config('services.firebase.client_email');
        $privateKey  = config('services.firebase.private_key');

        if (! $projectId || ! $clientEmail || ! $privateKey) return;

        try {
            $accessToken = $this->getFcmAccessToken($clientEmail, $privateKey);

            foreach ($tokens as $token) {
                Http::withToken($accessToken)
                    ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                        'message' => [
                            'token'        => $token,
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
        $now    = time();
        $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claim  = base64_encode(json_encode([
            'iss'   => $clientEmail,
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud'   => 'https://oauth2.googleapis.com/token',
            'iat'   => $now,
            'exp'   => $now + 3600,
        ]));

        $unsigned = $header . '.' . $claim;
        openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        $jwt = $unsigned . '.' . base64_encode($signature);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $jwt,
        ]);

        return $response->json('access_token');
    }

    private function allowedExportStatuses(string $role): array
    {
        return match ($role) {
            'reviewer'   => ['Pending', 'Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Hold', 'On Process'],
            'vp'         => ['Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Hold', 'On Process'],
            'purchasing' => ['Approved', 'On Process', 'On Hold'],
            'admin'      => ['Pending', 'Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Hold', 'On Process'],
            default      => [],
        };
    }

    private function generateSerial(JlEntry $entry): string
    {
        $year    = now()->year;
        $company = Company::where('name', $entry->company)->first();
        $prefix  = $company?->code ?? strtoupper(substr($entry->company, 0, 3));

        $count = JlEntry::where('company', $entry->company)
            ->whereYear('approved_at', $year)
            ->whereNotNull('serial')
            ->count();

        return $prefix . '-JL-' . str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT) . '-' . $year;
    }
}
