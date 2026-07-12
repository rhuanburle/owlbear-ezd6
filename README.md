# EZD6 Toolkit — extensão para Owlbear Rodeo

Extensão **não-oficial** para o [Owlbear Rodeo](https://www.owlbear.rodeo/) que
automatiza o sistema de RPG **EZD6** (em português), pensada para facilitar a
jogatina — inclusive com crianças.

## Recursos

- 🎲 **Rolador EZD6**: Trunfo/Estorvo, dificuldade definida pelo mestre, 1 = falha,
  6 = sucesso/crítico, com animação de dados e histórico compartilhado na sala.
- 💠 **Karma** como pool da ficha: gasto pós-rolagem (transforma em sucesso/crítico),
  ganho na falha, e a regra de "não usar o Karma recém-ganho na mesma jogada".
- ✨ **Dado Heroico**: re-rola qualquer dado (quantidade ajustável); recupera com 5 Karma.
- ⚔️ **Combate**: confirmação de crítico ("explosão" de 6), salvaguarda de armadura e
  salvaguarda milagrosa (com Karma / Dado Heroico).
- 🔮 **Magia**: Feitiço (Nível de Poder vs Resistência, Refluxo Arcano), Pergaminho
  (2D6 re-rolando 1s) e Milagre (vs Dados de Indiferença, com Oferenda).
- 📋 **Ficha de personagem** completa, fiel à ficha oficial, sincronizada e persistente
  (metadata da sala do Owlbear + backup local).
- 👑 **Tela do mestre**: vê as fichas dos jogadores e ajusta Karma, Vida (Golpes/cura),
  Dados Heroicos e Descanso.

## Desenvolvimento

```bash
npm install
npm run dev      # sobe em http://localhost:5173
npm run build    # gera dist/ para produção
```

Para testar dentro do Owlbear em desenvolvimento: no seu perfil, **Add Extension** →
cole `http://localhost:5173/manifest.json`.

## Stack

Vite + React + TypeScript + [`@owlbear-rodeo/sdk`](https://www.npmjs.com/package/@owlbear-rodeo/sdk).
Sem servidor próprio: os dados vivem no metadata da sala do Owlbear.

## Créditos e licença

- Código sob licença **MIT** (veja `LICENSE`).
- **EZD6** é de autoria de Scotty McFarland / Rune Hammer Games; versão em português
  por RPG Planet Books & Games. Esta é uma ferramenta **de fã, não-oficial**, e não
  redistribui o conteúdo do livro.
