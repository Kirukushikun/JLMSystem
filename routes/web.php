<?php

use App\Http\Controllers\JlController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

// ── Auth ────────────────────────────────────────────────────────────────────
Route::get('/login', [LoginController::class, 'showLogin'])->name('login');
Route::post('/login', [LoginController::class, 'postLogin'])->name('login.post');

// ── Protected ───────────────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {

    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

    // Requestor: submit form + view own requests
    Route::get('/', [JlController::class, 'submit'])->middleware('role:requestor,admin')->name('jl.submit');
    Route::post('/jl', [JlController::class, 'store'])->middleware('role:requestor,admin')->name('jl.store');
    Route::get('/my-requests', [JlController::class, 'myRequests'])->middleware('role:requestor,admin')->name('jl.myRequests');

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
    Route::get('/admin/audit-trail', [JlController::class, 'auditTrail'])->middleware('role:vp,admin')->name('jl.audit');

    // FCM device token registration
    Route::post('/fcm-token', [JlController::class, 'storeFcmToken'])->name('fcm.token');

    // Notifications
    Route::get('/notifications',          [JlController::class, 'notifications'])->name('notifications.index');
    Route::post('/notifications/read-all',[JlController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read',[JlController::class, 'markRead'])->name('notifications.read');

    // Admin: maintenance
    Route::get('/admin/maintenance', [MaintenanceController::class, 'index'])->middleware('role:admin')->name('admin.maintenance');
    Route::post('/admin/maintenance/companies', [MaintenanceController::class, 'storeCompany'])->middleware('role:admin')->name('admin.maintenance.companies.store');
    Route::delete('/admin/maintenance/companies/{company}', [MaintenanceController::class, 'destroyCompany'])->middleware('role:admin')->name('admin.maintenance.companies.destroy');
    Route::get('/admin/maintenance/companies/export', [MaintenanceController::class, 'exportCompanies'])->middleware('role:admin')->name('admin.maintenance.companies.export');
    Route::post('/admin/maintenance/companies/import', [MaintenanceController::class, 'importCompanies'])->middleware('role:admin')->name('admin.maintenance.companies.import');
    Route::post('/admin/maintenance/departments', [MaintenanceController::class, 'storeDepartment'])->middleware('role:admin')->name('admin.maintenance.departments.store');
    Route::delete('/admin/maintenance/departments/{department}', [MaintenanceController::class, 'destroyDepartment'])->middleware('role:admin')->name('admin.maintenance.departments.destroy');
    Route::get('/admin/maintenance/departments/export', [MaintenanceController::class, 'exportDepartments'])->middleware('role:admin')->name('admin.maintenance.departments.export');
    Route::post('/admin/maintenance/departments/import', [MaintenanceController::class, 'importDepartments'])->middleware('role:admin')->name('admin.maintenance.departments.import');
    Route::post('/admin/maintenance/jl-entries/import', [MaintenanceController::class, 'importJlEntries'])->middleware('role:admin')->name('admin.maintenance.jlEntries.import');
});
