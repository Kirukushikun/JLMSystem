<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

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
