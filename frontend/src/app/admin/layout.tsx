"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
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

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

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
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {isSidebarOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
                <h1 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    PolyDebate Admin
                </h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </header>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={`
                fixed h-full z-50 w-64 border-r border-white/10 bg-black/95 backdrop-blur-xl p-6 flex flex-col
                transition-transform duration-300 ease-out
                lg:translate-x-0 lg:z-auto
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="mb-10 hidden lg:block">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        PolyDebate Admin
                    </h1>
                    <p className="text-xs text-white/40 mt-1">Management Console</p>
                </div>

                {/* Mobile close button area */}
                <div className="lg:hidden mb-6 pt-2">
                    <p className="text-xs text-white/40">Management Console</p>
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

                <div className="pt-6 border-t border-white/10 space-y-2">
                    <button
                        onClick={() => router.push("/")}
                        className="w-full text-left px-4 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Back to App
                    </button>
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
            <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 p-4 sm:p-6 lg:p-10">
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
