<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Department;
use App\Models\RoleUser;
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
        $apiUsers = $this->fetchApiUsers();
        $localUsers = User::with('roleRows')->get()->keyBy('id')->map(fn ($u) => [
            'roles' => $u->roles,
            'company' => $u->company,
            'dept' => $u->dept,
        ]);

        return Inertia::render('admin/Users', [
            'apiUsers' => $apiUsers,
            'localUsers' => $localUsers,
            'companies' => Company::orderBy('name')->pluck('name'),
            'departments' => Department::orderBy('name')->pluck('name'),
        ]);
    }

    public function assign(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'id' => 'required|integer',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'roles' => 'required|array|min:1',
            'roles.*' => 'in:reviewer,vp,purchasing,purchasing_viewer,division_head,admin,requestor',
            'company' => ['nullable', 'string', Rule::exists('companies', 'name')],
            'dept' => ['nullable', 'string', Rule::exists('departments', 'name')],
        ]);

        $roles = array_values(array_unique($data['roles']));
        $isRequestor = in_array('requestor', $roles, true);
        $isDivisionHead = in_array('division_head', $roles, true);

        if ($isRequestor && (empty($data['company']) || empty($data['dept']))) {
            return back()->withErrors(['company' => 'Farm and department are required for the Requestor role.'])->withInput();
        }

        if ($isDivisionHead && empty($data['dept'])) {
            return back()->withErrors(['dept' => 'Department is required for the Division Head role.'])->withInput();
        }

        // Company only applies to requestors; department applies to requestors
        // and division heads (which department's queue they act on) — clear
        // whichever doesn't apply to the roles being assigned.
        $company = $isRequestor ? $data['company'] : null;
        $dept = ($isRequestor || $isDivisionHead) ? $data['dept'] : null;

        // `role` stays as a single legacy column — the highest-priority role
        // held, per User::ALL_ROLES — used for the post-login landing page
        // and anywhere else that can only reasonably act on one role.
        $primaryRole = collect(User::ALL_ROLES)->first(fn ($r) => in_array($r, $roles, true));

        $user = User::find($data['id']);

        if ($user) {
            $user->update(['name' => $data['name'], 'role' => $primaryRole, 'company' => $company, 'dept' => $dept]);
        } else {
            DB::table('users')->insert([
                'id' => $data['id'],
                'name' => $data['name'],
                'email' => $data['email'],
                'role' => $primaryRole,
                'company' => $company,
                'dept' => $dept,
                'password' => Hash::make(Str::random(32)),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        RoleUser::where('user_id', $data['id'])->whereNotIn('role', $roles)->delete();
        foreach ($roles as $role) {
            RoleUser::firstOrCreate(['user_id' => $data['id'], 'role' => $role]);
        }

        $labels = collect($roles)->map(fn ($r) => match ($r) {
            'vp' => 'VP Approver',
            'purchasing' => 'Purchasing',
            'purchasing_viewer' => 'Purchasing (View Only)',
            'division_head' => 'Division Head',
            'admin' => 'Admin',
            'requestor' => 'Requestor',
            default => 'Reviewer',
        })->implode(', ');

        return back()->with('success', "{$data['name']} has been granted access as: {$labels}.");
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

            $raw = $response->json();
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
