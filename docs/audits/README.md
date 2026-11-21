# Auditorias e evidências

## Lighthouse

Executado em 2026-10-16 com `pnpm audit:lighthouse`: build otimizado com mocks completos, Chromium do Playwright, perfis novos, presets oficiais mobile/desktop e throttling simulado. Execuções sequenciais, sem suíte de navegador concorrente. Fontes, imagens e funcionalidades permanecem habilitadas. Versões, CPU, sistema, condições e hash do build constam em [summary.json](lighthouse/summary.json).

Foram realizadas três medições por página/perfil, totalizando 12. Valores abaixo são medianas:

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 94 | 100 | 100 | 100 | 2883 ms | 0.0000 | 49 ms |
| Detalhe | Mobile | 98 | 100 | 100 | 100 | 2414 ms | 0.0000 | 0 ms |
| Início | Desktop | 100 | 97 | 100 | 100 | 413 ms | 0.0000 | 0 ms |
| Detalhe | Desktop | 100 | 97 | 100 | 100 | 494 ms | 0.0000 | 0 ms |

**Todas as metas foram atingidas:** Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95 e SEO ≥ 90 nos quatro grupos. `pnpm audit:lighthouse` terminou com código 0. As medianas são calculadas com as três execuções de cada grupo; os relatórios HTML/JSON detalhados são gerados localmente sob demanda (`pnpm audit:lighthouse`) e publicados como artefatos no workflow de CI ([`lighthouse.yml`](../../.github/workflows/lighthouse.yml)).

## Análise dos resultados

A pipeline anterior obteve Performance mobile 83/84, com LCP próximo de 4,2 s. A inicialização aguardava MSW, React/Router e consultas antes de mostrar o conteúdo principal. Antecipar downloads e consultas isoladamente não atingiu a meta.

O build mock agora gera dados pelas mesmas rotas REST MSW e pré-renderiza os componentes existentes do catálogo e do NFT de destaque (`/market/nft-001`) em Node, sem Chromium no build. O HTML seleciona a variante mobile/desktop e React hidrata a árvore. O cache público é preparado antes da montagem e revalidado por REST após a prontidão do transporte. O HTML cresceu para aproximadamente 196 kB/27 kB gzip; o conteúdo aparece antes de baixar e executar o runtime completo.

Estado persistido, sessões da aba, controles de rede e URLs filtradas preservam o fluxo REST atual. Páginas privadas e outros detalhes continuam usando renderização no cliente. Não há dados privados no snapshot, detecção de Lighthouse ou funções removidas para a auditoria. Escopo e consequências: [ADR 0007](../ADRs/0007-pre-renderizacao-publica-e-inicializacao.md).

Axios e Socket.IO aguardam a interceptação na camada de transporte. O preload de imagem respeita o tamanho renderizado por rota. Permanecem habilitados WebP responsivo, fontes latinas locais, rotas/modais sob demanda e atualização em segundo plano sem deslocar conteúdo. O chunk MSW completo permanece no build, com cerca de 472 kB minificados/174 kB gzip.

A série final mantém os presets oficiais e o throttling simulado, sem reduzir CPU/rede. FCP e Speed Index também são registrados em [summary.json](lighthouse/summary.json) e [summary.md](lighthouse/summary.md). A execução remota da pipeline valida cada PR; as evidências locais resumidas não substituem os testes da URL publicada.

## Reprodução limpa e testes

[VALIDATION.md](../VALIDATION.md) descreve comandos, ambiente e baselines. O verificador de cópia limpa (`pnpm verify:clean`) reproduz instalação, checks, build, preview e smoke de publicação.

Revalidação: 102 testes Vitest, 117 E2E aprovados (9 variantes ignoradas), 12 comparações visuais sem atualizar baselines e cópia limpa aprovada com o mesmo hash do build auditado. O smoke Lighthouse da cópia limpa também atingiu as metas.
