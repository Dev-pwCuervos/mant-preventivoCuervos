
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Bird,
    LockKeyhole,
    Mail,
    LogIn,
    AlertCircle,
    LoaderCircle,
} from "lucide-react";
import axios from "axios";

import api from "@/services/api";

type Usuario = {
    id: number;
    nombre: string;
    email: string;
    activo: boolean;
    roles: string[];
};

const ROLES_PERMITIDOS = [
    "Administrador",
    "Supervisor",
];

function obtenerError(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return "Ocurrió un error inesperado.";
    }

    const status = error.response?.status;

    if (!error.response) {
        return "No fue posible conectar con Laravel.";
    }

    if (status === 419) {
        return "La sesión CSRF expiró. Intenta nuevamente.";
    }

    if (status === 422) {
        return "Correo o contraseña incorrectos.";
    }

    if (status === 401) {
        return "Laravel no reconoce la sesión autenticada.";
    }

    if (status === 403) {
        return "No tienes permisos para acceder.";
    }

    if (status === 429) {
        return "Demasiados intentos. Espera unos minutos.";
    }

    return (
        error.response?.data?.message ||
        `Error ${status}: no fue posible iniciar sesión.`
    );
}

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);

    const iniciarSesion = async (
        evento: FormEvent<HTMLFormElement>
    ) => {
        evento.preventDefault();

        setError("");
        setCargando(true);

        try {
            // 1. Obtener cookie CSRF de Laravel
            await api.get("/sanctum/csrf-cookie");

            // 2. Iniciar sesión con Fortify
            const respuestaLogin = await api.post(
                "/backend/login",
                {
                    email,
                    password,
                }
            );

            if (respuestaLogin.data?.two_factor) {
                setError(
                    "Esta cuenta requiere verificación de dos factores."
                );
                return;
            }

            // 3. Obtener usuario autenticado
            const respuesta = await api.get<Usuario>(
                "/api/user"
            );

            const usuario = respuesta.data;

            // 4. Verificar estado de la cuenta
            if (!usuario.activo) {
                await api.post("/backend/logout");
                setError("Tu cuenta está desactivada.");
                return;
            }

            // 5. Verificar permisos de supervisión
            const permitido =
                Array.isArray(usuario.roles) &&
                usuario.roles.some((rol) =>
                    ROLES_PERMITIDOS.includes(rol)
                );

            if (!permitido) {
                await api.post("/backend/logout");

                setError(
                    "Solo Administradores y Supervisores pueden acceder."
                );

                return;
            }

            // 6. Acceder al dashboard
            router.replace("/dashboard");
        } catch (err) {
            console.error("Error de autenticación:", err);
            setError(obtenerError(err));
        } finally {
            setCargando(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-9 shadow-xl">
                <div className="mb-9 text-center">
                    <div className="mb-4 flex items-center justify-center gap-3">
                        <Bird size={36} className="text-slate-900" />

                        <h1 className="text-4xl font-bold tracking-tight text-slate-950">
                            CUERVO
                        </h1>
                    </div>

                    <p className="text-sm text-slate-500">
                        Sistema de Supervisión de Mantenimiento Preventivo
                    </p>
                </div>

                <form
                    onSubmit={iniciarSesion}
                    className="flex flex-col gap-5"
                >
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Correo electrónico
                        </label>

                        <div className="relative">
                            <Mail
                                size={18}
                                className="absolute left-3 top-3.5 text-slate-400"
                            />

                            <input
                                id="email"
                                type="email"
                                required
                                autoComplete="username"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                placeholder="correo@ejemplo.com"
                                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-slate-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Contraseña
                        </label>

                        <div className="relative">
                            <LockKeyhole
                                size={18}
                                className="absolute left-3 top-3.5 text-slate-400"
                            />

                            <input
                                id="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                placeholder="Ingresa tu contraseña"
                                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-slate-600"
                            />
                        </div>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            <AlertCircle
                                size={18}
                                className="mt-0.5 shrink-0"
                            />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={cargando}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {cargando ? (
                            <>
                                <LoaderCircle
                                    size={18}
                                    className="animate-spin"
                                />
                                Iniciando sesión...
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                Iniciar sesión
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-7 text-center text-xs text-slate-400">
                    CUERVO · Módulo de Supervisión
                </p>
            </div>
        </main>
    );
}
