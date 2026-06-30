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
    Route::get('/reviewer',   [JlController::class, 'reviewer'])->middleware('role:reviewer,admin')->name('jl.reviewer');
    Route::get('/vp',         [JlController::class, 'vp'])->middleware('role:vp,admin')->name('jl.vp');
    Route::get('/purchasing', [JlController::class, 'purchasing'])->middleware('role:purchasing,admin')->name('jl.purchasing');

    // Export (before {entry} routes to avoid conflict)
    Route::get('/jl/export', [JlController::class, 'export'])->name('jl.export');

    // Attachment download/view
    Route::get('/jl/{entry}/attachment', [JlController::class, 'attachment'])->name('jl.attachment');

    // Workflow actions
    Route::patch('/jl/{entry}/review',   [JlController::class, 'review'])->middleware('role:reviewer,admin')->name('jl.review');
    Route::patch('/jl/{entry}/approve',  [JlController::class, 'approve'])->middleware('role:vp,admin')->name('jl.approve');
    Route::patch('/jl/{entry}/reject',   [JlController::class, 'reject'])->middleware('role:reviewer,vp,admin')->name('jl.reject');
    Route::patch('/jl/{entry}/hold',     [JlController::class, 'hold'])->middleware('role:reviewer,vp,purchasing,admin')->name('jl.hold');
    Route::patch('/jl/{entry}/process',  [JlController::class, 'process'])->middleware('role:purchasing,admin')->name('jl.process');

    // Admin: user management
    Route::get('/admin/users', [UserManagementController::class, 'index'])->middleware('role:admin')->name('admin.users');
    Route::post('/admin/users/assign', [UserManagementController::class, 'assign'])->middleware('role:admin')->name('admin.users.assign');
    Route::delete('/admin/users/{id}', [UserManagementController::class, 'revoke'])->middleware('role:admin')->name('admin.users.revoke');

    // Admin: audit trail
    Route::get('/admin/audit-trail', [JlController::class, 'auditTrail'])->middleware('role:admin')->name('jl.audit');

    // Admin: maintenance
    Route::get('/admin/maintenance', [MaintenanceController::class, 'index'])->middleware('role:admin')->name('admin.maintenance');
    Route::post('/admin/maintenance/companies', [MaintenanceController::class, 'storeCompany'])->middleware('role:admin')->name('admin.maintenance.companies.store');
    Route::delete('/admin/maintenance/companies/{company}', [MaintenanceController::class, 'destroyCompany'])->middleware('role:admin')->name('admin.maintenance.companies.destroy');
    Route::post('/admin/maintenance/departments', [MaintenanceController::class, 'storeDepartment'])->middleware('role:admin')->name('admin.maintenance.departments.store');
    Route::delete('/admin/maintenance/departments/{department}', [MaintenanceController::class, 'destroyDepartment'])->middleware('role:admin')->name('admin.maintenance.departments.destroy');
});
