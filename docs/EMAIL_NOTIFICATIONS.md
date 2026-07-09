# Email Notifications — Implementation Guide

This guide covers how requestor email notifications were added to the JL Monitoring System. When a form's status changes, an HTML email is automatically sent to the email address the requestor provided on submission.

---

## Overview

| Trigger         | Email Subject                                      |
|-----------------|----------------------------------------------------|
| Reviewed        | Your JL Form JL-XXX-2026 Has Been Reviewed         |
| Approved        | Your JL Form JL-XXX-2026 Has Been Approved         |
| Rejected        | Your JL Form JL-XXX-2026 Was Rejected              |
| VP Rejected     | Your JL Form JL-XXX-2026 Was Rejected by VP        |
| On Hold         | Your JL Form JL-XXX-2026 Has Been Put On Hold      |

---

## Step 1: Add the Email Column to the Database

Create a migration to add `requestor_email` to the `jl_entries` table.

```bash
php artisan make:migration add_requestor_email_to_jl_entries
```

```php
public function up(): void
{
    Schema::table('jl_entries', function (Blueprint $table) {
        $table->string('requestor_email')->nullable()->after('title');
    });
}

public function down(): void
{
    Schema::table('jl_entries', function (Blueprint $table) {
        $table->dropColumn('requestor_email');
    });
}
```

```bash
php artisan migrate
```

---

## Step 2: Add to the Model Fillable List

In `app/Models/JlEntry.php`, add `requestor_email` to the `#[Fillable]` attribute:

```php
#[Fillable([
    'title', 'requestor_email', 'date', 'company', 'manager', 'dept', 'amount',
    'status', 'held_at', 'hold_reason', 'serial', 'submitted_at',
    'reviewed_at', 'approved_at', 'reject_reason', 'attachment', 'attachment_name',
])]
```

---

## Step 3: Validate the Email on Submission

In `app/Http/Requests/StoreJlRequest.php`, add the validation rule:

```php
public function rules(): array
{
    return [
        'title'           => ['required', 'string', 'max:255'],
        'requestor_email' => ['required', 'email', 'max:255'],
        // ... other rules
    ];
}
```

Because `StoreJlRequest` uses `$request->safe()` in the controller's `store()` method, the validated `requestor_email` is automatically included when the entry is created — no further change needed in `store()`.

---

## Step 4: Create the Mailable Class

```bash
php artisan make:mail RequestorMail
```

Replace the contents of `app/Mail/RequestorMail.php`:

```php
<?php

namespace App\Mail;

use App\Models\JlEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RequestorMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly JlEntry $entry,
        public readonly string  $event,
        public readonly ?string $reason = null,
    ) {}

    public function envelope(): Envelope
    {
        $subject = match ($this->event) {
            'reviewed'    => "Your JL Form {$this->entry->reference} Has Been Reviewed",
            'approved'    => "Your JL Form {$this->entry->reference} Has Been Approved",
            'rejected'    => "Your JL Form {$this->entry->reference} Was Rejected",
            'vp_rejected' => "Your JL Form {$this->entry->reference} Was Rejected by VP",
            'on_hold'     => "Your JL Form {$this->entry->reference} Has Been Put On Hold",
            default       => "Update on Your JL Form {$this->entry->reference}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.requestor');
    }
}
```

The three constructor properties (`$entry`, `$event`, `$reason`) are automatically available as variables inside the blade template.

---

## Step 5: Create the Email Blade Template

Create the directory and file:

```
resources/views/mail/requestor.blade.php
```

The template uses inline CSS (required for email clients) and a `match()` expression to render the correct status banner and text for each event. Key sections:

- **Status banner** — color-coded strip at the top (blue = reviewed, green = approved, red = rejected, amber = on hold)
- **Serial number box** — shown only on `approved` events, displays the assigned serial
- **Detail grid** — reference, title, company, department, manager, estimated amount
- **Reason box** — shown only when a rejection or hold reason was provided

> Email clients strip `<style>` tags from `<head>`. All CSS must be **inline** or in a `<style>` tag inside `<body>`. Avoid external stylesheets entirely.

---

## Step 6: Wire the Mailer into the Controller

In `app/Http/Controllers/JlController.php`, add the imports:

```php
use App\Mail\RequestorMail;
use Illuminate\Support\Facades\Mail;
```

Add a private helper method:

```php
private function mailRequestor(JlEntry $entry, string $event, ?string $reason = null): void
{
    if ($entry->requestor_email) {
        Mail::to($entry->requestor_email)->send(new RequestorMail($entry, $event, $reason));
    }
}
```

Then call it at the end of each workflow action, just before `return back()`:

```php
// In review()
$this->mailRequestor($entry, 'reviewed');

// In approve()
$this->mailRequestor($entry, 'approved');

// In reject()
$this->mailRequestor($entry, $isVpReject ? 'vp_rejected' : 'rejected', $reason);

// In hold()
$this->mailRequestor($entry, 'on_hold', $request->input('reason'));
```

The `if ($entry->requestor_email)` guard means emails are silently skipped for entries that were submitted before this feature was added.

---

## Step 7: Add the Email Field to the Submit Form

In the React form (`resources/js/pages/jl/Submit.tsx`), add `requestor_email` to the `useForm` initial state:

```tsx
const form = useForm({
    title:           '',
    requestor_email: '',
    // ...
});
```

Add the input field in the form grid, full-width below the title:

```tsx
<div className="sm:col-span-2">
    <Label>Requestor Email *</Label>
    <input
        className={INPUT}
        type="email"
        value={form.data.requestor_email}
        onChange={(e) => form.setData('requestor_email', e.target.value)}
        placeholder="your@email.com — you'll receive status updates here"
        disabled={form.processing}
    />
    {form.errors.requestor_email && (
        <p className="mt-1 text-xs text-red-500">{form.errors.requestor_email}</p>
    )}
</div>
```

---

## Step 8: Configure Mail in `.env`

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.yourprovider.com
MAIL_PORT=587
MAIL_USERNAME=your@email.com
MAIL_PASSWORD=yourpassword
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="JL Monitoring System"
```

After changing `.env` in production, run:

```bash
php artisan config:cache
```

---

## Testing

### Local — log driver (no SMTP needed)

Set `MAIL_MAILER=log` in `.env`. Every email will be written as raw HTML to `storage/logs/laravel.log`. Use this to verify the template renders and the correct event/reason is passed before connecting a real provider.

### Sandbox — Mailtrap

[mailtrap.io](https://mailtrap.io) catches all outgoing emails in a sandbox inbox without delivering them to real addresses. Free tier gives 1,000 emails/month. After creating an account go to **Email Testing → Inboxes → SMTP Settings** and copy the Laravel-ready credentials directly into `.env`.

### Production — real delivery

Any SMTP provider works (Resend, Postmark, SendGrid, Gmail App Password). Resend's free tier (3,000/month, 100/day) is a good starting point for low-volume internal tools.

---

## Notes

- Emails are sent **synchronously** on the same request. If your mail server is slow this can add latency to reviewer/VP actions. To send in the background, make `RequestorMail` implement `ShouldQueue` and ensure a queue worker is running.
- The `reason` parameter is optional — if `null`, the reason box is simply not rendered in the template.
- The serial number box only appears on `approved` events and only if `$entry->serial` is set (it always will be at that point since `approve()` assigns the serial before the mail is sent).
