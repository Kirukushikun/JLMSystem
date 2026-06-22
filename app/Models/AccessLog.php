<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['email', 'success', 'ip_address', 'user_agent'])]
class AccessLog extends Model
{
    protected function casts(): array
    {
        return ['success' => 'boolean'];
    }
}
