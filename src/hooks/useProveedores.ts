'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProveedores,
  getActiveProveedores,
  createProveedor,
  updateProveedor,
  toggleProveedorActive,
  deleteProveedor,
} from '@/services/proveedores.service';
import type { ProveedorFormData, ProveedoresListParams } from '@/services/proveedores.service';

export const proveedoresKeys = {
  all:    ()                          => ['proveedores'] as const,
  lists:  ()                          => [...proveedoresKeys.all(), 'list'] as const,
  list:   (params?: ProveedoresListParams) => [...proveedoresKeys.lists(), params] as const,
  active: ()                          => [...proveedoresKeys.all(), 'active'] as const,
};

export const useProveedoresList = (params?: ProveedoresListParams) => {
  return useQuery({
    queryKey: proveedoresKeys.list(params),
    queryFn: () => getProveedores(params),
    placeholderData: (prev) => prev,
  });
};

export const useActiveProveedoresList = () => {
  return useQuery({
    queryKey: proveedoresKeys.active(),
    queryFn: getActiveProveedores,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProveedorFormData) => createProveedor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.lists() });
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.active() });
    },
  });
};

export const useUpdateProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProveedorFormData> }) =>
      updateProveedor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.lists() });
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.active() });
    },
  });
};

export const useToggleProveedorActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      toggleProveedorActive(id, activo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.lists() });
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.active() });
    },
  });
};

export const useDeleteProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProveedor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.lists() });
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.active() });
    },
  });
};
