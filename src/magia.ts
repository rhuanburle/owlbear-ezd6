// Regras de Conjuração do EZD6 (págs. 14–16), puras e testáveis.
//
// - Conjurador escolhe o Nível de Poder (NP): 1, 2 ou 3 dados; vale o MAIOR.
// - Sucesso se o maior do NP >= o maior dado de resistência.
// - Resistência mais alta = 1 => conjuração instantânea (sucesso).
// - Qualquer 1 no NP => falha automática, a menos que aceite o Refluxo Arcano
//   (sacrificar 1 Golpe por cada 1). Com Refluxo, o 1 deixa de anular e vale a
//   comparação normal (maior do NP vs resistência).
// - Karma NÃO pode ser usado; Dado Heroico pode (re-rola um dado, até o 1).

import { rolarUmDado } from "./ezd6";

export type NivelPoder = 1 | 2 | 3;

export function rolarDadosMagia(qtd: number): number[] {
  return Array.from({ length: Math.max(0, qtd) }, () => rolarUmDado());
}

export type DesfechoConjuracao =
  | "instantanea"
  | "sucesso"
  | "sucesso-refluxo"
  | "falha-1"
  | "falha";

export interface AvaliacaoConjuracao {
  desfecho: DesfechoConjuracao;
  maiorNp: number;
  maiorResistencia: number;
  uns: number; // quantidade de 1 no NP
  golpesRefluxo: number; // Golpes a sacrificar para forçar via Refluxo (= uns)
}

export function avaliarConjuracao(
  np: number[],
  resistencia: number[],
  refluxoAceito: boolean,
): AvaliacaoConjuracao {
  const maiorNp = np.length ? Math.max(...np) : 0;
  const maiorResistencia = resistencia.length ? Math.max(...resistencia) : 0;
  const uns = np.filter((d) => d === 1).length;

  let desfecho: DesfechoConjuracao;
  if (maiorResistencia === 1) {
    desfecho = "instantanea"; // resistência revelada mais alta é 1
  } else if (uns > 0 && !refluxoAceito) {
    desfecho = "falha-1"; // 1 no NP anula, salvo Refluxo Arcano
  } else if (uns > 0) {
    // Refluxo aceito: o sacrifício FORÇA a conjuração ao sucesso (resumão de
    // regras: "ainda pode conjurá-la ao aceitar sofrer 1 Golpe para cada 1").
    desfecho = "sucesso-refluxo";
  } else {
    desfecho = maiorNp >= maiorResistencia ? "sucesso" : "falha";
  }

  return { desfecho, maiorNp, maiorResistencia, uns, golpesRefluxo: uns };
}

// ---------- Pergaminhos (pág. 17) ----------
// NP fixo 2D6, re-rolando qualquer 1 (pergaminhos não sofrem a falha do 1).
function rolarNao1(): number {
  let d = rolarUmDado();
  for (let i = 0; i < 50 && d === 1; i++) d = rolarUmDado();
  return d;
}
export function rolarPergaminho(): number[] {
  return [rolarNao1(), rolarNao1()];
}

// ---------- Milagres / Devoção (pág. 18) ----------
// Como a conjuração, mas contra Dados de Indiferença; qualquer 1 dissipa o
// milagre (sem Refluxo — a "oferenda" permite re-rolar tudo). Sem instantânea.
export type DesfechoMilagre = "sucesso" | "falha" | "dissipado";

export interface AvaliacaoMilagre {
  desfecho: DesfechoMilagre;
  maiorDado: number;
  maiorIndiferenca: number;
  uns: number;
}

export function avaliarMilagre(dados: number[], indiferenca: number[]): AvaliacaoMilagre {
  const maiorDado = dados.length ? Math.max(...dados) : 0;
  const maiorIndiferenca = indiferenca.length ? Math.max(...indiferenca) : 0;
  const uns = dados.filter((d) => d === 1).length;
  let desfecho: DesfechoMilagre;
  if (uns > 0) desfecho = "dissipado";
  else desfecho = maiorDado >= maiorIndiferenca ? "sucesso" : "falha";
  return { desfecho, maiorDado, maiorIndiferenca, uns };
}

export function textoMilagre(a: AvaliacaoMilagre): string {
  switch (a.desfecho) {
    case "sucesso":
      return "A divindade atende!";
    case "dissipado":
      return "Saiu 1 — a prece se dissipa.";
    case "falha":
      return "A divindade ignora o pedido.";
  }
}

export function textoConjuracao(a: AvaliacaoConjuracao): string {
  switch (a.desfecho) {
    case "instantanea":
      return "Conjuração instantânea! (resistência 1)";
    case "sucesso":
      return "Conjuração bem-sucedida!";
    case "sucesso-refluxo":
      return "Sucesso via Refluxo Arcano!";
    case "falha-1":
      return "Saiu 1 — as energias não se manifestam.";
    case "falha":
      return "A conjuração falhou.";
  }
}
