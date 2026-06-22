<?php

use App\Http\Controllers\JlController;
use Illuminate\Support\Facades\Route;

// ── Views ──
Route::get('/', [JlController::class, 'submit'])->name('jl.submit');
Route::get('/reviewer', [JlController::class, 'reviewer'])->name('jl.reviewer');
Route::get('/vp', [JlController::class, 'vp'])->name('jl.vp');

// ── Actions ──
Route::post('/jl', [JlController::class, 'store'])->name('jl.store');
Route::patch('/jl/{entry}/check', [JlController::class, 'check'])->name('jl.check');
Route::patch('/jl/{entry}/approve', [JlController::class, 'approve'])->name('jl.approve');
Route::patch('/jl/{entry}/reject', [JlController::class, 'reject'])->name('jl.reject');
