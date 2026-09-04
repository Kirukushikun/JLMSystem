<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->date('processed_at')->nullable()->after('approved_at');
            $table->string('process_remarks')->nullable()->after('approve_remarks');
        });
    }

    public function down(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->dropColumn(['processed_at', 'process_remarks']);
        });
    }
};
