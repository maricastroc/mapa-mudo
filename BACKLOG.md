# Backlog — Diga um Nome

## Linguagem e controles (não atacar até decisão de design)

- "PISTA 1 DE 3" lê como contador de quiz; a régua de escala já dá conta do progresso.
- "Outra pista" é linguagem de jogo; considerar linguagem espacial ("Mais perto").
- Linguagem de erro/acerto durante a descoberta: "Esse não é o nome deste ponto. Chegue mais perto." (resposta `otherPoint`).
- Decidir se um nome válido de outra cientista dito durante as pistas deve contar +1. Hoje não conta, para preservar o baseline.

## Visual (não atacar até decisão de design)

- Pista 2 visualmente vazia (topo do morro com poucas curvas).
- Regularidade dos estratos na pista 3 (parece papel pautado).
- Ombros do busto viram anéis de alvo na escala 1:1.
- Sobreposição de nomes no mapa coletivo; o posicionamento automático de cientistas `known` evita pontos, mas não a largura dos rótulos (ex.: Celina Brandão sobre Tereza Arrais).
- Medalhão do retorno pequeno.
- Rótulos de 11–13px pequenos para leitura à distância.
- Saturação do mar no tema ÍRIS (tema escuro removido nesta iteração; a questão volta se houver variante escura).
- Uma rocha nova na encosta de uma ilha grande pode não fechar o anel +1 (o contorno se funde ao da vizinha).
- No fim da feira os recifes ficam parecidos entre si, porque as descobertas se distribuem por igual; considerar variar a forma.

## Conteúdo e dados

- Limiar de emersão do recife (`REEF_SURFACES_AT = 1`) e amostra mínima para contar o silêncio (`SILENCE_SAMPLE_MIN = 20`) são ajustáveis em `src/participation/collective.ts`. Simulação com distribuição honesta: limiar 3 só faz o primeiro recife aflorar perto de 100 visitantes; limiar 5, perto de 400.
- Classificação por visita: "Diga outro nome" continua a mesma visita (resposta conta como reconhecimento); "Reiniciar" ou 90 s sem toque abrem visita nova. Quem chega antes dos 90 s e toca "Diga outro nome" entra como reconhecimento, não como lembrança.
- Nomes fora do catálogo (fila de conferência) não contam como lembrança nem como silêncio.
- Dados coletivos ficam só no `localStorage` do totem (`diga-um-nome:events:v2`); não há exportação nem cópia de segurança. A chave antiga `…:contributions:v1` é preservada e ignorada.

- Curadoria factual das ~20 `FeaturedScientist` (feita fora do código).
- Dicionário ampliado `KnownScientist` real, com aliases.
- `reveal.contribution` e `photo` já existem no modelo, mas ainda não aparecem na tela (o retrato continua topográfico genérico).
- Fila de conferência (`PendingScientistSubmission`) só em memória; não persiste nem aparece no mapa.

## Identidade

- Cores institucionais só `#1001e3` e `#ee704c`. O laranja (2,79:1 sobre o papel) não é usado em texto: fica em curvas, anéis, bordas e fundos; textos de destaque usam ink (4,89:1 sobre o laranja) ou azul.
- A curva +1 em laranja ÍRIS tem contraste menor que o vermelho anterior; o significado é reforçado pelo rótulo de texto.

## Plataforma

- Movimento reduzido implementado, mas não verificado no navegador.
- Teclado na tela para totem sem teclado do sistema.
