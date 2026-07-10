<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            'Accounting',
            'Audit',
            'Feedmill',
            'General Services',
            'Human Resources',
            'IT and Security Services',
            'Poultry',
            'Purchasing',
            'Sales & Marketing',
            'Swine',
            'Treasury',
        ];

        foreach ($departments as $name) {
            Department::firstOrCreate(['name' => $name]);
        }
    }
}
