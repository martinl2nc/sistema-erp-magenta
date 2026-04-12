'use client';

import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { useState } from 'react';

export interface DateRange {
  start: Date;
  end: Date;
  preset?: 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'custom';
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);

  const presets = [
    {
      id: 'thisMonth' as const,
      label: 'Este mes',
      getRange: () => ({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
        preset: 'thisMonth' as const,
      }),
    },
    {
      id: 'lastMonth' as const,
      label: 'Mes pasado',
      getRange: () => ({
        start: startOfMonth(subMonths(new Date(), 1)),
        end: endOfMonth(subMonths(new Date(), 1)),
        preset: 'lastMonth' as const,
      }),
    },
    {
      id: 'last3Months' as const,
      label: 'Últimos 3 meses',
      getRange: () => ({
        start: startOfMonth(subMonths(new Date(), 2)),
        end: endOfMonth(new Date()),
        preset: 'last3Months' as const,
      }),
    },
    {
      id: 'last6Months' as const,
      label: 'Últimos 6 meses',
      getRange: () => ({
        start: startOfMonth(subMonths(new Date(), 5)),
        end: endOfMonth(new Date()),
        preset: 'last6Months' as const,
      }),
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    onChange(preset.getRange());
    setShowCustom(false);
  };

  const handleCustomDateChange = (type: 'start' | 'end', dateString: string) => {
    const date = new Date(dateString);
    if (type === 'start') {
      onChange({ ...value, start: date, preset: 'custom' });
    } else {
      onChange({ ...value, end: date, preset: 'custom' });
    }
  };

  const formatDisplayDate = (date: Date) => {
    return format(date, 'dd MMM yyyy');
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${
                value.preset === preset.id
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-[#181B21] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6] hover:text-[#E2E8F0]'
              }
            `}
          >
            {preset.label}
          </button>
        ))}
        
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${
              value.preset === 'custom'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-[#181B21] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6] hover:text-[#E2E8F0]'
            }
          `}
        >
          <iconify-icon icon="solar:calendar-bold" style={{ marginRight: '0.5rem', fontSize: '1rem' }} />
          Personalizado
        </button>
      </div>

      {/* Current range display */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#181B21] border border-[#334155] rounded-lg text-sm">
        <iconify-icon icon="solar:calendar-mark-bold" style={{ color: '#94A3B8', fontSize: '1rem' }} />
        <span className="text-[#E2E8F0] font-medium">
          {formatDisplayDate(value.start)} - {formatDisplayDate(value.end)}
        </span>
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="w-full flex flex-wrap gap-3 mt-2 p-4 bg-[#181B21] border border-[#334155] rounded-lg">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[#94A3B8] mb-2 font-medium">Fecha inicio</label>
            <input
              type="date"
              value={format(value.start, 'yyyy-MM-dd')}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              className="w-full px-3 py-2 bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[#94A3B8] mb-2 font-medium">Fecha fin</label>
            <input
              type="date"
              value={format(value.end, 'yyyy-MM-dd')}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              className="w-full px-3 py-2 bg-[#0F1115] border border-[#334155] rounded-lg text-sm text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
