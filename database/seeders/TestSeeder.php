<?php

namespace Database\Seeders;

use App\Models\RoleUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Creates one dummy login per role, for use with LoginController's testing
 * mode (enabled automatically when no Turnstile site key is configured —
 * see LoginController::testingModeEnabled()). Not part of DatabaseSeeder's
 * default run — seed it explicitly:
 *
 *   php artisan db:seed --class=TestSeeder
 *
 * These accounts authenticate with a real local password instead of the
 * external Auth API, so this refuses to run against production.
 */
class TestSeeder extends Seeder
{
    public const PASSWORD = 'password';

    /** @var array<int, array{id: int, name: string, email: string, role: string, company?: string, dept?: string}> */
    public const ACCOUNTS = [
        ['id' => 900001, 'name' => 'Test Admin', 'email' => 'admin@test.local', 'role' => 'admin'],
        ['id' => 900002, 'name' => 'Test VP Approver', 'email' => 'vp@test.local', 'role' => 'vp'],
        ['id' => 900003, 'name' => 'Test Purchasing', 'email' => 'purchasing@test.local', 'role' => 'purchasing'],
        ['id' => 900004, 'name' => 'Test Purchasing Viewer', 'email' => 'purchasing_viewer@test.local', 'role' => 'purchasing_viewer'],
        ['id' => 900005, 'name' => 'Test Reviewer', 'email' => 'reviewer@test.local', 'role' => 'reviewer'],
        ['id' => 900006, 'name' => 'Test Division Head', 'email' => 'division_head@test.local', 'role' => 'division_head', 'dept' => 'Accounting'],
        ['id' => 900007, 'name' => 'Test Requestor', 'email' => 'requestor@test.local', 'role' => 'requestor', 'company' => 'BFC', 'dept' => 'Accounting'],
    ];

    public function run(): void
    {
        if (app()->environment('production')) {
            // Only ever invoked via `php artisan db:seed --class=TestSeeder`,
            // which always sets $command before calling run().
            $this->command->error('TestSeeder creates well-known dummy credentials and refuses to run in production.');

            return;
        }

        foreach (self::ACCOUNTS as $account) {
            DB::table('users')->insertOrIgnore([
                'id' => $account['id'],
                'name' => $account['name'],
                'email' => $account['email'],
                'role' => $account['role'],
                'company' => $account['company'] ?? null,
                'dept' => $account['dept'] ?? null,
                'password' => Hash::make(self::PASSWORD),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            RoleUser::firstOrCreate(['user_id' => $account['id'], 'role' => $account['role']]);
        }

        $this->command->info('Testing accounts ready — password for all: '.self::PASSWORD);
    }
}
