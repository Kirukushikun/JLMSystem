<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('role_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->timestamps();

            $table->unique(['user_id', 'role']);
        });

        // Backfill: every existing single-role user gets one row here so
        // hasRole()/hasAnyRole() work immediately without a separate data step.
        $now = now();
        $rows = DB::table('users')->pluck('role', 'id')->map(fn ($role, $id) => [
            'user_id' => $id,
            'role' => $role,
            'created_at' => $now,
            'updated_at' => $now,
        ])->values()->all();

        if (! empty($rows)) {
            DB::table('role_user')->insert($rows);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_user');
    }
};
