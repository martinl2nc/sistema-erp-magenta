'use client';

interface FunnelChartProps {
  data: {
    cotizaciones: number;
    pedidos: number;
    facturas: number;
    conversionAPedido: number;
    conversionAFactura: number;
  };
  isLoading?: boolean;
}

export function FunnelChart({ data, isLoading }: FunnelChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-[#1E2530] animate-pulse rounded-lg"></div>
        <div className="h-24 bg-[#1E2530] animate-pulse rounded-lg"></div>
        <div className="h-24 bg-[#1E2530] animate-pulse rounded-lg"></div>
      </div>
    );
  }

  const stages = [
    {
      name: 'Cotizaciones',
      value: data.cotizaciones,
      icon: 'solar:document-text-bold',
      color: '#3B82F6',
      percentage: 100,
      width: 100,
    },
    {
      name: 'Pedidos',
      value: data.pedidos,
      icon: 'solar:box-bold',
      color: '#A855F7',
      percentage: data.conversionAPedido,
      width: 75,
    },
    {
      name: 'Facturas',
      value: data.facturas,
      icon: 'solar:bill-list-bold',
      color: '#22C55E',
      percentage: data.conversionAFactura,
      width: 50,
    },
  ];

  return (
    <div className="space-y-6">
      {stages.map((stage, index) => (
        <div key={stage.name} className="relative">
          {/* Stage Container */}
          <div
            className="relative mx-auto rounded-lg border border-[#334155] overflow-hidden"
            style={{
              width: `${stage.width}%`,
              minWidth: '200px',
              backgroundColor: 'rgba(30, 37, 48, 0.5)',
            }}
          >
            {/* Background bar */}
            <div
              className="absolute inset-0 opacity-10"
              style={{ backgroundColor: stage.color }}
            />

            {/* Content */}
            <div className="relative z-10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${stage.color}20` }}
                >
                  <iconify-icon icon={stage.icon} style={{ color: stage.color, fontSize: '1.5rem' }} />
                </div>
                <div>
                  <div className="text-[#E2E8F0] font-medium">{stage.name}</div>
                  <div className="text-2xl font-bold text-white">{stage.value}</div>
                </div>
              </div>

              {index > 0 && (
                <div className="text-right">
                  <div className="text-sm text-[#94A3B8]">Conversión</div>
                  <div className="text-xl font-bold" style={{ color: stage.color }}>
                    {stage.percentage}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Arrow connector */}
          {index < stages.length - 1 && (
            <div className="flex justify-center mt-2 mb-2">
              <iconify-icon
                icon="solar:arrow-down-bold"
                style={{ color: '#64748B', fontSize: '1.5rem' }}
              />
            </div>
          )}
        </div>
      ))}

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-[#334155]">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-sm text-[#94A3B8]">Cotización → Pedido</div>
            <div className="text-2xl font-bold text-[#A855F7]">
              {data.conversionAPedido}%
            </div>
          </div>
          <div>
            <div className="text-sm text-[#94A3B8]">Cotización → Factura</div>
            <div className="text-2xl font-bold text-[#22C55E]">
              {data.conversionAFactura}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
