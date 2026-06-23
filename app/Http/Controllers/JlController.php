<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreJlRequest;
use App\Models\Company;
use App\Models\Department;
use App\Models\JlEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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
            'entries' => JlEntry::whereIn('status', ['Checked', 'Approved', 'VP Rejected'])
                ->latest()
                ->get(),
        ]);
    }

    public function store(StoreJlRequest $request): RedirectResponse
    {
        $entry = JlEntry::create([
            ...$request->validated(),
            'status'       => 'Pending',
            'submitted_at' => now()->toDateString(),
        ]);

        return back()->with('success', "Form submitted! Reference: {$entry->reference}");
    }

    public function check(JlEntry $entry): RedirectResponse
    {
        abort_if($entry->status !== 'Pending', 422, 'Entry is not pending.');

        $entry->update([
            'status'      => 'Checked',
            'reviewed_at' => now()->toDateString(),
        ]);

        return back();
    }

    public function approve(JlEntry $entry): RedirectResponse
    {
        abort_if($entry->status !== 'Checked', 422, 'Entry is not checked.');

        $entry->update([
            'status'      => 'Approved',
            'approved_at' => now()->toDateString(),
            'serial'      => $this->generateSerial($entry),
        ]);

        return back();
    }

    public function reject(Request $request, JlEntry $entry): RedirectResponse
    {
        abort_if(! in_array($entry->status, ['Pending', 'Checked']), 422, 'Entry cannot be rejected.');

        $entry->update([
            'status'        => $entry->status === 'Checked' ? 'VP Rejected' : 'Rejected',
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
