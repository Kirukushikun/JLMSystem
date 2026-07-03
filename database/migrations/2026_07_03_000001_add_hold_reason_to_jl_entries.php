<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->string('hold_reason')->nullable()->after('held_at');
        });
    }

    public function down(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->dropColumn('hold_reason');
        });
    }
};
