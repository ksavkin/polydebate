"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AnalyticsData {
    total_users: number;
    total_debates: number;
    total_messages: number;
    recent_debates_24h: number;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/analytics`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const result = await response.json();
                if (result.success) {
                    setData(result.data);
                }
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Platform Analytics</h2>
                <p className="text-white/40">Real-time overview of PolyDebate usage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={data?.total_users || 0} trend="+12% this week" />
                <StatCard title="Total Debates" value={data?.total_debates || 0} trend="+5% this week" />
                <StatCard title="Total Messages" value={data?.total_messages || 0} trend="+8% this week" />
                <StatCard title="Active Debates (24h)" value={data?.recent_debates_24h || 0} trend="Live" color="text-green-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl h-80 flex items-center justify-center">
                    <p className="text-white/20 italic">Traffic Chart Placeholder</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl h-80 flex items-center justify-center">
                    <p className="text-white/20 italic">Model Usage Placeholder</p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend, color = "text-white" }: { title: string; value: number | string; trend: string; color?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl backdrop-blur-sm"
        >
            <p className="text-white/40 text-sm font-medium uppercase tracking-wider mb-2">{title}</p>
            <p className={`text-3xl font-bold mb-2 ${color}`}>{value.toLocaleString()}</p>
            <p className="text-xs text-white/20">{trend}</p>
        </motion.div>
    );
}
