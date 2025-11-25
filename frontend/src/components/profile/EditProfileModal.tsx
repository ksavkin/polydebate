'use client';

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface User {
  name: string;
  email: string;
  avatar_url: string | null;
}

interface EditProfileModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSave: (name: string, avatar: File | null) => Promise<void>;
}

export function EditProfileModal({ isOpen, user, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    user.avatar_url ? `http://localhost:5001${user.avatar_url}` : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        setError('Only JPG, PNG, and GIF files are allowed');
        return;
      }

      setError(null);
      setAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(name.trim(), avatar);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-[#1a1f2e] border-gray-800 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">Edit Profile</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#252b3b] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your name"
            />
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Profile Picture</label>
            <div className="flex items-center gap-4">
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
                />
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-gray-700 bg-gray-900 hover:bg-gray-800 text-white w-full"
                >
                  Choose File
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG or GIF (max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button
              onClick={onClose}
              disabled={loading}
              variant="outline"
              className="flex-1 border-gray-700 bg-gray-900 hover:bg-gray-800 text-white"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
