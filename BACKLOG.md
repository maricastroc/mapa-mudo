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
- Possível conflito semântico entre relevo físico (mangue, nível do mar) e relevo de menções.
- Primeira menção de uma cientista `known`: o anel +1 nasce sobre um platô e aparece grande, porque o zoom foi calibrado para picos altos.
- Picos de fixture com poucas menções (2–3) podem não fechar o anel +1 em encostas; os picos criados em execução usam platô, mas os do baseline não, para não mudar o terreno validado.

## Conteúdo e dados

- Curadoria factual das ~20 `FeaturedScientist` (feita fora do código).
- Dicionário ampliado `KnownScientist` real, com aliases.
- `reveal.contribution` e `photo` já existem no modelo, mas ainda não aparecem na tela (o retrato continua topográfico genérico).
- Fila de conferência (`PendingScientistSubmission`) só em memória; não persiste nem aparece no mapa.

## Identidade

- `--iris-orange-ink` (#b5553a) é um tom derivado do laranja ÍRIS, criado para texto acessível (4,56:1). Precisa de validação da marca.
- A curva +1 em laranja ÍRIS tem contraste menor (2,79:1 sobre o papel) que o vermelho anterior; o significado é reforçado pelo rótulo de texto.

## Plataforma

- Movimento reduzido implementado, mas não verificado no navegador.
- Teclado na tela para totem sem teclado do sistema.
