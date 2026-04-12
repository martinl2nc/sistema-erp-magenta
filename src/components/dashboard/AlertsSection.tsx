'use client';

interface AlertsSectionProps {
  data: {
    cotizacionesExpiradas: number;
    borradoresAntiguos: number;
    nuevosClientes: number;
  };
  isLoading?: boolean;
}

export function AlertsSection({ data, isLoading }: AlertsSectionProps) {
  const alerts = [
    {
      label: 'Cotizaciones Expiradas',
      value: data.cotizacionesExpiradas,
      icon: 'solar:danger-triangle-bold',
      color: '#EF4444',
      bgColor: '#7F1D1D',
      subtitle: 'Sin convertir, requieren seguimiento',
      severity: 'high',
    },
    {
      label: 'Borradores Antiguos',
      value: data.borradoresAntiguos,
      icon: 'solar:clock-circle-bold',
      color: '#F59E0B',
      bgColor: '#78350F',
      subtitle: 'Más de 7 días sin enviar',
      severity: 'medium',
    },
    {
      label: 'Nuevos Clientes',
      value: data.nuevosClientes,
      icon: 'solar:user-plus-rounded-bold',
      color: '#22C55E',
      bgColor: '#14532D',
      subtitle: 'Registrados este mes',
      severity: 'info',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[#1E2530] animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {alerts.map((alert) => {
        const hasValue = alert.value > 0;
        const opacity = hasValue ? 1 : 0.6;

        return (
          <div
            key={alert.label}
            className="relative overflow-hidden rounded-lg border border-[#334155] bg-[#181B21] p-5 transition-all hover:border-opacity-80"
            style={{
              borderColor: hasValue ? alert.color : '#334155',
              opacity,
            }}
          >
            {/* Background glow for high severity items with values */}
            {hasValue && alert.severity === 'high' && (
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  background: `radial-gradient(circle at top right, ${alert.color} 0%, transparent 70%)`,
                }}
              />
            )}

            {/* Content */}
            <div className="relative z-10 flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: hasValue ? `${alert.color}20` : '#1E2530',
                }}
              >
                <iconify-icon
                  icon={alert.icon}
                  style={{
                    color: hasValue ? alert.color : '#64748B',
                    fontSize: '1.5rem',
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#94A3B8] font-medium mb-1">
                  {alert.label}
                </div>
                <div
                  className="text-3xl font-bold mb-1"
                  style={{
                    color: hasValue ? alert.color : '#64748B',
                  }}
                >
                  {alert.value}
                </div>
                <div className="text-xs text-[#64748B]">{alert.subtitle}</div>
              </div>
            </div>

            {/* Action indicator for items with values */}
            {hasValue && alert.severity !== 'info' && (
              <div className="mt-3 pt-3 border-t border-[#334155]">
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <iconify-icon
                    icon="solar:arrow-right-bold"
                    style={{ fontSize: '0.875rem' }}
                  />
                  <span>Requiere atención</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
