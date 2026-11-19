<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    @include('partials.head', ['title' => 'Acceso restringido'])
    <style>
        .error-page {
            min-height: 100vh;
            background: #fff;
            color: #18181b;
            font-family: var(--font-sans), sans-serif;
        }
        .error-back {
            position: absolute;
            top: 24px;
            left: 24px;
        }
        .error-back button,
        .error-back a {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            background: #fff;
            padding: 10px 14px;
            color: #27272a;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
        }
        .error-back button:hover,
        .error-back a:hover {
            background: #f4f4f5;
        }
        .error-center {
            display: flex;
            min-height: 100vh;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 100px 24px;
        }
        .error-mark {
            width: 36px !important;
            height: 36px !important;
            margin-bottom: 22px;
            flex: none;
        }
        .error-message {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 18px;
            text-align: center;
            font-size: 18px;
            line-height: 1.5;
        }
        .error-code {
            font-weight: 700;
        }
        .error-divider {
            width: 1px;
            height: 32px;
            background: #cbd5e1;
        }
        @media (max-width: 480px) {
            .error-back { top: 16px; left: 16px; }
            .error-message { gap: 12px; font-size: 15px; }
        }
    </style>
</head>
<body class="error-page">
    <div class="error-back">
        @auth
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button type="submit"><span aria-hidden="true">←</span> Volver al inicio de sesión</button>
            </form>
        @else
            <a href="{{ route('login') }}"><span aria-hidden="true">←</span> Volver al inicio de sesión</a>
        @endauth
    </div>

    <main class="error-center">
        <x-app-logo-icon class="error-mark" />
        <div class="error-message" role="alert">
            <span class="error-code">403</span>
            <span class="error-divider" aria-hidden="true"></span>
            <span>{{ $exception->getMessage() ?: 'No tienes permisos para acceder a este módulo.' }}</span>
        </div>
    </main>
</body>
</html>
