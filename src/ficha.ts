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
}

export const PADROES_VIDA = ["Miserável", "Pobre", "Estável", "Rico", "Nobre", "Realeza"];

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
