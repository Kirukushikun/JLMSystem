<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    public function index(): Response
    {
        $apiUsers   = $this->fetchApiUsers();
        $localUsers = User::all()->keyBy('id')->map(fn($u) => [
            'role'    => $u->role,
            'company' => $u->company,
            'dept'    => $u->dept,
        ]);

        return Inertia::render('admin/Users', [
            'apiUsers'    => $apiUsers,
            'localUsers'  => $localUsers,
            'companies'   => Company::orderBy('name')->pluck('name'),
            'departments' => Department::orderBy('name')->pluck('name'),
        ]);
    }

    public function assign(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'id'      => 'required|integer',
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'role'    => 'required|in:reviewer,vp,purchasing,admin,requestor',
            'company' => ['required_if:role,requestor', 'nullable', 'string', Rule::exists('companies', 'name')],
            'dept'    => ['required_if:role,requestor', 'nullable', 'string', Rule::exists('departments', 'name')],
        ]);

        // Company/department only apply to requestors — clear them for every other role.
        $company = $data['role'] === 'requestor' ? $data['company'] : null;
        $dept    = $data['role'] === 'requestor' ? $data['dept'] : null;

        $user = User::find($data['id']);

        if ($user) {
            $user->update(['name' => $data['name'], 'role' => $data['role'], 'company' => $company, 'dept' => $dept]);
        } else {
            DB::table('users')->insert([
                'id'         => $data['id'],
                'name'       => $data['name'],
                'email'      => $data['email'],
                'role'       => $data['role'],
                'company'    => $company,
                'dept'       => $dept,
                'password'   => Hash::make(Str::random(32)),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $label = match ($data['role']) {
            'vp'         => 'VP Approver',
            'purchasing' => 'Purchasing',
            'admin'      => 'Admin',
            'requestor'  => 'Requestor',
            default      => 'Reviewer',
        };

        return back()->with('success', "{$data['name']} has been granted {$label} access.");
    }

    public function revoke(int $id): RedirectResponse
    {
        $user = User::find($id);

        if (! $user) {
            return back()->with('error', 'User not found.');
        }

        $name = $user->name;
        $user->delete();

        return back()->with('success', "{$name}'s access has been revoked.");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function fetchApiUsers(): array
    {
        try {
            $response = Http::withHeaders(['x-api-key' => config('services.user_api.key')])
                ->withOptions(['verify' => storage_path('cacert.pem')])
                ->post(config('services.user_api.endpoint'));

            if (! $response->successful()) {
                return [];
            }

            $raw   = $response->json();
            $users = $raw['data'] ?? $raw;

            $decrypted = [];
            foreach ($users as $user) {
                try {
                    $user['id'] = (int) Crypt::decryptString($user['id']);
                    $decrypted[] = $user;
                } catch (\Exception $e) {
                    // skip users whose ID can't be decrypted
                }
            }

            return $decrypted;
        } catch (\Exception $e) {
            return [];
        }
    }
}
