"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Basic check for admin token/user
        const checkAdmin = () => {
            const token = localStorage.getItem("token");
            const userStr = localStorage.getItem("user");

            if (!token || !userStr) {
                if (pathname !== "/admin/login") {
                    router.push("/admin/login");
                } else {
                    setIsLoading(false);
                }
                return;
            }

            try {
                const user = JSON.parse(userStr);
                if (!user.is_admin) {
                    router.push("/");
                    return;
                }
                setIsAuthorized(true);
                setIsLoading(false);
            } catch (e) {
                router.push("/admin/login");
            }
        };

        checkAdmin();
    }, [pathname, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl p-6 flex flex-col fixed h-full">
                <div className="mb-10">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        PolyDebate Admin
                    </h1>
                    <p className="text-xs text-white/40 mt-1">Management Console</p>
                </div>

                <nav className="space-y-2 flex-1">
                    <AdminNavLink href="/admin/dashboard" active={pathname === "/admin/dashboard"}>
                        Analytics
                    </AdminNavLink>
                    <AdminNavLink href="/admin/users" active={pathname === "/admin/users"}>
                        User Management
                    </AdminNavLink>
                    <AdminNavLink href="/admin/debates" active={pathname === "/admin/debates"}>
                        Live Debates
                    </AdminNavLink>
                    <AdminNavLink href="/admin/debug" active={pathname === "/admin/debug"}>
                        System Debug
                    </AdminNavLink>
                </nav>

                <div className="pt-6 border-t border-white/10">
                    <button
                        onClick={() => {
                            localStorage.removeItem("token");
                            localStorage.removeItem("user");
                            router.push("/admin/login");
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1 p-10">
                {children}
            </main>
        </div>
    );
}

function AdminNavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
    return (
        <Link
            href={href}
            className={`block px-4 py-2 rounded-lg text-sm transition-all ${active
                    ? "bg-white/10 text-white font-medium shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
        >
            {children}
        </Link>
    );
}
