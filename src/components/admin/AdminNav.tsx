'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/events', label: 'Events & Gallery', icon: '🎉' },
    { href: '/admin/camera', label: 'Camera', icon: '📷' },
    { href: '/admin/branding', label: 'Branding', icon: '🎨' },
    { href: '/admin/frames', label: 'Frames & Layout', icon: '🖼️' },
    { href: '/admin/security', label: 'Security', icon: '🔒' },
  ];

  return (
    <nav className="w-full md:w-60 bg-[#181311]/90 backdrop-blur-md border-b md:border-b-0 md:border-r border-white/10 p-2.5 md:p-4 flex md:flex-col gap-1.5 md:gap-2 shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href === '/admin/events' && pathname.startsWith('/admin/events'));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3.5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? 'bg-[#e24a21]/20 text-[#faf6ee] border border-[#e24a21]/45 shadow-sm shadow-[#e24a21]/15 font-semibold'
                : 'text-[#c8beb7] hover:text-[#faf6ee] hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
