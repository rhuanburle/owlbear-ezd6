import { useState } from "react";
import {
  ORDEM_PORTE,
  PORTES,
  avaliarTM,
  resultadoSUE,
  rolarColisao,
  rolarUmDado,
  salvouEstrutural,
  textoColisao,
  textoSUE,
  veiculoPadrao,
} from "./veiculo";
import type { Porte, ResultadoTM, Veiculo } from "./veiculo";
import "./VeiculoView.css";

interface Props {
  veiculos: Veiculo[];
  setVeiculos: (lista: Veiculo[]) => void;
}

// Ação de veículo em andamento (mostrada sob o veículo correspondente).
type Acao =
  | { vid: string; tipo: "estrutural"; natural: number }
  | { vid: string; tipo: "sue"; natural: number }
  | { vid: string; tipo: "tm"; res: ResultadoTM; dif: number }
  | { vid: string; tipo: "colisao"; dados: number[]; total: number };

function novoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `veh-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export default function VeiculoView({ veiculos, setVeiculos }: Props) {
  const [acao, setAcao] = useState<Acao | null>(null);
  const [tmDif, setTmDif] = useState(3);

  function editar(vid: string, patch: Partial<Veiculo>) {
    setVeiculos(veiculos.map((v) => (v.id === vid ? { ...v, ...patch } : v)));
  }
  function trocarPorte(vid: string, porte: Porte) {
    const p = PORTES[porte];
    editar(vid, { porte, golpesMax: p.golpes, golpesAtual: p.golpes });
  }
  function sofrer(vid: string, n: number) {
    const v = veiculos.find((x) => x.id === vid);
    if (!v) return;
    editar(vid, { golpesAtual: Math.max(0, v.golpesAtual - n) });
  }

  return (
    <div className="veiculos">
      <div className="veiculos-topo">
        <h2>🚗 Veículos</h2>
        <button className="veh-add" onClick={() => setVeiculos([...veiculos, veiculoPadrao(novoId())])}>
          ➕ Adicionar
        </button>
      </div>

      {veiculos.length === 0 && (
        <p className="veh-vazio">Nenhum veículo. Adicione para rastrear Golpes, colisões e manobras.</p>
      )}

      {veiculos.map((v) => {
        const preset = PORTES[v.porte];
        const destruido = v.golpesAtual <= 0;
        const a = acao && acao.vid === v.id ? acao : null;
        return (
          <section key={v.id} className={`veh-card ${destruido ? "destruido" : ""}`}>
            <div className="veh-cab">
              <input
                className="veh-nome"
                value={v.nome}
                placeholder="Nome do veículo"
                onChange={(e) => editar(v.id, { nome: e.target.value })}
              />
              <button className="veh-remover" onClick={() => setVeiculos(veiculos.filter((x) => x.id !== v.id))}>
                🗑️
              </button>
            </div>

            <div className="veh-linha">
              <label className="veh-campo">
                <span>Porte</span>
                <select value={v.porte} onChange={(e) => trocarPorte(v.id, e.target.value as Porte)}>
                  {ORDEM_PORTE.map((p) => (
                    <option key={p} value={p}>
                      {PORTES[p].nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className="veh-stats">
                <span>🛡️ Estrutural {preset.salvaguarda}+</span>
                <span>💥 Colisão {textoColisao(v.porte)}</span>
              </div>
            </div>

            <div className="veh-golpes">
              <span className="veh-golpes-rot">Golpes</span>
              <div className="veh-controle">
                <button onClick={() => sofrer(v.id, 1)}>−</button>
                <span className={`veh-valor ${destruido ? "zero" : ""}`}>
                  {v.golpesAtual}
                  <small>/{v.golpesMax}</small>
                </span>
                <button
                  onClick={() => editar(v.id, { golpesAtual: Math.min(v.golpesMax, v.golpesAtual + 1) })}
                >
                  +
                </button>
              </div>
              {destruido && <span className="veh-destruido-tag">🔥 Destruído</span>}
            </div>

            <div className="veh-acoes">
              <button onClick={() => setAcao({ vid: v.id, tipo: "estrutural", natural: rolarUmDado() })}>
                🛡️ Salvaguarda Estrutural
              </button>
              <button onClick={() => setAcao({ vid: v.id, tipo: "sue", natural: rolarUmDado() })}>
                🎲 SUE (último esforço)
              </button>
              <button
                onClick={() => {
                  const natural = rolarUmDado();
                  setAcao({ vid: v.id, tipo: "tm", res: avaliarTM(natural, tmDif), dif: tmDif });
                }}
              >
                🔧 Teste de Manobra
              </button>
              <button onClick={() => setAcao({ vid: v.id, tipo: "colisao", ...rolarColisao(v.porte) })}>
                💥 Dano de Colisão
              </button>
            </div>

            <div className="veh-tm-dif">
              <span>Dificuldade da manobra:</span>
              <div className="veh-mini-stepper">
                <button onClick={() => setTmDif(Math.max(2, tmDif - 1))}>−</button>
                <b>{tmDif}+</b>
                <button onClick={() => setTmDif(Math.min(6, tmDif + 1))}>+</button>
              </div>
            </div>

            {a && (
              <div className="veh-resultado">
                {a.tipo === "estrutural" &&
                  (salvouEstrutural(a.natural, v.porte) ? (
                    <div className="veh-ok">🛡️ Rolou {a.natural} — Golpe evitado!</div>
                  ) : (
                    <div className="veh-falha">
                      🎲 Rolou {a.natural} — não salvou.
                      <button className="veh-aplicar" onClick={() => sofrer(v.id, 1)}>
                        💥 Sofrer 1 Golpe
                      </button>
                    </div>
                  ))}

                {a.tipo === "sue" && (
                  <div className={resultadoSUE(a.natural) === "derrapa" ? "veh-ok" : "veh-falha"}>
                    🎲 Rolou {a.natural} — {textoSUE(resultadoSUE(a.natural))}
                  </div>
                )}

                {a.tipo === "tm" &&
                  (a.res.sucesso ? (
                    <div className="veh-ok">🔧 Rolou {a.res.natural} (alvo {a.dif}+) — manobra bem-sucedida!</div>
                  ) : (
                    <div className="veh-falha">
                      🔧 Rolou {a.res.natural} (alvo {a.dif}+) — falha{a.res.critico ? " CRÍTICA" : ""}: veículo
                      sofre {a.res.golpes} Golpe{a.res.golpes > 1 ? "s" : ""}.
                      <button className="veh-aplicar" onClick={() => sofrer(v.id, a.res.golpes)}>
                        Aplicar (tente Salvaguarda Estrutural antes)
                      </button>
                    </div>
                  ))}

                {a.tipo === "colisao" && (
                  <div className="veh-ok">
                    💥 Dano de Colisão: {a.dados.join(" + ")} = <b>{a.total} Golpes</b> no alvo.
                  </div>
                )}
              </div>
            )}

            <textarea
              className="veh-notas"
              value={v.notas}
              placeholder="Modificações e notas (blindagem, estrepes, metralhadora, tunado…)"
              rows={2}
              onChange={(e) => editar(v.id, { notas: e.target.value })}
            />
          </section>
        );
      })}

      <p className="veh-ref">
        <b>Atacar veículo:</b> 3+ devagar · 4+ rápido · 5+ corpo a corpo. Karma não vale em Colisão/SUE — mas
        Dado Heroico e Dado de Poder podem (aplique manualmente re-rolando).
      </p>
    </div>
  );
}
