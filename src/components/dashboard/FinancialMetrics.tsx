'use client';

interface FinancialMetricsProps {
  data: {
    valorPromedio: number;
    totalDescuentos: number;
    cotizacionesConDescuento: number;
    porcentajeConDescuento: number;
  };
  isLoading?: boolean;
}

export function FinancialMetrics({ data, isLoading }: FinancialMetricsProps) {
  const metrics = [
    {
      label: 'Valor Promedio',
      value: data.valorPromedio,
      icon: 'solar:chart-2-bold',
      color: '#3B82F6',
      format: 'currency',
      subtitle: 'Por cotización',
    },
    {
      label: 'Descuentos Totales',
      value: data.totalDescuentos,
      icon: 'solar:tag-price-bold',
      color: '#EF4444',
      format: 'currency',
      subtitle: 'Monto total otorgado',
    },
    {
      label: '% con Descuento',
      value: data.porcentajeConDescuento,
      icon: 'solar:percent-bold',
      color: '#F59E0B',
      format: 'percentage',
      subtitle: `${data.cotizacionesConDescuento} cotizaciones`,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-[#1E2530] animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  const formatValue = (value: number, format: string) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (format === 'percentage') {
      return `${value}%`;
    }
    return value.toString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="relative overflow-hidden rounded-lg border border-[#334155] bg-[#181B21] p-6"
        >
          {/* Background decoration */}
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-5 -mr-8 -mt-8"
            style={{
              background: `radial-gradient(circle, ${metric.color} 0%, transparent 70%)`,
            }}
          />

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${metric.color}20` }}
              >
                <iconify-icon
                  icon={metric.icon}
                  style={{ color: metric.color, fontSize: '1.5rem' }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-[#94A3B8] font-medium">{metric.label}</div>
              <div className="text-3xl font-bold text-white">
                {formatValue(metric.value, metric.format)}
              </div>
              <div className="text-xs text-[#64748B]">{metric.subtitle}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
