'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCompanyConfig } from '@/hooks/useCompanyConfig';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: config } = useCompanyConfig();
  const { user, role, nombre, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/dashboard' || pathname === '/';
    if (path === '/cotizaciones') return pathname.startsWith('/cotizaciones');
    if (path === '/pedidos') return pathname.startsWith('/pedidos');
    if (path === '/facturacion') return pathname.startsWith('/facturacion');
    if (path === '/cobranzas') return pathname.startsWith('/cobranzas');
    if (path === '/compras/dashboard') return pathname === '/compras/dashboard';
    if (path.startsWith('/compras')) return pathname.startsWith(path);
    return pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-[#3B82F6] text-white shadow-sm'
        : 'text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/40'
    }`;

  const subNavLinkClass = (path: string) =>
    `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      pathname === path
        ? 'text-[#3B82F6] bg-[#3B82F6]/10'
        : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#334155]/30'
    }`;

  const content = (
    <>
      <div>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#334155]">
          <Link href="/dashboard" className="min-w-0">
            {config?.logo_url ? (
              <img
                src={config.logo_url}
                alt={config.razon_social || 'Logo Empresa'}
                className="max-h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-xl font-semibold tracking-tight text-[#E2E8F0]">
                COTIZADOR<span className="text-[#3B82F6]">PRO</span>
              </span>
            )}
          </Link>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1 text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]/40 rounded-md transition-colors"
            aria-label="Cerrar menú"
          >
            <iconify-icon icon="solar:close-circle-linear" class="text-xl"></iconify-icon>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto">
          {/* Ventas */}
          <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-widest text-[#475569]">Ventas</p>

          <Link href="/dashboard" className={navLinkClass('/')} onClick={onClose}>
            <iconify-icon icon="solar:home-smile-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            Dashboard
          </Link>

          <Link href="/cotizaciones" className={navLinkClass('/cotizaciones')} onClick={onClose}>
            <iconify-icon icon="solar:document-text-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            Cotizaciones
          </Link>

          <Link href="/pedidos" className={navLinkClass('/pedidos')} onClick={onClose}>
            <iconify-icon icon="solar:box-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
            Pedidos
          </Link>

          {role === 'admin' && (
            <Link href="/facturacion" className={navLinkClass('/facturacion')} onClick={onClose}>
              <iconify-icon icon="solar:bill-list-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
              Facturación
            </Link>
          )}

          {role === 'admin' && (
            <div>
              <Link href="/cobranzas" className={navLinkClass('/cobranzas')} onClick={onClose}>
                <iconify-icon icon="solar:wallet-money-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                Cobranzas
              </Link>
              <div className="ml-4 mt-0.5 pl-3 border-l border-[#334155] space-y-0.5">
                <Link href="/cobranzas/transacciones" className={subNavLinkClass('/cobranzas/transacciones')} onClick={onClose}>
                  <iconify-icon icon="solar:transfer-horizontal-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                  Transacciones
                </Link>
                <Link href="/cobranzas/aging" className={subNavLinkClass('/cobranzas/aging')} onClick={onClose}>
                  <iconify-icon icon="solar:chart-2-linear" stroke-width="1.5" class="text-sm"></iconify-icon>
                  Antigüedad
                </Link>
              </div>
            </div>
          )}

          {/* Compras */}
          {role === 'admin' && (
            <>
              <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-widest text-[#475569]">Compras</p>

              <Link href="/compras/dashboard" className={navLinkClass('/compras/dashboard')} onClick={onClose}>
                <iconify-icon icon="solar:home-smile-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                Dashboard
              </Link>

              <Link href="/compras/cotizaciones" className={navLinkClass('/compras/cotizaciones')} onClick={onClose}>
                <iconify-icon icon="solar:document-text-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                Cotizaciones
              </Link>

              <Link href="/compras/ordenes" className={navLinkClass('/compras/ordenes')} onClick={onClose}>
                <iconify-icon icon="solar:box-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                Órdenes de compra
              </Link>

              <Link href="/compras/facturacion" className={navLinkClass('/compras/facturacion')} onClick={onClose}>
                <iconify-icon icon="solar:bill-list-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                Facturación
              </Link>

              <Link href="/compras/pagos" className={navLinkClass('/compras/pagos')} onClick={onClose}>
                <iconify-icon icon="solar:wallet-money-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                Pagos
              </Link>
            </>
          )}

          {/* Admin */}
          {role === 'admin' && (
            <div className="pt-4">
              <Link href="/admin/clientes" className={navLinkClass('/admin')} onClick={onClose}>
                <iconify-icon icon="solar:settings-linear" stroke-width="1.5" class="text-lg"></iconify-icon>
                Administración
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-[#334155]">
        <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#334155]/40 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] flex shrink-0 items-center justify-center font-semibold text-xs border border-[#3B82F6]/30">
              {nombre ? nombre.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#E2E8F0] truncate" title={nombre || 'Usuario'}>{nombre || 'Usuario'}</p>
              <p className="text-xs text-[#94A3B8] truncate" title={user?.email || ''}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="text-[#94A3B8] hover:text-red-400 p-1 rounded-md hover:bg-[#0F1115] transition-colors"
            title="Cerrar Sesión"
          >
            <iconify-icon icon="solar:logout-2-linear" class="text-lg"></iconify-icon>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="shrink-0 hidden md:flex flex-col bg-[#181B21] w-[250px] border-r border-[#334155] justify-between h-full">
        {content}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="relative z-50 flex flex-col bg-[#181B21] w-[250px] border-r border-[#334155] justify-between h-full">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
