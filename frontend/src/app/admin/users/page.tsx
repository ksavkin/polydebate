"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface UserData {
    id: number;
    email: string;
    name: string;
    is_active: boolean;
    is_admin: boolean;
    created_at: string;
    total_debates: number;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/users`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const result = await response.json();
                if (result.success) {
                    setUsers(result.data);
                }
            } catch (err) {
                console.error("Failed to fetch users", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const deactivateUser = async (id: number) => {
        if (!confirm("Are you sure you want to deactivate this user?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/users/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                setUsers(users.map(u => u.id === id ? { ...u, is_active: false } : u));
            }
        } catch (err) {
            alert("Failed to deactivate user");
        }
    };

    if (isLoading) return <div className="animate-pulse text-white/20">Loading users...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">User Management</h2>
                <p className="text-white/40 text-sm">Manage user access and monitor activity.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-white/40 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-medium">User</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Debates</th>
                            <th className="px-6 py-4 font-medium">Joined</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{user.name}</div>
                                    <div className="text-white/40 text-xs">{user.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${user.is_active ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                                        }`}>
                                        {user.is_active ? "Active" : "Disabled"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-white/60">{user.total_debates}</td>
                                <td className="px-6 py-4 text-white/40">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {user.is_active && !user.is_admin && (
                                        <button
                                            onClick={() => deactivateUser(user.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Deactivate
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
