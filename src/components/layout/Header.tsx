'use client';

import Link from 'next/link';
import { useCompanyConfig } from '@/hooks/useCompanyConfig';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: config } = useCompanyConfig();

  return (
    <header className="h-16 bg-[#0F1115] border-b border-[#334155] flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/40 rounded-md transition-colors"
          aria-label="Abrir menú"
        >
          <iconify-icon icon="solar:hamburger-menu-linear" class="text-xl"></iconify-icon>
        </button>
        {config?.logo_url ? (
          <Link href="/dashboard" className="md:hidden shrink-0">
            <img
              src={config.logo_url}
              alt={config.razon_social || 'Logo Empresa'}
              className="h-8 w-auto object-contain"
            />
          </Link>
        ) : null}
      </div>

      <button className="relative p-2 text-[#94A3B8] hover:text-[#E2E8F0] transition-colors rounded-full hover:bg-[#334155]/40 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#0F1115]">
        <iconify-icon icon="solar:bell-linear" stroke-width="1.5" class="text-xl"></iconify-icon>
        <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#3B82F6] rounded-full ring-2 ring-[#0F1115]"></span>
      </button>
    </header>
  );
}
