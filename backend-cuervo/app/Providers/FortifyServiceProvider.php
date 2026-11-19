<?php

namespace App\Providers;

use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\LoginResponse;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register application services.
     */
    public function register(): void
    {
        // Custom response for React and Livewire login
        $this->app->singleton(
            LoginResponseContract::class,
            LoginResponse::class
        );
    }

    /**
     * Bootstrap application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
        $this->configureAuthentication();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(
            ResetUserPassword::class
        );
    }

    /**
     * Configure authentication views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(
            fn () => view('pages::auth.login')
        );

        Fortify::verifyEmailView(
            fn () => view('pages::auth.verify-email')
        );

        Fortify::twoFactorChallengeView(
            fn () => view('pages::auth.two-factor-challenge')
        );

        Fortify::confirmPasswordView(
            fn () => view('pages::auth.confirm-password')
        );

        Fortify::resetPasswordView(
            fn () => view('pages::auth.reset-password')
        );

        Fortify::requestPasswordResetLinkView(
            fn () => view('pages::auth.forgot-password')
        );
    }

    /**
     * Authenticate Cuervo users.
     *
     * Only active accounts may sign in.
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request) {

            $usuario = User::where(
                'email',
                $request->input('email')
            )->first();

            if (!$usuario || !$usuario->activo) {
                return null;
            }

            if (!Hash::check(
                $request->input('password', ''),
                $usuario->password
            )) {
                return null;
            }

            return $usuario;
        });
    }

    /**
     * Configure authentication rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->session()->get('login.id')
            );
        });

        RateLimiter::for('login', function (Request $request) {

            $throttleKey = Str::transliterate(
                Str::lower(
                    $request->input(Fortify::username())
                ).'|'.$request->ip()
            );

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('passkeys', function (Request $request) {

            $credentialId = $request->input('credential.id');

            return Limit::perMinute(10)->by(
                ($credentialId ?: $request->session()->getId())
                .'|'.$request->ip()
            );
        });
    }
}
