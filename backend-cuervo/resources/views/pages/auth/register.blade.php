
<x-layouts::auth :title="'Registrarse'">
    <div class="flex flex-col gap-6">

        <x-auth-header
            title="Crear cuenta"
            description="Ingresa tus datos para registrarte en Cuervo"
        />

        <!-- Mensajes de sesión -->
        <x-auth-session-status
            class="text-center"
            :status="session('status')"
        />

        <form
            method="POST"
            action="{{ route('register.store') }}"
            class="flex flex-col gap-6"
        >
            @csrf

            <!-- Nombre completo -->
            <flux:input
                name="nombre"
                label="Nombre completo"
                :value="old('nombre')"
                type="text"
                required
                autofocus
                autocomplete="name"
                placeholder="Ingresa tu nombre completo"
            />

            <!-- Correo electrónico -->
            <flux:input
                name="email"
                label="Correo electrónico"
                :value="old('email')"
                type="email"
                required
                autocomplete="email"
                placeholder="correo@ejemplo.com"
            />

            <!-- Contraseña -->
            <flux:input
                name="password"
                label="Contraseña"
                type="password"
                required
                autocomplete="new-password"
                placeholder="Ingresa tu contraseña"
                passwordrules="{{ \Illuminate\Validation\Rules\Password::defaults()->toPasswordRulesString() }}"
                viewable
            />

            <!-- Confirmar contraseña -->
            <flux:input
                name="password_confirmation"
                label="Confirmar contraseña"
                type="password"
                required
                autocomplete="new-password"
                placeholder="Confirma tu contraseña"
                passwordrules="{{ \Illuminate\Validation\Rules\Password::defaults()->toPasswordRulesString() }}"
                viewable
            />

            <div class="flex items-center justify-end">
                <flux:button
                    type="submit"
                    variant="primary"
                    class="w-full"
                    data-test="register-user-button"
                >
                    Crear cuenta
                </flux:button>
            </div>
        </form>

        <div class="text-center text-sm text-zinc-600 dark:text-zinc-400">
            <span>¿Ya tienes una cuenta?</span>

            <flux:link :href="route('login')" wire:navigate>
                Iniciar sesión
            </flux:link>
        </div>

    </div>
</x-layouts::auth>
