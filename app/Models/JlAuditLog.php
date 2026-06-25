<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JlAuditLog extends Model
{
    protected $fillable = ['jl_entry_id', 'event', 'actor', 'notes'];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(JlEntry::class, 'jl_entry_id');
    }
}
