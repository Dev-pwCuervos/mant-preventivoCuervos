<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvidenciaMantenimiento;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvidenciaController extends Controller
{
    public function show(
        Request $request,
        EvidenciaMantenimiento $evidencia
    ): RedirectResponse|StreamedResponse {
        $usuario = $request->user();

        abort_unless($usuario && (bool) $usuario->activo, 403);

        $puedeGestionar = $usuario->roles()
            ->whereIn('nombre', ['Administrador', 'Supervisor'])
            ->exists();

        $estaAsignado = $evidencia->mantenimiento->tecnicos()
            ->whereKey($usuario->id)
            ->exists();

        abort_unless($puedeGestionar || $estaAsignado, 403);

        $disco = Storage::disk($evidencia->disco);
        abort_unless($disco->exists($evidencia->ruta), 404);

        if ($evidencia->disco === 's3') {
            return redirect()->away(
                $disco->temporaryUrl(
                    $evidencia->ruta,
                    now()->addMinutes(5),
                    ['ResponseContentType' => $evidencia->mime_type]
                ),
                302,
                [
                    'Cache-Control' => 'no-store',
                    'Referrer-Policy' => 'no-referrer',
                ]
            );
        }

        return $disco->response(
            $evidencia->ruta,
            $evidencia->nombre_original,
            [
                'Content-Type' => $evidencia->mime_type,
                'Cache-Control' => 'private, max-age=300',
                'X-Content-Type-Options' => 'nosniff',
            ],
            'inline'
        );
    }
}
