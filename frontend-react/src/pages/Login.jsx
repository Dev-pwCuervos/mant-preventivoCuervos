
import { useState } from 'react';
import api from '../services/api';

const ROLES_PERMITIDOS = [
    'Administrador',
    'Supervisor',
    'Técnico',
];

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const iniciarSesion = async (e) => {
        e.preventDefault();

        setError('');
        setCargando(true);

        try {
            // PASO 1: Obtener cookie CSRF de Sanctum
            console.log('Preparando sesión CSRF...');

            await api.get('/sanctum/csrf-cookie', {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            // PASO 2: Autenticación mediante Fortify
            console.log('Enviando solicitud de autenticación...');

            const loginResponse = await api.post(
                '/login',
                {
                    email: email.trim(),
                    password,
                },
                {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                }
            );

            console.log(
                'Estado de autenticación:',
                loginResponse.status
            );

            // Verificar si Fortify requiere segundo factor
            if (loginResponse.data?.two_factor) {
                setError(
                    'Tu cuenta requiere verificación de dos factores. ' +
                    'Este paso todavía no está implementado en React.'
                );
                return;
            }

            // PASO 3: Consultar usuario autenticado
            console.log('Consultando usuario autenticado...');

            const respuesta = await api.get('/api/user', {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const usuario = respuesta.data;

            // PASO 4: Verificar estado de la cuenta
            if (!usuario.activo) {
                await api.post('/logout');

                setError(
                    'Tu cuenta está desactivada. ' +
                    'Contacta al administrador.'
                );
                return;
            }

            // PASO 5: Verificar roles
            const roles = Array.isArray(usuario.roles)
                ? usuario.roles
                : [];

            const permitido = roles.some(
                (rol) => ROLES_PERMITIDOS.includes(rol)
            );

            if (!permitido) {
                await api.post('/logout');

                setError(
                    'No tienes permisos para acceder a Cuervo.'
                );
                return;
            }

            // PASO 6: Inicio de sesión exitoso
            console.log('Sesión iniciada correctamente.');

            setPassword('');
            onLogin(usuario);

        } catch (err) {
            const status = err.response?.status;
            const url = err.config?.url;

            // No imprimir credenciales ni tokens
            console.error('Error de autenticación:', {
                url,
                status,
                message: err.message,
            });

            if (status === 419) {
                setError(
                    'Error 419: problema con CSRF o la sesión.'
                );
            } else if (status === 422) {
                setError(
                    'Error 422: credenciales incorrectas ' +
                    'o validación fallida.'
                );
            } else if (status === 401) {
                setError(
                    'Error 401: Laravel no reconoce ' +
                    'la sesión autenticada.'
                );
            } else if (status === 403) {
                setError(
                    'Error 403: acceso denegado.'
                );
            } else if (status === 404) {
                setError(
                    'Error 404: ruta de autenticación no encontrada.'
                );
            } else if (status === 429) {
                setError(
                    'Demasiados intentos. Espera unos minutos.'
                );
            } else if (status === 500) {
                setError(
                    'Error 500: problema interno de Laravel.'
                );
            } else if (!err.response) {
                setError(
                    'Error de conexión en ' +
                    (url || 'una solicitud') +
                    '. Revisa Network y el proxy de Vite.'
                );
            } else {
                setError(
                    'No fue posible iniciar sesión. ' +
                    'Código HTTP: ' + status
                );
            }
        } finally {
            setCargando(false);
        }
    };

    const inputStyle = {
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px',
        marginTop: '8px',
        marginBottom: '20px',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        fontSize: '15px',
    };

    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f4f6f9',
                padding: '20px',
                fontFamily: 'Arial, sans-serif',
            }}
        >
            <form
                onSubmit={iniciarSesion}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '35px',
                    borderRadius: '14px',
                    backgroundColor: '#ffffff',
                    boxShadow:
                        '0 8px 30px rgba(0,0,0,0.08)',
                }}
            >
                <h1
                    style={{
                        textAlign: 'center',
                        fontSize: '34px',
                        marginBottom: '5px',
                    }}
                >
                    CUERVO
                </h1>

                <p
                    style={{
                        textAlign: 'center',
                        color: '#64748b',
                        marginBottom: '30px',
                    }}
                >
                    Sistema de Mantenimiento Preventivo
                </p>

                <label htmlFor="email">
                    Correo electrónico
                </label>

                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                        setEmail(e.target.value)
                    }
                    required
                    autoComplete="username"
                    placeholder="correo@ejemplo.com"
                    style={inputStyle}
                />

                <label htmlFor="password">
                    Contraseña
                </label>

                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) =>
                        setPassword(e.target.value)
                    }
                    required
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    style={inputStyle}
                />

                {error && (
                    <p
                        role="alert"
                        style={{
                            color: '#dc2626',
                            marginBottom: '16px',
                            fontSize: '14px',
                            lineHeight: '1.5',
                        }}
                    >
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={cargando}
                    style={{
                        width: '100%',
                        padding: '13px',
                        backgroundColor: cargando
                            ? '#52525b'
                            : '#18181b',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: cargando
                            ? 'wait'
                            : 'pointer',
                        fontSize: '15px',
                        fontWeight: '600',
                    }}
                >
                    {cargando
                        ? 'Iniciando sesión...'
                        : 'Iniciar sesión'}
                </button>
            </form>
        </main>
    );
}
