<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property Carbon $date
 * @property string $company
 * @property string $manager
 * @property string $dept
 * @property float $amount
 * @property string $status
 * @property string $entry_type document | structured — which Submit-form mode created this entry
 * @property string|null $serial
 * @property Carbon $submitted_at
 * @property Carbon|null $endorsed_at
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $approved_at
 * @property Carbon|null $processed_at
 * @property string|null $reject_reason
 * @property string|null $endorse_remarks
 * @property string|null $review_remarks
 * @property string|null $approve_remarks
 * @property string|null $process_remarks
 * @property string|null $held_by
 * @property string|null $hold_reason
 * @property string|null $attachment
 * @property string|null $attachment_name
 * @property string|null $body free-text narrative — structured entries only
 * @property string|null $justification — structured entries only
 * @property array<int, array{item_name: string, quantity: string, purpose: string, image: string|null, image_name: string|null}>|null $items — structured entries only
 * @property array<int, array{description: string, quantity: string, unit_cost: string}>|null $cost_breakdown — structured entries only
 * @property-read string $reference
 * @property-read string|null $attachment_url
 */
#[Fillable([
    'user_id', 'title', 'date', 'company', 'manager', 'dept', 'amount',
    'status', 'entry_type', 'held_at', 'held_by', 'hold_reason', 'serial', 'submitted_at', 'endorsed_at', 'reviewed_at', 'approved_at', 'processed_at', 'reject_reason',
    'endorse_remarks', 'review_remarks', 'approve_remarks', 'process_remarks', 'attachment', 'attachment_name',
    'body', 'justification', 'items', 'cost_breakdown',
])]
class JlEntry extends Model
{
    protected $appends = ['reference', 'attachment_url'];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'date' => 'date:Y-m-d',
            'submitted_at' => 'date:Y-m-d',
            'endorsed_at' => 'date:Y-m-d',
            'reviewed_at' => 'date:Y-m-d',
            'approved_at' => 'date:Y-m-d',
            'processed_at' => 'date:Y-m-d',
        ];
    }

    /** e.g. JL-001-2026 */
    protected function reference(): Attribute
    {
        return Attribute::get(
            fn () => 'JL-'.str_pad((string) $this->id, 3, '0', STR_PAD_LEFT)
                   .'-'.($this->submitted_at?->year ?? now()->year)
        );
    }

    protected function attachmentUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->attachment ? route('jl.attachment', $this->id) : null,
        );
    }

    /**
     * Handled as a manual JSON get/set rather than the `array` cast, so the
     * get side can also inject each item's viewable image_url — combining a
     * cast and an accessor on the same column is ambiguous about evaluation
     * order, so this does the whole job itself.
     */
    /** @return Attribute<array<int, array<string, mixed>>, array<int, array<string, mixed>>|null> */
    protected function items(): Attribute
    {
        return Attribute::make(
            get: function (?string $value): array {
                // json_decode's return type is genuinely unpredictable at this point
                // (malformed JSON decodes to null, a scalar, etc.) — casting defends
                // against that as much as it satisfies collect()'s generics below.
                $items = $value ? (array) json_decode($value, true) : [];

                return collect($items)->map(function (array $item, int $index) {
                    $item['image_url'] = empty($item['image'])
                        ? null
                        : route('jl.itemImage', [$this->id, $index]);

                    return $item;
                })->all();
            },
            set: fn (?array $value) => json_encode($value ?? []),
        );
    }

    /** @return Attribute<array<int, array<string, mixed>>, array<int, array<string, mixed>>|null> */
    protected function costBreakdown(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value ? json_decode($value, true) : [],
            set: fn (?array $value) => json_encode($value ?? []),
        );
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
