'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellersService } from '@/services/sellers.service';
import type { SellerFormData } from '@/services/sellers.service';

export const sellersKeys = {
  all: ['sellers'] as const,
  list: () => [...sellersKeys.all, 'list'] as const,
  detail: (id: string) => [...sellersKeys.all, 'detail', id] as const,
};

export function useSellersList() {
  return useQuery({
    queryKey: sellersKeys.list(),
    queryFn: sellersService.getSellers,
  });
}

export function useCreateSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newSeller: SellerFormData) => sellersService.createSeller(newSeller),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersKeys.list() });
    },
  });
}

export function useUpdateSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SellerFormData> }) =>
      sellersService.updateSeller(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersKeys.list() });
    },
  });
}

export function useDeleteSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sellersService.deleteSeller(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersKeys.list() });
    },
  });
}

export function useToggleSellerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: boolean }) =>
      sellersService.toggleSellerActive(id, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersKeys.list() });
    },
  });
}
