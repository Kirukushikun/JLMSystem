<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE jl_entries MODIFY COLUMN status ENUM(
            'Pending','Reviewed','Rejected','Approved','VP Rejected','On Hold','On Process'
        ) NOT NULL DEFAULT 'Pending'");

        Schema::table('jl_entries', function (Blueprint $table) {
            $table->string('held_at', 50)->nullable()->after('reject_reason');
        });
    }

    public function down(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->dropColumn('held_at');
        });

        DB::statement("ALTER TABLE jl_entries MODIFY COLUMN status ENUM(
            'Pending','Reviewed','Rejected','Approved','VP Rejected'
        ) NOT NULL DEFAULT 'Pending'");
    }
};
