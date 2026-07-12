// Camada fina sobre o SDK do Owlbear Rodeo.
// Objetivo: o app funcionar tanto DENTRO do Owlbear (com broadcast entre
// jogadores e dificuldade sincronizada pelo mestre) quanto FORA dele (aberto
// direto no navegador, para desenvolver e testar sem precisar do Owlbear).

import OBR from "@owlbear-rodeo/sdk";
import type { DadoCritico, Difficulty, Rolagem } from "./ezd6";
import { normalizarFicha } from "./ficha";
import type { Ficha } from "./ficha";

export const CANAL_ROLAGEM = "com.ezd6.toolkit/roll";
const CHAVE_ALVO = "com.ezd6.toolkit/alvo";
const CHAVE_COMBATE = "com.ezd6.toolkit/combate";

export type Papel = "GM" | "PLAYER";

/** Entrada de rolagem comum (dados de ação). */
export interface EntradaRolagem {
  tipo: "rolagem";
  id: string;
  autor: string;
  cor: string;
  /** Rolagem crua (dados + qual valeu). */
  rolagem: Rolagem;
  /** Karma gasto no dado principal (pós-rolagem). */
  karma: number;
  /** Dados da confirmação de crítico (vazio se não houve crítico). */
  criticos: DadoCritico[];
  /** Estado de combate no momento da rolagem (define crítico x sucesso garantido). */
  combate: boolean;
  /** Já foi reivindicado o +1 de Karma pela falha desta rolagem? */
  karmaGanho?: boolean;
  /** Já foi usado o Dado Heroico nesta rolagem? (bloqueia reivindicar Karma da falha) */
  heroicoUsado?: boolean;
  timestamp: number;
}

/** Entrada de mágica / pergaminho / milagre (para o histórico compartilhado). */
export interface EntradaMagia {
  tipo: "magia";
  id: string;
  autor: string;
  cor: string;
  modo: "feitico" | "pergaminho" | "milagre";
  dados: number[];
  oposicao: number[];
  texto: string;
  desfecho: "sucesso" | "falha" | "critico";
  timestamp: number;
}

export type LogEntry = EntradaRolagem | EntradaMagia;

export interface Jogador {
  nome: string;
  cor: string;
  papel: Papel;
}

/** True quando o app está embarcado dentro de uma sala do Owlbear Rodeo. */
export const dentroDoOwlbear = OBR.isAvailable;

/** Executa o callback quando o Owlbear estiver pronto (ou já, se estivermos fora dele). */
export function quandoPronto(cb: () => void): void {
  if (dentroDoOwlbear) {
    OBR.onReady(cb);
  } else {
    cb();
  }
}

export async function obterJogador(): Promise<Jogador> {
  if (!dentroDoOwlbear) {
    return { nome: "Mestre (modo teste)", cor: "#7c3aed", papel: "GM" };
  }
  const [nome, cor, papel] = await Promise.all([
    OBR.player.getName(),
    OBR.player.getColor(),
    OBR.player.getRole(),
  ]);
  return { nome, cor, papel };
}

/** Avisa quando o jogador muda (ex.: o mestre promove alguém a GM). */
export function aoMudarJogador(cb: (j: Jogador) => void): () => void {
  if (!dentroDoOwlbear) return () => {};
  return OBR.player.onChange((p) => {
    cb({ nome: p.name, cor: p.color, papel: p.role });
  });
}

// ---------- Dificuldade (alvo) controlada pelo mestre ----------
// Dentro do Owlbear: guardada no metadata da SALA, então todos veem o mesmo
// valor e só o mestre pode alterá-lo (a UI esconde o controle dos jogadores).

let alvoLocal: Difficulty = 3;
const alvoListeners = new Set<(a: Difficulty) => void>();

function normalizarAlvo(v: unknown): Difficulty {
  return v === 2 || v === 3 || v === 4 || v === 5 || v === 6 ? v : 3;
}

export async function obterAlvo(): Promise<Difficulty> {
  if (!dentroDoOwlbear) return alvoLocal;
  const md = await OBR.room.getMetadata();
  return normalizarAlvo(md[CHAVE_ALVO]);
}

export async function definirAlvo(alvo: Difficulty): Promise<void> {
  if (!dentroDoOwlbear) {
    alvoLocal = alvo;
    alvoListeners.forEach((fn) => fn(alvo));
    return;
  }
  await OBR.room.setMetadata({ [CHAVE_ALVO]: alvo });
}

export function aoMudarAlvo(cb: (alvo: Difficulty) => void): () => void {
  if (!dentroDoOwlbear) {
    alvoListeners.add(cb);
    return () => alvoListeners.delete(cb);
  }
  return OBR.room.onMetadataChange((md) => cb(normalizarAlvo(md[CHAVE_ALVO])));
}

// ---------- Modo combate controlado pelo mestre ----------
// Fora de combate, um 6 é apenas "sucesso garantido"; em combate, é crítico com
// confirmação de Golpes (livro, pág. 7 e 12).

let combateLocal = false;
const combateListeners = new Set<(c: boolean) => void>();

export async function obterCombate(): Promise<boolean> {
  if (!dentroDoOwlbear) return combateLocal;
  const md = await OBR.room.getMetadata();
  return md[CHAVE_COMBATE] === true;
}

export async function definirCombate(combate: boolean): Promise<void> {
  if (!dentroDoOwlbear) {
    combateLocal = combate;
    combateListeners.forEach((fn) => fn(combate));
    return;
  }
  await OBR.room.setMetadata({ [CHAVE_COMBATE]: combate });
}

export function aoMudarCombate(cb: (combate: boolean) => void): () => void {
  if (!dentroDoOwlbear) {
    combateListeners.add(cb);
    return () => combateListeners.delete(cb);
  }
  return OBR.room.onMetadataChange((md) => cb(md[CHAVE_COMBATE] === true));
}

// ---------- Ficha de personagem ----------
// Guardada no metadata do JOGADOR (cada um tem a sua, sincroniza para os outros
// verem, e persiste na sala). Espelhada no localStorage para sobreviver a
// recarregamentos e ao modo de teste (fora do Owlbear).

// A ficha é guardada no metadata da SALA (persiste com a sala, de graça), sob
// uma chave própria por dono. O "dono" é um id estável no localStorage — assim,
// ao reconectar do mesmo navegador, o jogador reencontra a própria ficha, e cada
// um grava só a sua chave (setMetadata faz merge no topo, sem clobber dos outros).
const CHAVE_FICHA_PREFIXO = "com.ezd6.toolkit/ficha:";
const LOCAL_FICHA = "ezd6-toolkit-ficha";
const LOCAL_OWNER = "ezd6-toolkit-owner";

function novoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `own-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

function donoId(): string {
  let id = localStorage.getItem(LOCAL_OWNER);
  if (!id) {
    id = novoId();
    localStorage.setItem(LOCAL_OWNER, id);
  }
  return id;
}

/** Chave da ficha deste dono dentro do metadata da sala. */
export function chaveFicha(): string {
  return CHAVE_FICHA_PREFIXO + donoId();
}

function lerFichaLocal(): Ficha | null {
  try {
    const cru = localStorage.getItem(LOCAL_FICHA);
    return cru ? normalizarFicha(JSON.parse(cru)) : null;
  } catch {
    return null;
  }
}

function gravarFichaLocal(f: Ficha): void {
  try {
    localStorage.setItem(LOCAL_FICHA, JSON.stringify(f));
  } catch {
    /* ignora cota/erro de storage */
  }
}

export async function obterFicha(): Promise<Ficha> {
  if (dentroDoOwlbear) {
    const md = await OBR.room.getMetadata();
    const naSala = md[chaveFicha()];
    if (naSala) return normalizarFicha(naSala);
  }
  return lerFichaLocal() ?? normalizarFicha(null);
}

export async function salvarFicha(f: Ficha): Promise<void> {
  gravarFichaLocal(f);
  if (dentroDoOwlbear) await OBR.room.setMetadata({ [chaveFicha()]: f });
}

export interface FichaSalva {
  chave: string;
  ficha: Ficha;
}

function fichasDeMetadata(md: Record<string, unknown>): FichaSalva[] {
  return Object.keys(md)
    .filter((k) => k.startsWith(CHAVE_FICHA_PREFIXO))
    .map((k) => ({ chave: k, ficha: normalizarFicha(md[k]) }));
}

/** Todas as fichas salvas na sala (para o mestre ver os jogadores). */
export async function obterTodasFichas(): Promise<FichaSalva[]> {
  if (!dentroDoOwlbear) {
    const f = lerFichaLocal();
    return f ? [{ chave: chaveFicha(), ficha: f }] : [];
  }
  return fichasDeMetadata(await OBR.room.getMetadata());
}

/** Observa mudanças nas fichas da sala (para a tela do mestre atualizar ao vivo). */
export function aoMudarFichas(cb: (fichas: FichaSalva[]) => void): () => void {
  if (!dentroDoOwlbear) return () => {};
  return OBR.room.onMetadataChange((md) => cb(fichasDeMetadata(md)));
}

/** O mestre grava a ficha de um jogador específico (pela chave dele). */
export async function salvarFichaDe(chave: string, ficha: Ficha): Promise<void> {
  if (dentroDoOwlbear) await OBR.room.setMetadata({ [chave]: ficha });
}

/** Observa mudanças na MINHA própria ficha na sala (ex.: o mestre me deu Karma). */
export function aoMudarMinhaFicha(cb: (f: Ficha) => void): () => void {
  if (!dentroDoOwlbear) return () => {};
  const chave = chaveFicha();
  return OBR.room.onMetadataChange((md) => {
    const f = md[chave];
    if (f) cb(normalizarFicha(f));
  });
}

// ---------- Rolagens (broadcast) ----------

const receptores = new Set<(entry: LogEntry) => void>();

/**
 * Envia uma rolagem para todos na sala (inclusive para si, via "ALL"), de modo
 * que o log fique idêntico em todos os clientes. Reenviar com o mesmo `id`
 * atualiza a entrada existente (usado na confirmação de crítico).
 * Fora do Owlbear, entrega direto aos ouvintes locais.
 */
export async function enviarRolagem(entry: LogEntry): Promise<void> {
  if (dentroDoOwlbear) {
    await OBR.broadcast.sendMessage(CANAL_ROLAGEM, entry, { destination: "ALL" });
  } else {
    receptores.forEach((fn) => fn(entry));
  }
}

/** Registra um ouvinte para rolagens (retorna função de cancelamento). */
export function aoReceberRolagem(cb: (entry: LogEntry) => void): () => void {
  if (dentroDoOwlbear) {
    return OBR.broadcast.onMessage(CANAL_ROLAGEM, (event) => {
      cb(event.data as LogEntry);
    });
  }
  receptores.add(cb);
  return () => receptores.delete(cb);
}
