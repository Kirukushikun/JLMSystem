<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->insertOrIgnore([
            'id'         => 61,
            'name'       => 'Admin IT',
            'email'      => 'admin_it@bfcgroup.org',
            'role'       => 'admin',
            'password'   => Hash::make(Str::random(32)), // placeholder — login uses external API
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
