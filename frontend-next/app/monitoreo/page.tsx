
"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import {
    Menu,
    RefreshCw,
    Search,
    ClipboardList,
    CalendarDays,
    UserRound,
    Flag,
    Eye,
    X,
    AlertCircle,
    LoaderCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import axios from "axios";

import api from "@/services/api";
import Sidebar from "@/components/Sidebar";

/*
|--------------------------------------------------------------------------
| CUERVO - MONITOREO DE MANTENIMIENTOS
|--------------------------------------------------------------------------
|
| Next.js: Supervisión
| Laravel: API REST
| MariaDB: Base de datos central
|
*/

type Usuario = {
    id: number;
    nombre: string;
    email: string;
    activo: boolean;
    roles: string[];
};

type Catalogo = {
    id: number;
    nombre: string;
    codigo?: string;
    nivel?: number;
};

type Tecnico = {
    id: number;
    nombre: string;
    email?: string;
};

type Mantenimiento = {
    id: number;
    fecha_programada: string | null;
    fecha_trabajo_terminado?: string | null;
    fecha_cierre?: string | null;
    observaciones?: string | null;
    plan?: Catalogo | null;
    estado?: Catalogo | null;
    prioridad?: Catalogo | null;
    tecnicos?: Tecnico[];
};

type RespuestaPaginada = {
    data: Mantenimiento[];
    current_page: number;
    last_page: number;
    total: number;
};

const ESTADOS = [
    { codigo: "", nombre: "Todos los estados" },
    { codigo: "PENDIENTE", nombre: "Pendiente" },
    { codigo: "EN_PROCESO", nombre: "En proceso" },
    { codigo: "EN_REVISION", nombre: "En revisión" },
    { codigo: "CERRADO", nombre: "Cerrado" },
    { codigo: "CANCELADO", nombre: "Cancelado" },
];

const PRIORIDADES = [
    { id: "", nombre: "Todas las prioridades" },
    { id: "1", nombre: "Baja" },
    { id: "2", nombre: "Media" },
    { id: "3", nombre: "Alta" },
    { id: "4", nombre: "Crítica" },
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

    const status = error.response?.status;

    if (status === 401) {
        return "Tu sesión expiró. Inicia sesión nuevamente.";
    }

    if (status === 403) {
        return "No tienes permisos para consultar mantenimientos.";
    }

    return (
        error.response?.data?.message ||
        "No fue posible consultar los mantenimientos."
    );
}

function estiloEstado(codigo?: string): string {
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

export default function MonitoreoPage() {
    const router = useRouter();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [verificando, setVerificando] = useState(true);

    const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
    const [cargando, setCargando] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);

    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("");
    const [prioridad, setPrioridad] = useState("");

    const [pagina, setPagina] = useState(1);
    const [ultimaPagina, setUltimaPagina] = useState(1);
    const [total, setTotal] = useState(0);

    const [detalle, setDetalle] = useState<Mantenimiento | null>(null);
    const [error, setError] = useState("");

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

        verificar();

        return () => {
            activo = false;
        };
    }, [router]);

    /*
    |--------------------------------------------------------------------------
    | Consultar mantenimientos
    |--------------------------------------------------------------------------
    */

    const cargarMantenimientos = useCallback(
        async (paginaActual: number = 1) => {
            setCargando(true);
            setError("");

            try {
                const respuesta = await api.get<RespuestaPaginada>(
                    "/api/mantenimientos",
                    {
                        params: {
                            page: paginaActual,
                        },
                    }
                );

                setMantenimientos(respuesta.data.data || []);
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
        [router]
    );

    useEffect(() => {
        if (usuario) {
            void cargarMantenimientos(1);
        }
    }, [usuario, cargarMantenimientos]);

    /*
    |--------------------------------------------------------------------------
    | Filtrado de registros cargados
    |--------------------------------------------------------------------------
    */

    const registrosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return mantenimientos.filter((item) => {
            const coincideBusqueda =
                !texto ||
                String(item.id).includes(texto) ||
                (item.plan?.nombre || "")
                    .toLowerCase()
                    .includes(texto);

            const coincideEstado =
                !estado ||
                item.estado?.codigo === estado;

            const coincidePrioridad =
                !prioridad ||
                String(item.prioridad?.id) === prioridad;

            return (
                coincideBusqueda &&
                coincideEstado &&
                coincidePrioridad
            );
        });
    }, [mantenimientos, busqueda, estado, prioridad]);

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
                {/* Barra superior */}
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
                    {/* Encabezado */}
                    <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
                        <div>
                            <p className="mb-2 text-xs font-bold tracking-widest text-slate-500">
                                SUPERVISIÓN
                            </p>

                            <h1 className="text-3xl font-bold text-slate-950">
                                Monitoreo de Mantenimientos
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Consulta y supervisa los trabajos registrados.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => cargarMantenimientos(pagina)}
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

                    {/* Panel principal */}
                    <section className="rounded-xl border border-slate-200 bg-white p-6">
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-950">
                                    Órdenes de mantenimiento
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    {total} registros encontrados en la API
                                </p>
                            </div>

                            <ClipboardList
                                size={22}
                                className="text-slate-500"
                            />
                        </div>

                        {/* Filtros */}
                        <div className="mb-7 grid gap-3 md:grid-cols-3">
                            <div className="relative">
                                <Search
                                    size={18}
                                    className="absolute left-3 top-3.5 text-slate-400"
                                />

                                <input
                                    type="search"
                                    placeholder="Buscar por nombre o ID..."
                                    value={busqueda}
                                    onChange={(e) =>
                                        setBusqueda(e.target.value)
                                    }
                                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-slate-500"
                                />
                            </div>

                            <select
                                value={estado}
                                onChange={(e) =>
                                    setEstado(e.target.value)
                                }
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

                            <select
                                value={prioridad}
                                onChange={(e) =>
                                    setPrioridad(e.target.value)
                                }
                                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                            >
                                {PRIORIDADES.map((item) => (
                                    <option
                                        key={item.id}
                                        value={item.id}
                                    >
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Listado */}
                        {cargando ? (
                            <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-slate-500">
                                <LoaderCircle
                                    size={20}
                                    className="animate-spin"
                                />
                                Cargando mantenimientos...
                            </div>
                        ) : registrosFiltrados.length === 0 ? (
                            <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center text-slate-500">
                                <ClipboardList size={35} />
                                <h3 className="font-semibold">
                                    No se encontraron mantenimientos
                                </h3>
                                <p className="text-xs">
                                    Prueba cambiando los filtros seleccionados.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {registrosFiltrados.map((item) => (
                                    <article
                                        key={item.id}
                                        className="rounded-xl border border-slate-200 p-5 transition hover:border-slate-300"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="mb-2 text-xs font-bold tracking-widest text-slate-500">
                                                    ORDEN #{item.id}
                                                </p>

                                                <h3 className="text-base font-bold text-slate-950">
                                                    {item.plan?.nombre || "Sin plan"}
                                                </h3>
                                            </div>

                                            <span
                                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${estiloEstado(item.estado?.codigo)}`}
                                            >
                                                {item.estado?.nombre || "—"}
                                            </span>
                                        </div>

                                        <div className="mt-5 flex flex-wrap gap-5 border-y border-slate-100 py-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-2">
                                                <CalendarDays size={16} />
                                                {formatearFecha(item.fecha_programada)}
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <UserRound size={16} />
                                                {item.tecnicos?.length
                                                    ? item.tecnicos
                                                        .map((t) => t.nombre)
                                                        .join(", ")
                                                    : "Sin asignar"}
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <Flag size={16} />
                                                {item.prioridad?.nombre || "Sin prioridad"}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setDetalle(item)}
                                                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800"
                                            >
                                                <Eye size={16} />
                                                Ver detalles
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        {/* Paginación */}
                        <div className="mt-7 flex flex-wrap items-center justify-end gap-4 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                disabled={cargando || pagina <= 1}
                                onClick={() =>
                                    cargarMantenimientos(pagina - 1)
                                }
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
                                onClick={() =>
                                    cargarMantenimientos(pagina + 1)
                                }
                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                            >
                                Siguiente
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </section>
                </main>
            </div>

            {/* Ventana de detalles */}
            {detalle && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label="Detalles del mantenimiento"
                        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"
                    >
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="mb-2 text-xs font-bold tracking-widest text-slate-500">
                                    ORDEN #{detalle.id}
                                </p>

                                <h2 className="text-xl font-bold text-slate-950">
                                    Detalles del mantenimiento
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setDetalle(null)}
                                aria-label="Cerrar detalles"
                                className="rounded-lg bg-slate-100 p-2 text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5 text-sm">
                            <div>
                                <p className="text-xs text-slate-500">
                                    Plan de mantenimiento
                                </p>
                                <strong className="text-slate-900">
                                    {detalle.plan?.nombre || "Sin plan"}
                                </strong>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs text-slate-500">
                                        Estado
                                    </p>
                                    <p className="font-semibold text-slate-900">
                                        {detalle.estado?.nombre || "—"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">
                                        Prioridad
                                    </p>
                                    <p className="font-semibold text-slate-900">
                                        {detalle.prioridad?.nombre || "—"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">
                                        Fecha programada
                                    </p>
                                    <p className="font-semibold text-slate-900">
                                        {formatearFecha(detalle.fecha_programada)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">
                                        Técnicos asignados
                                    </p>
                                    <p className="font-semibold text-slate-900">
                                        {detalle.tecnicos?.length
                                            ? detalle.tecnicos
                                                .map((t) => t.nombre)
                                                .join(", ")
                                            : "Sin asignar"}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-xs text-slate-500">
                                    Observaciones
                                </p>

                                <div className="rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                                    {detalle.observaciones ||
                                        "Sin observaciones registradas."}
                                </div>
                            </div>
                        </div>

                        <div className="mt-7 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setDetalle(null)}
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
