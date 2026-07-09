<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Department;
use App\Models\JlEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MaintenanceController extends Controller
{
    private const VALID_STATUSES = ['Pending', 'Reviewed', 'Rejected', 'Approved', 'VP Rejected', 'On Hold', 'On Process'];

    public function index(): Response
    {
        return Inertia::render('admin/Maintenance', [
            'companies'   => Company::orderBy('name')->get(),
            'departments' => Department::orderBy('name')->get(),
        ]);
    }

    public function storeCompany(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:companies,name',
            'code' => 'required|string|max:10',
        ]);

        $data['code'] = strtoupper($data['code']);

        Company::create($data);

        return back()->with('success', "{$data['name']} has been added.");
    }

    public function destroyCompany(Company $company): RedirectResponse
    {
        $inUse = JlEntry::where('company', $company->name)->exists();

        if ($inUse) {
            return back()->with('error', "Cannot remove \"{$company->name}\" — it has existing JL entries.");
        }

        $name = $company->name;
        $company->delete();

        return back()->with('success', "\"{$name}\" has been removed.");
    }

    public function exportCompanies(): StreamedResponse
    {
        $companies = Company::orderBy('name')->get();

        return response()->streamDownload(function () use ($companies) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name', 'Code']);
            foreach ($companies as $c) {
                fputcsv($out, [$c->name, $c->code]);
            }
            fclose($out);
        }, 'companies-' . now()->format('Y-m-d') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function importCompanies(Request $request): RedirectResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        [$rows, $error] = $this->readCsv($request->file('file'));
        if ($error) {
            return back()->with('error', $error);
        }

        $imported = 0;
        $errors   = [];

        foreach ($rows as $i => $row) {
            $line = $i + 2;
            $name = trim($row['Name'] ?? '');
            $code = trim($row['Code'] ?? '');

            if ($name === '' || $code === '') {
                $errors[] = "Row {$line}: missing name or code.";
                continue;
            }

            Company::updateOrCreate(['name' => $name], ['code' => strtoupper($code)]);
            $imported++;
        }

        return $this->importResponse('company', 'companies', $imported, $errors);
    }

    public function storeDepartment(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:departments,name',
        ]);

        Department::create($data);

        return back()->with('success', "{$data['name']} has been added.");
    }

    public function destroyDepartment(Department $department): RedirectResponse
    {
        $inUse = JlEntry::where('dept', $department->name)->exists();

        if ($inUse) {
            return back()->with('error', "Cannot remove \"{$department->name}\" — it has existing JL entries.");
        }

        $name = $department->name;
        $department->delete();

        return back()->with('success', "\"{$name}\" has been removed.");
    }

    public function exportDepartments(): StreamedResponse
    {
        $departments = Department::orderBy('name')->get();

        return response()->streamDownload(function () use ($departments) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name']);
            foreach ($departments as $d) {
                fputcsv($out, [$d->name]);
            }
            fclose($out);
        }, 'departments-' . now()->format('Y-m-d') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function importDepartments(Request $request): RedirectResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        [$rows, $error] = $this->readCsv($request->file('file'));
        if ($error) {
            return back()->with('error', $error);
        }

        $imported = 0;
        $errors   = [];

        foreach ($rows as $i => $row) {
            $line = $i + 2;
            $name = trim($row['Name'] ?? '');

            if ($name === '') {
                $errors[] = "Row {$line}: missing name.";
                continue;
            }

            Department::updateOrCreate(['name' => $name]);
            $imported++;
        }

        return $this->importResponse('department', 'departments', $imported, $errors);
    }

    /**
     * Import JL entries from a CSV in the same column layout produced by JlController::export().
     * Intended for seeding historical records when redeploying to a new environment — not for
     * everyday use, since re-importing the same file will create duplicate entries.
     */
    public function importJlEntries(Request $request): RedirectResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:10240']]);

        [$rows, $error] = $this->readCsv($request->file('file'));
        if ($error) {
            return back()->with('error', $error);
        }

        $companyNames = Company::pluck('name')->all();
        $deptNames    = Department::pluck('name')->all();

        $imported = 0;
        $errors   = [];
        $seenSerials = [];

        DB::transaction(function () use ($rows, $companyNames, $deptNames, &$imported, &$errors, &$seenSerials) {
            foreach ($rows as $i => $row) {
                $line = $i + 2;

                $title    = trim($row['Title'] ?? '');
                $date     = trim($row['Date Prepared'] ?? '');
                $company  = trim($row['Company'] ?? '');
                $dept     = trim($row['Department'] ?? '');
                $manager  = trim($row['Manager'] ?? '');
                $amount   = preg_replace('/[^0-9.\-]/', '', $row['Est. Amount'] ?? '');
                $status   = trim($row['Status'] ?? '');
                $heldAt   = trim($row['Held At'] ?? '') ?: null;
                $serial   = trim($row['Serial No.'] ?? '') ?: null;
                $submitted = trim($row['Submitted'] ?? '');
                $reviewed  = trim($row['Reviewed'] ?? '') ?: null;
                $approved  = trim($row['Approved'] ?? '') ?: null;
                $rejectReason = trim($row['Reject Reason'] ?? '') ?: null;

                if ($title === '' || $company === '' || $dept === '' || $manager === '' || $date === '' || $submitted === '') {
                    $errors[] = "Row {$line}: missing required field(s).";
                    continue;
                }
                if (! in_array($company, $companyNames, true)) {
                    $errors[] = "Row {$line}: unknown company \"{$company}\" — add it in Maintenance first.";
                    continue;
                }
                if (! in_array($dept, $deptNames, true)) {
                    $errors[] = "Row {$line}: unknown department \"{$dept}\" — add it in Maintenance first.";
                    continue;
                }
                if (! in_array($status, self::VALID_STATUSES, true)) {
                    $errors[] = "Row {$line}: invalid status \"{$status}\".";
                    continue;
                }
                if ($amount === '' || ! is_numeric($amount)) {
                    $errors[] = "Row {$line}: invalid amount.";
                    continue;
                }
                if (! strtotime($date) || ! strtotime($submitted)) {
                    $errors[] = "Row {$line}: invalid date.";
                    continue;
                }

                // A serial only ever exists on an Approved entry (see generateSerial()) —
                // discard anything in this column on other statuses rather than trusting
                // it as a real serial (historical exports sometimes leak the Reference
                // number into this column for non-approved rows).
                if ($status !== 'Approved') {
                    $serial = null;
                }

                // Historical rows are often missing per-stage timestamps. Default the
                // review/approval dates to the submission date so this row is still
                // picked up by generateSerial()'s whereYear('approved_at', ...) count
                // when future entries are approved.
                if ($status === 'Approved') {
                    $submittedDate = date('Y-m-d', strtotime($submitted));
                    $reviewed = $reviewed ?: $submittedDate;
                    $approved = $approved ?: $submittedDate;
                }

                // An On Hold entry needs to know which stage it was held at, or it
                // becomes unreachable in every dashboard; default to Pending.
                if ($status === 'On Hold' && ! $heldAt) {
                    $heldAt = 'Pending';
                }

                // `serial` is UNIQUE — check for collisions up front (both within this
                // file and against what's already in the database) so a duplicate is
                // reported as a normal skipped row instead of an uncaught exception
                // that rolls back the entire batch.
                if ($serial !== null) {
                    if (isset($seenSerials[$serial])) {
                        $errors[] = "Row {$line}: duplicate serial \"{$serial}\" (already used by row {$seenSerials[$serial]} in this file).";
                        continue;
                    }
                    if (JlEntry::where('serial', $serial)->exists()) {
                        $errors[] = "Row {$line}: serial \"{$serial}\" already exists in the database.";
                        continue;
                    }
                    $seenSerials[$serial] = $line;
                }

                try {
                    JlEntry::create([
                        'title'         => $title,
                        'date'          => $date,
                        'company'       => $company,
                        'dept'          => $dept,
                        'manager'       => $manager,
                        'amount'        => (float) $amount,
                        'status'        => $status,
                        'held_at'       => $heldAt,
                        'serial'        => $serial,
                        'submitted_at'  => $submitted,
                        'reviewed_at'   => $reviewed ?: null,
                        'approved_at'   => $approved ?: null,
                        'reject_reason' => $rejectReason,
                    ]);

                    $imported++;
                } catch (\Throwable $e) {
                    $errors[] = "Row {$line}: could not be saved (" . Str::limit($e->getMessage(), 120) . ').';
                }
            }
        });

        return $this->importResponse('JL entry', 'JL entries', $imported, $errors);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * @return array{0: array<int, array<string, string|null>>, 1: string|null}
     */
    private function readCsv(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if (! $handle) {
            return [[], 'Could not read the uploaded file.'];
        }

        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);
            return [[], 'The file is empty.'];
        }

        $columns = count($header);
        $rows    = [];

        while (($line = fgetcsv($handle)) !== false) {
            if ($line === [null] || $line === false) {
                continue;
            }
            $line = array_pad(array_slice($line, 0, $columns), $columns, null);
            $rows[] = array_combine($header, $line);
        }

        fclose($handle);

        return [$rows, null];
    }

    private function importResponse(string $singular, string $plural, int $imported, array $errors): RedirectResponse
    {
        $label   = $imported === 1 ? $singular : $plural;
        $message = "Imported {$imported} {$label}.";

        if ($errors) {
            $shown = array_slice($errors, 0, 5);
            $message .= ' ' . count($errors) . ' row(s) skipped: ' . implode(' ', $shown);
            if (count($errors) > 5) {
                $message .= ' …and ' . (count($errors) - 5) . ' more.';
            }
        }

        return $imported === 0 && $errors
            ? back()->with('error', $message)
            : back()->with('success', $message);
    }
}
