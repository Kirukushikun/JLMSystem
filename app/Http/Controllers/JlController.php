<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreJlRequest;
use App\Models\Company;
use App\Models\Department;
use App\Models\JlEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        return Inertia::render('jl/Vp', [
            'entries' => JlEntry::whereIn('status', ['Reviewed', 'Approved', 'VP Rejected'])
                ->latest()
                ->get(),
        ]);
    }

    public function store(StoreJlRequest $request): RedirectResponse
    {
        $data = $request->safe()->except(['attachment']);

        $path         = null;
        $originalName = null;

        if ($request->hasFile('attachment')) {
            $file         = $request->file('attachment');
            $originalName = $file->getClientOriginalName();
            $path         = $file->store('jl-attachments', 'local');
        }

        $entry = JlEntry::create([
            ...$data,
            'attachment'      => $path,
            'attachment_name' => $originalName,
            'status'          => 'Pending',
            'submitted_at'    => now()->toDateString(),
        ]);

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
        abort_if($entry->status !== 'Pending', 422, 'Entry is not pending.');

        $entry->update([
            'status'      => 'Reviewed',
            'reviewed_at' => now()->toDateString(),
        ]);

        return back();
    }

    public function approve(JlEntry $entry): RedirectResponse
    {
        abort_if($entry->status !== 'Reviewed', 422, 'Entry is not reviewed.');

        $entry->update([
            'status'      => 'Approved',
            'approved_at' => now()->toDateString(),
            'serial'      => $this->generateSerial($entry),
        ]);

        return back();
    }

    public function reject(Request $request, JlEntry $entry): RedirectResponse
    {
        abort_if(! in_array($entry->status, ['Pending', 'Reviewed']), 422, 'Entry cannot be rejected.');

        $entry->update([
            'status'        => $entry->status === 'Reviewed' ? 'VP Rejected' : 'Rejected',
            'reviewed_at'   => $entry->reviewed_at ?? now()->toDateString(),
            'reject_reason' => $request->input('reject_reason') ?: 'No reason provided.',
        ]);

        return back();
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
