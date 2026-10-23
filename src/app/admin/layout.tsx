import React from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';
import { logoutAction } from '@/actions/auth';
import { redirect } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleLogout = async () => {
    'use server';
    await logoutAction();
    redirect('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f0ff] flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-[#12121a]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <div>
            <h1 className="font-bold text-base text-zinc-100">Admin Dashboard</h1>
            <p className="text-[10px] text-zinc-400">Mingle Booth Experience Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="btn btn-secondary btn-sm text-xs"
            target="_blank"
            title="Open Kiosk in new tab"
          >
            📸 View Booth
          </Link>
          <form action={handleLogout}>
            <button type="submit" className="btn btn-danger btn-sm text-xs">
              Log Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <AdminNav />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}
