<?php

use App\Http\Controllers\JlController;
use Illuminate\Support\Facades\Route;

Route::get('/', [JlController::class, 'submit'])->name('jl.submit');
Route::get('/reviewer', [JlController::class, 'reviewer'])->name('jl.reviewer');
Route::get('/vp', [JlController::class, 'vp'])->name('jl.vp');
