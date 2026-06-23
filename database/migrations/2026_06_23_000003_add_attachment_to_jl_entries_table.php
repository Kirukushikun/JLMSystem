<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->string('attachment')->nullable()->after('reject_reason');
            $table->string('attachment_name')->nullable()->after('attachment');
        });
    }

    public function down(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->dropColumn(['attachment', 'attachment_name']);
        });
    }
};
