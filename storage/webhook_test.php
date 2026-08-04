$admin = App\Models\User::where('role', 'admin')->firstOrFail();
Auth::loginUsingId($admin->id);

$entry = App\Models\JlEntry::create([
    'user_id'      => $admin->id,
    'title'        => 'TEST - webhook trigger, please ignore',
    'date'         => now(),
    'company'      => 'BFC',
    'manager'      => 'Test Manager',
    'dept'         => 'IT and Security Services',
    'amount'       => 1,
    'status'       => 'Pending',
    'submitted_at' => now(),
]);

echo "Created test entry: {$entry->reference} (id={$entry->id})\n";

app(App\Http\Controllers\JlController::class)->review($entry);

echo "Triggered review() -> webhook should have fired.\n";
echo "TEST_ENTRY_ID={$entry->id}\n";
