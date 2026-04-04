'use client';

interface ComparisonBadgeProps {
  percentageChange: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function ComparisonBadge({ percentageChange, size = 'md', showIcon = true }: ComparisonBadgeProps) {
  const isPositive = percentageChange > 0;
  const isNeutral = percentageChange === 0;
  
  const color = isNeutral ? '#94A3B8' : isPositive ? '#22C55E' : '#EF4444';
  const bgColor = isNeutral ? '#334155' : isPositive ? '#14532D' : '#7F1D1D';
  const icon = isNeutral ? 'solar:minus-circle-bold' : isPositive ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold';
  
  const sizes = {
    sm: {
      text: 'text-xs',
      padding: 'px-2 py-1',
      icon: '0.75rem',
    },
    md: {
      text: 'text-sm',
      padding: 'px-2.5 py-1',
      icon: '0.875rem',
    },
    lg: {
      text: 'text-base',
      padding: 'px-3 py-1.5',
      icon: '1rem',
    },
  };

  const sizeStyles = sizes[size];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold ${sizeStyles.padding} ${sizeStyles.text}`}
      style={{
        backgroundColor: `${bgColor}40`,
        color: color,
      }}
    >
      {showIcon && (
        <iconify-icon
          icon={icon}
          style={{ fontSize: sizeStyles.icon }}
        />
      )}
      <span>{isPositive ? '+' : ''}{percentageChange}%</span>
    </div>
  );
}
