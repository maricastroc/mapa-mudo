# Elas em Jogo · jeito de escrever

Vale para todos os jogos. A referência pronta é o "Resgate no mar" (Katherine Johnson), em `src/lab/benches.ts` e `src/lab/johnson/`.

## O tom

Como alguém que gosta de ciência contando uma história boa para um grupo misturado de crianças, adolescentes e adultos. Leve, esperto, sem infantilizar.

- Frases curtas. Uma ideia por frase.
- Português do Brasil falado hoje: "pegar", "desviar", "mandou bem", "sem um arranhão".
- Verbo no lugar de substantivo: "você resgatou 8 cápsulas", não "resgate de 8 cápsulas".
- Nada de travessão, ponto e vírgula, slogan ou frase grandiosa.
- Termo técnico só quando o jogo precisa dele e o contexto explica.
- O jogo é uma metáfora. Nunca diga que ele reproduz o trabalho dela. Diga onde a metáfora encontra o fato.

## Tamanho de cada texto

| Lugar | Forma | Limite |
| --- | --- | --- |
| Nome do jogo | ação ou pergunta | até 4 palavras |
| Abertura | o que fazer, e o perigo se houver | 2 frases curtas |
| Dica durante o jogo | imperativo direto | até 6 palavras |
| Reação na tela | exclamação de uma palavra | "+1", "quase!", "ai!", "3 seguidas!" |
| Placar | rótulo em maiúsculas | 1 palavra |
| Resultado | número grande + frase simples | 1 linha cada |
| Revelação | pergunta, "Foi ela.", legenda da demonstração | 1 frase por fase |

## A revelação: ver mais do que ler

A tela final mostra a contribuição em vez de explicar em parágrafos. Muita gente na feira não para para ler.

**Fixo em todos os jogos** (`src/lab/Reveal.tsx`):

1. Foto histórica real à esquerda, em risografia, com crédito.
2. Pergunta curta ligada ao jogo, como "Quem sabia onde a cápsula ia cair?".
3. "Foi ela." e o nome, com uma linha de contexto ("Matemática da NASA · Estados Unidos").
4. No meio, uma demonstração animada e opcional, própria da cientista.
5. No rodapé, sempre visíveis: "Seu resultado" numa linha e os botões "Próximo jogo" e "Passar a vez".

**A demonstração**

- Mostra a ideia central da contribuição em poucos segundos (até ~6 s).
- Começa parada, com um convite de um toque ("Conferir a trajetória"). Se ninguém tocar, roda sozinha depois de alguns segundos. Dá para ver de novo.
- Não é um segundo jogo: nada para errar, nada para acertar.
- Representa o valor do trabalho, não simula o trabalho. Nada de "apertou o botão, a ciência aconteceu".
- Uma legenda curta por fase, no máximo uma frase.
- No final: uma frase de destaque em três batidas (como "O computador calculou. Katherine conferiu. John Glenn confiou.") e logo abaixo um parágrafo curto, de até três frases, que diz quem ela foi, o episódio mostrado e o que mais ela fez.
- Ordem na tela: nome da cientista, animação, frase de destaque, parágrafo, resultado do jogador, botões.
- Diz o que é ilustrativo ("Esquema · fora de escala").
- Cada cientista tem a sua: muda a forma, o gesto e o desenho, não só o texto. Exemplos: Katherine confere um caminho e a cápsula volta por ele. Marie Curie e Jaqueline precisam de demonstrações com outra lógica visual.

## Palavras

| Prefira | Evite |
| --- | --- |
| jogo, próximo jogo | bancada, módulo, etapa |
| seu resultado | seu registro, desempenho |
| pancada, "ai!" | avaria, dano, penalidade |
| "sem um arranhão" | nenhuma avaria |
| 8 resgates seguidos | melhor sequência: 8 |
| descobrir a cientista | revelação, conhecer a pesquisadora |
| em breve | em construção, indisponível |
| Perfeito! · Mandou bem! · Boa! · Quase lá! | Missão cumprida, Parabéns pelo desempenho |

## Antes de publicar

- Leia em voz alta. Se soar como relatório, edital ou propaganda, reescreva.
- Uma criança de 10 anos entende? Um adulto se sente tratado como criança?
- Cada fato da revelação tem fonte.
