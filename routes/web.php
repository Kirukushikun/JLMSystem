<?php

use App\Http\Controllers\JlController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

// ── Auth ────────────────────────────────────────────────────────────────────
Route::get('/login', [LoginController::class, 'showLogin'])->name('login');
Route::post('/login', [LoginController::class, 'postLogin'])->name('login.post');

// ── Public: submit form (anyone with the link can submit) ───────────────────
Route::get('/', [JlController::class, 'submit'])->name('jl.submit');
Route::post('/jl', [JlController::class, 'store'])->name('jl.store');

// ── Protected ───────────────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {

    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

    // Dashboards
    Route::get('/reviewer', [JlController::class, 'reviewer'])->middleware('role:reviewer,admin')->name('jl.reviewer');
    Route::get('/vp', [JlController::class, 'vp'])->middleware('role:vp,admin')->name('jl.vp');

    // Workflow actions
    Route::patch('/jl/{entry}/check',   [JlController::class, 'check'])->middleware('role:reviewer,admin')->name('jl.check');
    Route::patch('/jl/{entry}/approve', [JlController::class, 'approve'])->middleware('role:vp,admin')->name('jl.approve');
    Route::patch('/jl/{entry}/reject',  [JlController::class, 'reject'])->middleware('role:reviewer,vp,admin')->name('jl.reject');

    // Admin: user management
    Route::get('/admin/users', [UserManagementController::class, 'index'])->middleware('role:admin')->name('admin.users');
    Route::post('/admin/users/assign', [UserManagementController::class, 'assign'])->middleware('role:admin')->name('admin.users.assign');
    Route::delete('/admin/users/{id}', [UserManagementController::class, 'revoke'])->middleware('role:admin')->name('admin.users.revoke');

    // Admin: maintenance
    Route::get('/admin/maintenance', [MaintenanceController::class, 'index'])->middleware('role:admin')->name('admin.maintenance');
    Route::post('/admin/maintenance/companies', [MaintenanceController::class, 'storeCompany'])->middleware('role:admin')->name('admin.maintenance.companies.store');
    Route::delete('/admin/maintenance/companies/{company}', [MaintenanceController::class, 'destroyCompany'])->middleware('role:admin')->name('admin.maintenance.companies.destroy');
    Route::post('/admin/maintenance/departments', [MaintenanceController::class, 'storeDepartment'])->middleware('role:admin')->name('admin.maintenance.departments.store');
    Route::delete('/admin/maintenance/departments/{department}', [MaintenanceController::class, 'destroyDepartment'])->middleware('role:admin')->name('admin.maintenance.departments.destroy');
});
