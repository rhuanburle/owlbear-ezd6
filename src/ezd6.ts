// Núcleo de regras do EZD6 — puro, sem dependência de UI ou do Owlbear.
// Assim conseguimos testar a mecânica isoladamente no terminal.
//
// Ponto importante do sistema: o KARMA é gasto DEPOIS de ver o dado. Por isso
// a rolagem é "crua" (função `rolar`) e a aplicação de Karma é uma avaliação
// posterior (`avaliar`), que pode transformar uma falha em sucesso ou, ao
// alcançar 6, em crítico.

export type Difficulty = 2 | 3 | 4 | 5 | 6;

export const DIFICULDADES: { valor: Difficulty; nome: string }[] = [
  { valor: 2, nome: "Fácil" },
  { valor: 3, nome: "Normal" },
  { valor: 4, nome: "Difícil" },
  { valor: 5, nome: "Muito Difícil" },
  { valor: 6, nome: "Super Difícil" },
];

export type Modo = "normal" | "trunfo" | "estorvo";
export type Desfecho = "falha" | "sucesso" | "critico";

export interface RollInput {
  /** Número alvo da ação (2 a 6). */
  alvo: Difficulty;
  /** Quantidade de Trunfos (dados extras, pega o MAIOR). */
  trunfos: number;
  /** Quantidade de Estorvos (dados extras, pega o MENOR). */
  estorvos: number;
}

/** Resultado "cru" de uma rolagem, antes de qualquer Karma. */
export interface Rolagem {
  /** Todos os dados que foram rolados. */
  dados: number[];
  /** Índice do dado que ficou valendo (o maior ou o menor). */
  indiceEscolhido: number;
  /** Valor natural do dado escolhido. */
  natural: number;
  modo: Modo;
  alvo: Difficulty;
  /** True quando o dado natural é 1 (falha garantida; Karma não altera, só o Dado Heroico). */
  umNatural: boolean;
}

export type RNG = () => number; // retorna [0, 1)

const rolarD6 = (rng: RNG): number => Math.floor(rng() * 6) + 1;

/** Rola um único d6 (usado na confirmação de crítico). */
export function rolarUmDado(rng: RNG = Math.random): number {
  return rolarD6(rng);
}

/**
 * Executa uma rolagem crua de EZD6 (sem Karma).
 *
 * Trunfo e Estorvo se cancelam. O saldo líquido define quantos dados extras
 * entram: saldo positivo => pega o MAIOR; saldo negativo => pega o MENOR.
 */
export function rolar(input: RollInput, rng: RNG = Math.random): Rolagem {
  const saldo = (input.trunfos | 0) - (input.estorvos | 0);
  const qtdDados = 1 + Math.abs(saldo);
  const dados = Array.from({ length: qtdDados }, () => rolarD6(rng));

  let modo: Modo = "normal";
  let indiceEscolhido = 0;
  if (saldo > 0) {
    modo = "trunfo";
    indiceEscolhido = dados.reduce((maior, v, i) => (v > dados[maior] ? i : maior), 0);
  } else if (saldo < 0) {
    modo = "estorvo";
    indiceEscolhido = dados.reduce((menor, v, i) => (v < dados[menor] ? i : menor), 0);
  }

  const natural = dados[indiceEscolhido];
  return { dados, indiceEscolhido, natural, modo, alvo: input.alvo, umNatural: natural === 1 };
}

export interface Avaliacao {
  /** Karma efetivamente aplicado (0 se for um 1 natural). */
  karmaAplicado: number;
  /** Valor final = natural + karma, limitado a 6. */
  valorFinal: number;
  desfecho: Desfecho;
}

/**
 * Aplica o Karma gasto (pós-rolagem) sobre a rolagem e decide o desfecho.
 * - 1 natural continua falha (Karma não ajuda).
 * - Valor final 6 (natural ou alcançado via Karma) = crítico.
 * - Caso contrário, sucesso se valor final >= alvo.
 */
export function avaliar(r: Rolagem, karma: number): Avaliacao {
  const karmaAplicado = r.umNatural ? 0 : Math.max(0, Math.floor(karma));
  const valorFinal = Math.min(6, r.natural + karmaAplicado);

  let desfecho: Desfecho;
  if (r.umNatural) desfecho = "falha";
  else if (valorFinal >= 6) desfecho = "critico";
  else if (valorFinal >= r.alvo) desfecho = "sucesso";
  else desfecho = "falha";

  return { karmaAplicado, valorFinal, desfecho };
}

// ---------- Confirmação de crítico (Regra de Crítico, pág. 12) ----------
// Ao tirar 6 você tem 1 Golpe. Rola-se um novo dado; a cada 6 (natural ou
// alcançado com Karma) acumula-se +1 Golpe e rola-se de novo. Para no primeiro
// dado que ficar abaixo de 6. Nas confirmações o Karma PODE empurrar qualquer
// dado até 6 ("...até o Karma acabar").

export interface DadoCritico {
  natural: number;
  karma: number;
}

export const valorCritico = (d: DadoCritico): number =>
  Math.min(6, d.natural + Math.max(0, Math.floor(d.karma)));

/** Golpes = 1 (do 6 original) + 1 por cada dado de confirmação que chegou a 6. */
export function golpesDeCritico(criticos: DadoCritico[]): number {
  let seises = 0;
  for (const d of criticos) {
    if (valorCritico(d) >= 6) seises++;
    else break;
  }
  return 1 + seises;
}

/** A confirmação ainda pode continuar? (vazia, ou o último dado chegou a 6.) */
export function critAberto(criticos: DadoCritico[]): boolean {
  if (criticos.length === 0) return true;
  return valorCritico(criticos[criticos.length - 1]) >= 6;
}

export function textoDesfecho(desfecho: Desfecho, umNatural: boolean, emCombate = false): string {
  switch (desfecho) {
    case "critico":
      // Um 6 é sempre sucesso garantido (pág. 7). O acerto CRÍTICO com Golpes
      // adicionais só existe em combate (pág. 12).
      return emCombate ? "CRÍTICO!" : "Sucesso garantido!";
    case "sucesso":
      return "Sucesso";
    case "falha":
      return umNatural ? "Falha (1 natural)" : "Falha";
  }
}
