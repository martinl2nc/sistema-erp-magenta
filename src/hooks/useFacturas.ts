'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facturasService } from '@/services/facturas.service';

export const facturasKeys = {
  all: ['facturas'] as const,
  list: () => [...facturasKeys.all, 'list'] as const,
};

export function useFacturasList() {
  return useQuery({
    queryKey: facturasKeys.list(),
    queryFn: facturasService.getFacturas,
  });
}

export function useCreateNotaCredito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: facturasService.createNotaCredito,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facturasKeys.list() });
    },
  });
}
