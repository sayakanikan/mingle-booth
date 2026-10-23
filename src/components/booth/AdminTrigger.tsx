'use client';

import Link from 'next/link';

export function AdminTrigger() {
  return (
    <Link
      href="/admin"
      className="fixed top-5 right-5 z-40 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white/80 hover:text-white backdrop-blur-md transition-all shadow-lg select-none"
      title="Open Admin Settings"
    >
      <span className="text-sm">⚙</span>
      <span>Admin</span>
    </Link>
  );
}
