<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'company' => ['required', 'string', Rule::exists('companies', 'name')],
            'manager' => ['required', 'string', 'max:255'],
            'dept' => ['required', 'string', Rule::exists('departments', 'name')],
            'subject' => ['required', 'string', 'max:255'],
            'date_needed' => ['required', 'date'],
            'body' => ['nullable', 'string', 'max:2000'],
            'justification' => ['required', 'string', 'max:2000'],
            'items' => ['nullable', 'array'],
            'items.*.item_name' => ['required_with:items.*', 'string', 'max:255'],
            'items.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'items.*.purpose' => ['nullable', 'string', 'max:255'],
            'items.*.image' => ['nullable', 'file', 'image', 'max:5120'],
            'cost_breakdown' => ['required', 'array', 'min:1'],
            'cost_breakdown.*.description' => ['required', 'string', 'max:255'],
            'cost_breakdown.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'cost_breakdown.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'attachment' => ['nullable', 'file', 'image', 'max:5120'],
        ];
    }
}
