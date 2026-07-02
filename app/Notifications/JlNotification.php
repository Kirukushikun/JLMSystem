<?php

namespace App\Notifications;

use App\Models\JlEntry;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class JlNotification extends Notification
{
    public function __construct(
        public readonly JlEntry $entry,
        public readonly string  $event,
        public readonly string  $title,
        public readonly string  $body,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'entry_id'  => $this->entry->id,
            'reference' => $this->entry->reference,
            'event'     => $this->event,
            'title'     => $this->title,
            'body'      => $this->body,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id'        => $this->id,
            'entry_id'  => $this->entry->id,
            'reference' => $this->entry->reference,
            'event'     => $this->event,
            'title'     => $this->title,
            'body'      => $this->body,
            'read_at'   => null,
            'created_at'=> now()->toISOString(),
        ]);
    }
}
