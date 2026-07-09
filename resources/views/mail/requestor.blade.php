<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JL Form Update</title>
    <style>
        body { margin: 0; padding: 0; background: #f0f4f8; font-family: Arial, sans-serif; color: #374151; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .header { background: #1e3a5f; padding: 28px 32px; }
        .header h1 { margin: 0; font-size: 18px; color: #ffffff; font-weight: 700; letter-spacing: .3px; }
        .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,.65); }
        .body { padding: 28px 32px; }
        .status-banner { border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 15px; font-weight: 600; }
        .status-reviewed   { background: #eff6ff; color: #1d4ed8; border-left: 4px solid #3b82f6; }
        .status-approved   { background: #f0fdf4; color: #15803d; border-left: 4px solid #22c55e; }
        .status-rejected   { background: #fef2f2; color: #b91c1c; border-left: 4px solid #ef4444; }
        .status-on_hold    { background: #fffbeb; color: #b45309; border-left: 4px solid #f59e0b; }
        .status-on_process { background: #faf5ff; color: #7e22ce; border-left: 4px solid #a855f7; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin-bottom: 20px; }
        .detail-item label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #9ca3af; margin-bottom: 2px; }
        .detail-item span  { font-size: 14px; font-weight: 600; color: #111827; }
        .detail-full { grid-column: 1 / -1; }
        .reason-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
        .reason-box label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #9ca3af; }
        .reason-box p { margin: 4px 0 0; font-size: 14px; color: #374151; }
        .serial-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; text-align: center; }
        .serial-box label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #6b7280; margin-bottom: 4px; }
        .serial-box span { font-size: 22px; font-weight: 800; color: #1e3a5f; letter-spacing: 1px; }
        .footer { border-top: 1px solid #f3f4f6; padding: 20px 32px; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>JL Monitoring System</h1>
        <p>Update on your form request</p>
    </div>

    <div class="body">
        @php
            $bannerClass = match($event) {
                'reviewed'    => 'status-reviewed',
                'approved'    => 'status-approved',
                'rejected',
                'vp_rejected' => 'status-rejected',
                'on_hold'     => 'status-on_hold',
                'on_process'  => 'status-on_process',
                default       => 'status-reviewed',
            };
            $bannerText = match($event) {
                'reviewed'    => '✔ Your form has been reviewed and forwarded to the VP Approver.',
                'approved'    => '🎉 Your form has been approved by the VP.',
                'rejected'    => '✕ Your form was rejected by the Reviewer.',
                'vp_rejected' => '✕ Your form was rejected by the VP Approver.',
                'on_hold'     => '⏸ Your form has been put on hold.',
                'on_process'  => '⚙ Your form is now being processed by Purchasing.',
                default       => 'There has been an update to your form.',
            };
        @endphp

        <div class="status-banner {{ $bannerClass }}">{{ $bannerText }}</div>

        @if($event === 'approved' && $entry->serial)
        <div class="serial-box">
            <label>Serial Number Assigned</label>
            <span>{{ $entry->serial }}</span>
        </div>
        @endif

        <div class="detail-grid">
            <div class="detail-item detail-full">
                <label>JL Title</label>
                <span>{{ $entry->title }}</span>
            </div>
            <div class="detail-item">
                <label>Reference</label>
                <span>{{ $entry->reference }}</span>
            </div>
            <div class="detail-item">
                <label>Date Prepared</label>
                <span>{{ $entry->date }}</span>
            </div>
            <div class="detail-item">
                <label>Company / Farm</label>
                <span>{{ $entry->company }}</span>
            </div>
            <div class="detail-item">
                <label>Department</label>
                <span>{{ $entry->dept }}</span>
            </div>
            <div class="detail-item">
                <label>Manager / Supervisor</label>
                <span>{{ $entry->manager }}</span>
            </div>
            <div class="detail-item">
                <label>Estimated Amount</label>
                <span>₱ {{ number_format($entry->amount, 2) }}</span>
            </div>
        </div>

        @if($reason)
        <div class="reason-box">
            <label>{{ in_array($event, ['rejected', 'vp_rejected']) ? 'Rejection Reason' : 'Hold Reason' }}</label>
            <p>{{ $reason }}</p>
        </div>
        @endif
    </div>

    <div class="footer">
        This is an automated notification from the JL Monitoring System. Please do not reply to this email.
    </div>
</div>
</body>
</html>
