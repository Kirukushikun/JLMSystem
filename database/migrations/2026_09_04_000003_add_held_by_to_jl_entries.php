<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            // Which role put the entry on hold, e.g. "Purchasing". Recorded at
            // hold() time rather than derived on read, because the stage an entry
            // was held at doesn't always identify the holder on its own — an
            // 'Approved' entry can be held by either the VP or Purchasing.
            $table->string('held_by', 50)->nullable()->after('held_at');
        });
    }

    public function down(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->dropColumn('held_by');
        });
    }
};
