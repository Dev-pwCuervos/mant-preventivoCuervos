<x-layouts::auth title="Iniciar sesión">
    <div class="flex flex-col gap-6">
        <x-auth-header title="Iniciar sesión" description="Ingresa tu correo y contraseña para continuar" />

        <!-- Session Status -->
        <x-auth-session-status class="text-center" :status="session('status')" />


        <form method="POST" action="{{ route('login.store') }}" class="cuervo-login-form flex flex-col gap-5">
            @csrf

            <!-- Email Address -->
            <flux:input
                name="email"
                label="Correo electrónico"
                :value="old('email')"
                type="email"
                required
                autofocus
                autocomplete="email"
                placeholder="correo@ejemplo.com"
            />

            <!-- Password -->
            <div class="relative">
                <flux:input
                    name="password"
                    label="Contraseña"
                    type="password"
                    required
                    autocomplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    viewable
                />

                @if (Route::has('password.request'))
                    <flux:link class="absolute top-0 text-sm end-0" :href="route('password.request')" wire:navigate>
                        ¿Olvidaste tu contraseña?
                    </flux:link>
                @endif
            </div>

            <!-- Remember Me -->
            <flux:checkbox name="remember" label="Recordarme" :checked="old('remember')" />

            <div class="flex items-center justify-end">
                <button type="submit" class="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" data-test="login-button">
                    Iniciar sesión
                </button>
            </div>
        </form>

    </div>
</x-layouts::auth>
