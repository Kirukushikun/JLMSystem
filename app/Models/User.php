<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $role reviewer | vp | purchasing | purchasing_viewer | requestor | admin — the primary/legacy role, kept for the default post-login landing page and CSV export defaults. Use hasRole()/hasAnyRole() for access checks, not this column directly, since a user may hold more than one role.
 * @property string|null $company
 * @property string|null $dept
 * @property string $password
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'role', 'company', 'dept'])]
#[Hidden(['password'])]
#[Appends(['roles'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Roles are assigned/checked from here — the `role` column is only a
     * legacy "primary role" pointer, not the source of truth for access.
     */
    public const ALL_ROLES = ['admin', 'vp', 'purchasing', 'purchasing_viewer', 'reviewer', 'requestor'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    /** @return HasMany<RoleUser, $this> */
    public function roleRows(): HasMany
    {
        return $this->hasMany(RoleUser::class);
    }

    /** @return Attribute<array<int, string>, never> */
    protected function roles(): Attribute
    {
        return Attribute::get(fn () => $this->roleRows->map(fn (RoleUser $r) => $r->role)->values()->all());
    }

    public function hasRole(string $role): bool
    {
        return $this->roleRows->pluck('role')->contains($role);
    }

    /** @param  string[]  $roles */
    public function hasAnyRole(array $roles): bool
    {
        return $this->roleRows->pluck('role')->intersect($roles)->isNotEmpty();
    }

    /**
     * The single role used for the post-login landing page and other spots
     * that can only reasonably act on one role at a time — highest-priority
     * role a user holds, per ALL_ROLES order.
     */
    public function primaryRole(): ?string
    {
        $held = $this->roleRows->pluck('role');

        foreach (self::ALL_ROLES as $role) {
            if ($held->contains($role)) {
                return $role;
            }
        }

        return null;
    }
}
