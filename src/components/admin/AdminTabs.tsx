'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { id: 'productos', label: 'Productos y Categorías', path: '/admin/productos' },
  { id: 'empresa', label: 'Configuración de Empresa', path: '/admin/empresa' },
  { id: 'clientes', label: 'Clientes y Vendedores', path: '/admin/clientes' },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-[#334155] overflow-x-auto">
      <nav className="flex space-x-8 min-w-max">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-[#3B82F6] text-[#E2E8F0]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0] hover:border-[#334155]'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
