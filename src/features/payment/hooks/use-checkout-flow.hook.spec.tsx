import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/core/api/api-error';
import type { AuthSession } from '@/features/auth/domain/entities/auth-session.entity';
import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/hooks/use-session-view-model.hook';
import type { Cart } from '@/features/cart/domain/entities/cart.entity';
import type { Order } from '@/features/orders/domain/entities/order.entity';
import type { Quote } from '@/features/quotes/domain/entities/quote.entity';
import type { PaymentFormInput, PaymentFormValues } from '../data/schemas/payment-form.schema';
import { useCheckoutFlow } from './use-checkout-flow.hook';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  onSessionError: vi.fn(),
  refreshSession: vi.fn(),
  createQuote: vi.fn(),
  acceptQuote: vi.fn(),
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  getWallet: vi.fn(),
  getSavedWallets: vi.fn(),
  saveWallet: vi.fn(),
  linkSecondary: vi.fn(),
  rememberOrder: vi.fn(),
  clearPaymentDraft: vi.fn(),
  attemptState: {
    attempt: null as { key: string; orderId: string | null } | null,
    order: undefined as Order | undefined,
    isRecovering: false,
    error: null as Error | null,
    retry: vi.fn(),
    create: vi.fn(),
    complete: vi.fn(),
    reset: vi.fn(),
    isCreating: false,
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/features/auth/hooks/use-auth-session.hook', () => ({
  useAuthSession: () => ({
    session: baseSession,
    refreshSession: mocks.refreshSession,
  }),
}));

vi.mock('@/features/auth/hooks/use-session-error-handler.hook', () => ({
  useSessionErrorHandler: () => mocks.onSessionError,
}));

vi.mock('@/features/cart/hooks/use-cart.hook', () => ({
  useCart: () => ({
    id: baseCart.id,
    version: baseCart.version,
    items: baseCart.items,
    isLoading: false,
    isPending: false,
  }),
}));

vi.mock('@/features/orders/data/order-attempt.store', () => ({
  rememberOrder: mocks.rememberOrder,
}));

vi.mock('@/features/orders/hooks/use-order-attempt.hook', () => ({
  useOrderAttempt: () => mocks.attemptState,
}));

vi.mock('@/features/quotes/quotes.dependencies', () => ({
  createQuotesUseCase: () => ({
    create: mocks.createQuote,
    accept: mocks.acceptQuote,
  }),
}));

vi.mock('../payment.dependencies', () => ({
  createWalletConnectionUseCase: () => ({
    connect: mocks.connectWallet,
    disconnect: mocks.disconnectWallet,
    get: mocks.getWallet,
  }),
}));

vi.mock('@/features/wallets/wallets.dependencies', () => ({
  walletsUseCase: {
    getWallets: mocks.getSavedWallets,
  },
}));

vi.mock('@/features/wallets/hooks/use-wallets.hook', () => ({
  WALLETS_QUERY_KEY: ['wallets'] as const,
  useWalletActions: () => ({
    save: { mutateAsync: mocks.saveWallet },
    link: { mutateAsync: mocks.linkSecondary },
  }),
}));

vi.mock('../data/payment-draft.store', () => ({
  clearPaymentDraft: mocks.clearPaymentDraft,
}));

const ownerId = '11111111-1111-4111-8111-111111111111';

const baseSession: AuthSession = {
  user: { id: ownerId, username: 'AliceDemo', email: 'alice@kurio.test' },
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

const baseCart: Cart = {
  id: 'cart-1',
  userId: ownerId,
  version: 2,
  couponCode: null,
  items: [
    {
      nftId: 'nft-001',
      name: 'Emerald Ape #042',
      imageUrl: '/images/8459204731e6eba9d474cbc8ebc37071360d3ba5.webp',
      collection: 'Kurio Apes',
      tokenId: '0042',
      editionId: 'standard',
      editionName: '1/10',
      unitPriceEth: '1.19',
      quantity: 1,
      available: 10,
    },
  ],
  totals: {
    subtotalEth: '1.19',
    discountEth: '0.00',
    estimatedFeeEth: '0.016',
    totalEth: '1.206',
  },
};

const baseQuote: Quote = {
  id: 'quote-1',
  cartId: baseCart.id,
  cartVersion: baseCart.version,
  network: 'ethereum',
  pricingVersion: 1,
  userId: ownerId,
  createdAt: '2026-10-16T12:00:00.000Z',
  status: 'valid',
  items: baseCart.items,
  nftVersions: { 'nft-001': 1 },
  couponCode: null,
  totals: baseCart.totals,
  issues: [],
};

const validFormValues: PaymentFormValues = {
  displayName: 'Alice Demo',
  network: 'ethereum',
  walletAddress: `0x${'a'.repeat(40)}`,
  walletType: 'metamask',
  email: 'alice@kurio.test',
  username: 'AliceDemo',
  profileName: 'Coleção Alice',
  secondaryWallet: '',
  referralCode: '',
  ensName: 'alice',
  useSecondaryWallet: false,
  note: '',
  walletProvider: 'metamask',
};

function createTestClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(AUTH_SESSION_QUERY_KEY, baseSession);
  client.setQueryData(['cart', ownerId], baseCart);
  client.setQueryDefaults(['cart', ownerId], {
    queryFn: async () => baseCart,
  });
  return client;
}

function renderCheckoutHook(client: QueryClient, defaults: PaymentFormInput = validFormValues) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => {
      const form = useForm<PaymentFormInput, unknown, PaymentFormValues>({
        defaultValues: defaults,
      });
      return useCheckoutFlow(form);
    },
    { wrapper }
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.refreshSession.mockResolvedValue(baseSession);
  mocks.createQuote.mockResolvedValue(baseQuote);
  mocks.acceptQuote.mockResolvedValue(baseQuote);
  mocks.attemptState.attempt = null;
  mocks.attemptState.order = undefined;
  mocks.attemptState.isRecovering = false;
  mocks.attemptState.error = null;
});

describe('useCheckoutFlow', () => {
  it('carrega a cotação inicial automaticamente quando sessão, carrinho e rede são válidos', async () => {
    const client = createTestClient();
    const { result } = renderCheckoutHook(client);

    await waitFor(() => expect(result.current.quote?.id).toBe('quote-1'));
    expect(mocks.createQuote).toHaveBeenCalledWith(
      {
        cartId: baseCart.id,
        cartVersion: baseCart.version,
        network: 'ethereum',
        previousQuoteId: undefined,
      },
      expect.any(AbortSignal)
    );
  });

  it('interrompe o submit quando a revalidação da cotação exige revisão', async () => {
    const client = createTestClient();
    const updatedQuote: Quote = {
      ...baseQuote,
      id: 'quote-2',
      status: 'review-required',
      totals: { ...baseQuote.totals, totalEth: '2.206' },
      issues: [{ code: 'PRICE_CHANGED', message: 'O preço mudou.' }],
    };
    mocks.createQuote.mockResolvedValueOnce(baseQuote).mockResolvedValueOnce(updatedQuote);

    const { result } = renderCheckoutHook(client);
    await waitFor(() => expect(result.current.quote?.id).toBe('quote-1'));

    await act(async () => {
      await result.current.submit(validFormValues);
    });

    expect(result.current.quote).toEqual(updatedQuote);
    expect(mocks.acceptQuote).not.toHaveBeenCalled();
    expect(mocks.attemptState.create).not.toHaveBeenCalled();
  });

  it('trata conflito HTTP 409 no submit exibindo aviso e refazendo a cotação', async () => {
    const client = createTestClient();
    const refreshedQuote: Quote = { ...baseQuote, id: 'quote-refreshed' };
    mocks.createQuote
      .mockResolvedValueOnce(baseQuote)
      .mockRejectedValueOnce(new ApiError('A cotação mudou antes do envio.', 409))
      .mockResolvedValueOnce(refreshedQuote);

    const { result } = renderCheckoutHook(client);
    await waitFor(() => expect(result.current.quote?.id).toBe('quote-1'));

    await act(async () => {
      await result.current.submit(validFormValues);
    });

    await waitFor(() => expect(result.current.quote?.id).toBe('quote-refreshed'));
    expect(result.current.notice).toBe('A cotação mudou antes do envio.');
    expect(mocks.attemptState.create).not.toHaveBeenCalled();
  });

  it('conclui pedido confirmado uma única vez, limpa estado e navega para o comprovante', async () => {
    const client = createTestClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const confirmedOrder: Order = {
      id: 'order-123',
      userId: ownerId,
      attemptId: 'attempt-123',
      quoteId: 'quote-1',
      connectionId: 'conn-1',
      version: 2,
      createdAt: '2026-10-16T12:00:00.000Z',
      updatedAt: '2026-10-16T12:00:05.000Z',
      status: 'confirmed',
      confirmedAt: '2026-10-16T12:00:05.000Z',
      transactionHash: `0x${'b'.repeat(64)}`,
      snapshot: {
        items: baseCart.items,
        totals: baseCart.totals,
        collector: {
          displayName: validFormValues.displayName,
          username: validFormValues.username,
          email: validFormValues.email,
          profileName: validFormValues.profileName,
          ensName: validFormValues.ensName,
          referralCode: validFormValues.referralCode,
          note: validFormValues.note,
        },
        walletAddress: validFormValues.walletAddress,
        network: 'ethereum',
        provider: 'metamask',
      },
    };
    mocks.attemptState.attempt = { key: 'attempt-123', orderId: 'order-123' };
    mocks.attemptState.order = confirmedOrder;

    const { rerender } = renderCheckoutHook(client);

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(1));
    rerender();
    rerender();

    expect(mocks.rememberOrder).toHaveBeenCalledTimes(1);
    expect(mocks.rememberOrder).toHaveBeenCalledWith(ownerId, 'order-123');
    expect(mocks.clearPaymentDraft).toHaveBeenCalledTimes(1);
    expect(mocks.clearPaymentDraft).toHaveBeenCalledWith(ownerId);
    expect(mocks.attemptState.complete).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/payment/confirmation',
      search: { orderId: 'order-123' },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['cart', ownerId] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['catalog'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['market'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['activity', ownerId] });
  });
});
