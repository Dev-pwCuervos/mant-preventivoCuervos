<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    $usuario = auth()->user();

    if (!$usuario) {
        return redirect()->route('login');
    }

    if ($usuario->tieneRol('Administrador')) {
        return redirect()->route('dashboard');
    }

    if ($usuario->tieneRol('Supervisor')) {
        return redirect()->route('dashboard');
    }

    abort(403);
})->name('home');

Route::middleware(['auth'])->group(function () {

    Route::livewire('/dashboard', 'dashboard-admin')
        ->middleware('rol:Administrador,Supervisor')
        ->name('dashboard');

    Route::middleware(['rol:Administrador'])->group(function () {

        Route::livewire('/roles', 'roles')
            ->name('roles.index');

        Route::livewire('/usuarios', 'usuarios')
            ->name('usuarios.index');

        Route::livewire('/ubicaciones', 'ubicaciones')
            ->name('ubicaciones.index');

    });

    Route::middleware(['rol:Administrador,Supervisor'])->group(function () {
        Route::livewire('/categorias-equipos', 'categorias-equipos')
            ->name('categorias.index');

        Route::livewire('/estados-equipo', 'estados-equipo')
            ->name('estados.index');

        Route::livewire('/equipos', 'equipos')
            ->name('equipos.index');

        Route::livewire('/planes-mantenimiento', 'planes-mantenimiento')
            ->name('planes.index');
    });

});

require __DIR__.'/settings.php';
