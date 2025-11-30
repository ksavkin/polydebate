'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, type ProfileUser, type ProfileStatistics, type UserDebate } from '@/lib/api';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatisticsCards } from '@/components/profile/StatisticsCards';
import { TopDebates } from '@/components/profile/TopDebates';
import { DebateHistory } from '@/components/profile/DebateHistory';
import { EditProfileModal } from '@/components/profile/EditProfileModal';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [statistics, setStatistics] = useState<ProfileStatistics | null>(null);
  const [topDebates, setTopDebates] = useState<UserDebate[]>([]);
  const [topDebatesType, setTopDebatesType] = useState<'recent' | 'favorites'>('recent');
  const [debates, setDebates] = useState<UserDebate[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 12, offset: 0, has_more: false });
  const [filters, setFilters] = useState({ category: null as string | null, status: null as string | null, sort: 'recent' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topDebatesLoading, setTopDebatesLoading] = useState(false);
  const [debatesLoading, setDebatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        console.log('Fetching profile...');
        console.log('Auth token exists:', !!localStorage.getItem('auth_token'));
        const data = await apiClient.getProfile();
        console.log('Profile data received:', data);
        setUser(data.user);
        setStatistics(data.statistics);
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        console.error('Error message:', err.message);
        // Redirect to login on authentication error
        if (err.message.includes('Unauthorized') || err.message.includes('401') || err.message.includes('Authentication failed')) {
          console.log('Redirecting to login due to auth error');
          router.push('/login');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  // Fetch top debates
  useEffect(() => {
    const fetchTopDebates = async () => {
      if (!user) return;

      try {
        setTopDebatesLoading(true);
        const data = await apiClient.getTopDebates(topDebatesType, 5);
        setTopDebates(data.debates);
      } catch (err: any) {
        console.error('Failed to load top debates:', err);
      } finally {
        setTopDebatesLoading(false);
      }
    };

    fetchTopDebates();
  }, [topDebatesType, user]);

  // Fetch debate history
  useEffect(() => {
    const fetchDebates = async () => {
      if (!user) return;

      try {
        setDebatesLoading(true);
        const data = await apiClient.getUserDebates({
          limit: pagination.limit,
          offset: pagination.offset,
          category: filters.category,
          status: filters.status,
          sort: filters.sort,
        });
        setDebates(data.debates);
        setPagination(data.pagination);
      } catch (err: any) {
        console.error('Failed to load debates:', err);
      } finally {
        setDebatesLoading(false);
      }
    };

    fetchDebates();
  }, [filters, pagination.offset, user]);

  const handleEditProfile = async (name: string, avatar: File | null) => {
    try {
      const data = await apiClient.updateProfile(name, avatar);
      // Backend returns { user: {...} }, not { success: true, user: {...} }
      if (data.user) {
        setUser(data.user);
        setIsEditModalOpen(false);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    router.push('/');
  };

  const handleDeleteDebate = async (debateId: string) => {
    try {
      await apiClient.deleteDebate(debateId);
      // Refresh debates
      setDebates(prev => prev.filter(d => d.debate_id !== debateId));
      setTopDebates(prev => prev.filter(d => d.debate_id !== debateId));
      // Update statistics
      if (statistics) {
        setStatistics({ ...statistics, total_debates: statistics.total_debates - 1 });
      }
    } catch (err: any) {
      console.error('Failed to delete debate:', err);
      alert('Failed to delete debate: ' + err.message);
    }
  };

  const handleViewDebate = (debateId: string) => {
    router.push(`/debate/${debateId}`);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handlePageChange = (offset: number) => {
    setPagination(prev => ({ ...prev, offset }));
  };

  const handleToggleFavorite = async (marketId: string, debateId: string, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        // Remove by debateId
        await apiClient.removeFavorite(debateId);
      } else {
        // Add with both IDs
        await apiClient.addFavorite(marketId, debateId);
      }

      // Update local state for both lists
      const updateDebateList = (list: any[]) =>
        list.map(d => d.debate_id === debateId ? { ...d, is_favorite: !isFavorite } : d);

      setDebates(prev => updateDebateList(prev));
      setTopDebates(prev => updateDebateList(prev));

      // Refresh statistics to update favorites count
      const profile = await apiClient.getProfile();
      setStatistics(profile.statistics);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      alert('Failed to update favorite status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-[var(--foreground)]">Loading profile...</div>
      </div>
    );
  }

  if (error || !user || !statistics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-xl">{error || 'Failed to load profile'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto space-y-6 py-8 px-4">
        {/* Profile Header */}
        <ProfileHeader
          user={user}
          onEditClick={() => setIsEditModalOpen(true)}
          onLogoutClick={handleLogout}
        />

        {/* Statistics Cards */}
        <StatisticsCards
          statistics={statistics}
          tokensRemaining={user.tokens_remaining}
        />

        {/* Top Debates */}
        <TopDebates
          debates={topDebates}
          type={topDebatesType}
          onTypeChange={setTopDebatesType}
          onDelete={handleDeleteDebate}
          onView={handleViewDebate}
          onToggleFavorite={handleToggleFavorite}
          loading={topDebatesLoading}
        />

        {/* Debate History */}
        <DebateHistory
          debates={debates}
          pagination={pagination}
          filters={filters}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
          onDelete={handleDeleteDebate}
          onView={handleViewDebate}
          onToggleFavorite={handleToggleFavorite}
          loading={debatesLoading}
        />

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            user={user}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleEditProfile}
          />
        )}
      </div>
    </div>
  );
}
