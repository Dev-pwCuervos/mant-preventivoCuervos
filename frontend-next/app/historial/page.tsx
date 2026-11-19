
"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    ArrowRight,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock3,
    History,
    LoaderCircle,
    Menu,
    RefreshCw,
    Search,
    UserRound,
    X,
} from "lucide-react";
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

type Estado = {
    id: number;
    codigo: string;
    nombre: string;
};

type Mantenimiento = {
    id: number;
    fecha_programada: string | null;
    plan?: {
        nombre: string;
    } | null;
    estado?: Estado | null;
    prioridad?: {
        nombre: string;
    } | null;
    tecnicos?: {
        id: number;
        nombre: string;
    }[];
};

type Movimiento = {
    id: number;
    mantenimiento_id: number;
    estado_anterior?: Estado | null;
    estado_nuevo?: Estado | null;
    usuario?: {
        id: number;
        nombre: string;
    } | null;
    motivo: string | null;
    created_at: string;
};

type RespuestaSeguimiento = {
    data: Mantenimiento[];
    current_page: number;
    last_page: number;
    total: number;
};

type RespuestaHistorial = {
    mantenimiento_id: number;
    historial: Movimiento[];
};

const ESTADOS = [
    { codigo: "", nombre: "Todos los estados" },
    { codigo: "PENDIENTE", nombre: "Pendiente" },
    { codigo: "EN_PROCESO", nombre: "En proceso" },
    { codigo: "EN_REVISION", nombre: "En revisión" },
    { codigo: "CERRADO", nombre: "Cerrado" },
    { codigo: "CANCELADO", nombre: "Cancelado" },
];

function formatearFecha(fecha?: string | null): string {
    if (!fecha) return "—";

    const valor = new Date(fecha);

    return Number.isNaN(valor.getTime())
        ? fecha
        : valor.toLocaleString("es-GT");
}

function obtenerError(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return "Ocurrió un error inesperado.";
    }

    if (error.response?.status === 401) {
        return "Tu sesión expiró. Inicia sesión nuevamente.";
    }

    if (error.response?.status === 403) {
        return "No tienes permisos para consultar el historial.";
    }

    return (
        error.response?.data?.message ||
        "No fue posible consultar la información."
    );
}

function colorEstado(codigo?: string): string {
    switch (codigo) {
        case "PENDIENTE":
            return "bg-orange-50 text-orange-700";
        case "EN_PROCESO":
            return "bg-blue-50 text-blue-700";
        case "EN_REVISION":
            return "bg-purple-50 text-purple-700";
        case "CERRADO":
            return "bg-green-50 text-green-700";
        case "CANCELADO":
            return "bg-red-50 text-red-700";
        default:
            return "bg-slate-100 text-slate-600";
    }
}

export default function HistorialPage() {
    const router = useRouter();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [verificando, setVerificando] = useState(true);
    const [cerrando, setCerrando] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);

    const [ordenes, setOrdenes] = useState<Mantenimiento[]>([]);
    const [cargando, setCargando] = useState(false);

    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("");

    const [pagina, setPagina] = useState(1);
    const [ultimaPagina, setUltimaPagina] = useState(1);
    const [total, setTotal] = useState(0);

    const [ordenSeleccionada, setOrdenSeleccionada] =
        useState<Mantenimiento | null>(null);

    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [errorHistorial, setErrorHistorial] = useState("");

    const [error, setError] = useState("");

    /*
    |--------------------------------------------------------------------------
    | Consultar órdenes
    |--------------------------------------------------------------------------
    */

    const cargarOrdenes = useCallback(
        async (numero = 1) => {
            setCargando(true);
            setError("");

            try {
                const respuesta = await api.get<RespuestaSeguimiento>(
                    "/api/seguimiento",
                    {
                        params: {
                            page: numero,
                            ...(estado ? { estado } : {}),
                        },
                    }
                );

                setOrdenes(respuesta.data.data || []);
                setPagina(respuesta.data.current_page || 1);
                setUltimaPagina(respuesta.data.last_page || 1);
                setTotal(respuesta.data.total || 0);
            } catch (err) {
                if (
                    axios.isAxiosError(err) &&
                    err.response?.status === 401
                ) {
                    router.replace("/login");
                    return;
                }

                setError(obtenerError(err));
            } finally {
                setCargando(false);
            }
        },
        [estado, router]
    );

    /*
    |--------------------------------------------------------------------------
    | Verificar sesión
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        let activo = true;

        const verificar = async () => {
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
            } catch {
                router.replace("/login");
            } finally {
                if (activo) {
                    setVerificando(false);
                }
            }
        };

        void verificar();

        return () => {
            activo = false;
        };
    }, [router]);

    useEffect(() => {
        if (usuario) {
            void cargarOrdenes(1);
        }
    }, [usuario, cargarOrdenes]);

    /*
    |--------------------------------------------------------------------------
    | Buscar en la página cargada
    |--------------------------------------------------------------------------
    */

    const ordenesFiltradas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        if (!texto) return ordenes;

        return ordenes.filter((orden) =>
            String(orden.id).includes(texto) ||
            (orden.plan?.nombre || "")
                .toLowerCase()
                .includes(texto)
        );
    }, [ordenes, busqueda]);

    /*
    |--------------------------------------------------------------------------
    | Consultar historial de una orden
    |--------------------------------------------------------------------------
    */

    const consultarHistorial = async (orden: Mantenimiento) => {
        setOrdenSeleccionada(orden);
        setMovimientos([]);
        setErrorHistorial("");
        setCargandoHistorial(true);

        try {
            const respuesta = await api.get<RespuestaHistorial>(
                `/api/mantenimientos/${orden.id}/historial`
            );

            setMovimientos(respuesta.data.historial || []);
        } catch (err) {
            setErrorHistorial(obtenerError(err));
        } finally {
            setCargandoHistorial(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Cerrar sesión
    |--------------------------------------------------------------------------
    */

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

    if (verificando || !usuario) {
        return (
            <main className="flex min-h-screen items-center justify-center gap-3 bg-slate-100 text-slate-600">
                <LoaderCircle size={22} className="animate-spin" />
                Verificando sesión...
            </main>
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
                            onClick={() => setMenuAbierto(true)}
                            className="text-slate-700 lg:hidden"
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
                    <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
                        <div>
                            <p className="mb-2 text-xs font-bold tracking-widest text-slate-500">
                                SUPERVISIÓN
                            </p>

                            <h1 className="text-3xl font-bold text-slate-950">
                                Historial y Auditoría
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Consulta la trazabilidad de los mantenimientos.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => cargarOrdenes(pagina)}
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

                    <section className="rounded-xl border border-slate-200 bg-white p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-950">
                                    Registro de mantenimientos
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    {total} órdenes registradas
                                </p>
                            </div>

                            <History
                                size={23}
                                className="text-slate-500"
                            />
                        </div>

                        <div className="mb-7 grid gap-3 md:grid-cols-2">
                            <div className="relative">
                                <Search
                                    size={18}
                                    className="absolute left-3 top-3.5 text-slate-400"
                                />

                                <input
                                    type="search"
                                    placeholder="Buscar orden o mantenimiento..."
                                    value={busqueda}
                                    onChange={(e) =>
                                        setBusqueda(e.target.value)
                                    }
                                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-slate-500"
                                />
                            </div>

                            <select
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                            >
                                {ESTADOS.map((item) => (
                                    <option
                                        key={item.codigo}
                                        value={item.codigo}
                                    >
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {cargando ? (
                            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
                                <LoaderCircle
                                    size={20}
                                    className="animate-spin"
                                />
                                Cargando órdenes...
                            </div>
                        ) : ordenesFiltradas.length === 0 ? (
                            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                                <ClipboardList
                                    size={38}
                                    className="text-slate-400"
                                />

                                <h3 className="font-semibold text-slate-900">
                                    No hay órdenes disponibles
                                </h3>

                                <p className="text-sm text-slate-500">
                                    No se encontraron mantenimientos con los filtros seleccionados.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {ordenesFiltradas.map((orden) => (
                                    <article
                                        key={orden.id}
                                        className="rounded-xl border border-slate-200 p-5"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="mb-2 text-xs font-bold tracking-widest text-slate-500">
                                                    ORDEN #{orden.id}
                                                </p>

                                                <h3 className="text-base font-bold text-slate-950">
                                                    {orden.plan?.nombre || "Sin plan"}
                                                </h3>
                                            </div>

                                            <span
                                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${colorEstado(
                                                    orden.estado?.codigo
                                                )}`}
                                            >
                                                {orden.estado?.nombre || "—"}
                                            </span>
                                        </div>

                                        <div className="mt-5 flex flex-wrap gap-5 border-y border-slate-100 py-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-2">
                                                <CalendarDays size={16} />
                                                {formatearFecha(
                                                    orden.fecha_programada
                                                )}
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <UserRound size={16} />
                                                {orden.tecnicos?.length
                                                    ? orden.tecnicos
                                                        .map((t) => t.nombre)
                                                        .join(", ")
                                                    : "Sin asignar"}
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <Clock3 size={16} />
                                                {orden.prioridad?.nombre || "Sin prioridad"}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    consultarHistorial(orden)
                                                }
                                                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                                            >
                                                <History size={17} />
                                                Ver historial
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        <div className="mt-7 flex flex-wrap items-center justify-end gap-4 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                disabled={cargando || pagina <= 1}
                                onClick={() => cargarOrdenes(pagina - 1)}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                            >
                                <ChevronLeft size={16} />
                                Anterior
                            </button>

                            <span className="text-xs text-slate-500">
                                Página {pagina} de {ultimaPagina}
                            </span>

                            <button
                                type="button"
                                disabled={cargando || pagina >= ultimaPagina}
                                onClick={() => cargarOrdenes(pagina + 1)}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                            >
                                Siguiente
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </section>
                </main>
            </div>

            {ordenSeleccionada && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label="Historial del mantenimiento"
                        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"
                    >
                        <div className="mb-7 flex items-start justify-between gap-4">
                            <div>
                                <p className="mb-2 text-xs font-bold tracking-widest text-slate-500">
                                    ORDEN #{ordenSeleccionada.id}
                                </p>

                                <h2 className="text-xl font-bold text-slate-950">
                                    Historial de cambios
                                </h2>

                                <p className="mt-2 text-sm text-slate-500">
                                    {ordenSeleccionada.plan?.nombre || "Sin plan"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setOrdenSeleccionada(null)}
                                className="rounded-lg bg-slate-100 p-2 text-slate-600"
                                aria-label="Cerrar historial"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {errorHistorial && (
                            <div
                                role="alert"
                                className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                            >
                                {errorHistorial}
                            </div>
                        )}

                        {cargandoHistorial ? (
                            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
                                <LoaderCircle
                                    size={20}
                                    className="animate-spin"
                                />
                                Consultando historial...
                            </div>
                        ) : movimientos.length === 0 ? (
                            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                                <History
                                    size={35}
                                    className="text-slate-400"
                                />

                                <p className="text-sm text-slate-500">
                                    Esta orden todavía no tiene cambios registrados.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {movimientos.map((movimiento) => (
                                    <div
                                        key={movimiento.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                                    >
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                                                {movimiento.estado_anterior?.nombre || "Inicio"}
                                            </span>

                                            <ArrowRight
                                                size={18}
                                                className="text-slate-400"
                                            />

                                            <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${colorEstado(
                                                movimiento.estado_nuevo?.codigo
                                            )}`}>
                                                {movimiento.estado_nuevo?.nombre || "—"}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-2">
                                                <UserRound size={15} />
                                                {movimiento.usuario?.nombre || "Usuario no disponible"}
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <CalendarDays size={15} />
                                                {formatearFecha(movimiento.created_at)}
                                            </span>
                                        </div>

                                        {movimiento.motivo && (
                                            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                                                <p className="mb-2 text-xs font-bold text-slate-700">
                                                    Motivo del cambio
                                                </p>

                                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                    {movimiento.motivo}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-7 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setOrdenSeleccionada(null)}
                                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
