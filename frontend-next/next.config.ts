
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination:
                    "http://backend-cuervo.test/api/:path*",
            },
            {
                source: "/sanctum/:path*",
                destination:
                    "http://backend-cuervo.test/sanctum/:path*",
            },
            {
                source: "/backend/login",
                destination:
                    "http://backend-cuervo.test/login",
            },
            {
                source: "/backend/logout",
                destination:
                    "http://backend-cuervo.test/logout",
            },
        ];
    },
};

export default nextConfig;
