<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<string>> */
    public function rules(): array
    {
        return [
            'title'   => ['required', 'string', 'max:255'],
            'date'    => ['required', 'date'],
            'company' => ['required', 'string', 'in:BFC,BDL,PFC,RH,Feedmill'],
            'manager' => ['required', 'string', 'max:255'],
            'dept'    => ['required', 'string', 'in:Operations,Finance,Human Resources,Maintenance,Logistics,Harvesting,Other'],
            'amount'  => ['required', 'numeric', 'min:0'],
        ];
    }
}
