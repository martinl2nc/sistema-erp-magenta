'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUbigeo } from '@/hooks/useUbigeo';
import type { UbigeoRecord } from '@/services/ubigeo.service';

interface Props {
  value?: string;
  onChange: (codigo: string, record: UbigeoRecord) => void;
  disabled?: boolean;
  label?: string;
}

const selectClass =
  'appearance-none w-full bg-[#0F1115] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

export default function UbigeoSelector({ value, onChange, disabled, label }: Props) {
  const { isLoading, departamentos, getProvincias, getDistritos, lookupByCode } = useUbigeo();

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');

  // Initialize from value prop (inverse lookup)
  useEffect(() => {
    if (!value || isLoading) return;
    const record = lookupByCode(value);
    if (record) {
      setSelectedDept(record.codigo.slice(0, 2));
      setSelectedProv(record.codigo.slice(0, 4));
      setSelectedDist(record.codigo);
    }
  }, [value, isLoading, lookupByCode]);

  const provincias = useMemo(() => getProvincias(selectedDept), [getProvincias, selectedDept]);
  const distritos = useMemo(() => getDistritos(selectedProv), [getDistritos, selectedProv]);

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDept(e.target.value);
    setSelectedProv('');
    setSelectedDist('');
  };

  const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProv(e.target.value);
    setSelectedDist('');
  };

  const handleDistChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const codigo = e.target.value;
    setSelectedDist(codigo);
    const record = lookupByCode(codigo);
    if (record) onChange(codigo, record);
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">{label}</label>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Departamento */}
        <div className="relative">
          <select
            title="Departamento"
            value={selectedDept}
            onChange={handleDeptChange}
            disabled={disabled || isLoading}
            className={selectClass}
          >
            <option value="">
              {isLoading ? 'Cargando...' : 'Departamento'}
            </option>
            {departamentos.map(d => (
              <option key={d.dept_codigo} value={d.dept_codigo}>
                {d.departamento}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
            <iconify-icon icon="solar:alt-arrow-down-linear" class="text-sm"></iconify-icon>
          </div>
        </div>

        {/* Provincia */}
        <div className="relative">
          <select
            title="Provincia"
            value={selectedProv}
            onChange={handleProvChange}
            disabled={disabled || !selectedDept || isLoading}
            className={selectClass}
          >
            <option value="">Provincia</option>
            {provincias.map(p => (
              <option key={p.prov_codigo} value={p.prov_codigo}>
                {p.provincia}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
            <iconify-icon icon="solar:alt-arrow-down-linear" class="text-sm"></iconify-icon>
          </div>
        </div>

        {/* Distrito */}
        <div className="relative">
          <select
            title="Distrito"
            value={selectedDist}
            onChange={handleDistChange}
            disabled={disabled || !selectedProv || isLoading}
            className={selectClass}
          >
            <option value="">Distrito</option>
            {distritos.map(d => (
              <option key={d.codigo} value={d.codigo}>
                {d.distrito}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#94A3B8]">
            <iconify-icon icon="solar:alt-arrow-down-linear" class="text-sm"></iconify-icon>
          </div>
        </div>
      </div>

      {selectedDist && (
        <p className="mt-1.5 text-[10px] text-[#64748B]">
          Código ubigeo: <span className="font-mono">{selectedDist}</span>
        </p>
      )}
    </div>
  );
}
