import { useEffect, useRef, useState } from "react";
import {
  COBERTURA,
  DIFICULDADES,
  adicionarDadoPoder,
  avaliar,
  critAberto,
  golpesDeCritico,
  rolar,
  rolarPoolMiasma,
  rolarUmDado,
  sucessoMiasma,
  textoDesfecho,
  valorCritico,
} from "./ezd6";
import type { Difficulty } from "./ezd6";
import {
  aoMudarAlvo,
  aoMudarCenario,
  aoMudarCombate,
  aoMudarJogador,
  aoMudarMinhaFicha,
  aoMudarVeiculos,
  aoReceberRolagem,
  definirAlvo,
  definirCenario,
  definirCombate,
  dentroDoOwlbear,
  enviarRolagem,
  obterAlvo,
  obterCenario,
  obterCombate,
  obterFicha,
  obterJogador,
  obterVeiculos,
  quandoPronto,
  salvarFicha,
  salvarVeiculos,
} from "./obr";
import type { EntradaMagia, EntradaMiasma, EntradaRolagem, Jogador, LogEntry } from "./obr";
import { FICHA_PADRAO } from "./ficha";
import type { Ficha } from "./ficha";
import type { Veiculo } from "./veiculo";
import FichaView from "./FichaView";
import MagiaView from "./MagiaView";
import MesaView from "./MesaView";
import VeiculoView from "./VeiculoView";
import "./App.css";

// Posições dos pips para cada face do dado (grade 3x3).
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Dado({
  valor,
  escolhido,
  grande,
  rolando,
}: {
  valor: number;
  escolhido: boolean;
  grande?: boolean;
  rolando?: boolean;
}) {
  // Durante a rolagem, cicla faces aleatórias antes de revelar o valor final.
  const [face, setFace] = useState(valor);
  useEffect(() => {
    if (!rolando) return;
    const id = setInterval(() => setFace(Math.floor(Math.random() * 6) + 1), 80);
    return () => clearInterval(id);
  }, [rolando]);
  const mostrado = rolando ? face : valor;
  return (
    <div
      className={`dado ${escolhido ? "escolhido" : "descartado"} ${grande ? "grande" : ""} ${
        rolando ? "rolando" : ""
      }`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`pip ${PIPS[mostrado]?.includes(i) ? "on" : ""}`} />
      ))}
    </div>
  );
}

function Stepper({
  rotulo,
  valor,
  setValor,
  cor,
  min = 0,
  max = 9,
}: {
  rotulo: string;
  valor: number;
  setValor: (n: number) => void;
  cor: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="stepper">
      <span className="stepper-rotulo" style={{ color: cor }}>
        {rotulo}
      </span>
      <div className="stepper-controles">
        <button onClick={() => setValor(Math.max(min, valor - 1))} aria-label={`menos ${rotulo}`}>
          −
        </button>
        <span className="stepper-valor">{valor}</span>
        <button onClick={() => setValor(Math.min(max, valor + 1))} aria-label={`mais ${rotulo}`}>
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Desafio com Conjunto de Dados (Mundo Devastado, pág. 102): o mestre monta um
 * pool de 3–6 dados de dificuldade. Qualquer 1 é removido na hora (se saírem só
 * 1s, o desafio degrada). Os jogadores rolam e, a cada dado que iguale/supere um
 * dado de dificuldade, o mestre clica para removê-lo. Sem dados = desafio vencido.
 */
function DesafioDados() {
  const [qtd, setQtd] = useState(4);
  const [pool, setPool] = useState<{ valor: number; fora: boolean }[] | null>(null);
  const [degradado, setDegradado] = useState(false);

  function montar() {
    const dados = Array.from({ length: qtd }, () => rolarUmDado());
    setDegradado(dados.every((d) => d === 1));
    setPool(dados.map((v) => ({ valor: v, fora: v === 1 }))); // 1s já saem
  }
  function alternar(i: number) {
    setPool((p) => p && p.map((d, j) => (j === i ? { ...d, fora: !d.fora } : d)));
  }

  const restantes = pool ? pool.filter((d) => !d.fora).length : 0;
  const vencido = pool !== null && restantes === 0;

  return (
    <section className="desafio-dados">
      <label>🧩 Desafio com Conjunto de Dados (mestre)</label>
      <div className="desafio-montar">
        <div className="mini-stepper">
          <button onClick={() => setQtd(Math.max(3, qtd - 1))}>−</button>
          <b>{qtd}</b>
          <button onClick={() => setQtd(Math.min(6, qtd + 1))}>+</button>
        </div>
        <button className="ficha-btn" onClick={montar}>
          🎲 Montar desafio
        </button>
      </div>
      {pool && (
        <>
          <div className="desafio-pool">
            {pool.map((d, i) => (
              <button
                key={i}
                className={`desafio-dado ${d.fora ? "fora" : ""}`}
                onClick={() => alternar(i)}
                title={d.fora ? "Superado (clique para voltar)" : "Clique quando os jogadores superarem"}
              >
                {d.valor}
              </button>
            ))}
          </div>
          {degradado ? (
            <small className="combate-dica">Só saíram 1s — o desafio degrada e não exige esforço.</small>
          ) : vencido ? (
            <div className="desafio-vencido">✅ Desafio superado!</div>
          ) : (
            <small className="combate-dica">
              Faltam {restantes} dado{restantes > 1 ? "s" : ""}. Karma não vale aqui; Dado Heroico/Poder sim.
            </small>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Dados de Vilania (Mundo Devastado, pág. 107): recurso do mestre para PNJs/vilões
 * especiais (1–3). Apenas 1 por teste, substituindo um dado rolado — exatamente
 * como o Dado Heroico. Estado local/efêmero do mestre.
 */
function DadosVilania() {
  const [dados, setDados] = useState(0);
  const [ultimo, setUltimo] = useState<number | null>(null);
  return (
    <section className="desafio-dados vilania">
      <label>😈 Dados de Vilania (mestre)</label>
      <div className="desafio-montar">
        <div className="mini-stepper">
          <button onClick={() => setDados(Math.max(0, dados - 1))}>−</button>
          <b>{dados}</b>
          <button onClick={() => setDados(Math.min(9, dados + 1))}>+</button>
        </div>
        <button
          className="ficha-btn"
          disabled={dados <= 0}
          onClick={() => {
            setUltimo(rolarUmDado());
            setDados(dados - 1);
          }}
        >
          🎲 Usar (substitui 1 dado)
        </button>
      </div>
      {ultimo !== null && (
        <div className="vilania-res">
          Saiu <b>{ultimo}</b> — substitua um dado da jogada do PNJ por este.
        </div>
      )}
      <small className="combate-dica">1 por teste, como o Dado Heroico do vilão. Recomece a cada cena.</small>
    </section>
  );
}

export default function App() {
  const [jogador, setJogador] = useState<Jogador>({ nome: "…", cor: "#7c3aed", papel: "PLAYER" });
  const [alvo, setAlvo] = useState<Difficulty>(3);
  const [emCombate, setEmCombate] = useState(false);
  const [cenario, setCenario] = useState(false); // "Mundo Devastado" ligado/desligado (mestre)
  const [trunfos, setTrunfos] = useState(0);
  const [estorvos, setEstorvos] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [ficha, setFicha] = useState<Ficha>(FICHA_PADRAO);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [aba, setAba] = useState<"rolar" | "magia" | "ficha" | "veiculos" | "mesa">("rolar");
  // A MINHA rolagem atual (editável): fonte síncrona local, independente do log
  // (que só atualiza após o eco do broadcast). Evita perder a janela de edição
  // quando outro jogador rola, e evita duplo-débito em cliques rápidos.
  const [minhaEntrada, setMinhaEntrada] = useState<EntradaRolagem | null>(null);
  // Karma "em preparação" (ainda não confirmado): o jogador escolhe quanto e clica OK.
  const [karmaStage, setKarmaStage] = useState(0);
  const [karmaCritStage, setKarmaCritStage] = useState(0);
  const [rolando, setRolando] = useState(false); // animação de dados girando

  const jogadorRef = useRef(jogador);
  jogadorRef.current = jogador;
  const alvoRef = useRef(alvo);
  alvoRef.current = alvo;
  const combateRef = useRef(emCombate);
  combateRef.current = emCombate;
  const cenarioRef = useRef(cenario);
  cenarioRef.current = cenario;
  const fichaRef = useRef(ficha);
  fichaRef.current = ficha;
  const veiculosRef = useRef(veiculos);
  veiculosRef.current = veiculos;
  const ultimoVeiculosRef = useRef(""); // eco da própria gravação (igual à ficha)
  const salvarVeiculosTimer = useRef<number | null>(null);
  const minhaRef = useRef(minhaEntrada);
  minhaRef.current = minhaEntrada;
  const salvarTimer = useRef<number | null>(null);
  const animTimer = useRef<number | null>(null);
  // JSON da última versão que ESTE cliente salvou — usado para ignorar o "eco"
  // da própria gravação e só aplicar mudanças externas (ex.: o mestre deu Karma).
  const ultimoSalvoRef = useRef<string>("");

  const ehMestre = jogador.papel === "GM";

  useEffect(() => {
    // IMPORTANTE: as assinaturas do OBR (onChange/onMetadataChange/broadcast) só
    // podem ser registradas DEPOIS do OBR estar pronto, senão o SDK lança
    // "Unable to send message: not ready". Por isso tudo vai dentro de quandoPronto.
    const cancelamentos: Array<() => void> = [];
    quandoPronto(() => {
      obterJogador().then(setJogador);
      obterAlvo().then(setAlvo);
      obterCombate().then(setEmCombate);
      obterCenario().then(setCenario);
      obterFicha().then((f) => {
        fichaRef.current = f;
        ultimoSalvoRef.current = JSON.stringify(f);
        setFicha(f);
      });
      obterVeiculos().then((l) => {
        veiculosRef.current = l;
        ultimoVeiculosRef.current = JSON.stringify(l);
        setVeiculos(l);
      });
      cancelamentos.push(aoMudarJogador(setJogador));
      cancelamentos.push(aoMudarAlvo(setAlvo));
      cancelamentos.push(aoMudarCombate(setEmCombate));
      cancelamentos.push(aoMudarCenario(setCenario));
      cancelamentos.push(
        aoMudarVeiculos((l) => {
          const j = JSON.stringify(l);
          if (j === ultimoVeiculosRef.current) return; // eco da minha própria gravação
          ultimoVeiculosRef.current = j;
          veiculosRef.current = l;
          setVeiculos(l);
        }),
      );
      cancelamentos.push(
        aoMudarMinhaFicha((f) => {
          const j = JSON.stringify(f);
          if (j === ultimoSalvoRef.current) return; // eco da minha própria gravação
          ultimoSalvoRef.current = j;
          fichaRef.current = f;
          setFicha(f);
        }),
      );
      cancelamentos.push(
        aoReceberRolagem((entry) => {
          setLog((atual) => {
            const i = atual.findIndex((e) => e.id === entry.id);
            if (i >= 0) {
              const copia = atual.slice();
              copia[i] = entry; // atualização (Karma / crítico)
              return copia;
            }
            return [entry, ...atual].slice(0, 30);
          });
        }),
      );
    });
    return () => cancelamentos.forEach((c) => c());
  }, []);

  // Se o cenário for desligado, a aba Veículos deixa de existir: volta ao Rolar.
  useEffect(() => {
    if (!cenario && aba === "veiculos") setAba("rolar");
  }, [cenario, aba]);

  /** Aplica uma mudança na minha rolagem (síncrono no ref) e transmite (mesma id => substitui em todos). */
  function aplicarMinha(mut: (e: EntradaRolagem) => EntradaRolagem) {
    const atual = minhaRef.current;
    if (!atual) return;
    const nova = mut(atual);
    minhaRef.current = nova;
    setMinhaEntrada(nova);
    enviarRolagem(nova);
  }

  /** Registra uma mágica/pergaminho/milagre no histórico compartilhado (mesma id => atualiza). */
  function registrarMagia(m: {
    id: string;
    modo: EntradaMagia["modo"];
    dados: number[];
    oposicao: number[];
    texto: string;
    desfecho: EntradaMagia["desfecho"];
  }) {
    const entry: EntradaMagia = {
      tipo: "magia",
      id: m.id,
      autor: jogadorRef.current.nome,
      cor: jogadorRef.current.cor,
      modo: m.modo,
      dados: m.dados,
      oposicao: m.oposicao,
      texto: m.texto,
      desfecho: m.desfecho,
      timestamp: Date.now(),
    };
    enviarRolagem(entry);
  }

  /** Atualiza a ficha (fonte da verdade das mecânicas) e persiste com debounce.
   *  Aceita um patch objeto ou uma função do estado atual (leitura síncrona via ref,
   *  evitando valores defasados em cliques rápidos). */
  function atualizarFicha(patch: Partial<Ficha> | ((f: Ficha) => Partial<Ficha>)) {
    const base = fichaRef.current;
    const p = typeof patch === "function" ? patch(base) : patch;
    const nova = { ...base, ...p };
    fichaRef.current = nova;
    setFicha(nova);
    if (salvarTimer.current) clearTimeout(salvarTimer.current);
    salvarTimer.current = window.setTimeout(() => {
      ultimoSalvoRef.current = JSON.stringify(nova);
      salvarFicha(nova);
    }, 400);
  }

  /** Atualiza a lista de veículos (estado imediato) e persiste com debounce (igual à ficha). */
  function atualizarVeiculos(lista: Veiculo[]) {
    veiculosRef.current = lista;
    setVeiculos(lista);
    if (salvarVeiculosTimer.current) clearTimeout(salvarVeiculosTimer.current);
    salvarVeiculosTimer.current = window.setTimeout(() => {
      ultimoVeiculosRef.current = JSON.stringify(lista);
      salvarVeiculos(lista);
    }, 300);
  }

  /** Reivindica +1 Karma pela falha. Só se ainda NÃO resgatou a jogada (Karma ou Dado Heroico). */
  function ganharKarmaFalha() {
    const e = minhaRef.current;
    if (!e || e.karmaGanho || e.karma > 0 || e.heroicoUsado) return;
    atualizarFicha({ karma: fichaRef.current.karma + 1 });
    aplicarMinha((x) => ({ ...x, karmaGanho: true }));
  }

  /** Dispara a animação de dados girando por ~0,7s. */
  function animarRolagem() {
    setRolando(true);
    if (animTimer.current) clearTimeout(animTimer.current);
    animTimer.current = window.setTimeout(() => setRolando(false), 700);
  }

  function handleRolar() {
    animarRolagem();
    const rolagem = rolar({ alvo: alvoRef.current, trunfos, estorvos });
    const entry: EntradaRolagem = {
      tipo: "rolagem",
      id: crypto.randomUUID(),
      autor: jogadorRef.current.nome,
      cor: jogadorRef.current.cor,
      rolagem,
      karma: 0,
      criticos: [],
      combate: combateRef.current,
      timestamp: Date.now(),
    };
    minhaRef.current = entry;
    setMinhaEntrada(entry);
    enviarRolagem(entry);
    setKarmaStage(0);
    setKarmaCritStage(0);
    setTrunfos(0);
    setEstorvos(0);
  }

  /** Confirma (OK) o Karma preparado no dado principal, debitando do pool da ficha. */
  function confirmarKarma() {
    const e = minhaRef.current;
    if (!e) return;
    const delta = karmaStage - e.karma; // quanto sai (ou volta) do pool
    if (delta === 0) return;
    atualizarFicha({ karma: fichaRef.current.karma - delta });
    aplicarMinha((x) => ({ ...x, karma: karmaStage }));
  }

  /** Rola mais um dado de confirmação de crítico. */
  function rolarConfirmacao() {
    if (!minhaRef.current) return;
    setKarmaCritStage(0);
    aplicarMinha((e) => ({
      ...e,
      criticos: [...e.criticos, { natural: rolarUmDado(), karma: 0 }],
    }));
  }

  /** Confirma (OK) o Karma no último dado de confirmação, debitando do pool da ficha. */
  function confirmarKarmaCritico() {
    const e = minhaRef.current;
    if (!e || e.criticos.length === 0) return;
    const anterior = e.criticos[e.criticos.length - 1].karma;
    const delta = karmaCritStage - anterior;
    if (delta === 0) return;
    atualizarFicha({ karma: fichaRef.current.karma - delta });
    aplicarMinha((x) => {
      const cs = x.criticos.slice();
      cs[cs.length - 1] = { ...cs[cs.length - 1], karma: karmaCritStage };
      return { ...x, criticos: cs };
    });
  }

  /** Dado Heroico no dado principal: consome um dado da ficha e re-rola o dado que vale.
   *  Não pode se já reivindicou o Karma da falha (ou-um-ou-outro). */
  function usarHeroicoPrincipal() {
    const e = minhaRef.current;
    if (!e || e.karmaGanho || fichaRef.current.dadosHeroicos <= 0) return;
    animarRolagem();
    atualizarFicha({ dadosHeroicos: fichaRef.current.dadosHeroicos - 1 });
    setKarmaStage(0);
    setKarmaCritStage(0);
    aplicarMinha((x) => {
      const dados = x.rolagem.dados.slice();
      const novo = rolarUmDado();
      dados[x.rolagem.indiceEscolhido] = novo;
      return {
        ...x,
        karma: 0,
        criticos: [],
        heroicoUsado: true,
        rolagem: { ...x.rolagem, dados, natural: novo, umNatural: novo === 1 },
      };
    });
  }

  /** Dado Heroico no último dado de confirmação: consome um dado da ficha e re-rola. */
  function usarHeroicoCritico() {
    if (!minhaRef.current || fichaRef.current.dadosHeroicos <= 0) return;
    atualizarFicha({ dadosHeroicos: fichaRef.current.dadosHeroicos - 1 });
    setKarmaCritStage(0);
    aplicarMinha((e) => {
      if (e.criticos.length === 0) return e;
      const cs = e.criticos.slice();
      cs[cs.length - 1] = { natural: rolarUmDado(), karma: 0 };
      return { ...e, criticos: cs };
    });
  }

  /** Resistência ao Miasma (Mundo Devastado): rola X d6 e salva com qualquer 6. Vai direto ao histórico. */
  function rolarMiasma() {
    const dados = rolarPoolMiasma(fichaRef.current.resistenciaMiasma);
    const entry: EntradaMiasma = {
      tipo: "miasma",
      id: crypto.randomUUID(),
      autor: jogadorRef.current.nome,
      cor: jogadorRef.current.cor,
      dados,
      sucesso: sucessoMiasma(dados),
      timestamp: Date.now(),
    };
    enviarRolagem(entry);
  }

  /** Dado de Poder: adiciona um dado à jogada atual (pega o maior) e debita o pool. */
  function usarDadoPoder() {
    const e = minhaRef.current;
    if (!e || fichaRef.current.dadosPoder <= 0) return;
    animarRolagem();
    atualizarFicha({ dadosPoder: fichaRef.current.dadosPoder - 1 });
    setKarmaStage(0);
    setKarmaCritStage(0);
    aplicarMinha((x) => ({ ...x, rolagem: adicionarDadoPoder(x.rolagem, rolarUmDado()) }));
  }

  const saldo = trunfos - estorvos;
  const ultima = minhaEntrada; // o card de resultado mostra sempre a MINHA rolagem
  const av = ultima ? avaliar(ultima.rolagem, ultima.karma) : null;
  const souDono = !!ultima; // é sempre minha, então sempre editável
  const dificuldadeAtual = DIFICULDADES.find((d) => d.valor === alvo);
  const ultimoCritico = ultima && ultima.criticos.length > 0 ? ultima.criticos.at(-1)! : null;

  return (
    <div className={`app ${cenario ? "cenario-md" : ""}`}>
      <header className="topo">
        <div className="logo">
          EZ<span>D6</span>
        </div>
        <div className="jogador" style={{ borderColor: jogador.cor }}>
          {jogador.nome}
          {ehMestre && <span className="tag-mestre">MESTRE</span>}
        </div>
      </header>

      <nav className="abas">
        <button className={aba === "rolar" ? "ativo" : ""} onClick={() => setAba("rolar")}>
          🎲 Rolar
        </button>
        <button className={aba === "magia" ? "ativo" : ""} onClick={() => setAba("magia")}>
          {cenario ? "🧠 Psíquico" : "🔮 Magia"}
        </button>
        <button className={aba === "ficha" ? "ativo" : ""} onClick={() => setAba("ficha")}>
          📋 Ficha
        </button>
        {cenario && (
          <button className={aba === "veiculos" ? "ativo" : ""} onClick={() => setAba("veiculos")}>
            🚗 Veículos
          </button>
        )}
        {ehMestre && (
          <button className={aba === "mesa" ? "ativo" : ""} onClick={() => setAba("mesa")}>
            👑 Mesa
          </button>
        )}
      </nav>

      {aba === "magia" && (
        <MagiaView ficha={ficha} atualizar={atualizarFicha} logar={registrarMagia} cenario={cenario} />
      )}
      {aba === "ficha" && <FichaView ficha={ficha} atualizar={atualizarFicha} cenario={cenario} />}
      {aba === "veiculos" && cenario && (
        <VeiculoView veiculos={veiculos} setVeiculos={atualizarVeiculos} />
      )}
      {aba === "mesa" && ehMestre && <MesaView />}

      {aba === "rolar" && (
        <>
      <section className="alvo-secao">
        <label>Dificuldade (alvo){!ehMestre && " — definida pelo mestre"}</label>
        {ehMestre ? (
          <div className="alvo-botoes">
            {DIFICULDADES.map((d) => (
              <button
                key={d.valor}
                className={alvo === d.valor ? "ativo" : ""}
                onClick={() => definirAlvo(d.valor)}
                title={d.nome}
              >
                <strong>{d.valor}+</strong>
                <small>{d.nome}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="alvo-fixo">
            <strong>{alvo}+</strong>
            <span>{dificuldadeAtual?.nome}</span>
          </div>
        )}
      </section>

      <section className="combate-secao">
        {ehMestre ? (
          <button
            className={`combate-toggle ${emCombate ? "ativo" : ""}`}
            onClick={() => definirCombate(!emCombate)}
          >
            <span>⚔️ Modo combate</span>
            <span className="combate-estado">{emCombate ? "LIGADO" : "desligado"}</span>
          </button>
        ) : (
          emCombate && <div className="combate-badge">⚔️ Em combate</div>
        )}
        {ehMestre && (
          <small className="combate-dica">
            {emCombate
              ? "Um 6 vira crítico com confirmação de Golpes."
              : "Um 6 é só sucesso garantido (sem Golpes)."}
          </small>
        )}
      </section>

      <section className="cenario-secao">
        {ehMestre ? (
          <button
            className={`combate-toggle cenario-toggle ${cenario ? "ativo" : ""}`}
            onClick={() => definirCenario(!cenario)}
          >
            <span>🌍 Cenário: Mundo Devastado</span>
            <span className="combate-estado">{cenario ? "LIGADO" : "desligado"}</span>
          </button>
        ) : (
          cenario && <div className="combate-badge cenario-badge">🌫️ Mundo Devastado</div>
        )}
      </section>

      {cenario && (
        <section className="cobertura">
          <label>🎯 Cobertura — dificuldade para acertar quem se protege</label>
          <div className="cobertura-niveis">
            {COBERTURA.map((c) =>
              ehMestre ? (
                <button
                  key={c.valor}
                  className={alvo === c.valor ? "ativo" : ""}
                  onClick={() => definirAlvo(c.valor)}
                  title={`Definir dificuldade ${c.valor}+`}
                >
                  <strong>{c.valor}+</strong>
                  <small>{c.nome}</small>
                </button>
              ) : (
                <div key={c.valor} className="cobertura-item">
                  <strong>{c.valor}+</strong>
                  <small>{c.nome}</small>
                </div>
              ),
            )}
          </div>
          <small className="combate-dica">Explosões e armas incendiárias ignoram cobertura.</small>
        </section>
      )}

      {cenario && (
        <section className="pool-miasma">
          <button className="rolar-miasma" onClick={rolarMiasma}>
            🟢 Resistência ao Miasma ({ficha.resistenciaMiasma}D6)
          </button>
          <small className="combate-dica">Salva com um 6 — o resultado vai ao histórico. Ajuste os dados na Ficha.</small>
        </section>
      )}

      <section className="modificadores modificadores-2">
        <Stepper rotulo="Trunfo" valor={trunfos} setValor={setTrunfos} cor="#22c55e" />
        <Stepper rotulo="Estorvo" valor={estorvos} setValor={setEstorvos} cor="#ef4444" />
      </section>

      <p className="dica-saldo">
        {saldo > 0 && `Rola ${1 + saldo} dados, pega o maior 🟢`}
        {saldo < 0 && `Rola ${1 - saldo} dados, pega o menor 🔴`}
        {saldo === 0 && "Rola 1 dado"}
        <br />
        <small>Karma é gasto depois de ver o dado.</small>
      </p>

      <button className="rolar" onClick={handleRolar}>
        🎲 ROLAR
      </button>

      <div className="heroico-status">
        💠 Karma: <b className="karma-pool">{ficha.karma}</b> · Dado Heroico:{" "}
        {ficha.dadosHeroicos > 0 ? (
          <span className="disp">✨ {ficha.dadosHeroicos}</span>
        ) : (
          <span className="usado">0 (recupere na Ficha)</span>
        )}
        {cenario && (
          <>
            {" · "}🔋 Poder: <b className="karma-pool">{ficha.dadosPoder}</b>
          </>
        )}
      </div>

      {ultima && av && (
        <section className={`resultado desfecho-${av.desfecho}`}>
          <div className="dados-linha">
            {ultima.rolagem.dados.map((v, i) => (
              <Dado
                key={i}
                valor={v}
                escolhido={i === ultima.rolagem.indiceEscolhido}
                grande
                rolando={rolando}
              />
            ))}
          </div>
          <div className="desfecho-texto">
            {textoDesfecho(av.desfecho, ultima.rolagem.umNatural, ultima.combate)}
          </div>
          {av.karmaAplicado > 0 && (
            <div className="detalhe">
              {ultima.rolagem.natural} + {av.karmaAplicado} Karma = {av.valorFinal}
            </div>
          )}

          {/* Karma pós-rolagem no dado principal (escolhe a quantidade e confirma com OK) */}
          {souDono && ultima.rolagem.umNatural && (
            <div className="detalhe aviso-um">1 natural — falha. O Karma não ajuda aqui.</div>
          )}
          {/* Ganhar Karma pela falha — só se ainda NÃO resgatou (Karma/Dado Heroico). Ou-um-ou-outro. */}
          {souDono &&
            av.desfecho === "falha" &&
            !ultima.karmaGanho &&
            ultima.karma === 0 &&
            !ultima.heroicoUsado && (
              <button className="karma-ganho-btn" onClick={ganharKarmaFalha}>
                💠 Ganhar 1 Karma pela falha
              </button>
            )}
          {/* Dado Heroico: bloqueado se já reivindicou o Karma da falha */}
          {souDono &&
            !ultima.karmaGanho &&
            ficha.dadosHeroicos > 0 &&
            ultima.karma === 0 &&
            av.desfecho !== "critico" && (
              <button
                className={`heroico-btn ${ultima.rolagem.umNatural ? "destaque" : ""}`}
                onClick={usarHeroicoPrincipal}
              >
                ✨{" "}
                {ultima.rolagem.umNatural
                  ? "Usar Dado Heroico (re-rolar o 1)"
                  : "Dado Heroico (re-rolar)"}
              </button>
            )}
          {/* Dado de Poder (Mundo Devastado): adiciona um dado à jogada, pega o maior */}
          {souDono && cenario && ficha.dadosPoder > 0 && av.desfecho !== "critico" && (
            <button className="heroico-btn poder-btn" onClick={usarDadoPoder}>
              🔋 Dado de Poder (+1 dado)
            </button>
          )}
          {souDono &&
            !ultima.karmaGanho &&
            !ultima.rolagem.umNatural &&
            av.valorFinal < 6 &&
            (ficha.karma > 0 || ultima.karma > 0) && (
            <div className="karma-stage">
              <div className="karma-controle">
                <span>Gastar Karma:</span>
                <div className="karma-botoes">
                  <button onClick={() => setKarmaStage(Math.max(0, karmaStage - 1))} disabled={karmaStage === 0}>
                    −
                  </button>
                  <b className="karma-num">{karmaStage}</b>
                  <button
                    onClick={() => setKarmaStage(karmaStage + 1)}
                    disabled={
                      ultima.rolagem.natural + karmaStage >= 6 ||
                      karmaStage >= ultima.karma + ficha.karma
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              {karmaStage !== ultima.karma && (
                <div className="karma-previa">
                  <span>
                    Ficaria {ultima.rolagem.natural} + {karmaStage} ={" "}
                    {Math.min(6, ultima.rolagem.natural + karmaStage)} →{" "}
                    <b>{textoDesfecho(avaliar(ultima.rolagem, karmaStage).desfecho, false)}</b>
                  </span>
                  <button className="ok-karma" onClick={confirmarKarma}>
                    OK
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Confirmação de crítico — só em combate (pág. 12) */}
          {av.desfecho === "critico" && ultima.combate && (
            <div className="critico-area">
              {ultima.criticos.length > 0 && (
                <div className="dados-linha criticos">
                  {ultima.criticos.map((d, i) => (
                    <div key={i} className="crit-dado">
                      <Dado valor={d.natural} escolhido={valorCritico(d) >= 6} />
                      {d.karma > 0 && <span className="crit-karma">+{d.karma}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="golpes">⚔️ {golpesDeCritico(ultima.criticos)} Golpes</div>

              {souDono && (
                <div className="critico-controles">
                  {critAberto(ultima.criticos) ? (
                    <button className="confirmar-critico" onClick={rolarConfirmacao}>
                      🎲 Confirmar crítico!
                    </button>
                  ) : (
                    ultimoCritico && (
                      <div className="karma-stage">
                        <div className="detalhe">
                          Saiu {ultimoCritico.natural}. Gaste Karma para chegar a 6 e continuar — ou
                          pare por aqui.
                        </div>
                        <div className="karma-controle">
                          <span>Karma neste dado:</span>
                          <div className="karma-botoes">
                            <button
                              onClick={() => setKarmaCritStage(Math.max(0, karmaCritStage - 1))}
                              disabled={karmaCritStage === 0}
                            >
                              −
                            </button>
                            <b className="karma-num">{karmaCritStage}</b>
                            <button
                              onClick={() => setKarmaCritStage(karmaCritStage + 1)}
                              disabled={
                                ultimoCritico.natural + karmaCritStage >= 6 ||
                                karmaCritStage >= ultimoCritico.karma + ficha.karma
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {karmaCritStage !== ultimoCritico.karma && (
                          <div className="karma-previa">
                            <span>
                              Ficaria {ultimoCritico.natural} + {karmaCritStage} ={" "}
                              {Math.min(6, ultimoCritico.natural + karmaCritStage)}
                            </span>
                            <button className="ok-karma" onClick={confirmarKarmaCritico}>
                              OK
                            </button>
                          </div>
                        )}
                        {ficha.dadosHeroicos > 0 && ultimoCritico.karma === 0 && (
                          <button
                            className={`heroico-btn ${ultimoCritico.natural === 1 ? "destaque" : ""}`}
                            onClick={usarHeroicoCritico}
                          >
                            ✨ Dado Heroico (re-rolar este dado)
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {cenario && ehMestre && <DesafioDados />}
      {cenario && ehMestre && <DadosVilania />}

      <section className="historico">
        <h2>Histórico</h2>
        {log.length === 0 && <p className="vazio">Nenhuma rolagem ainda. Aperte ROLAR!</p>}
        <ul>
          {log.map((entry) => {
            if (entry.tipo === "miasma") {
              return (
                <li key={entry.id} className={`desfecho-${entry.sucesso ? "sucesso" : "falha"}`}>
                  <span className="autor" style={{ color: entry.cor }}>
                    {entry.autor}
                  </span>
                  <span className="mini-dados">
                    🟢{" "}
                    {entry.dados.map((v, i) => (
                      <b key={i} className={v === 6 ? "vale" : ""}>
                        {v}
                      </b>
                    ))}
                  </span>
                  <span className="alvo-mini">miasma</span>
                  <span className="desfecho-mini">
                    {entry.sucesso ? "Resistiu ao miasma" : "Sucumbiu (sem 6)"}
                  </span>
                </li>
              );
            }
            if (entry.tipo === "magia") {
              const icone =
                entry.modo === "milagre" ? "🙏" : entry.modo === "pergaminho" ? "📜" : "🔮";
              return (
                <li key={entry.id} className={`desfecho-${entry.desfecho}`}>
                  <span className="autor" style={{ color: entry.cor }}>
                    {entry.autor}
                  </span>
                  <span className="mini-dados">
                    {icone} {entry.dados.join(", ")}
                    <i className="mini-karma"> vs {entry.oposicao.join(", ")}</i>
                  </span>
                  <span className="alvo-mini" />
                  <span className="desfecho-mini">{entry.texto}</span>
                </li>
              );
            }
            const a = avaliar(entry.rolagem, entry.karma);
            return (
              <li key={entry.id} className={`desfecho-${a.desfecho}`}>
                <span className="autor" style={{ color: entry.cor }}>
                  {entry.autor}
                </span>
                <span className="mini-dados">
                  {entry.rolagem.dados.map((v, i) => (
                    <b key={i} className={i === entry.rolagem.indiceEscolhido ? "vale" : ""}>
                      {v}
                    </b>
                  ))}
                  {entry.karma > 0 && <i className="mini-karma">+{entry.karma}k</i>}
                </span>
                <span className="alvo-mini">alvo {entry.rolagem.alvo}+</span>
                <span className="desfecho-mini">
                  {textoDesfecho(a.desfecho, entry.rolagem.umNatural, entry.combate)}
                  {a.desfecho === "critico" &&
                    entry.combate &&
                    ` · ${golpesDeCritico(entry.criticos)} Golpes`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
        </>
      )}

      {!dentroDoOwlbear && (
        <footer className="aviso-teste">
          Modo de teste (fora do Owlbear, tratado como Mestre). Dentro de uma sala, o mestre define a
          dificuldade e as rolagens aparecem para todos.
        </footer>
      )}
    </div>
  );
}
