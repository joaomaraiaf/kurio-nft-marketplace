# Cenários determinísticos de demonstração (MSW + Socket.IO)

Todos os controles abaixo são interceptados localmente pelo Service Worker do MSW na aba aberta. Execute-os pelo console do navegador (não via `curl` ou `page.request`, pois processos externos não compartilham o estado simulado do browser).

## Helper de console

Defina este helper no console da aba atual (ele vive apenas na sessão de console da página):

```js
window.setMockControl = async (control, payload) => {
  const response = await fetch(`/api/__mock/${control}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Controle mock falhou: ${response.status}`);
};
```

## Catálogo e falhas de rede

Cenários disponíveis: `default`, `empty`, `slow` (1,5 s), `server-error` (503), `network-error` e `out-of-order` (latências alternadas).

```js
await setMockControl('reset', { scenario: 'slow' });
location.reload();
```

Para falhar a consulta inicial e as 3 tentativas automáticas com HTTP 503 e validar a recuperação pela interface:

```js
await setMockControl('network', {
  rules: [{ path: '/nfts', method: 'GET', status: 503, times: 4 }],
});
location.reload();
```

- `status: 0` simula falha de conexão; `delayMs: 1500` com `status: 200` atrasa uma resposta válida.
- `gate: 'catalogo'` pausa a requisição até liberar com `await setMockControl('network/release', { gate: 'catalogo' })`.
- Regras são consumidas por requisição (`times` de 1 a 10) e persistem no `sessionStorage` da aba.
- Status suportados: `401`, `403`, `404`, `409`, `422`, `503`. `path` é relativo à API (`/cart`, `/quotes`, `/favorites`, `/nfts/nft-001`).

## Favoritos, carrinho e expiração de sessão

Simular rollback otimista após falha de mutation:

```js
await setMockControl('commerce/failure', {
  resource: 'favorites', // ou 'cart'
  delayMs: 1000,
  status: 503, // use 0 para falha de conexão
});
```

Simular sessão expirada para validar bloqueio e retomada pela mesma conta:

```js
await setMockControl('auth/expire-session', {});
```

## Checkout, concorrência, preço e cupons

Cenários disponíveis: `confirmed`, `refused`, `timeout-after-create` e `last-unit`.

```js
await setMockControl('checkout', { scenario: 'refused' });
```

- `timeout-after-create`: persiste a tentativa e responde com `504`; após refresh, o checkout recupera o mesmo pedido pela chave idempotente sem duplicar compra ou estoque.
- `last-unit`: deixa 1 unidade da edição `edition-one` do `nft-001`; duas abas disputando simultaneamente resultam em 1 confirmação e 1 recusa atômica sob Web Locks.
- `{ resolveAfterMs: 5000 }`: atrasa a liquidação para observar o estado `pending`.
- `{ refuseConnection: true }`: simula recusa na conexão de carteira.
- Cupons: `KURIO10` aplica 10% de desconto; `EXPIRADO` testa cupom expirado; `{ expireCoupon: true | false }` alterna a validade de `KURIO10` durante o checkout.

Publicar atualização de preço/estoque em tempo real (atualiza o store REST e emite `nft.updated` via Socket.IO):

```js
await fetch('/api/__mock/nfts/nft-001', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ editionId: 'edition-one', priceEth: '2.25', available: 0 }),
});
```

## Reset global

Restaura fixtures, contas demo e estado de comércio, limpa regras de rede, invalida sessões e encerra sockets:

```js
await setMockControl('reset', { scenario: 'default' });
location.reload();
```

Detalhes completos de payloads e limites estão em [API_CONTRACTS.md](API_CONTRACTS.md) e [COMMERCE_CONTRACTS.md](COMMERCE_CONTRACTS.md).
