// Modelo da Ficha de Personagem do EZD6.
// A ficha é a FONTE DA VERDADE das mecânicas automatizadas: o pool de Karma, o
// Dado Heroico e a Vida vivem aqui, e o rolador lê/atualiza esses valores.

export interface Ficha {
  // Identidade / descrição (campos de texto do livro)
  nome: string;
  especie: string;
  trilha: string; // Trilha Heroica
  trunfosHabilidades: string; // Trunfos e Habilidades de Trilha Heroica (campo único, como na ficha)
  inclinacoes: string;
  aspectos: string;
  circuloFeiticaria: string;
  equipamento: string;
  armas: string;
  pocoes: string;
  pergaminhos: string;
  padraoVida: string;

  // Mecânica (automatizada)
  vidaAtual: number;
  vidaMax: number;
  /** Limiar da salvaguarda de armadura: rolar >= este valor ignora 1 Golpe. 0 = sem armadura. */
  armadura: number;
  /** Pool de Karma (começa em 3 por sessão). */
  karma: number;
  /**
   * Quantidade de Dados Heroicos disponíveis. Começa em 1, mas Trilhas e
   * habilidades podem conceder mais de um. Cada uso gasta 1; recupera-se
   * gastando 5 Karma.
   */
  dadosHeroicos: number;

  // Cenário "Mundo Devastado" (suplemento). Só usados quando o cenário está
  // ligado; defaults neutros para não afetar mesas do livro básico.
  /** Resistência ao Miasma: quantidade de d6 rolados (salva com qualquer 6). Pág. 103. */
  resistenciaMiasma: number;
  /** Dados de Poder disponíveis (adicionam dados à jogada; resetam por sessão). Pág. 110. */
  dadosPoder: number;
  /** Máximo de Dados de Poder (para onde o "resetar sessão" volta). */
  dadosPoderMax: number;
  /** Possui escudo? Permite uma 2ª salvaguarda de armadura por rodada. Pág. 7. */
  escudo: boolean;
  /** Nível de contaminação (0–3). Ao chegar a 3, perde 1 Golpe permanente e zera. Pág. 104. */
  contaminacao: number;
  /** Estado de contágio: sadio, debilitado (Estorvo até curar) ou doente. Pág. 104. */
  contagio: "nenhum" | "debilitado" | "doente";
  /** Atordoado: Estorvo em tudo e não corre no próximo turno. Pág. 101. */
  atordoado: boolean;
  /** Suprimentos atuais (comida/água/munição). Pág. 45. */
  suprimentos: number;
  /** Máximo de suprimentos que carrega (5 base, +5 mochila, +3 Acumulador). */
  suprimentosMax: number;
}

export const PADROES_VIDA = ["Miserável", "Pobre", "Estável", "Rico", "Nobre", "Realeza"];
/** Níveis de Riqueza do cenário "Mundo Devastado" (pág. 43) — substituem os Padrões de Vida. */
export const NIVEIS_RIQUEZA = ["Liso", "Modesto", "Estável", "Brilhoso", "Cromado", "Endinheirado"];

export const FICHA_PADRAO: Ficha = {
  nome: "",
  especie: "",
  trilha: "",
  trunfosHabilidades: "",
  inclinacoes: "",
  aspectos: "",
  circuloFeiticaria: "",
  equipamento: "",
  armas: "",
  pocoes: "",
  pergaminhos: "",
  padraoVida: "Estável",
  vidaAtual: 3,
  vidaMax: 3,
  armadura: 0,
  karma: 3,
  dadosHeroicos: 1,
  resistenciaMiasma: 1,
  dadosPoder: 0,
  dadosPoderMax: 0,
  escudo: false,
  contaminacao: 0,
  contagio: "nenhum",
  atordoado: false,
  suprimentos: 5,
  suprimentosMax: 5,
};

/** Garante que um objeto vindo do storage tenha todos os campos (retrocompat). */
export function normalizarFicha(bruto: unknown): Ficha {
  if (!bruto || typeof bruto !== "object") return { ...FICHA_PADRAO };
  return { ...FICHA_PADRAO, ...(bruto as Partial<Ficha>) };
}

/** Texto do limiar de armadura: 5 => "5-6", 6 => "6", 0 => "—". */
export function textoArmadura(limiar: number): string {
  if (limiar < 2 || limiar > 6) return "—";
  return limiar >= 6 ? "6" : `${limiar}-6`;
}
