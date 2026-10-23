'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/camera', label: 'Camera', icon: '📷' },
    { href: '/admin/branding', label: 'Branding', icon: '🎨' },
    { href: '/admin/frames', label: 'Frames & Layout', icon: '🖼️' },
    { href: '/admin/gallery', label: 'Gallery', icon: '🗂️' },
    { href: '/admin/security', label: 'Security', icon: '🔒' },
  ];

  return (
    <nav className="w-full md:w-60 bg-[#12121a]/80 backdrop-blur-md border-b md:border-b-0 md:border-r border-white/10 p-3 md:p-4 flex md:flex-col gap-2 shrink-0 overflow-x-auto">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
