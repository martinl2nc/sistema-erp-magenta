'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosService } from '@/services/pedidos.service';
import type { PedidoEstado, CreatePedidoPayload } from '@/services/pedidos.service';

export const pedidosKeys = {
  all: ['pedidos'] as const,
  list: () => [...pedidosKeys.all, 'list'] as const,
  detail: (id: string) => [...pedidosKeys.all, 'detail', id] as const,
};

export function usePedidosList() {
  return useQuery({
    queryKey: pedidosKeys.list(),
    queryFn: pedidosService.getPedidos,
  });
}

export function useCreatePedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePedidoPayload) => pedidosService.createPedido(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
    },
  });
}

export function useUpdatePedidoForEmision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { tipo_comprobante: 'factura' | 'boleta'; direccion_facturacion?: string } }) =>
      pedidosService.updateForEmision(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
    },
  });
}

export function useUpdatePedidoEstado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado, extra }: { id: string; estado: PedidoEstado; extra?: { error_detalle?: string } }) =>
      pedidosService.updateEstado(id, estado, extra),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.list() });
    },
  });
}
