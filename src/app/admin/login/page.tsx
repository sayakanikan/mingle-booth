'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/actions/auth';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAction(password);
      if (res.success) {
        router.push('/admin/camera');
        router.refresh();
      } else {
        setError(res.error || 'Authentication failed');
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="glass-card max-w-sm w-full p-8 rounded-3xl text-center shadow-2xl flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-2xl shadow-lg">
          🔒
        </div>

        <div>
          <h2 className="text-2xl font-bold text-hero-gradient font-sans">Admin Access</h2>
          <p className="text-xs text-zinc-400 mt-1">Enter password to configure photobooth</p>
        </div>

        {error && (
          <div className="w-full p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all text-center tracking-widest"
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 text-sm font-semibold"
          >
            {loading ? 'Verifying…' : 'Unlock Dashboard →'}
          </button>
        </form>

        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Return to Kiosk
        </Link>
      </div>
    </div>
  );
}
