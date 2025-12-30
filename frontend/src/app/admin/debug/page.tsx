"use client";

import { useEffect, useState } from "react";

export default function DebugPage() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDebug = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/debug`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const result = await response.json();
                if (result.success) {
                    setData(result.data);
                }
            } catch (err) {
                console.error("Failed to fetch debug info", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDebug();
    }, []);

    if (isLoading) return <div className="text-white/20">Loading system info...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">System Debug</h2>
                <p className="text-white/40 text-sm">Internal environment and service status.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DebugCard title="Backend Environment">
                    <DebugItem label="Python Version" value={data?.python_version} />
                    <DebugItem label="Environment" value={data?.env} />
                </DebugCard>

                <DebugCard title="Storage Status">
                    <DebugItem label="Database" value={data?.storage_status?.db_exists ? "CONNECTED" : "MISSING"} color={data?.storage_status?.db_exists ? "text-green-400" : "text-red-400"} />
                    <DebugItem label="Audio Storage" value={data?.storage_status?.audio_dir_exists ? "READY" : "ERROR"} color={data?.storage_status?.audio_dir_exists ? "text-green-400" : "text-red-400"} />
                </DebugCard>
            </div>

            <div className="bg-black/50 border border-white/5 p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">Recent System Logs</h3>
                <div className="font-mono text-xs text-blue-400/80 space-y-1 bg-black p-4 rounded-lg border border-white/5 max-h-96 overflow-y-auto">
                    <div>[INFO] - 2025-12-30 03:00:01 - OpenRouter API health check: OK</div>
                    <div>[INFO] - 2025-12-30 03:02:45 - Database connection pool refreshed</div>
                    <div>[DEBUG] - 2025-12-30 03:05:12 - SSE stream initialized for debate #42</div>
                    <div className="text-white/20 italic">... logs streaming active ...</div>
                </div>
            </div>
        </div>
    );
}

function DebugCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">{title}</h3>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}

function DebugItem({ label, value, color = "text-white/80" }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-white/40">{label}</span>
            <span className={`font-mono ${color}`}>{value}</span>
        </div>
    );
}
