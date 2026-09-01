<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->date('endorsed_at')->nullable()->after('submitted_at');
            $table->string('endorse_remarks')->nullable()->after('reject_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->dropColumn(['endorsed_at', 'endorse_remarks']);
        });
    }
};
