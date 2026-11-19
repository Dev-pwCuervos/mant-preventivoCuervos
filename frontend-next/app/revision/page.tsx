
"use client";

import {
    FormEvent,
    useCallback,
    useEffect,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    LoaderCircle,
    Menu,
    RefreshCw,
    RotateCcw,
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

type Mantenimiento = {
    id: number;
    fecha_programada: string | null;
    fecha_trabajo_terminado: string | null;
    observaciones: string | null;
    plan?: {
        nombre: string;
    } | null;
    estado?: {
        codigo: string;
        nombre: string;
    } | null;
    prioridad?: {
        nombre: string;
    } | null;
    tecnicos?: {
        id: number;
        nombre: string;
    }[];
};

type RespuestaSeguimiento = {
    data: Mantenimiento[];
    current_page: number;
    last_page: number;
    total: number;
};

type Accion = "aprobar" | "devolver";

function fechaTexto(fecha: string | null): string {
    if (!fecha) return "—";

    const valor = new Date(fecha);

    return Number.isNaN(valor.getTime())
        ? fecha
        : valor.toLocaleString("es-GT");
}

function mensajeError(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return "Ocurrió un error inesperado.";
    }

    const status = error.response?.status;

    if (status === 401) {
        return "La sesión expiró. Inicia sesión nuevamente.";
    }

    if (status === 403) {
        return "No tienes permisos para esta operación.";
    }

    if (status === 419) {
        return "La sesión CSRF expiró. Actualiza la página.";
    }

    if (status === 422) {
        const errores = error.response?.data?.errors;

        if (errores && typeof errores === "object") {
            return Object.values(errores)
                .flat()
                .join(" ");
        }
    }

    return (
        error.response?.data?.message ||
        "No fue posible completar la operación."
    );
}

export default function RevisionPage() {
    const router = useRouter();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [verificando, setVerificando] = useState(true);

    const [ordenes, setOrdenes] = useState<Mantenimiento[]>([]);
    const [cargando, setCargando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);

    const [pagina, setPagina] = useState(1);
    const [ultimaPagina, setUltimaPagina] = useState(1);
    const [total, setTotal] = useState(0);

    const [ordenSeleccionada, setOrdenSeleccionada] =
        useState<Mantenimiento | null>(null);
    const [accion, setAccion] = useState<Accion | null>(null);
    const [motivo, setMotivo] = useState("");

    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const cargarOrdenes = useCallback(async (numero = 1) => {
        setCargando(true);
        setError("");

        try {
            const respuesta = await api.get<RespuestaSeguimiento>(
                "/api/seguimiento",
                {
                    params: {
                        estado: "EN_REVISION",
                        page: numero,
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

            setError(mensajeError(err));
        } finally {
            setCargando(false);
        }
    }, [router]);

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

                await cargarOrdenes(1);
            } catch {
                router.replace("/login");
            } finally {
                if (activo) setVerificando(false);
            }
        };

        void verificar();

        return () => {
            activo = false;
        };
    }, [router, cargarOrdenes]);

    const abrirAccion = (
        orden: Mantenimiento,
        nuevaAccion: Accion
    ) => {
        setOrdenSeleccionada(orden);
        setAccion(nuevaAccion);
        setMotivo("");
        setError("");
        setMensaje("");
    };

    const cerrarModal = () => {
        if (procesando) return;

        setOrdenSeleccionada(null);
        setAccion(null);
        setMotivo("");
    };

    const confirmarAccion = async (
        evento: FormEvent<HTMLFormElement>
    ) => {
        evento.preventDefault();

        if (!ordenSeleccionada || !accion || procesando) return;

        const texto = motivo.trim();

        if (accion === "devolver" && texto.length < 10) {
            setError(
                "Debes explicar el motivo de devolución con al menos 10 caracteres."
            );
            return;
        }

        setProcesando(true);
        setError("");
        setMensaje("");

        const id = ordenSeleccionada.id;

        try {
            if (accion === "aprobar") {
                await api.post(
                    `/api/mantenimientos/${id}/cerrar`,
                    {
                        motivo: texto || null,
                    }
                );
            } else {
                await api.post(
                    `/api/mantenimientos/${id}/devolver`,
                    {
                        motivo: texto,
                    }
                );
            }

            setMensaje(
                accion === "aprobar"
                    ? `Mantenimiento #${id} aprobado y cerrado correctamente.`
                    : `Mantenimiento #${id} devuelto a proceso correctamente.`
            );

            setOrdenSeleccionada(null);
            setAccion(null);
            setMotivo("");

            await cargarOrdenes(pagina);
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setProcesando(false);
        }
    };

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
                <LoaderCircle
                    size={22}
                    className="animate-spin"
                />
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
                                Revisión y Aprobación
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Evalúa los trabajos terminados y decide
                                si deben aprobarse o corregirse.
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
                            <span>{error}</span>
                        </div>
                    )}

                    {mensaje && (
                        <div
                            role="status"
                            className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
                        >
                            <CheckCircle2 size={19} />
                            <span>{mensaje}</span>
                        </div>
                    )}

                    <div className="mb-6 grid gap-5 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <p className="text-sm text-slate-500">
                                Pendientes de revisión
                            </p>

                            <strong className="mt-3 block text-4xl font-bold text-slate-950">
                                {total}
                            </strong>

                            <p className="mt-2 text-xs text-slate-400">
                                Órdenes que requieren evaluación
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="flex items-center gap-3">
                                <ClipboardCheck
                                    size={25}
                                    className="text-purple-600"
                                />

                                <h2 className="font-bold text-slate-900">
                                    Control de calidad
                                </h2>
                            </div>

                            <p className="mt-4 text-sm leading-7 text-slate-500">
                                Revisa las observaciones de los técnicos.
                                Aprueba los trabajos correctos o devuelve
                                aquellos que requieren correcciones.
                            </p>
                        </div>
                    </div>

                    <section className="rounded-xl border border-slate-200 bg-white p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-950">
                                    Órdenes en revisión
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Trabajos finalizados por los técnicos
                                </p>
                            </div>

                            <ClipboardCheck
                                size={22}
                                className="text-slate-500"
                            />
                        </div>

                        {cargando ? (
                            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
                                <LoaderCircle
                                    size={20}
                                    className="animate-spin"
                                />
                                Cargando órdenes...
                            </div>
                        ) : ordenes.length === 0 ? (
                            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                                <CheckCircle2
                                    size={40}
                                    className="text-green-500"
                                />

                                <h3 className="font-semibold text-slate-900">
                                    No hay trabajos pendientes de revisión
                                </h3>

                                <p className="text-sm text-slate-500">
                                    Las órdenes aparecerán cuando un Técnico
                                    termine un mantenimiento.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {ordenes.map((orden) => (
                                    <article
                                        key={orden.id}
                                        className="rounded-xl border border-slate-200 p-5"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="mb-2 text-xs font-bold tracking-widest text-slate-500">
                                                    ORDEN #{orden.id}
                                                </p>

                                                <h3 className="text-lg font-bold text-slate-950">
                                                    {orden.plan?.nombre || "Sin plan"}
                                                </h3>
                                            </div>

                                            <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                                                En revisión
                                            </span>
                                        </div>

                                        <div className="mt-5 flex flex-wrap gap-5 border-y border-slate-100 py-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-2">
                                                <CalendarDays size={16} />
                                                {fechaTexto(orden.fecha_programada)}
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <UserRound size={16} />
                                                {orden.tecnicos?.length
                                                    ? orden.tecnicos
                                                        .map((t) => t.nombre)
                                                        .join(", ")
                                                    : "Sin técnico"}
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <Clock3 size={16} />
                                                Finalizado: {fechaTexto(
                                                    orden.fecha_trabajo_terminado
                                                )}
                                            </span>
                                        </div>

                                        <div className="mt-5 rounded-lg bg-slate-50 p-4">
                                            <p className="mb-2 text-xs font-bold text-slate-700">
                                                Observaciones del Técnico
                                            </p>

                                            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                                {orden.observaciones ||
                                                    "Sin observaciones registradas."}
                                            </p>
                                        </div>

                                        <div className="mt-5 flex flex-wrap justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    abrirAccion(orden, "devolver")
                                                }
                                                className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100"
                                            >
                                                <RotateCcw size={17} />
                                                Devolver a proceso
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    abrirAccion(orden, "aprobar")
                                                }
                                                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                                            >
                                                <CheckCircle2 size={17} />
                                                Aprobar y cerrar
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        <div className="mt-7 flex items-center justify-end gap-4 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                disabled={cargando || pagina <= 1}
                                onClick={() => cargarOrdenes(pagina - 1)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                            >
                                Anterior
                            </button>

                            <span className="text-xs text-slate-500">
                                Página {pagina} de {ultimaPagina}
                            </span>

                            <button
                                type="button"
                                disabled={cargando || pagina >= ultimaPagina}
                                onClick={() => cargarOrdenes(pagina + 1)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                            >
                                Siguiente
                            </button>
                        </div>
                    </section>
                </main>
            </div>

            {ordenSeleccionada && accion && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label={
                            accion === "aprobar"
                                ? "Aprobar mantenimiento"
                                : "Devolver mantenimiento"
                        }
                        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"
                    >
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-950">
                                    {accion === "aprobar"
                                        ? "Aprobar mantenimiento"
                                        : "Devolver a proceso"}
                                </h2>

                                <p className="mt-2 text-sm text-slate-500">
                                    Orden #{ordenSeleccionada.id}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarModal}
                                disabled={procesando}
                                className="rounded-lg bg-slate-100 p-2 text-slate-600"
                                aria-label="Cerrar ventana"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={confirmarAccion}>
                            <label
                                htmlFor="motivo"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                {accion === "aprobar"
                                    ? "Observaciones de aprobación (opcional)"
                                    : "Motivo de devolución (obligatorio)"}
                            </label>

                            <textarea
                                id="motivo"
                                rows={5}
                                required={accion === "devolver"}
                                minLength={accion === "devolver" ? 10 : undefined}
                                maxLength={5000}
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder={
                                    accion === "aprobar"
                                        ? "Describe el resultado de la revisión..."
                                        : "Explica qué debe corregir el Técnico..."
                                }
                                className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none focus:border-slate-600"
                            />

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={cerrarModal}
                                    disabled={procesando}
                                    className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={procesando}
                                    className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                                        accion === "aprobar"
                                            ? "bg-zinc-900"
                                            : "bg-orange-600"
                                    }`}
                                >
                                    {procesando ? (
                                        <LoaderCircle
                                            size={17}
                                            className="animate-spin"
                                        />
                                    ) : accion === "aprobar" ? (
                                        <CheckCircle2 size={17} />
                                    ) : (
                                        <RotateCcw size={17} />
                                    )}

                                    {procesando
                                        ? "Procesando..."
                                        : accion === "aprobar"
                                        ? "Confirmar aprobación"
                                        : "Confirmar devolución"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
