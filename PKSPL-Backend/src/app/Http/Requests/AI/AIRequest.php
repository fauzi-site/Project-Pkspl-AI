<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;

class AIRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prompt' => ['required', 'string', 'min:2', 'max:10000'],
            'session_id' => ['nullable', 'string', 'max:64'],
            'id_proyek' => ['nullable', 'integer', 'exists:proyek,id_proyek'],
            'page_context' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'prompt.required' => 'Pesan pertanyaan tidak boleh kosong.',
            'prompt.min' => 'Pesan minimal terdiri dari 2 karakter.',
            'id_proyek.exists' => 'Proyek penelitian yang dirujuk tidak ditemukan.',
        ];
    }
}
