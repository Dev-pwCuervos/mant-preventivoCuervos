<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    public function create(array $input): User
    {
        Validator::make($input, [
            'nombre' => [
                'required',
                'string',
                'max:100',
            ],
            'email' => [
                'required',
                'email',
                'max:150',
                'unique:usuarios,email',
            ],
            'password' => [
                'required',
                'confirmed',
                Password::defaults(),
            ],
        ])->validate();

        return User::create([
            'nombre' => $input['nombre'],
            'email' => $input['email'],
            'password' => $input['password'],
            'activo' => true,
        ]);
    }
}