# Diga um Nome

Experiência do ÍRIS — Laboratório de Inovação e Dados do Governo do Ceará para o espaço "Ciência Delas" da Feira do Conhecimento 2026.

## Na feira

1. Com internet, uma vez: `npm ci` e `npm run build` (o build guarda as fontes; depois disso nada depende de internet).
2. No computador do totem: `npm start` e abrir `http://localhost:3000/?totem` em tela cheia. O modo totem fica gravado no navegador e transforma os links das fontes em texto, para ninguém sair da experiência. `?totem=0` desliga.
3. O teclado aparece na própria tela; um teclado físico também funciona.

Reiniciar (rodapé) e o reinício automático depois de 90 segundos sem toque começam uma nova visita sem apagar o mapa.

## Dados

- Cada resposta fica no navegador do totem e é copiada para `data/participations.jsonl` no computador que roda o servidor. Os nomes guardados para conferência vão para `data/review-queue.jsonl`. A pasta pode ser trocada com `DIGA_UM_NOME_DATA_DIR`.
- Se o navegador for limpo, o mapa volta a partir do arquivo. Se o servidor cair, o navegador continua guardando e envia depois.
- Vários totens podem usar o mesmo servidor: a cada 30 segundos, quando a tela está parada na pergunta, o mapa junta as respostas de todos.
- Exportar: Créditos → Dados da feira, ou `GET /api/participations?format=csv` (respostas) e `GET /api/participations?format=csv&list=review` (nomes para conferência).
- Nada identifica quem participou: cada registro guarda o tipo de resposta, a cientista (ou a referência, como "estrangeira" ou "homem") e a hora. Os nomes para conferência são o texto digitado pela pessoa; revise antes de publicar.
- A coluna `ja_estava_no_mapa` da exportação indica lembranças de nomes que já apareciam no mapa coletivo, e `voltou` indica nomes apresentados no estande e depois lembrados sem pista. A fila vê a tela, então essas lembranças não são medidas independentes de conhecimento prévio.

## Desenvolvimento

`npm run dev`, `npm test`, `npm run typecheck`, `npm run lint`.

Conteúdo: `src/content/scientists/featured.json` (curadoria das 50 cientistas) e `src/content/scientists/references.ts` (nomes frequentes fora da folha: estrangeiras, homens e brasileiras ainda não curadas). Pendências de verificação em `docs/curation/REVISAO-PISTAS.md`.
