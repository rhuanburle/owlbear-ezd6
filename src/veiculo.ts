// Modelo e regras de Veículos do cenário "Mundo Devastado" (suplemento, págs. 55–66).
// Puro, sem UI/OBR — testável isoladamente, como ezd6.ts.

import { rolarUmDado } from "./ezd6";
import type { RNG } from "./ezd6";

export type Porte = "leve" | "medio" | "pesado" | "superpesado";

export interface PresetPorte {
  /** Golpes que o veículo aguenta antes de ser destruído. */
  golpes: number;
  /** Limiar da Salvaguarda Estrutural: rolar >= este valor evita 1 Golpe. */
  salvaguarda: number;
  /** Dano de Colisão: quantidade e faces dos dados (ex.: 2D6 => {qtd:2, faces:6}). */
  colisao: { qtd: number; faces: number };
  /** Rótulo com exemplos (pág. 57/61). */
  nome: string;
}

// Portes oficiais (pág. 57 e 61). Salvaguarda Estrutural: Leve 6, Médio/Pesado 5+, Superpesado 4+.
export const PORTES: Record<Porte, PresetPorte> = {
  leve: { golpes: 3, salvaguarda: 6, colisao: { qtd: 1, faces: 3 }, nome: "Leve (moto, quadriciclo, bugue)" },
  medio: { golpes: 4, salvaguarda: 5, colisao: { qtd: 1, faces: 6 }, nome: "Médio (carro, SUV pequeno)" },
  pesado: { golpes: 6, salvaguarda: 5, colisao: { qtd: 2, faces: 3 }, nome: "Pesado (van, SUV grande)" },
  superpesado: { golpes: 10, salvaguarda: 4, colisao: { qtd: 2, faces: 6 }, nome: "Superpesado (caminhão, ônibus)" },
};

export const ORDEM_PORTE: Porte[] = ["leve", "medio", "pesado", "superpesado"];

/** Texto do dano de colisão (ex.: "2D6"). */
export function textoColisao(p: Porte): string {
  const c = PORTES[p].colisao;
  return `${c.qtd}D${c.faces}`;
}

export interface Veiculo {
  id: string;
  nome: string;
  porte: Porte;
  golpesAtual: number;
  golpesMax: number;
  /** Modificações e notas (texto livre — pág. 63–64). */
  notas: string;
}

export function veiculoPadrao(id: string): Veiculo {
  const p = PORTES.medio;
  return { id, nome: "", porte: "medio", golpesAtual: p.golpes, golpesMax: p.golpes, notas: "" };
}

/** Garante campos e coerência ao ler do storage. */
export function normalizarVeiculo(bruto: unknown): Veiculo {
  const b = (bruto ?? {}) as Partial<Veiculo>;
  const porte: Porte = ORDEM_PORTE.includes(b.porte as Porte) ? (b.porte as Porte) : "medio";
  const max = typeof b.golpesMax === "number" ? b.golpesMax : PORTES[porte].golpes;
  const atual = typeof b.golpesAtual === "number" ? Math.min(b.golpesAtual, max) : max;
  return {
    id: b.id ?? "",
    nome: b.nome ?? "",
    porte,
    golpesMax: max,
    golpesAtual: atual,
    notas: b.notas ?? "",
  };
}

/** Rola o Dano de Colisão do porte (soma dos dados). Pág. 60. */
export function rolarColisao(p: Porte, rng: RNG = Math.random): { dados: number[]; total: number } {
  const c = PORTES[p].colisao;
  const dados = Array.from({ length: c.qtd }, () => Math.floor(rng() * c.faces) + 1);
  return { dados, total: dados.reduce((a, b) => a + b, 0) };
}

export type ResultadoSUE = "explode" | "colide" | "derrapa";

/**
 * Salvaguarda de Último Esforço (pág. 56): feita quando o motorista morre ou o
 * veículo sofre o último Golpe. Dificuldade 4+: 1 explode (bola de fogo),
 * 2–3 colide, 4–6 derrapa e para de forma brusca (a salvo).
 */
export function resultadoSUE(natural: number): ResultadoSUE {
  if (natural === 1) return "explode";
  if (natural <= 3) return "colide";
  return "derrapa";
}

export function textoSUE(r: ResultadoSUE): string {
  switch (r) {
    case "explode":
      return "💥 Explode numa bola de fogo! Passageiros: salvaguarda de morte iminente com Estorvo.";
    case "colide":
      return "💢 Capota/colide, pega fogo e se parte. Passageiros: salvaguarda de morte iminente.";
    case "derrapa":
      return "🛞 Derrapa e para sem se despedaçar. Passageiros sofrem 1 Golpe; veículo inoperante.";
  }
}

/** Salvaguarda Estrutural: rolar >= limiar do porte evita 1 Golpe. */
export function salvouEstrutural(natural: number, p: Porte): boolean {
  return natural >= PORTES[p].salvaguarda;
}

/**
 * Teste de Manobra (pág. 59): rola d6 vs dificuldade escolhida (2–6). Falha => 1 Golpe.
 * Falha crítica (1 natural) => 1D3 Golpes.
 */
export interface ResultadoTM {
  natural: number;
  sucesso: boolean;
  golpes: number; // Golpes sofridos pelo veículo em caso de falha
  critico: boolean;
}

export function avaliarTM(natural: number, dificuldade: number, rng: RNG = Math.random): ResultadoTM {
  const sucesso = natural >= dificuldade;
  const critico = natural === 1;
  let golpes = 0;
  if (!sucesso) golpes = critico ? Math.floor(rng() * 3) + 1 : 1; // falha crítica: 1D3
  return { natural, sucesso, golpes, critico };
}

// Reexporta para as views não precisarem importar de dois módulos.
export { rolarUmDado };
