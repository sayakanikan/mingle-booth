import React from 'react';
import Link from 'next/link';
import { logoutAction } from '@/actions/auth';
import { isAdminAuthenticated } from '@/lib/auth';
import { AdminNav } from '@/components/admin/AdminNav';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthed = await isAdminAuthenticated();

  if (!isAuthed) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    'use server';
    await logoutAction();
    redirect('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f0ff] flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-white/10 px-4 md:px-6 flex items-center justify-between bg-[#12121a]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⚙️</span>
          <div>
            <h1 className="font-bold text-sm md:text-base text-zinc-100">Admin Dashboard</h1>
            <p className="text-[10px] text-zinc-400 hidden sm:block">Mingle Booth by Kala Kini Experience Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="btn btn-secondary btn-sm text-xs px-2.5 sm:px-3"
            target="_blank"
            title="Open Mingle in new tab"
          >
            📸 <span className="hidden xs:inline">View</span> Booth
          </Link>
          <form action={handleLogout}>
            <button type="submit" className="btn btn-danger btn-sm text-xs px-2.5 sm:px-3">
              Log Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <AdminNav />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="max-w-4xl mx-auto w-full space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
