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
    <Card className="bg-gradient-to-br from-[#1a1f2e] to-[#252b3b] border-gray-800 mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {user.avatar_url ? (
              <img
                src={`http://localhost:5001${user.avatar_url}`}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                {getInitials(user.name)}
              </div>
            )}

            {/* User Info */}
            <div>
              <h1 className="text-2xl font-bold text-white">{user.name}</h1>
              <p className="text-gray-400">{user.email}</p>
              <p className="text-sm text-gray-500">
                Member since {formatDate(user.created_at)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onEditClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Edit Profile
            </Button>
            <Button
              onClick={onLogoutClick}
              variant="outline"
              className="border-gray-700 bg-gray-900 hover:bg-gray-800 text-white"
            >
              Log Out
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
