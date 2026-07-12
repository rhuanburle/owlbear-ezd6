# EZD6 Toolkit — extensão para Owlbear Rodeo

Extensão **não-oficial** para o [Owlbear Rodeo](https://www.owlbear.rodeo/) que
automatiza o sistema de RPG **EZD6** (em português), pensada para facilitar a
jogatina — inclusive com crianças.

**🔗 Extensão publicada:** https://owlbear-ezd6.web.app

## 📥 Como instalar no Owlbear Rodeo

1. No Owlbear, abra o menu de **perfil** → **Add Extension**.
2. Cole a URL do manifest:
   ```
   https://owlbear-ezd6.web.app/manifest.json
   ```
3. Confirme. A extensão (ícone de dado verde 🟢) aparece na barra de ferramentas.

### Para a sua mesa (jogadores)

O **mestre** (dono da sala) habilita a extensão nas configurações da sala. Os
**jogadores que entram pelo link da sala já recebem a extensão automaticamente** —
não precisam instalar nem colar a URL.

> Em breve também no catálogo oficial ([extensions.owlbear.rodeo](https://extensions.owlbear.rodeo/)),
> para instalar com 1 clique (submissão em revisão).

## ✨ Recursos

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

## 🛠️ Desenvolvimento

```bash
npm install
npm run dev      # sobe em http://localhost:5173
npm run build    # gera dist/ para produção
```

Para testar dentro do Owlbear em desenvolvimento: **Add Extension** →
`http://localhost:5173/manifest.json`.

## 🚀 Deploy

Hospedado no **Firebase Hosting** (domínio-raiz, grátis). Deploy manual:

```bash
npm run build && firebase deploy --only hosting
```

O deploy também é **automático**: todo push na branch `main` publica via GitHub Actions
(veja `.github/workflows/deploy.yml`).

## Stack

Vite + React + TypeScript + [`@owlbear-rodeo/sdk`](https://www.npmjs.com/package/@owlbear-rodeo/sdk).
Sem servidor próprio: os dados vivem no metadata da sala do Owlbear.

## Créditos e licença

- Código sob licença **MIT** (veja `LICENSE`).
- **EZD6** é de autoria de Scotty McFarland / Rune Hammer Games; versão em português
  por RPG Planet Books & Games. Esta é uma ferramenta **de fã, não-oficial**, e não
  redistribui o conteúdo do livro.
