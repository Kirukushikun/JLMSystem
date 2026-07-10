<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $companies = [
            ['name' => 'BFC',       'code' => 'BFC'],
            ['name' => 'BFC-IRAQ',  'code' => 'IRAQ'],
            ['name' => 'BROOKDALE', 'code' => 'BDL'],
            ['name' => 'FEEDMILL',  'code' => 'FEEDMILL'],
            ['name' => 'HATCHERY',  'code' => 'HAT'],
            ['name' => 'PFC',       'code' => 'PFC'],
            ['name' => 'RH/BBGC',   'code' => 'RH/BBGC'],
        ];

        foreach ($companies as $data) {
            Company::firstOrCreate(['name' => $data['name']], ['code' => $data['code']]);
        }
    }
}
