<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    @include('partials.head')
</head>
<body class="cuervo-light min-h-screen bg-[#f5f6fa] text-zinc-900">
    <main class="flex min-h-screen items-center justify-center p-5">
        <section class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-12">
            <x-app-logo-icon class="mx-auto size-12 text-zinc-900" />
            <h1 class="mt-4 text-4xl font-extrabold tracking-wide">CUERVO</h1>
            <p class="mt-2 text-slate-500">Sistema de Mantenimiento Preventivo</p>
            <p class="mt-8 text-sm leading-6 text-slate-600">
                Gestiona equipos, planes y trabajos de mantenimiento desde un solo lugar.
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                @auth
                    <a href="{{ route('dashboard') }}" class="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700">
                        Ir al dashboard
                    </a>
                @else
                    <a href="{{ route('login') }}" class="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700">
                        Iniciar sesión
                    </a>
                    @if(Route::has('register'))
                        <a href="{{ route('register') }}" class="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-slate-50">
                            Crear cuenta
                        </a>
                    @endif
                @endauth
            </div>
        </section>
    </main>
    @fluxScripts
</body>
</html>
