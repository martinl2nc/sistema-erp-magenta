<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Next.js Developer Skill
A specialized skill has been installed in `.claude/skills/nextjs-developer`. Use it for all Next.js 14+ / App Router tasks.
<!-- END:nextjs-agent-rules -->

---

# Coding Standards — Sistema de Cotizaciones v2

## Architecture

This is a Next.js 16 App Router project. The data flow is strictly:

```
Page (Server Component) → Client Component → Hook (TanStack Query) → Service → Supabase
```

Never skip layers. Never call Supabase directly from a component.

---

## File Structure

| What | Where |
|------|-------|
| Business logic & DB calls | `src/services/*.service.ts` |
| TanStack Query wrappers | `src/hooks/use*.ts` |
| Reusable components | `src/components/<feature>/` |
| Feature modals/drawers | `src/features/<feature>/` |
| Shared types | `src/types/common.types.ts` |
| Financial calculations | `src/utils/calculations.ts` |
| Formatters (currency, date, name) | `src/utils/formatters.ts` |
| App-wide constants | `src/constants/index.ts` |

---

## Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Components | `PascalCase.tsx` | `QuoteForm.tsx`, `ClientFormModal.tsx` |
| Hooks | `usePascalCase.ts` | `useQuotes.ts`, `useFileUpload.ts` |
| Services | `camelCase.service.ts` | `clients.service.ts`, `quotes.service.ts` |
| Utilities | `camelCase.ts` or `camelCase.utils.ts` | `quoteForm.utils.ts`, `formatters.ts` |
| Constants | `UPPER_SNAKE_CASE` | `TAX_RATES`, `FILE_UPLOAD`, `PAGINATION` |
| Interfaces | `PascalCase` | `Client`, `Quote`, `FinancialCalculation` |
| State union types | `PascalCase` | `EstadoCotizacion = 'Borrador' \| 'Enviada' \| ...` |
| Directories | `lowercase` | `clients/`, `quotes/`, `pedidos/` |
| API routes | `kebab-case` | `create-seller/`, `emitir/` |

---

## TypeScript

- Use `interface` for object shapes (entities, form data).
- Use `type` for unions and computed types.
- Define entity types in their service file (`clients.service.ts` exports `Client` and `ClientFormData`).
- Put shared cross-feature types in `src/types/common.types.ts`.
- Infer from Zod schemas when they exist: `type LoginFormValues = z.infer<typeof loginSchema>`.
- No `any`. Use `unknown` and narrow, or define a proper type.

---

## Data Fetching

### Services
- Services are plain async functions or objects — no React dependencies.
- Every service throws a typed `Error` with a human-readable message on failure.
- Handle specific DB error codes (e.g. `23505` for unique constraint) and translate them to user-facing messages.
- Prefer Supabase RPC for complex atomic operations. Implement a legacy fallback if the RPC may not exist yet:

```typescript
const { data, error } = await supabase.rpc('save_quote_atomic', { ... });
if (error) {
  if (isRpcFunctionMissing(error)) return saveQuoteLegacy(data);
  throw error;
}
```

### Hooks (TanStack Query)
- Every entity has a **query key factory** (nested, `as const`):

```typescript
export const clientsKeys = {
  all: () => ['clients'] as const,
  list: () => [...clientsKeys.all(), 'list'] as const,
  active: () => [...clientsKeys.all(), 'active'] as const,
};
```

- Always use key factories for `invalidateQueries` — never hardcode strings.
- Use optimistic updates + rollback for status changes (see `useUpdateQuoteStatus` as reference).
- `onSuccess` in `useMutation` invalidates all relevant keys, not just one.

### Pages (Server Components)
- Fetch initial data in parallel with `Promise.all`.
- Pass data as `initial*` props to client components.
- Client components receive initial data and may refresh with hooks as needed.

---

## Forms

- **Auth forms**: use `react-hook-form` + Zod + `zodResolver`.
- **All other forms**: use `useState` + manual validation helper in `*.utils.ts`.
- Validation helpers return `string | null` (error message or null if valid).
- Do NOT introduce `react-hook-form` to existing complex forms (QuoteForm, ClientFormModal, etc.) unless explicitly tasked.

---

## Supabase Clients — Never Mix Them

| Client | File | Use for |
|--------|------|---------|
| Browser | `src/lib/supabase/client.ts` | Services, client components, TanStack Query hooks |
| Server | `src/lib/supabase/server.ts` | Server components, `generateMetadata`, middleware |
| Admin | `src/lib/supabase/admin.ts` | API routes only — requires `SUPABASE_SERVICE_ROLE_KEY` |

The admin client must NEVER be used outside of `src/app/api/` routes.

---

## Error Handling

- **Page-level errors**: `error.tsx` with retry and back navigation.
- **Page loading**: `loading.tsx` with skeleton or spinner.
- **Mutation errors**: `toast.error(err.message)` via `sonner`.
- **Validation errors**: inline `setError(string)` displayed above the submit button.
- **API routes**: return `NextResponse.json({ error: '...' }, { status: N })` with appropriate HTTP codes (400, 401, 403, 409, 500).

---

## Auth & Roles

- Always use `useAuth()` from `src/context/AuthContext.tsx` to access user and role.
- Roles are `'admin'` or `'vendedor'` — loaded lazily from `perfiles_usuario`.
- Role-based rendering: `{role === 'admin' && <AdminSection />}`.
- Vendor auto-lock: if `role === 'vendedor'`, pre-populate `vendedor_id` with `user.id` and disable the field.
- Never trust role data from the client for security decisions — enforce on the server (RLS or API route checks).

---

## Financial Calculations

- All tax/discount/total math lives in `src/utils/calculations.ts`.
- Use `TAX_RATES.IGV` (0.18) from `src/constants/index.ts` — never hardcode `0.18`.
- Round to `DECIMAL_PRECISION` (2) from constants.
- `calculateQuoteTotals(lineItems, descuentoGlobal, aplicaIgv)` is the single source of truth for quote math.
- Memoize totals with `useMemo` when derived from form state.

---

## Formatting

- Currency, dates, names, phones, and documents must always go through `src/utils/formatters.ts`.
- Use `formatCurrency` for all monetary display (Peruvian locale, PEN).
- Use `getClientDisplayName` for displaying client names (handles `razon_social` vs contact name).
- Never format inline in JSX — extract to a formatter or a local variable.

---

## Component Patterns

### Feature Modals
- Modals live in `src/features/<feature>/`.
- They are fully self-contained: own state, own mutations, own validation.
- Accept `isOpen`, `onClose`, optional entity for edit mode, and `onSuccess` callback.
- Reset state on open via `useEffect([isOpen, entity])`.

### Custom State Hooks
- Extract complex form state into `use<ComponentName>State.ts` co-located with the component.
- The hook returns all state, setters, derived values (e.g. `totals`), and handlers.

### List Pages
- Client components with local filter state.
- Use `useMemo` for filtered/sorted lists derived from query data.
- Always handle: `isLoading`, `isError`, empty state, populated state.
- Render desktop table + mobile card layout for responsive support.

---

## API Routes

1. Authenticate with server Supabase client.
2. Authorize by checking `perfiles_usuario.rol`.
3. Validate required body fields and return 400 with clear message.
4. Use admin client only for privileged operations.
5. Return 201 for creation, 200 for updates, appropriate 4xx/5xx for errors.

---

## What NOT to Do

- Do not call `createClient()` (browser) inside a Server Component or API route.
- Do not hardcode query key strings — use key factories.
- Do not add `console.log` to committed code.
- Do not add `any` types.
- Do not duplicate financial calculation logic — always use `calculations.ts`.
- Do not format currency, dates, or names inline — always use `formatters.ts`.
- Do not mix Supabase clients across contexts.
- Do not introduce new state management libraries (no Zustand, no Redux, no Jotai).
- Do not add error handling for cases that cannot happen in this codebase.
