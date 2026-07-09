<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $title
 * @property \Illuminate\Support\Carbon $date
 * @property string $company
 * @property string $manager
 * @property string $dept
 * @property float $amount
 * @property string $status
 * @property string|null $serial
 * @property \Illuminate\Support\Carbon $submitted_at
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property \Illuminate\Support\Carbon|null $approved_at
 * @property string|null $reject_reason
 * @property string|null $hold_reason
 * @property string|null $attachment
 * @property string|null $attachment_name
 * @property-read string $reference
 * @property-read string|null $attachment_url
 */
#[Fillable([
    'user_id', 'title', 'date', 'company', 'manager', 'dept', 'amount',
    'status', 'held_at', 'hold_reason', 'serial', 'submitted_at', 'reviewed_at', 'approved_at', 'reject_reason',
    'attachment', 'attachment_name',
])]
class JlEntry extends Model
{
    protected $appends = ['reference', 'attachment_url'];

    protected function casts(): array
    {
        return [
            'amount'       => 'float',
            'date'         => 'date:Y-m-d',
            'submitted_at' => 'date:Y-m-d',
            'reviewed_at'  => 'date:Y-m-d',
            'approved_at'  => 'date:Y-m-d',
        ];
    }

    /** e.g. JL-001-2026 */
    protected function reference(): Attribute
    {
        return Attribute::get(
            fn () => 'JL-' . str_pad((string) $this->id, 3, '0', STR_PAD_LEFT)
                   . '-' . ($this->submitted_at?->year ?? now()->year)
        );
    }

    protected function attachmentUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->attachment ? route('jl.attachment', $this->id) : null,
        );
    }
}
