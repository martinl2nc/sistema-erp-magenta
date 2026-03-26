'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailHistoryService } from '@/services/emailHistory.service';

export const emailHistoryKeys = {
  byQuote: (cotizacionId: string) => ['emailHistory', cotizacionId] as const,
};

export function useEmailHistory(cotizacionId: string | null) {
  return useQuery({
    queryKey: emailHistoryKeys.byQuote(cotizacionId ?? ''),
    queryFn: () => emailHistoryService.getHistory(cotizacionId!),
    enabled: Boolean(cotizacionId),
  });
}

export function useLogEmailSend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cotizacionId, email }: { cotizacionId: string; email: string }) =>
      emailHistoryService.logSend(cotizacionId, email),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: emailHistoryKeys.byQuote(vars.cotizacionId) });
    },
  });
}
