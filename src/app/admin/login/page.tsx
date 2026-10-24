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

  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await loginAction(password);
      if (res.success) {
        window.location.href = '/admin/camera';
      } else {
        setError(res.error || 'Authentication failed');
        setLoading(false);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none -top-20 -left-20 opacity-30"
        style={{ background: 'radial-gradient(circle, #c084fc, #f472b6)' }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[130px] pointer-events-none -bottom-20 -right-20 opacity-20"
        style={{ background: 'radial-gradient(circle, #38bdf8, #818cf8)' }}
      />

      <div className="glass-card max-w-sm w-full p-8 rounded-3xl text-center shadow-2xl flex flex-col items-center gap-5 relative z-10 border border-white/15">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-purple-400/40 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/10">
          🔐
        </div>

        <div>
          <h2 className="text-2xl font-bold text-hero-gradient font-sans tracking-tight">Admin Access</h2>
          <p className="text-xs text-zinc-400 mt-1">Enter password to configure photobooth</p>
        </div>

        {error && (
          <div className="w-full p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all text-center tracking-wider font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs p-1"
              tabIndex={-1}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="btn btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying…' : 'Unlock Dashboard →'}
          </button>
        </form>

        <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1">
          <span>←</span>
          <span>Return to Mingle</span>
        </Link>
      </div>
    </div>
  );
}
