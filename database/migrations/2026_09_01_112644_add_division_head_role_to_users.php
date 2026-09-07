<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('reviewer','vp','purchasing','purchasing_viewer','division_head','requestor','admin') NOT NULL DEFAULT 'reviewer'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('reviewer','vp','purchasing','purchasing_viewer','requestor','admin') NOT NULL DEFAULT 'reviewer'");
    }
};
