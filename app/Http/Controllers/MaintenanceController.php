<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Department;
use App\Models\JlEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceController extends Controller
{
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
}
