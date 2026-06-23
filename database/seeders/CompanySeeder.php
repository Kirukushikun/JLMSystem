<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $companies = [
            ['name' => 'BFC',      'code' => 'BFC'],
            ['name' => 'BDL',      'code' => 'BDL'],
            ['name' => 'PFC',      'code' => 'PFC'],
            ['name' => 'RH',       'code' => 'RH'],
            ['name' => 'Feedmill', 'code' => 'FML'],
        ];

        foreach ($companies as $data) {
            Company::firstOrCreate(['name' => $data['name']], ['code' => $data['code']]);
        }
    }
}
