import { useEffect, useRef, useState } from "react";
import { rolarUmDado } from "./ezd6";
import {
  avaliarConjuracao,
  avaliarMilagre,
  rolarDadosMagia,
  rolarPergaminho,
  textoConjuracao,
  textoMilagre,
} from "./magia";
import type { NivelPoder } from "./magia";
import type { Ficha } from "./ficha";
import "./MagiaView.css";

interface Props {
  ficha: Ficha;
  atualizar: (patch: Partial<Ficha> | ((f: Ficha) => Partial<Ficha>)) => void;
  logar: (m: {
    id: string;
    modo: "feitico" | "pergaminho" | "milagre";
    dados: number[];
    oposicao: number[];
    texto: string;
    desfecho: "sucesso" | "falha" | "critico";
  }) => void;
}

type Modo = "feitico" | "pergaminho" | "milagre";
interface Resultado {
  dados: number[]; // dados do conjurador/devoto
  oposicao: number[]; // resistência (feitiço/pergaminho) ou indiferença (milagre)
  refluxo: boolean;
}

const MODOS: { id: Modo; nome: string }[] = [
  { id: "feitico", nome: "🔮 Feitiço" },
  { id: "pergaminho", nome: "📜 Pergaminho" },
  { id: "milagre", nome: "🙏 Milagre" },
];

export default function MagiaView({ ficha, atualizar, logar }: Props) {
  const [modo, setModo] = useState<Modo>("feitico");
  const [np, setNp] = useState<NivelPoder>(1);
  const [oposicaoDados, setOposicaoDados] = useState(1); // resistência ou indiferença
  const [alvos, setAlvos] = useState(1);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const resultadoRef = useRef(resultado);
  resultadoRef.current = resultado;
  const idRef = useRef(""); // id do lançamento atual (mantido nas atualizações)

  function definirResultado(r: Resultado | null) {
    resultadoRef.current = r;
    setResultado(r);
  }

  // Registra no histórico compartilhado sempre que o resultado muda (mesma id => atualiza).
  useEffect(() => {
    if (!resultado) return;
    let texto = "";
    let desfecho: "sucesso" | "falha" | "critico";
    if (modo === "milagre") {
      const a = avaliarMilagre(resultado.dados, resultado.oposicao);
      texto = textoMilagre(a);
      desfecho = a.desfecho === "falha" ? "falha" : a.desfecho === "dissipado" ? "critico" : "sucesso";
    } else {
      const a = avaliarConjuracao(resultado.dados, resultado.oposicao, resultado.refluxo);
      texto = textoConjuracao(a);
      desfecho = a.desfecho === "falha" ? "falha" : a.desfecho === "falha-1" ? "critico" : "sucesso";
    }
    logar({ id: idRef.current, modo, dados: resultado.dados, oposicao: resultado.oposicao, texto, desfecho });
  }, [resultado, modo]);

  const ehMilagre = modo === "milagre";
  const ehPergaminho = modo === "pergaminho";
  const rotuloOposicao = ehMilagre ? "Indiferença" : "Resistência";
  const usaAlvos = !ehMilagre;
  const oposicaoTotal = oposicaoDados + (usaAlvos ? alvos - 1 : 0);

  function lancar() {
    idRef.current = crypto.randomUUID();
    const dados = ehPergaminho ? rolarPergaminho() : rolarDadosMagia(np);
    definirResultado({ dados, oposicao: rolarDadosMagia(oposicaoTotal), refluxo: false });
  }

  function aceitarRefluxo() {
    const r = resultadoRef.current;
    if (!r || r.refluxo) return;
    const av = avaliarConjuracao(r.dados, r.oposicao, false);
    if (av.desfecho !== "falha-1") return;
    atualizar((f) => ({ vidaAtual: Math.max(0, f.vidaAtual - av.golpesRefluxo) }));
    definirResultado({ ...r, refluxo: true });
  }

  function oferenda() {
    // Devoção: re-rola todos os dados do milagre (1×/dia, com aval do IC — não travado aqui).
    const r = resultadoRef.current;
    if (!r) return;
    definirResultado({ ...r, dados: rolarDadosMagia(r.dados.length), refluxo: false });
  }

  function heroicoReroll(indice: number) {
    const r = resultadoRef.current;
    if (!r || ficha.dadosHeroicos <= 0 || ehPergaminho) return;
    atualizar((f) => ({ dadosHeroicos: Math.max(0, f.dadosHeroicos - 1) }));
    const dados = r.dados.slice();
    dados[indice] = rolarUmDado();
    definirResultado({ ...r, dados, refluxo: false });
  }

  const av = resultado && !ehMilagre ? avaliarConjuracao(resultado.dados, resultado.oposicao, resultado.refluxo) : null;
  const avM = resultado && ehMilagre ? avaliarMilagre(resultado.dados, resultado.oposicao) : null;
  const maiorOposicao = av?.maiorResistencia ?? avM?.maiorIndiferenca ?? 0;
  const maiorMeu = av?.maiorNp ?? avM?.maiorDado ?? 0;
  const desfecho = av?.desfecho ?? avM?.desfecho ?? "";
  const classe = desfecho === "falha" ? "mag-falha" : desfecho.startsWith("falha") || desfecho === "dissipado" ? "mag-aviso" : "mag-sucesso";
  const texto = av ? textoConjuracao(av) : avM ? textoMilagre(avM) : "";
  const tapavel = ficha.dadosHeroicos > 0 && !ehPergaminho;

  return (
    <div className="magia">
      <div className="modo-botoes">
        {MODOS.map((m) => (
          <button
            key={m.id}
            className={modo === m.id ? "ativo" : ""}
            onClick={() => {
              setModo(m.id);
              definirResultado(null);
            }}
          >
            {m.nome}
          </button>
        ))}
      </div>

      <p className="magia-dica">
        {ehMilagre
          ? "Milagre: o maior dado precisa alcançar a maior Indiferença. Qualquer 1 dissipa. Karma não; Dado Heroico sim."
          : ehPergaminho
            ? "Pergaminho: NP fixo 2D6 (re-rola 1s), consumido no uso. Sem Refluxo."
            : "Feitiço: o maior do NP precisa alcançar a maior Resistência. Karma não; Dado Heroico sim."}
      </p>

      <div className="magia-controles">
        {!ehPergaminho && (
          <div className="magia-campo">
            <span>{ehMilagre ? "Urgência da prece" : "Nível de Poder"}</span>
            <div className="np-botoes">
              {([1, 2, 3] as NivelPoder[]).map((n) => (
                <button key={n} className={np === n ? "ativo" : ""} onClick={() => setNp(n)}>
                  {n}D6
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="magia-steppers">
          <div className="magia-campo">
            <span>{rotuloOposicao} (dados)</span>
            <div className="mini-stepper">
              <button onClick={() => setOposicaoDados(Math.max(1, oposicaoDados - 1))}>−</button>
              <b>{oposicaoDados}</b>
              <button onClick={() => setOposicaoDados(Math.min(6, oposicaoDados + 1))}>+</button>
            </div>
          </div>
          {usaAlvos && (
            <div className="magia-campo">
              <span>Alvos</span>
              <div className="mini-stepper">
                <button onClick={() => setAlvos(Math.max(1, alvos - 1))}>−</button>
                <b>{alvos}</b>
                <button onClick={() => setAlvos(Math.min(6, alvos + 1))}>+</button>
              </div>
            </div>
          )}
        </div>
        {usaAlvos && alvos > 1 && (
          <small className="magia-nota">
            {alvos} alvos → {oposicaoTotal} dados de resistência (coletivo: todos ou nenhum).
          </small>
        )}
      </div>

      <button className={`conjurar ${ehMilagre ? "milagre" : ""}`} onClick={lancar}>
        {ehMilagre ? "🙏 CLAMAR MILAGRE" : ehPergaminho ? "📜 USAR PERGAMINHO" : "🔮 CONJURAR"}
      </button>

      {resultado && (
        <section className={`magia-res ${classe}`}>
          <div className="mag-linha">
            <span className="mag-rot">{rotuloOposicao}</span>
            <div className="mag-dados">
              {resultado.oposicao.map((d, i) => (
                <b key={i} className={d === maiorOposicao ? "alto" : ""}>
                  {d}
                </b>
              ))}
            </div>
          </div>

          <div className="mag-linha">
            <span className="mag-rot">{ehMilagre ? "Sua prece" : "Seu NP"}</span>
            <div className="mag-dados">
              {resultado.dados.map((d, i) => (
                <button
                  key={i}
                  className={`np-dado ${d === maiorMeu ? "alto" : ""} ${d === 1 ? "um" : ""}`}
                  disabled={!tapavel}
                  onClick={() => heroicoReroll(i)}
                  title={tapavel ? "Re-rolar com Dado Heroico" : ""}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {tapavel && (
            <div className="mag-hint">✨ Toque um dado seu para re-rolar (Dado Heroico: {ficha.dadosHeroicos})</div>
          )}

          <div className="mag-desfecho">{texto}</div>

          {av?.desfecho === "falha-1" && (
            <button className="refluxo-btn" onClick={aceitarRefluxo}>
              🩸 Refluxo Arcano — sacrificar {av.golpesRefluxo} Golpe{av.golpesRefluxo > 1 ? "s" : ""}
            </button>
          )}
          {avM?.desfecho === "dissipado" && (
            <button className="oferenda-btn" onClick={oferenda}>
              🎁 Oferenda — re-rolar tudo (1×/dia, com aval do IC)
            </button>
          )}
        </section>
      )}
    </div>
  );
}
