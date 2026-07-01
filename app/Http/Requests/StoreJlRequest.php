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
            'title'   => ['required', 'string', 'max:255'],
            'date'    => ['required', 'date'],
            'company' => ['required', 'string', Rule::exists('companies', 'name')],
            'manager' => ['required', 'string', 'max:255'],
            'dept'    => ['required', 'string', Rule::exists('departments', 'name')],
            'amount'     => ['required', 'numeric', 'min:0'],
            'attachment'      => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx'],
            'turnstile_token' => ['nullable', 'string'],
        ];
    }
}
