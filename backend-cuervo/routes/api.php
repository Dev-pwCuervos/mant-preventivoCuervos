
<?php

use App\Http\Controllers\Api\AsignacionController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\IntervencionController;
use App\Http\Controllers\Api\MantenimientoController;
use App\Http\Controllers\Api\SeguimientoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ReporteController;

/*
|--------------------------------------------------------------------------
| CUERVO - API REST
|--------------------------------------------------------------------------
|
| Laravel + Livewire: Administración
| React: Operaciones
| Next.js: Supervisión
|
*/

Route::get('/estado', function () {
    return response()->json([
        'sistema' => 'Cuervo',
        'mensaje' => 'API REST funcionando correctamente',
        'version' => '1.0',
    ]);
});

/*
|--------------------------------------------------------------------------
| Rutas protegidas con Laravel Sanctum
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Usuario autenticado
    |--------------------------------------------------------------------------
    */

    Route::get(
    '/reportes',
    [ReporteController::class, 'index']
)->name('api.reportes.index');

    Route::get('/user', function (Request $request) {
        $usuario = $request->user();

        abort_unless(
            (bool) $usuario->activo,
            403,
            'Tu cuenta está desactivada.'
        );

        $usuario->load('roles');

        return response()->json([
            'id' => $usuario->id,
            'nombre' => $usuario->nombre,
            'email' => $usuario->email,
            'activo' => (bool) $usuario->activo,
            'roles' => $usuario->roles
                ->pluck('nombre')
                ->values()
                ->all(),
        ]);
    });

    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/dashboard',
        [DashboardController::class, 'index']
    )->name('api.dashboard.index');

    /*
    |--------------------------------------------------------------------------
    | Mantenimientos
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/mantenimientos/catalogos',
        [MantenimientoController::class, 'catalogos']
    )->name('api.mantenimientos.catalogos');

    Route::get(
        '/mantenimientos',
        [MantenimientoController::class, 'index']
    )->name('api.mantenimientos.index');

    Route::post(
        '/mantenimientos',
        [MantenimientoController::class, 'store']
    )->name('api.mantenimientos.store');

    Route::get(
        '/mantenimientos/{mantenimiento}',
        [MantenimientoController::class, 'show']
    )->whereNumber('mantenimiento')
      ->name('api.mantenimientos.show');

    /*
    |--------------------------------------------------------------------------
    | Asignaciones
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/asignaciones',
        [AsignacionController::class, 'index']
    )->name('api.asignaciones.index');

    Route::post(
        '/mantenimientos/{mantenimiento}/tecnicos',
        [AsignacionController::class, 'store']
    )->whereNumber('mantenimiento')
      ->name('api.asignaciones.store');

    /*
    |--------------------------------------------------------------------------
    | Intervenciones
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/mantenimientos/{mantenimiento}/iniciar',
        [IntervencionController::class, 'iniciar']
    )->whereNumber('mantenimiento')
      ->name('api.intervenciones.iniciar');

    Route::post(
        '/mantenimientos/{mantenimiento}/finalizar',
        [IntervencionController::class, 'finalizar']
    )->whereNumber('mantenimiento')
      ->name('api.intervenciones.finalizar');

    /*
    |--------------------------------------------------------------------------
    | Seguimiento y cierre
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/seguimiento',
        [SeguimientoController::class, 'index']
    )->name('api.seguimiento.index');

    Route::get(
        '/mantenimientos/{mantenimiento}/historial',
        [SeguimientoController::class, 'historial']
    )->whereNumber('mantenimiento')
      ->name('api.seguimiento.historial');

    Route::post(
        '/mantenimientos/{mantenimiento}/cerrar',
        [SeguimientoController::class, 'cerrar']
    )->whereNumber('mantenimiento')
      ->name('api.seguimiento.cerrar');

    Route::post(
        '/mantenimientos/{mantenimiento}/rechazar',
        [SeguimientoController::class, 'rechazar']
    )->whereNumber('mantenimiento')
      ->name('api.seguimiento.rechazar');

});
