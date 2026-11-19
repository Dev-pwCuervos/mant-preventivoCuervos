
"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    CalendarDays,
    ChartColumnIncreasing,
    CheckCircle2,
    Clock3,
    Download,
    LoaderCircle,
    Menu,
    RefreshCw,
    Wrench,
} from "lucide-react";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    LineChart,
    Line,
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

type Indicadores = {
    total: number;
    cerrados: number;
    atrasados: number;
    cerrados_a_tiempo: number;
    porcentaje_cierre: number;
};

type Grupo = {
    nombre: string;
    cantidad: number;
};

type Mes = {
    mes: string;
    cantidad: number;
    cerrados: number;
};

type Tecnico = {
    id: number;
    nombre: string;
    asignados: number;
    cerrados: number;
};

type Orden = {
    id: number;
    plan: string | null;
    estado: string | null;
    prioridad: string | null;
    fecha_programada: string | null;
    fecha_cierre: string | null;
    tecnicos: string[];
};

type Reporte = {
    periodo: {
        desde: string;
        hasta: string;
    };
    indicadores: Indicadores;
    por_estado: Grupo[];
    por_prioridad: Grupo[];
    por_mes: Mes[];
    tecnicos: Tecnico[];
    ordenes: Orden[];
};

const COLORES = [
    "#f97316",
    "#3b82f6",
    "#a855f7",
    "#22c55e",
    "#ef4444",
    "#64748b",
];

function fechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function escaparCSV(valor: unknown): string {
    const texto = String(valor ?? "");

    // Evita interpretar valores como fórmulas en Excel.
    const seguro = /^[\s]*[=+\-@\t\r]/.test(texto)
        ? `'${texto}`
        : texto;

    return `"${seguro.replace(/"/g, '""')}"`;
}

function exportarCSV(ordenes: Orden[]) {
    const encabezados = [
        "ID",
        "Plan",
        "Estado",
        "Prioridad",
        "Fecha programada",
        "Fecha cierre",
        "Técnicos",
    ];

    const filas = ordenes.map((orden) => [
        orden.id,
        orden.plan,
        orden.estado,
        orden.prioridad,
        orden.fecha_programada,
        orden.fecha_cierre,
        orden.tecnicos.join("; "),
    ]);

    const contenido = [
        encabezados,
        ...filas,
    ]
        .map((fila) => fila.map(escaparCSV).join(","))
        .join("\r\n");

    const blob = new Blob(
        ["\uFEFF", contenido],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "cuervo-reporte-mantenimientos.csv";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
}

function obtenerError(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return "Ocurrió un error inesperado.";
    }

    if (error.response?.status === 401) {
        return "La sesión expiró.";
    }

    if (error.response?.status === 403) {
        return "No tienes permisos para consultar reportes.";
    }

    if (error.response?.status === 422) {
        return "Verifica el período seleccionado.";
    }

    return (
        error.response?.data?.message ||
        "No fue posible cargar el reporte."
    );
}

export default function ReportesPage() {
    const router = useRouter();

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [verificando, setVerificando] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);

    const [reporte, setReporte] = useState<Reporte | null>(null);
    const [error, setError] = useState("");

    const [desde, setDesde] = useState(() => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-01-01`;
    });

    const [hasta, setHasta] = useState(() =>
        fechaLocal(new Date())
    );

    const cargarReporte = useCallback(async (
        fechaDesde: string,
        fechaHasta: string
    ) => {
        if (fechaDesde > fechaHasta) {
            setError(
                "La fecha inicial no puede superar la fecha final."
            );
            return;
        }

        setCargando(true);
        setError("");

        try {
            const respuesta = await api.get<Reporte>(
                "/api/reportes",
                {
                    params: {
                        desde: fechaDesde,
                        hasta: fechaHasta,
                    },
                }
            );

            setReporte(respuesta.data);
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
    }, [router]);

    useEffect(() => {
        let activo = true;

        const verificar = async () => {
            try {
                const respuesta = await api.get<Usuario>(
                    "/api/user"
                );

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
                if (activo) setVerificando(false);
            }
        };

        void verificar();

        return () => {
            activo = false;
        };
    }, [router]);

    useEffect(() => {
        if (usuario) {
            void cargarReporte(desde, hasta);
        }
        // Carga inicial al autenticar.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario, cargarReporte]);

    const cerrarSesion = async () => {
        setCerrando(true);

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

    const indicadores = reporte?.indicadores;

    const tarjetas = [
        {
            titulo: "Total de mantenimientos",
            valor: indicadores?.total,
            icono: Wrench,
            color: "text-blue-600",
            fondo: "bg-blue-50",
        },
        {
            titulo: "Mantenimientos cerrados",
            valor: indicadores?.cerrados,
            icono: CheckCircle2,
            color: "text-green-600",
            fondo: "bg-green-50",
        },
        {
            titulo: "Órdenes atrasadas",
            valor: indicadores?.atrasados,
            icono: Clock3,
            color: "text-orange-600",
            fondo: "bg-orange-50",
        },
        {
            titulo: "Porcentaje de cierre",
            valor: indicadores
                ? `${indicadores.porcentaje_cierre}%`
                : undefined,
            icono: ChartColumnIncreasing,
            color: "text-purple-600",
            fondo: "bg-purple-50",
        },
    ];

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
                                Reportes y Estadísticas
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Analiza el cumplimiento y desempeño
                                de los mantenimientos preventivos.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={!reporte || cargando}
                            onClick={() =>
                                reporte && exportarCSV(reporte.ordenes)
                            }
                            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                        >
                            <Download size={18} />
                            Exportar CSV
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

                    <section className="mb-7 rounded-xl border border-slate-200 bg-white p-6">
                        <div className="mb-5 flex items-center gap-3">
                            <CalendarDays
                                size={21}
                                className="text-slate-500"
                            />

                            <h2 className="text-lg font-bold text-slate-950">
                                Período del reporte
                            </h2>
                        </div>

                        <form
                            onSubmit={(evento) => {
                                evento.preventDefault();
                                void cargarReporte(desde, hasta);
                            }}
                            className="flex flex-wrap items-end gap-4"
                        >
                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="desde"
                                    className="text-xs font-semibold text-slate-600"
                                >
                                    Fecha inicial
                                </label>

                                <input
                                    id="desde"
                                    type="date"
                                    required
                                    value={desde}
                                    onChange={(e) => setDesde(e.target.value)}
                                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="hasta"
                                    className="text-xs font-semibold text-slate-600"
                                >
                                    Fecha final
                                </label>

                                <input
                                    id="hasta"
                                    type="date"
                                    required
                                    value={hasta}
                                    onChange={(e) => setHasta(e.target.value)}
                                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={cargando}
                                className="flex h-11 items-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                <RefreshCw
                                    size={17}
                                    className={cargando ? "animate-spin" : ""}
                                />
                                Generar reporte
                            </button>
                        </form>
                    </section>

                    <div className="mb-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {tarjetas.map((tarjeta) => {
                            const Icono = tarjeta.icono;

                            return (
                                <section
                                    key={tarjeta.titulo}
                                    className="rounded-xl border border-slate-200 bg-white p-6"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm text-slate-500">
                                            {tarjeta.titulo}
                                        </p>

                                        <div className={`rounded-xl p-3 ${tarjeta.fondo}`}>
                                            <Icono
                                                size={21}
                                                className={tarjeta.color}
                                            />
                                        </div>
                                    </div>

                                    <strong className="mt-6 block text-4xl font-bold text-slate-950">
                                        {cargando && !reporte
                                            ? "..."
                                            : tarjeta.valor ?? "—"}
                                    </strong>

                                    <p className="mt-2 text-xs text-slate-400">
                                        Datos del período consultado
                                    </p>
                                </section>
                            );
                        })}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <section className="rounded-xl border border-slate-200 bg-white p-6">
                            <h2 className="text-lg font-bold text-slate-950">
                                Mantenimientos por estado
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Distribución de las órdenes
                            </p>

                            <div className="mt-6 h-72">
                                {reporte?.por_estado.length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={reporte.por_estado}
                                                dataKey="cantidad"
                                                nameKey="nombre"
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={60}
                                                outerRadius={90}
                                            >
                                                {reporte.por_estado.map((item, i) => (
                                                    <Cell
                                                        key={item.nombre}
                                                        fill={COLORES[i % COLORES.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                        Sin datos disponibles
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-6">
                            <h2 className="text-lg font-bold text-slate-950">
                                Mantenimientos por prioridad
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Distribución de importancia
                            </p>

                            <div className="mt-6 h-72">
                                {reporte?.por_prioridad.length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={reporte.por_prioridad}
                                            margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="nombre"
                                                tick={{ fontSize: 11 }}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <Tooltip />
                                            <Bar
                                                dataKey="cantidad"
                                                name="Mantenimientos"
                                                fill="#334155"
                                                radius={[5, 5, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                        Sin datos disponibles
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-6">
                            <h2 className="text-lg font-bold text-slate-950">
                                Evolución mensual
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Órdenes programadas y cerradas por mes
                            </p>

                            <div className="mt-6 h-72">
                                {reporte?.por_mes.length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={reporte.por_mes}
                                            margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="mes"
                                                tick={{ fontSize: 11 }}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <Tooltip />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="cantidad"
                                                name="Programados"
                                                stroke="#3b82f6"
                                                strokeWidth={3}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="cerrados"
                                                name="Cerrados"
                                                stroke="#16a34a"
                                                strokeWidth={3}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                        Sin datos disponibles
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-6">
                            <h2 className="text-lg font-bold text-slate-950">
                                Carga de trabajo por técnico
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Participación en mantenimientos del período
                            </p>

                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                                            <th className="pb-4 font-semibold">
                                                Técnico
                                            </th>
                                            <th className="pb-4 text-center font-semibold">
                                                Asignados
                                            </th>
                                            <th className="pb-4 text-center font-semibold">
                                                Cerrados
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {reporte?.tecnicos.map((tecnico) => (
                                            <tr
                                                key={tecnico.id}
                                                className="border-b border-slate-100"
                                            >
                                                <td className="py-4 font-medium text-slate-800">
                                                    {tecnico.nombre}
                                                </td>
                                                <td className="py-4 text-center text-slate-600">
                                                    {tecnico.asignados}
                                                </td>
                                                <td className="py-4 text-center text-slate-600">
                                                    {tecnico.cerrados}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {!reporte?.tecnicos.length && (
                                    <p className="py-12 text-center text-sm text-slate-400">
                                        Sin técnicos registrados en el período.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    {reporte && (
                        <p className="mt-6 text-xs text-slate-500">
                            Período consultado: {reporte.periodo.desde}
                            {" — "}
                            {reporte.periodo.hasta}.
                            Los indicadores se calculan sobre órdenes
                            cuya fecha programada pertenece al período.
                        </p>
                    )}
                </main>
            </div>
        </div>
    );
}
