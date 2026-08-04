<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// One-off: manually test the VP approval webhook end-to-end. Remove after the test.
Artisan::command('test:vp-webhook', function () {
    $admin = \App\Models\User::where('role', 'admin')->firstOrFail();
    \Illuminate\Support\Facades\Auth::loginUsingId($admin->id);

    $entry = \App\Models\JlEntry::create([
        'user_id'      => $admin->id,
        'title'        => 'TEST - webhook trigger, please ignore',
        'date'         => now(),
        'company'      => 'BFC',
        'manager'      => 'Test Manager',
        'dept'         => 'IT and Security Services',
        'amount'       => 1,
        'status'       => 'Pending',
        'submitted_at' => now(),
    ]);

    $this->info("Created test entry: {$entry->reference} (id={$entry->id})");

    app(\App\Http\Controllers\JlController::class)->review($entry);

    $this->info('Triggered review() -> webhook should have fired.');
    $this->info("TEST_ENTRY_ID={$entry->id}");
})->purpose('Fire the VP approval webhook with a throwaway test entry');

// Backup tasks
Schedule::command('backup:run')
    ->dailyAt('19:00')
    ->description('Run database backup daily after working hours')
    ->withoutOverlapping();

Schedule::command('backup:clean')
    ->dailyAt('05:00')
    ->description('Clean up old backups daily')
    ->withoutOverlapping();

Schedule::command('backup:monitor')
    ->daily()
    ->description('Monitor backup health daily');
