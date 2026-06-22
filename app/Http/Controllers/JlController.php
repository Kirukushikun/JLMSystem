<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class JlController extends Controller
{
    public function submit(): Response
    {
        return Inertia::render('jl/Submit');
    }

    public function reviewer(): Response
    {
        return Inertia::render('jl/Reviewer', [
            'entries' => $this->mockEntries(),
        ]);
    }

    public function vp(): Response
    {
        $vpStatuses = ['Checked', 'Approved', 'VP Rejected'];

        return Inertia::render('jl/Vp', [
            'entries' => array_values(
                array_filter(
                    $this->mockEntries(),
                    fn ($e) => in_array($e['status'], $vpStatuses)
                )
            ),
        ]);
    }

    /** @return array<int, array<string, mixed>> */
    private function mockEntries(): array
    {
        return [
            [
                'id' => 'JL-001-2026',
                'title' => 'Farm Labor Cost Q1 2026',
                'date' => '2026-01-15',
                'company' => 'BFC Farm Davao',
                'manager' => 'Roberto Dela Cruz',
                'dept' => 'Operations',
                'amount' => 125000,
                'status' => 'Approved',
                'serial' => 'BFC-JL-001-2026',
                'submittedAt' => '2026-01-15',
                'reviewedAt' => '2026-01-17',
                'approvedAt' => '2026-01-20',
                'rejectReason' => null,
            ],
            [
                'id' => 'JL-002-2026',
                'title' => 'Harvesting Equipment Maintenance',
                'date' => '2026-02-10',
                'company' => 'BFC Farm Bukidnon',
                'manager' => 'Maria Santos',
                'dept' => 'Maintenance',
                'amount' => 87500,
                'status' => 'Checked',
                'serial' => null,
                'submittedAt' => '2026-02-10',
                'reviewedAt' => '2026-02-12',
                'approvedAt' => null,
                'rejectReason' => null,
            ],
            [
                'id' => 'JL-003-2026',
                'title' => 'Logistics Labor — March Run',
                'date' => '2026-03-05',
                'company' => 'BFC Farm Cotabato',
                'manager' => 'Juan Ramos',
                'dept' => 'Logistics',
                'amount' => 43000,
                'status' => 'Rejected',
                'serial' => null,
                'submittedAt' => '2026-03-05',
                'reviewedAt' => '2026-03-06',
                'approvedAt' => null,
                'rejectReason' => 'Missing supporting documents for overtime hours.',
            ],
            [
                'id' => 'JL-004-2026',
                'title' => 'HR Onboarding Cost April',
                'date' => '2026-04-20',
                'company' => 'BFC Group HQ',
                'manager' => 'Ana Mendoza',
                'dept' => 'Human Resources',
                'amount' => 31000,
                'status' => 'Pending',
                'serial' => null,
                'submittedAt' => '2026-04-20',
                'reviewedAt' => null,
                'approvedAt' => null,
                'rejectReason' => null,
            ],
            [
                'id' => 'JL-005-2026',
                'title' => 'Q2 Finance Audit Labor',
                'date' => '2026-05-01',
                'company' => 'BFC Farm Mindanao',
                'manager' => 'Carlos Villanueva',
                'dept' => 'Finance',
                'amount' => 56800,
                'status' => 'Pending',
                'serial' => null,
                'submittedAt' => '2026-05-01',
                'reviewedAt' => null,
                'approvedAt' => null,
                'rejectReason' => null,
            ],
        ];
    }
}
