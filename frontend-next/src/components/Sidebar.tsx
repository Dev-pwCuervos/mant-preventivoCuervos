
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bird,
    LayoutDashboard,
    ClipboardList,
    ClipboardCheck,
    History,
    ChartNoAxesCombined,
    LogOut,
    X,
} from "lucide-react";

type SidebarProps = {
    nombre: string;
    roles: string[];
    abierto: boolean;
    onClose: () => void;
    onLogout: () => void;
    cerrando: boolean;
};

const opciones = [
    {
        nombre: "Dashboard",
        ruta: "/dashboard",
        icono: LayoutDashboard,
    },
    {
        nombre: "Monitoreo",
        ruta: "/monitoreo",
        icono: ClipboardList,
    },
    {
        nombre: "Revisión",
        ruta: "/revision",
        icono: ClipboardCheck,
    },
    {
        nombre: "Historial",
        ruta: "/historial",
        icono: History,
    },
    {
        nombre: "Reportes",
        ruta: "/reportes",
        icono: ChartNoAxesCombined,
    },
];

export default function Sidebar({
    nombre,
    roles,
    abierto,
    onClose,
    onLogout,
    cerrando,
}: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {abierto && (
                <button
                    type="button"
                    aria-label="Cerrar menú"
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                />
            )}

            <aside
                className={`
                    fixed inset-y-0 left-0 z-50
                    flex w-64 flex-col bg-zinc-950 text-white
                    transition-transform duration-200
                    lg:translate-x-0
                    ${abierto ? "translate-x-0" : "-translate-x-full"}
                `}
            >
                <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
                    <div className="flex items-center gap-3">
                        <Bird size={29} />
                        <span className="text-xl font-bold">
                            CUERVO
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="lg:hidden"
                        aria-label="Cerrar menú"
                    >
                        <X size={21} />
                    </button>
                </div>

                <div className="px-4 pt-8">
                    <p className="mb-4 px-3 text-xs font-semibold tracking-widest text-zinc-500">
                        SUPERVISIÓN
                    </p>

                    <nav className="space-y-2">
                        {opciones.map((opcion) => {
                            const Icono = opcion.icono;
                            const activo = pathname === opcion.ruta;

                            return (
                                <Link
                                    key={opcion.ruta}
                                    href={opcion.ruta}
                                    onClick={onClose}
                                    className={`
                                        flex items-center gap-3 rounded-xl
                                        px-4 py-3 text-sm font-medium
                                        transition-colors
                                        ${
                                            activo
                                                ? "bg-white text-zinc-950"
                                                : "text-zinc-400 hover:bg-white/10 hover:text-white"
                                        }
                                    `}
                                >
                                    <Icono size={19} />
                                    {opcion.nombre}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto border-t border-white/10 p-5">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 font-bold">
                            {nombre.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                                {nombre}
                            </p>

                            <p className="truncate text-xs text-zinc-400">
                                {roles.join(", ")}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onLogout}
                        disabled={cerrando}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                        <LogOut size={18} />
                        {cerrando ? "Cerrando..." : "Cerrar sesión"}
                    </button>
                </div>
            </aside>
        </>
    );
}
