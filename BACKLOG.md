# Backlog — Diga um Nome

## Visual (não atacar até decisão de design)

- Pista 2 visualmente vazia (topo do morro com poucas curvas).
- Regularidade dos estratos na pista 3 (parece papel pautado).
- Ombros do busto viram anéis de alvo na escala 1:1.
- No mapa coletivo, o sufixo explicativo da rocha mais alta ("31 lembraram") pode ficar sob as curvas da própria ilha.
- Uma rocha nova na encosta de uma ilha grande pode não fechar o anel +1 (o contorno se funde ao da vizinha).
- No fim da feira os recifes ficam parecidos entre si, porque as descobertas se distribuem por igual. A legenda diz "uma cientista de cada vez" para explicar; a forma não foi alterada para não sugerir diferenças que os dados não têm.
- Saturação do mar no tema ÍRIS (tema escuro removido; a questão volta se houver variante escura).
- No celular, a resposta para "Marie Curie" e semelhantes passa da dobra e exige rolar o painel.

## Conteúdo e dados

- Pendências de verificação das pistas revisadas: `docs/curation/REVISAO-PISTAS.md`.
- Limiar de emersão do recife (`REEF_SURFACES_AT = 1`) e amostra mínima para mostrar a proporção do silêncio (`SILENCE_SAMPLE_MIN = 20`) são ajustáveis em `src/participation/collective.ts`.
- Classificação por visita: "Diga outro nome" e "Conhecer outra cientista" continuam a mesma visita; "Passar a vez", "Reiniciar" ou 90 s sem toque abrem visita nova. Quem chega antes dos 90 s e não toca "Passar a vez" entra na visita anterior.
- A lista de nomes frequentes fora da folha (`references.ts`) é pequena e deliberadamente conservadora; nomes que ela não reconhece vão para conferência.
- `reveal.contribution` existe no modelo, mas não aparece na tela.

## Identidade

- Cores institucionais só `#1001e3` e `#ee704c`. O laranja (2,79:1 sobre o papel) não é usado em texto: fica em curvas, anéis, bordas e fundos; textos de destaque usam ink (4,89:1 sobre o laranja) ou azul.
- A curva +1 em laranja ÍRIS tem contraste menor que o vermelho anterior; o significado é reforçado pelo rótulo de texto.

## Plataforma

- Movimento reduzido implementado, mas não verificado no navegador.
- O teclado na tela aparece no layout de totem/tablet; no celular, usa o teclado do sistema.
