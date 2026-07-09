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
            'on_process'  => "Your JL Form {$this->entry->reference} Is Now Being Processed",
            default       => "Update on Your JL Form {$this->entry->reference}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.requestor');
    }
}
