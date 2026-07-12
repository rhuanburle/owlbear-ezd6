import { useRef, useState } from "react";
import { rolarUmDado } from "./ezd6";
import { PADROES_VIDA, textoArmadura } from "./ficha";
import type { Ficha } from "./ficha";
import "./FichaView.css";

interface Props {
  ficha: Ficha;
  atualizar: (patch: Partial<Ficha> | ((f: Ficha) => Partial<Ficha>)) => void;
}

function Campo({
  rotulo,
  valor,
  onChange,
  area,
  linhas = 2,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  area?: boolean;
  linhas?: number;
  placeholder?: string;
}) {
  return (
    <label className="campo">
      <span className="campo-rotulo">{rotulo}</span>
      {area ? (
        <textarea
          value={valor}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={linhas}
        />
      ) : (
        <input value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

type Save = { natural: number; karma: number; limiar: number; tipo: "armadura" | "milagre" };

export default function FichaView({ ficha, atualizar }: Props) {
  // Salvaguarda em andamento (armadura ou milagrosa): d6 rolado; Karma melhora; Dado Heroico re-rola.
  const [save, setSave] = useState<Save | null>(null);
  const saveRef = useRef(save); // leitura síncrona (à prova de duplo-clique)
  saveRef.current = save;
  const [limiarMilagre, setLimiarMilagre] = useState(4); // número exigido (o IC anuncia)

  const umNaturalSave = save?.natural === 1;
  const valorSave = save ? Math.min(6, save.natural + (umNaturalSave ? 0 : save.karma)) : 0;
  const salvou = !!save && valorSave >= save.limiar;

  function definirSave(s: Save | null) {
    saveRef.current = s;
    setSave(s);
  }
  function rolarSave(limiar: number, tipo: "armadura" | "milagre") {
    if (limiar < 2) return;
    definirSave({ natural: rolarUmDado(), karma: 0, limiar, tipo });
  }
  function addKarmaSave() {
    const s = saveRef.current;
    if (!s || s.natural === 1 || ficha.karma <= 0) return; // 1 natural: só Dado Heroico
    if (Math.min(6, s.natural + s.karma) >= s.limiar) return; // já salvou
    definirSave({ ...s, karma: s.karma + 1 });
    atualizar((f) => ({ karma: Math.max(0, f.karma - 1) }));
  }
  function heroicoSave() {
    const s = saveRef.current;
    if (!s || ficha.dadosHeroicos <= 0) return;
    atualizar((f) => ({ dadosHeroicos: Math.max(0, f.dadosHeroicos - 1) }));
    definirSave({ ...s, natural: rolarUmDado(), karma: 0 });
  }
  function sofrerGolpe() {
    atualizar((f) => ({ vidaAtual: Math.max(0, f.vidaAtual - 1) }));
    definirSave(null);
  }

  return (
    <div className="ficha">
      {/* Cabeçalho estilo EZ D6 */}
      <div className="ficha-topo">
        <div className="ficha-logo">
          EZ<span>D6</span>
        </div>
        <label className="campo campo-nome">
          <span className="campo-rotulo">Nome</span>
          <input
            value={ficha.nome}
            placeholder="Nome do herói"
            onChange={(e) => atualizar({ nome: e.target.value })}
          />
        </label>
      </div>

      <div className="ficha-linha">
        <Campo rotulo="Espécie" valor={ficha.especie} onChange={(v) => atualizar({ especie: v })} />
        <Campo rotulo="Trilha Heroica" valor={ficha.trilha} onChange={(v) => atualizar({ trilha: v })} />
      </div>

      {/* Vida + Armadura (topo, como na ficha original) */}
      <section className="mec">
        <div className="mec-bloco vida">
          <h3>❤️ Vida</h3>
          <div className="mec-controle">
            <button onClick={() => atualizar((f) => ({ vidaAtual: Math.max(0, f.vidaAtual - 1) }))}>−</button>
            <span className="mec-valor">
              {ficha.vidaAtual}
              <small>/{ficha.vidaMax}</small>
            </span>
            <button
              onClick={() => atualizar((f) => ({ vidaAtual: Math.min(f.vidaMax, f.vidaAtual + 1) }))}
            >
              +
            </button>
          </div>
          <label className="mec-mini">
            Máx
            <input
              type="number"
              min={1}
              value={ficha.vidaMax}
              onChange={(e) => {
                const max = Math.max(1, Number(e.target.value) || 1);
                atualizar((f) => ({ vidaMax: max, vidaAtual: Math.min(f.vidaAtual, max) }));
              }}
            />
          </label>
        </div>

        <div className="mec-bloco armadura">
          <h3>🛡️ Armadura</h3>
          <select value={ficha.armadura} onChange={(e) => atualizar({ armadura: Number(e.target.value) })}>
            <option value={0}>Sem armadura</option>
            <option value={5}>5-6 (comum)</option>
            <option value={4}>4-6 (forte)</option>
            <option value={6}>6 (fraca)</option>
            <option value={3}>3-6</option>
            <option value={2}>2-6</option>
          </select>
          <div className="mec-mini">Ignora golpe: {textoArmadura(ficha.armadura)}</div>
          <button
            className="ficha-btn"
            disabled={ficha.armadura < 2 || !!save}
            onClick={() => rolarSave(ficha.armadura, "armadura")}
          >
            Salvaguarda
          </button>
        </div>
      </section>

      {/* Salvaguarda milagrosa: quedas, fogo, veneno... (número exigido pelo IC) */}
      <div className="mec-bloco milagrosa">
        <h3>✨ Salvaguarda milagrosa</h3>
        <div className="mec-mini">Iguale ou supere o número exigido (o IC anuncia), senão sofra 1 Golpe.</div>
        <div className="milagrosa-lim">
          <span>Alvo:</span>
          <button onClick={() => setLimiarMilagre(Math.max(2, limiarMilagre - 1))}>−</button>
          <b>{limiarMilagre}+</b>
          <button onClick={() => setLimiarMilagre(Math.min(6, limiarMilagre + 1))}>+</button>
        </div>
        <button className="ficha-btn" disabled={!!save} onClick={() => rolarSave(limiarMilagre, "milagre")}>
          Rolar salvaguarda milagrosa
        </button>
      </div>

      {/* Fluxo compartilhado da salvaguarda em andamento (armadura ou milagrosa) */}
      {save && (
        <div className="save-flow destaque">
          <div className="save-titulo">
            {save.tipo === "armadura" ? "🛡️ Salvaguarda de armadura" : "✨ Salvaguarda milagrosa"} — alvo{" "}
            {save.limiar}+
          </div>
          <div className={`save-dado ${salvou ? "ok" : "falha"}`}>
            🎲 {save.natural}
            {save.karma > 0 && <span className="save-k">+{save.karma}</span>}
            {" = "}
            {valorSave}
          </div>
          {salvou ? (
            <>
              <div className="save-res ok">
                {save.tipo === "armadura" ? "🛡️ Golpe ignorado!" : "✨ Salvou!"}
              </div>
              <button className="ficha-btn" onClick={() => definirSave(null)}>
                OK
              </button>
            </>
          ) : (
            <>
              {umNaturalSave && <div className="save-res falha">1 natural — só o Dado Heroico salva.</div>}
              <div className="save-acoes">
                <button
                  className="ficha-btn"
                  disabled={umNaturalSave || ficha.karma <= 0}
                  onClick={addKarmaSave}
                >
                  💠 +1 Karma
                </button>
                <button className="ficha-btn" disabled={ficha.dadosHeroicos <= 0} onClick={heroicoSave}>
                  ✨ Dado Heroico
                </button>
              </div>
              <button className="ficha-btn perigo" onClick={sofrerGolpe}>
                💥 Sofrer 1 Golpe
              </button>
            </>
          )}
        </div>
      )}

      {/* Campos descritivos, na ordem da ficha */}
      <Campo
        rotulo="Trunfos e Habilidades de Trilha Heroica"
        valor={ficha.trunfosHabilidades}
        onChange={(v) => atualizar({ trunfosHabilidades: v })}
        area
        linhas={3}
      />
      <Campo rotulo="Inclinações" valor={ficha.inclinacoes} onChange={(v) => atualizar({ inclinacoes: v })} area />
      <Campo rotulo="Aspectos" valor={ficha.aspectos} onChange={(v) => atualizar({ aspectos: v })} area />
      <Campo
        rotulo="Círculo de Feitiçaria"
        valor={ficha.circuloFeiticaria}
        onChange={(v) => atualizar({ circuloFeiticaria: v })}
        area
      />
      <Campo
        rotulo="Equipamentos"
        valor={ficha.equipamento}
        onChange={(v) => atualizar({ equipamento: v })}
        area
        linhas={3}
      />
      <Campo rotulo="Armas" valor={ficha.armas} onChange={(v) => atualizar({ armas: v })} area />
      <Campo rotulo="Poções" valor={ficha.pocoes} onChange={(v) => atualizar({ pocoes: v })} area />
      <Campo rotulo="Pergaminhos" valor={ficha.pergaminhos} onChange={(v) => atualizar({ pergaminhos: v })} area />

      {/* Karma + Dado Heroico (rodapé, como na ficha original) */}
      <section className="mec">
        <div className="mec-bloco karma">
          <h3>💠 Karma</h3>
          <div className="mec-controle">
            <button onClick={() => atualizar((f) => ({ karma: Math.max(0, f.karma - 1) }))}>−</button>
            <span className="mec-valor">{ficha.karma}</span>
            <button onClick={() => atualizar((f) => ({ karma: f.karma + 1 }))}>+</button>
          </div>
          <div className="mec-mini nota">Gasto no rolador</div>
        </div>

        <div className="mec-bloco heroico">
          <h3>✨ Dado Heroico</h3>
          <div className="mec-controle">
            <button onClick={() => atualizar((f) => ({ dadosHeroicos: Math.max(0, f.dadosHeroicos - 1) }))}>
              −
            </button>
            <span className="mec-valor">{ficha.dadosHeroicos}</span>
            <button onClick={() => atualizar((f) => ({ dadosHeroicos: f.dadosHeroicos + 1 }))}>+</button>
          </div>
          <button
            className="ficha-btn"
            disabled={ficha.karma < 5}
            onClick={() => atualizar((f) => ({ dadosHeroicos: f.dadosHeroicos + 1, karma: f.karma - 5 }))}
          >
            Recuperar (−5 Karma)
          </button>
        </div>
      </section>

      {/* Padrão de Vida (círculos de seleção, como na ficha) */}
      <div className="padrao-vida">
        <span className="campo-rotulo">Padrão de Vida</span>
        <div className="padrao-opcoes">
          {PADROES_VIDA.map((p) => (
            <button
              key={p}
              className={`padrao-opcao ${ficha.padraoVida === p ? "ativo" : ""}`}
              onClick={() => atualizar({ padraoVida: p })}
            >
              <span className="radio" />
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
