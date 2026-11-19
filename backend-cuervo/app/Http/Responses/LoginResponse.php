<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Log;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        Log::info('CUERVO LOGIN RESPONSE', [
            'expects_json' => $request->expectsJson(),
            'accept' => $request->header('Accept'),
            'ajax' => $request->ajax(),
            'host' => $request->getHost(),
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Inicio de sesión correcto.',
            ], 200);
        }

        $usuario = $request->user();

        if ($usuario?->tieneRol('Supervisor') && !$usuario->tieneRol('Administrador')) {
            return redirect()->route('dashboard');
        }

        return redirect()->intended(config('fortify.home', '/dashboard'));
    }
}
