<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE jl_entries MODIFY COLUMN status ENUM(
            'Pending','Reviewed','Rejected','Approved','VP Rejected','On Hold','On Process','Cancelled'
        ) NOT NULL DEFAULT 'Pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE jl_entries MODIFY COLUMN status ENUM(
            'Pending','Reviewed','Rejected','Approved','VP Rejected','On Hold','On Process'
        ) NOT NULL DEFAULT 'Pending'");
    }
};
