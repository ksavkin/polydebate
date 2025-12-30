"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                router.push("/admin/dashboard");
            } else {
                setError(data.error?.message || "Login failed");
            }
        } catch (err) {
            setError("Connection error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl"
            >
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
                    <p className="text-white/40 text-sm">Secure Management Console</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-white/60 mb-1 ml-1 uppercase tracking-wider">
                            Admin Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                            placeholder="admin@polydebate.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-white/60 mb-1 ml-1 uppercase tracking-wider">
                            Secure Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all ${isLoading ? "opacity-50 cursor-not-allowed" : "shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                            }`}
                    >
                        {isLoading ? "Authenticating..." : "Access Console"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push("/")}
                        className="text-xs text-white/30 hover:text-white transition-colors"
                    >
                        ← Back to Application
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
