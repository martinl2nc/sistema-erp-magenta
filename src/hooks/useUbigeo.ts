'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { getAllUbigeos } from '@/services/ubigeo.service';
import type { UbigeoRecord } from '@/services/ubigeo.service';

export interface Departamento {
  dept_codigo: string;
  departamento: string;
}

export interface Provincia {
  prov_codigo: string;
  provincia: string;
}

export const ubigeoKeys = {
  all: () => ['ubigeos'] as const,
};

export const useUbigeo = () => {
  const { data: allUbigeos = [], isLoading } = useQuery({
    queryKey: ubigeoKeys.all(),
    queryFn: getAllUbigeos,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const departamentos = useMemo((): Departamento[] => {
    const seen = new Set<string>();
    const result: Departamento[] = [];
    for (const u of allUbigeos) {
      const code = u.codigo.slice(0, 2);
      if (!seen.has(code)) {
        seen.add(code);
        result.push({ dept_codigo: code, departamento: u.departamento });
      }
    }
    return result.sort((a, b) => a.departamento.localeCompare(b.departamento, 'es'));
  }, [allUbigeos]);

  const getProvincias = useCallback((deptCodigo: string): Provincia[] => {
    if (!deptCodigo) return [];
    const seen = new Set<string>();
    const result: Provincia[] = [];
    for (const u of allUbigeos) {
      if (u.codigo.slice(0, 2) !== deptCodigo) continue;
      const code = u.codigo.slice(0, 4);
      if (!seen.has(code)) {
        seen.add(code);
        result.push({ prov_codigo: code, provincia: u.provincia });
      }
    }
    return result.sort((a, b) => a.provincia.localeCompare(b.provincia, 'es'));
  }, [allUbigeos]);

  const getDistritos = useCallback((provCodigo: string): UbigeoRecord[] => {
    if (!provCodigo) return [];
    return allUbigeos
      .filter(u => u.codigo.slice(0, 4) === provCodigo)
      .sort((a, b) => a.distrito.localeCompare(b.distrito, 'es'));
  }, [allUbigeos]);

  const lookupByCode = useCallback((codigo: string): UbigeoRecord | null => {
    if (!codigo || codigo.length !== 6) return null;
    return allUbigeos.find(u => u.codigo === codigo) ?? null;
  }, [allUbigeos]);

  return {
    isLoading,
    departamentos,
    getProvincias,
    getDistritos,
    lookupByCode,
  };
};
