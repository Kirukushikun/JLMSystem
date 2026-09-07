<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            // Which role rejected the entry, e.g. "Division Head" or "FOC Head".
            // Recorded at reject() time — 'Rejected' alone doesn't say who did it,
            // since both Division Head (at Pending) and FOC/Reviewer (at Endorsed)
            // can produce it. 'VP Rejected' is unambiguous (always VP) but gets
            // this filled in too, for a single consistent source in the UI.
            $table->string('rejected_by', 50)->nullable()->after('reject_reason');
        });
    }

    public function down(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->dropColumn('rejected_by');
        });
    }
};
