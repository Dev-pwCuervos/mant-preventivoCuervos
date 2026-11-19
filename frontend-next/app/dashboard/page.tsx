
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Menu,
    RefreshCw,
    Clock3,
    Wrench,
    ClipboardCheck,
    CheckCircle2,
    Activity,
    CalendarDays,
    Users,
    AlertCircle,
    LoaderCircle,
} from "lucide-react";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";
import axios from "axios";

import api from "@/services/api";
import Sidebar from "@/components/Sidebar";

type Usuario = {
    id: number;
    nombre: string;
    email: string;
    activo: boolean;
    roles: string[];
};

type Estadisticas = {
    pendientes: number;
    en_proceso: number;
    en_revision: number;
    completados: number;
};

type Mantenimiento = {
    id: number;
    fecha_programada: string | null;
    plan?: { nombre: string } | null;
    estado?: { codigo: string; nombre: string } | null;
    prioridad?: { nombre: string } | null;
    tecnicos?: { id: number; nombre: string }[];
};

type RespuestaDashboard = {
    estadisticas: Estadisticas;
    recientes: Mantenimiento[];
};

const TARJETAS = [
    {
        titulo: "Pendientes",
        clave: "pendientes" as const,
        icono: Clock3,
        color: "text-orange-600",
        fondo: "bg-orange-50",
        grafico: "#f97316",
    },
    {
        titulo: "En proceso",
        clave: "en_proceso" as const,
        icono: Wrench,
        color: "text-blue-600",
        fondo: "bg-blue-50",
        grafico: "#3b82f6",
    },
    {
        titulo: "En revisión",
        clave: "en_revision" as const,
        icono: ClipboardCheck,
        color: "text-purple-600",
        fondo: "bg-purple-50",
        grafico: "#a855f7",
    },
    {
        titulo: "Cerrados",
        clave: "completados" as const,
        icono: CheckCircle2,
        color: "text-green-600",
        fondo: "bg-green-50",
        grafico: "#22c55e",
    },
];

function formatearFecha(fecha: string | null) {
    if (!fecha) return "—";

    const valor = new Date(fecha);

    return Number.isNaN(valor.getTime())
        ? fecha
        : valor.toLocaleString("es-GT");
}

export default function DashboardPage() {
    const router = useRouter();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
    const [recientes, setRecientes] = useState<Mantenimiento[]>([]);

    const [verificando, setVerificando] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [error, setError] = useState("");

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        setError("");

        try {
            const respuesta = await api.get<RespuestaDashboard>(
                "/api/dashboard"
            );

            setEstadisticas(respuesta.data.estadisticas);
            setRecientes(respuesta.data.recientes || []);
        } catch (err) {
            if (
                axios.isAxiosError(err) &&
                [401, 403].includes(err.response?.status || 0)
            ) {
                router.replace("/login");
                return;
            }

            setError("No fue posible cargar las estadísticas.");
        } finally {
            setCargando(false);
        }
    }, [router]);

    useEffect(() => {
        let activo = true;

        const iniciar = async () => {
            try {
                const respuesta = await api.get<Usuario>("/api/user");
                const datos = respuesta.data;

                const permitido =
                    datos.activo &&
                    Array.isArray(datos.roles) &&
                    datos.roles.some((rol) =>
                        ["Administrador", "Supervisor"].includes(rol)
                    );

                if (!permitido) {
                    router.replace("/login");
                    return;
                }

                if (activo) {
                    setUsuario(datos);
                }

                await cargarDatos();
            } catch {
                router.replace("/login");
            } finally {
                if (activo) setVerificando(false);
            }
        };

        iniciar();

        return () => {
            activo = false;
        };
    }, [router, cargarDatos]);

    const cerrarSesion = async () => {
        setCerrando(true);
        setError("");

        try {
            await api.post("/backend/logout");
            router.replace("/login");
        } catch {
            setError("No fue posible cerrar sesión.");
            setCerrando(false);
        }
    };

    const datosGrafico = TARJETAS.map((tarjeta) => ({
        name: tarjeta.titulo,
        value: estadisticas?.[tarjeta.clave] ?? 0,
        color: tarjeta.grafico,
    }));

    const total = datosGrafico.reduce(
        (suma, item) => suma + item.value,
        0
    );

    if (verificando || !usuario) {
        return (
            <div className="flex min-h-screen items-center justify-center gap-3 bg-slate-100 text-slate-600">
                <LoaderCircle size={22} className="animate-spin" />
                Verificando sesión...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <Sidebar
                nombre={usuario.nombre}
                roles={usuario.roles}
                abierto={menuAbierto}
                onClose={() => setMenuAbierto(false)}
                onLogout={cerrarSesion}
                cerrando={cerrando}
            />

            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-9">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            className="text-slate-700 lg:hidden"
                            onClick={() => setMenuAbierto(true)}
                            aria-label="Abrir menú"
                        >
                            <Menu size={24} />
                        </button>

                        <strong className="text-sm text-slate-900 sm:text-base">
                            Sistema de Supervisión
                        </strong>
                    </div>

                    <span className="text-sm font-medium text-slate-600">
                        {usuario.nombre}
                    </span>
                </header>

                <main className="mx-auto max-w-7xl px-5 py-9 lg:px-9">
                    <div className="mb-9 flex flex-wrap items-center justify-between gap-5">
                        <div>
                            <p className="mb-2 text-xs font-bold tracking-widest text-slate-500">
                                PANEL DE SUPERVISIÓN
                            </p>

                            <h1 className="text-3xl font-bold text-slate-950">
                                Bienvenido, {usuario.nombre}
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Resumen de las operaciones de mantenimiento.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={cargarDatos}
                            disabled={cargando}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={cargando ? "animate-spin" : ""}
                            />
                            Actualizar
                        </button>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                        >
                            <AlertCircle size={19} />
                            {error}
                        </div>
                    )}

                    <div className="mb-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {TARJETAS.map((tarjeta) => {
                            const Icono = tarjeta.icono;

                            return (
                                <div
                                    key={tarjeta.clave}
                                    className="rounded-xl border border-slate-200 bg-white p-6"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-sm text-slate-500">
                                            {tarjeta.titulo}
                                        </span>

                                        <div className={`rounded-xl p-3 ${tarjeta.fondo}`}>
                                            <Icono
                                                size={21}
                                                className={tarjeta.color}
                                            />
                                        </div>
                                    </div>

                                    <strong className="mt-6 block text-4xl font-bold text-slate-950">
                                        {cargando && !estadisticas
                                            ? "..."
                                            : estadisticas?.[tarjeta.clave] ?? "—"}
                                    </strong>

                                    <p className="mt-2 text-xs text-slate-400">
                                        {estadisticas
                                            ? "Datos de Laravel API"
                                            : "Información no disponible"}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <section className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="mb-6 flex items-center gap-3">
                                <Activity size={21} className="text-slate-500" />

                                <div>
                                    <h2 className="text-lg font-bold text-slate-950">
                                        Distribución de mantenimientos
                                    </h2>

                                    <p className="text-xs text-slate-500">
                                        Órdenes agrupadas por estado
                                    </p>
                                </div>
                            </div>

                            {total === 0 ? (
                                <div className="flex h-72 items-center justify-center text-sm text-slate-400">
                                    No hay datos para mostrar.
                                </div>
                            ) : (
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={datosGrafico}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={65}
                                                outerRadius={95}
                                                paddingAngle={3}
                                            >
                                                {datosGrafico.map((item) => (
                                                    <Cell
                                                        key={item.name}
                                                        fill={item.color}
                                                    />
                                                ))}
                                            </Pie>

                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="mb-6 flex items-center gap-3">
                                <CalendarDays size={21} className="text-slate-500" />

                                <div>
                                    <h2 className="text-lg font-bold text-slate-950">
                                        Mantenimientos recientes
                                    </h2>

                                    <p className="text-xs text-slate-500">
                                        Últimos trabajos registrados
                                    </p>
                                </div>
                            </div>

                            {recientes.length === 0 ? (
                                <div className="flex h-72 items-center justify-center text-sm text-slate-400">
                                    No hay mantenimientos recientes.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recientes.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-xl border border-slate-200 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <strong className="block text-sm text-slate-900">
                                                        #{item.id} — {item.plan?.nombre || "Sin plan"}
                                                    </strong>

                                                    <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                        <CalendarDays size={14} />
                                                        {formatearFecha(item.fecha_programada)}
                                                    </p>

                                                    <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                        <Users size={14} />
                                                        {item.tecnicos?.length
                                                            ? item.tecnicos.map((t) => t.nombre).join(", ")
                                                            : "Sin asignar"}
                                                    </p>

                                                    <p className="mt-2 text-xs text-slate-500">
                                                        Prioridad: {item.prioridad?.nombre || "—"}
                                                    </p>
                                                </div>

                                                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                    {item.estado?.nombre || "—"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
