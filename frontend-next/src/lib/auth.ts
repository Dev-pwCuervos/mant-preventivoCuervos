
import "server-only";

import { headers } from "next/headers";

type UsuarioAutenticado = {
    id: number;
    nombre: string;
    email: string;
    activo: boolean;
    roles: string[];
};

export async function obtenerSupervisor():
    Promise<UsuarioAutenticado | null> {

    const encabezados = await headers();

    // Cookies recibidas por Next.js desde el navegador
    const cookies = encabezados.get("cookie");

    if (!cookies) {
        return null;
    }

    try {
        const respuesta = await fetch(
            "http://backend-cuervo.test/api/user",
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    Referer: "http://localhost:3000/",
                    Cookie: cookies,
                },
                cache: "no-store",
                redirect: "manual",
            }
        );

        if (!respuesta.ok) {
            console.error(
                "Laravel rechazó la sesión:",
                respuesta.status
            );

            return null;
        }

        const usuario =
            (await respuesta.json()) as UsuarioAutenticado;

        const autorizado =
            usuario.activo === true &&
            Array.isArray(usuario.roles) &&
            usuario.roles.some((rol) =>
                ["Administrador", "Supervisor"].includes(rol)
            );

        return autorizado ? usuario : null;

    } catch (error) {
        console.error(
            "Error al verificar sesión con Laravel:",
            error
        );

        return null;
    }
}
