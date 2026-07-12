import { useEffect, useRef, useState } from "react";
import { aoMudarFichas, obterTodasFichas, quandoPronto, salvarFichaDe } from "./obr";
import type { FichaSalva } from "./obr";
import { textoArmadura } from "./ficha";
import type { Ficha } from "./ficha";
import "./MesaView.css";

function BarraVida({ atual, max }: { atual: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (atual / max) * 100)) : 0;
  return (
    <div className="barra-vida" title={`Vida ${atual}/${max}`}>
      <div className="barra-preench" style={{ width: `${pct}%` }} />
      <span>
        {atual}/{max}
      </span>
    </div>
  );
}

export default function MesaView() {
  const [fichas, setFichas] = useState<FichaSalva[]>([]);
  const fichasRef = useRef(fichas);
  fichasRef.current = fichas;

  useEffect(() => {
    quandoPronto(() => {
      obterTodasFichas().then(setFichas);
    });
    return aoMudarFichas(setFichas);
  }, []);

  /** Ajusta a ficha de um jogador (síncrono no ref, à prova de duplo-clique) e grava. */
  function ajustar(chave: string, mut: (f: Ficha) => Partial<Ficha>) {
    const item = fichasRef.current.find((x) => x.chave === chave);
    if (!item) return;
    const nova = { ...item.ficha, ...mut(item.ficha) };
    const novas = fichasRef.current.map((x) => (x.chave === chave ? { chave, ficha: nova } : x));
    fichasRef.current = novas;
    setFichas(novas);
    salvarFichaDe(chave, nova);
  }

  const comNome = fichas.filter((f) => f.ficha.nome.trim() || f.ficha.especie.trim());

  return (
    <div className="mesa">
      <p className="mesa-dica">Fichas dos jogadores nesta sala. Você pode ajustar como mestre.</p>
      {comNome.length === 0 && (
        <p className="vazio">Nenhuma ficha preenchida ainda. Peça aos jogadores para abrir a aba Ficha.</p>
      )}
      {comNome.map((f) => {
        const p = f.ficha;
        const c = f.chave;
        return (
          <div key={c} className="jogador-card">
            <div className="jogador-cab">
              <strong>{p.nome || "Sem nome"}</strong>
              <span className="jogador-sub">{[p.especie, p.trilha].filter(Boolean).join(" · ")}</span>
            </div>

            <div className="jogador-mec">
              <div className="jm-item vida">
                <span className="jm-rot">❤️ Vida</span>
                <BarraVida atual={p.vidaAtual} max={p.vidaMax} />
                <div className="jm-botoes">
                  <button
                    onClick={() => ajustar(c, (f) => ({ vidaAtual: Math.max(0, f.vidaAtual - 1) }))}
                  >
                    − Golpe
                  </button>
                  <button
                    onClick={() =>
                      ajustar(c, (f) => ({ vidaAtual: Math.min(f.vidaMax, f.vidaAtual + 1) }))
                    }
                  >
                    + Cura
                  </button>
                </div>
              </div>

              <div className="jm-item">
                <span className="jm-rot">💠 Karma</span>
                <b>{p.karma}</b>
                <div className="jm-botoes">
                  <button onClick={() => ajustar(c, (f) => ({ karma: Math.max(0, f.karma - 1) }))}>
                    −
                  </button>
                  <button onClick={() => ajustar(c, (f) => ({ karma: f.karma + 1 }))}>+</button>
                </div>
              </div>

              <div className="jm-item">
                <span className="jm-rot">✨ Dados Heroicos</span>
                <b>{p.dadosHeroicos}</b>
                <div className="jm-botoes">
                  <button
                    onClick={() =>
                      ajustar(c, (f) => ({ dadosHeroicos: Math.max(0, f.dadosHeroicos - 1) }))
                    }
                  >
                    −
                  </button>
                  <button onClick={() => ajustar(c, (f) => ({ dadosHeroicos: f.dadosHeroicos + 1 }))}>
                    +
                  </button>
                </div>
              </div>

              <div className="jm-item">
                <span className="jm-rot">🛡️ Armadura</span>
                <b>{textoArmadura(p.armadura)}</b>
              </div>
            </div>

            <button
              className="descanso-btn"
              onClick={() => ajustar(c, (f) => ({ vidaAtual: f.vidaMax }))}
              disabled={p.vidaAtual >= p.vidaMax}
            >
              🌙 Descanso (recupera todos os Golpes)
            </button>

            {(p.armas || p.inclinacoes || p.aspectos) && (
              <div className="jogador-notas">
                {p.armas && (
                  <div>
                    <span className="jn-rot">Armas:</span> {p.armas}
                  </div>
                )}
                {p.inclinacoes && (
                  <div>
                    <span className="jn-rot">Inclinações:</span> {p.inclinacoes}
                  </div>
                )}
                {p.aspectos && (
                  <div>
                    <span className="jn-rot">Aspectos:</span> {p.aspectos}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
