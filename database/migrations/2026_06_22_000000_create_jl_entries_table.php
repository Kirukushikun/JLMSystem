<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jl_entries', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->date('date');
            $table->string('company');
            $table->string('manager');
            $table->string('dept');
            $table->decimal('amount', 12, 2);
            $table->enum('status', ['Pending', 'Checked', 'Rejected', 'Approved', 'VP Rejected'])
                  ->default('Pending');
            $table->string('serial')->nullable()->unique();
            $table->date('submitted_at');
            $table->date('reviewed_at')->nullable();
            $table->date('approved_at')->nullable();
            $table->text('reject_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jl_entries');
    }
};
