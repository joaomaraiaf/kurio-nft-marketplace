import { z } from 'zod';

export const paymentNetworkSchema = z.enum(['ethereum', 'polygon', 'solana'], {
  error: 'Selecione uma rede.',
});

export const paymentWalletTypeSchema = z.enum(['metamask', 'coinbase', 'walletconnect'], {
  error: 'Selecione o tipo de carteira.',
});

export const paymentFormSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome de exibição.'),
  network: z.union([paymentNetworkSchema, z.literal('')]).pipe(paymentNetworkSchema),
  walletAddress: z.string().trim().min(8, 'Informe o endereço da carteira.'),
  walletType: z.union([paymentWalletTypeSchema, z.literal('')]).pipe(paymentWalletTypeSchema),
  email: z.email('Informe um e-mail válido.'),
  username: z.string().trim().min(2, 'Informe seu nome de usuário.'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  secondaryWallet: z.string().trim(),
  referralCode: z.string().trim(),
  ensName: z.string().trim(),
  useSecondaryWallet: z.boolean(),
  note: z.string().trim().max(240, 'A observação pode ter até 240 caracteres.'),
  walletProvider: z.enum(['metamask', 'coinbase', 'walletconnect'], {
    error: 'Selecione uma carteira para continuar.',
  }),
});

export type PaymentFormInput = z.input<typeof paymentFormSchema>;
export type PaymentFormValues = z.output<typeof paymentFormSchema>;
