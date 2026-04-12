'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotesService } from '@/services/quotes.service';
import type { QuoteFormData, QuoteStatus, Quote, QuotesListParams, PaginatedQuotes } from '@/services/quotes.service';
import { sendQuoteToWebhook } from '@/services/webhook.service';
import type { SendQuoteWebhookParams } from '@/services/webhook.service';

export const quotesKeys = {
  all: () => ['quotes'] as const,
  lists: () => [...quotesKeys.all(), 'list'] as const,
  list: (params?: QuotesListParams) => [...quotesKeys.lists(), params] as const,
  detail: (id: string) => [...quotesKeys.all(), 'detail', id] as const,
};

export function useQuotesList(params?: QuotesListParams) {
  return useQuery({
    queryKey: quotesKeys.list(params),
    queryFn: () => quotesService.getQuotes(params),
    placeholderData: (prev) => prev,
  });
}

export function useQuoteDetail(id: string | null) {
  return useQuery({
    queryKey: id ? quotesKeys.detail(id) : [],
    queryFn: () => quotesService.getQuoteById(id!),
    enabled: !!id,
  });
}

export function useSaveQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: QuoteFormData) => quotesService.saveQuote(data),
    onSuccess: (savedQuote) => {
      queryClient.invalidateQueries({ queryKey: quotesKeys.lists() });
      if (savedQuote.id) {
        queryClient.invalidateQueries({ queryKey: quotesKeys.detail(savedQuote.id) });
      }
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quotesService.deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotesKeys.lists() });
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      quotesService.updateQuoteStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: quotesKeys.lists() });
      const queries = queryClient.getQueriesData<PaginatedQuotes>({ queryKey: quotesKeys.lists() });
      queryClient.setQueriesData<PaginatedQuotes>(
        { queryKey: quotesKeys.lists() },
        (old) => old ? { ...old, data: old.data.map((q) => (q.id === id ? { ...q, estado: status } : q)) } : old
      );
      return { queries };
    },
    onError: (_err, _vars, context) => {
      context?.queries.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: quotesKeys.lists() });
    },
  });
}

export function useUpdateQuoteFollowup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      quotesService.updateQuoteFollowup(id, value),
    onMutate: async ({ id, value }) => {
      await queryClient.cancelQueries({ queryKey: quotesKeys.lists() });
      const queries = queryClient.getQueriesData<PaginatedQuotes>({ queryKey: quotesKeys.lists() });
      queryClient.setQueriesData<PaginatedQuotes>(
        { queryKey: quotesKeys.lists() },
        (old) => old ? { ...old, data: old.data.map((q) => (q.id === id ? { ...q, seguimiento_automatico: value } : q)) } : old
      );
      return { queries };
    },
    onError: (_err, _vars, context) => {
      context?.queries.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: quotesKeys.lists() });
    },
  });
}

export function useSendQuoteWebhook() {
  return useMutation({
    mutationFn: (params: SendQuoteWebhookParams) => sendQuoteToWebhook(params),
  });
}
