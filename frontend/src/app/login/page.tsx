'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import { useSearch } from '@/contexts/SearchContext';

export default function LoginPage() {
  const router = useRouter();
  const { loginRequestCode, loginVerifyCode } = useAuth();
  const searchParams = useSearchParams();
  const { searchQuery, setSearchQuery } = useSearch();
  const [activeCategory, setActiveCategory] = useState("trending");
  const [activeSubtopic, setActiveSubtopic] = useState("All");
  
  // Get search query from URL params
  const urlSearchQuery = searchParams.get("q") || "";
  
  // Sync context state with URL
  useEffect(() => {
    if (urlSearchQuery !== searchQuery) {
      setSearchQuery(urlSearchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearchQuery]);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(15);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await loginRequestCode({ email });
      setSuccessMessage(response.message);
      setExpiryMinutes(response.expiryMinutes);
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginVerifyCode({ email, code });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await loginRequestCode({ email });
      setSuccessMessage('New code sent! ' + response.message);
      setExpiryMinutes(response.expiryMinutes);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Navigation Header */}
      <Navigation 
        activeCategory={activeCategory}
        activeSubtopic={activeSubtopic}
        searchQuery={searchQuery}
        onCategoryChange={(category) => {
          setActiveCategory(category);
          setActiveSubtopic("All");
        }}
        onSubtopicChange={(subtopic) => setActiveSubtopic(subtopic)}
        onSearchChange={(query) => {
          setSearchQuery(query);
        }}
      />

      {/* Main Content - Centered higher (top-middle) */}
      <div className="flex-1 flex items-start justify-center px-4 pt-8 pb-8">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div
                className="w-10 h-10 rounded flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span className="text-white font-bold text-lg">PD</span>
              </div>
              <span className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>PolyDebate</span>
            </Link>
            <h1 className="text-h1 mb-2" style={{ color: 'var(--foreground)' }}>Welcome Back</h1>
            <p style={{ color: 'var(--foreground-secondary)' }}>Log in to continue</p>
          </div>

          {/* Main Form Card */}
          <div
            className="p-8 rounded-lg"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="w-full"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {error && (
                <div
                  className="p-4 rounded-md"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--color-red)',
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-red)' }}>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full text-white font-medium"
                disabled={loading}
                style={{
                  background: 'var(--color-primary)',
                  boxShadow: 'var(--shadow-primary)',
                }}
              >
                {loading ? 'Sending...' : 'Send Login Code'}
              </Button>

              <div className="text-center">
                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  Don't have an account?{' '}
                  <Link
                    href="/signup"
                    className="font-medium hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div
                className="p-4 rounded-md mb-6"
                style={{
                  background: 'rgba(37, 99, 235, 0.1)',
                  border: '1px solid var(--color-primary)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
                  We sent a {expiryMinutes}-minute verification code to <strong>{email}</strong>
                </p>
              </div>

              {successMessage && (
                <div
                  className="p-4 rounded-md"
                  style={{
                    background: 'rgba(39, 174, 96, 0.1)',
                    border: '1px solid var(--color-green)',
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-green)' }}>{successMessage}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  Verification Code
                </label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  required
                  maxLength={6}
                  disabled={loading}
                  className="w-full text-center text-2xl tracking-widest font-mono"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {error && (
                <div
                  className="p-4 rounded-md"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--color-red)',
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-red)' }}>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full text-white font-medium"
                disabled={loading || code.length !== 6}
                style={{
                  background: 'var(--color-primary)',
                  boxShadow: 'var(--shadow-primary)',
                }}
              >
                {loading ? 'Verifying...' : 'Verify & Log In'}
              </Button>

              <div className="text-center space-y-3">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm font-medium hover:underline disabled:opacity-50"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Resend Code
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    Change Email
                  </button>
                </div>
              </div>
            </form>
          )}
          </div>
        </div>
      </div>

      {/* Footer - Always visible at bottom */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
