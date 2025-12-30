"use client";

import { useEffect, useState } from "react";

interface DebateData {
    id: number;
    slug: string;
    title: string;
    user_id: number;
    status: string;
    created_at: string;
}

export default function DebatesPage() {
    const [debates, setDebates] = useState<DebateData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDebates = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/debates`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const result = await response.json();
                if (result.success) {
                    setDebates(result.data);
                }
            } catch (err) {
                console.error("Failed to fetch debates", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDebates();
    }, []);

    if (isLoading) return <div className="text-white/20">Loading debates...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">Live Debates</h2>
                <p className="text-white/40 text-sm">Monitor all debate sessions on the platform.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {debates.map((debate) => (
                    <div key={debate.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors">
                        <div>
                            <h3 className="text-white font-medium mb-1">{debate.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-white/40 font-mono">
                                <span>ID: #{debate.id}</span>
                                <span>•</span>
                                <span>{debate.slug}</span>
                                <span>•</span>
                                <span>User: {debate.user_id}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${debate.status === 'completed' ? "bg-blue-400/10 text-blue-400" : "bg-yellow-400/10 text-yellow-400 animate-pulse"
                                    }`}>
                                    {debate.status}
                                </span>
                                <p className="text-[10px] text-white/20 mt-1 uppercase tracking-tighter">
                                    {new Date(debate.created_at).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => window.open(`/debate/${debate.id}`, '_blank')}
                                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
                                title="View Live"
                            >
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
