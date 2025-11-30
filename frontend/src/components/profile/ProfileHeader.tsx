'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileHeaderProps {
  user: {
    name: string;
    email: string;
    avatar_url: string | null;
    created_at: string;
  };
  onEditClick: () => void;
  onLogoutClick: () => void;
}

export function ProfileHeader({ user, onEditClick, onLogoutClick }: ProfileHeaderProps) {
  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card
      className="mb-6"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {user.avatar_url ? (
              <img
                src={`http://localhost:5001${user.avatar_url}`}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-2"
                style={{ borderColor: "var(--card-border)" }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--color-primary), #8b5cf6)" }}
              >
                {getInitials(user.name)}
              </div>
            )}

            {/* User Info */}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{user.name}</h1>
              <p style={{ color: "var(--foreground-secondary)" }}>{user.email}</p>
              <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                Member since {formatDate(user.created_at)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onEditClick}
              className="text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Edit Profile
            </Button>
            <Button
              onClick={onLogoutClick}
              variant="outline"
              style={{
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
                backgroundColor: "transparent"
              }}
            >
              Log Out
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
