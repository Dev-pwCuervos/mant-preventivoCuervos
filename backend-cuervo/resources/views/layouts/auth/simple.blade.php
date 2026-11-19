<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        @include('partials.head')
    </head>
    <body class="cuervo-light min-h-screen bg-[#f5f6fa] antialiased">
        <div class="flex min-h-svh items-center justify-center p-5 md:p-10">
            <div class="cuervo-auth-card flex w-full max-w-md flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
                <div class="mb-4 flex flex-col items-center gap-2 text-center">
                    <x-app-logo-icon class="size-10 text-zinc-900" />
                    <span class="text-3xl font-extrabold tracking-wide text-zinc-900">CUERVO</span>
                    <span class="text-sm text-slate-500">Sistema de Mantenimiento Preventivo</span>
                </div>
                <div class="flex flex-col gap-6">
                    {{ $slot }}
                </div>
            </div>
        </div>

        @persist('toast')
            <flux:toast.group>
                <flux:toast />
            </flux:toast.group>
        @endpersist

        @fluxScripts
    </body>
</html>
