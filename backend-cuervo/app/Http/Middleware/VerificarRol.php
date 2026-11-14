<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificarRol
{
    public function handle(
        Request $request,
        Closure $next,
        string $rol
    ): Response {

        $usuario = $request->user();

        // Verificar que el usuario exista y esté activo
        if (!$usuario || !$usuario->activo) {
            abort(403, 'Tu cuenta no tiene acceso autorizado.');
        }

        // Verificar que tenga el rol solicitado
        if (!$usuario->tieneRol($rol)) {
            abort(403, 'No tienes permisos para acceder a este módulo.');
        }

        return $next($request);
    }
}
