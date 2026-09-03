<?php

namespace Database\Seeders;

use App\Models\RoleUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['id' => 5,   'name' => 'Admin',     'email' => 'admin@bfcgroup.org',      'role' => 'admin'],
            ['id' => 61,  'name' => 'Admin IT',  'email' => 'admin_it@bfcgroup.org',   'role' => 'admin'],
            ['id' => 63,  'name' => 'Purchasing', 'email' => 'purchasing@bfcgroup.org', 'role' => 'purchasing'],
            ['id' => 64,  'name' => 'VP Approver', 'email' => 'vp@bfcgroup.org',         'role' => 'vp'],
            ['id' => 100, 'name' => 'Reviewer',  'email' => 'reviewer@bfcgroup.org',   'role' => 'reviewer'],
        ];

        foreach ($users as $user) {
            DB::table('users')->insertOrIgnore([
                ...$user,
                'password' => Hash::make(Str::random(32)),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // insertOrIgnore doesn't touch the role_user pivot, so a fresh
            // environment (migrate:fresh --seed) would otherwise leave these
            // accounts with no role hasRole()/hasAnyRole() can actually see.
            RoleUser::firstOrCreate(['user_id' => $user['id'], 'role' => $user['role']]);
        }
    }
}
