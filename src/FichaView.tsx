import { useRef, useState } from "react";
import { rolarUmDado } from "./ezd6";
import { NIVEIS_RIQUEZA, PADROES_VIDA, textoArmadura } from "./ficha";
import type { Ficha } from "./ficha";
import "./FichaView.css";

interface Props {
  ficha: Ficha;
  atualizar: (patch: Partial<Ficha> | ((f: Ficha) => Partial<Ficha>)) => void;
  /** Cenário "Mundo Devastado" ligado: mostra os trackers extras (miasma, poder, contaminação…). */
  cenario?: boolean;
}

const CONTAGIOS: { id: Ficha["contagio"]; nome: string }[] = [
  { id: "nenhum", nome: "Sadio" },
  { id: "debilitado", nome: "Debilitado" },
  { id: "doente", nome: "Doente" },
];

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

type TipoSave = "armadura" | "milagre" | "morte";
type Save = { natural: number; karma: number; limiar: number; tipo: TipoSave };

export default function FichaView({ ficha, atualizar, cenario = false }: Props) {
  // Salvaguarda em andamento (armadura ou milagrosa): d6 rolado; Karma melhora; Dado Heroico re-rola.
  const [save, setSave] = useState<Save | null>(null);
  const saveRef = useRef(save); // leitura síncrona (à prova de duplo-clique)
  saveRef.current = save;
  const [limiarMilagre, setLimiarMilagre] = useState(4); // número exigido (o IC anuncia)
  // Escudo (Mundo Devastado): permite uma 2ª salvaguarda de armadura por rodada.
  // "Usado" reinicia a cada nova salvaguarda de armadura (novo golpe recebido).
  const [escudoUsado, setEscudoUsado] = useState(false);

  const umNaturalSave = save?.natural === 1;
  const valorSave = save ? Math.min(6, save.natural + (umNaturalSave ? 0 : save.karma)) : 0;
  const salvou = !!save && valorSave >= save.limiar;

  function definirSave(s: Save | null) {
    saveRef.current = s;
    setSave(s);
  }
  function rolarSave(limiar: number, tipo: TipoSave) {
    if (limiar < 2) return;
    if (tipo === "armadura") setEscudoUsado(false); // novo golpe: escudo disponível de novo
    definirSave({ natural: rolarUmDado(), karma: 0, limiar, tipo });
  }
  // Dano Massivo (pág. 107): rola várias salvaguardas de armadura de uma vez.
  const [massivoN, setMassivoN] = useState(2);
  const [massivoRes, setMassivoRes] = useState<{ dados: number[]; falhas: number } | null>(null);
  function rolarMassivo() {
    if (ficha.armadura < 2) return;
    const dados = Array.from({ length: massivoN }, () => rolarUmDado());
    const falhas = dados.filter((d) => d < ficha.armadura).length;
    setMassivoRes({ dados, falhas });
  }
  function usarEscudo() {
    const s = saveRef.current;
    if (!s || s.tipo !== "armadura" || !ficha.escudo || escudoUsado) return;
    setEscudoUsado(true);
    // 2ª salvaguarda com o escudo: precisa tirar um 6 (pág. 7), independente do limiar da armadura.
    definirSave({ natural: rolarUmDado(), karma: 0, limiar: 6, tipo: "armadura" });
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

      {/* Fluxo compartilhado da salvaguarda em andamento (armadura, milagrosa ou morte iminente) */}
      {save && (
        <div className="save-flow destaque">
          <div className="save-titulo">
            {save.tipo === "armadura"
              ? "🛡️ Salvaguarda de armadura"
              : save.tipo === "morte"
                ? "☠️ Morte iminente"
                : "✨ Salvaguarda milagrosa"}{" "}
            — alvo {save.limiar}+
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
                {save.tipo === "armadura"
                  ? "🛡️ Golpe ignorado!"
                  : save.tipo === "morte"
                    ? "🫀 Sobreviveu (caído, sem agir)!"
                    : "✨ Salvou!"}
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
              {cenario && save.tipo === "armadura" && ficha.escudo && !escudoUsado && (
                <button className="ficha-btn" onClick={usarEscudo}>
                  🛡️ Usar escudo (2ª salvaguarda)
                </button>
              )}
              {save.tipo === "morte" ? (
                <button className="ficha-btn perigo" onClick={() => definirSave(null)}>
                  💀 Tombou
                </button>
              ) : (
                <button className="ficha-btn perigo" onClick={sofrerGolpe}>
                  💥 Sofrer 1 Golpe
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Cenário "Mundo Devastado": trackers extras (só quando o cenário está ligado) */}
      {cenario && (
        <section className="md-secao">
          <h3 className="md-titulo">🌫️ Mundo Devastado</h3>

          <div className="md-grade">
            <div className="mec-bloco">
              <h3>🟢 Resistência ao Miasma</h3>
              <div className="mec-controle">
                <button
                  onClick={() => atualizar((f) => ({ resistenciaMiasma: Math.max(1, f.resistenciaMiasma - 1) }))}
                >
                  −
                </button>
                <span className="mec-valor">{ficha.resistenciaMiasma}D6</span>
                <button
                  onClick={() => atualizar((f) => ({ resistenciaMiasma: Math.min(6, f.resistenciaMiasma + 1) }))}
                >
                  +
                </button>
              </div>
              <div className="mec-mini nota">Rola no Rolar; salva com um 6.</div>
            </div>

            <div className="mec-bloco">
              <h3>🔋 Dados de Poder</h3>
              <div className="mec-controle">
                <button onClick={() => atualizar((f) => ({ dadosPoder: Math.max(0, f.dadosPoder - 1) }))}>−</button>
                <span className="mec-valor">
                  {ficha.dadosPoder}
                  <small>/{ficha.dadosPoderMax}</small>
                </span>
                <button
                  onClick={() =>
                    atualizar((f) => ({ dadosPoder: Math.min(f.dadosPoderMax, f.dadosPoder + 1) }))
                  }
                >
                  +
                </button>
              </div>
              <label className="mec-mini">
                Máx
                <input
                  type="number"
                  min={0}
                  value={ficha.dadosPoderMax}
                  onChange={(e) => {
                    const max = Math.max(0, Number(e.target.value) || 0);
                    atualizar((f) => ({ dadosPoderMax: max, dadosPoder: Math.min(f.dadosPoder, max) }));
                  }}
                />
              </label>
              <button
                className="ficha-btn"
                disabled={ficha.dadosPoderMax === 0}
                onClick={() => atualizar((f) => ({ dadosPoder: f.dadosPoderMax }))}
              >
                Resetar sessão
              </button>
            </div>
          </div>

          <label className="md-escudo">
            <input
              type="checkbox"
              checked={ficha.escudo}
              onChange={(e) => atualizar({ escudo: e.target.checked })}
            />
            🛡️ Tenho escudo <small>(2ª salvaguarda de armadura por rodada)</small>
          </label>

          <div className="mec-bloco md-contaminacao">
            <h3>☣️ Contaminação</h3>
            <div className="mec-controle">
              <button onClick={() => atualizar((f) => ({ contaminacao: Math.max(0, f.contaminacao - 1) }))}>
                −
              </button>
              <span className={`mec-valor ${ficha.contaminacao >= 3 ? "perigo-txt" : ""}`}>
                {ficha.contaminacao}
                <small>/3</small>
              </span>
              <button onClick={() => atualizar((f) => ({ contaminacao: Math.min(3, f.contaminacao + 1) }))}>
                +
              </button>
            </div>
            {ficha.contaminacao >= 3 ? (
              <button
                className="ficha-btn perigo"
                onClick={() =>
                  atualizar((f) => {
                    const vidaMax = Math.max(1, f.vidaMax - 1);
                    return { vidaMax, vidaAtual: Math.min(f.vidaAtual, vidaMax), contaminacao: 0 };
                  })
                }
              >
                💥 Purgar (−1 Golpe permanente)
              </button>
            ) : (
              <div className="mec-mini nota">Em 3, perde 1 Golpe permanente.</div>
            )}
          </div>

          <div className="padrao-vida">
            <span className="campo-rotulo">Contágio</span>
            <div className="padrao-opcoes">
              {CONTAGIOS.map((c) => (
                <button
                  key={c.id}
                  className={`padrao-opcao ${ficha.contagio === c.id ? "ativo" : ""}`}
                  onClick={() => atualizar({ contagio: c.id })}
                >
                  <span className="radio" />
                  {c.nome}
                </button>
              ))}
            </div>
            {ficha.contagio !== "nenhum" && (
              <div className="mec-mini nota">
                {ficha.contagio === "debilitado"
                  ? "Debilitado: Estorvo em todos os testes até se curar (refeição + descanso)."
                  : "Doente: Estorvo em tudo e perde 1 Golpe/dia; só cura com fármacos."}
              </div>
            )}
          </div>

          {/* Suprimentos (pág. 45) */}
          <div className="mec-bloco">
            <h3>🥫 Suprimentos</h3>
            <div className="mec-controle">
              <button onClick={() => atualizar((f) => ({ suprimentos: Math.max(0, f.suprimentos - 1) }))}>−</button>
              <span className="mec-valor">
                {ficha.suprimentos}
                <small>/{ficha.suprimentosMax}</small>
              </span>
              <button
                onClick={() => atualizar((f) => ({ suprimentos: Math.min(f.suprimentosMax, f.suprimentos + 1) }))}
              >
                +
              </button>
            </div>
            <label className="mec-mini">
              Máx
              <input
                type="number"
                min={0}
                value={ficha.suprimentosMax}
                onChange={(e) => {
                  const max = Math.max(0, Number(e.target.value) || 0);
                  atualizar((f) => ({ suprimentosMax: max, suprimentos: Math.min(f.suprimentos, max) }));
                }}
              />
            </label>
            <div className="mec-mini nota">−1/dia · tiroteio −1 (rifle/SMG −2)</div>
          </div>

          {/* Atordoamento (pág. 101) */}
          <label className="md-escudo">
            <input
              type="checkbox"
              checked={ficha.atordoado}
              onChange={(e) => atualizar({ atordoado: e.target.checked })}
            />
            💫 Atordoado <small>(Estorvo em tudo e não corre no próximo turno)</small>
          </label>

          {/* Morte iminente (pág. 107): último Golpe → 6 sobrevive caído. Karma/Heroico valem. */}
          <div className="mec-bloco">
            <h3>☠️ Morte iminente</h3>
            <div className="mec-mini">No último Golpe, role: num 6 você sobrevive caído (Karma e Dado Heroico valem).</div>
            <button className="ficha-btn perigo" disabled={!!save} onClick={() => rolarSave(6, "morte")}>
              Rolar salvaguarda de morte (6+)
            </button>
          </div>

          {/* Dano Massivo (pág. 107): várias salvaguardas de armadura de uma vez */}
          <div className="mec-bloco">
            <h3>💢 Dano Massivo</h3>
            <div className="mec-mini">Sofreu vários Golpes de uma vez? Role todas as salvaguardas de armadura juntas.</div>
            <div className="milagrosa-lim">
              <span>Golpes:</span>
              <button onClick={() => setMassivoN(Math.max(1, massivoN - 1))}>−</button>
              <b>{massivoN}</b>
              <button onClick={() => setMassivoN(Math.min(12, massivoN + 1))}>+</button>
            </div>
            <button className="ficha-btn" disabled={ficha.armadura < 2} onClick={rolarMassivo}>
              {ficha.armadura < 2 ? "Defina a armadura primeiro" : `Rolar ${massivoN}× armadura (${textoArmadura(ficha.armadura)})`}
            </button>
            {massivoRes && (
              <div className="massivo-res">
                🎲 {massivoRes.dados.join(", ")} → <b>{massivoRes.falhas}</b> Golpe
                {massivoRes.falhas !== 1 ? "s" : ""} sofrido{massivoRes.falhas !== 1 ? "s" : ""}
                {massivoRes.falhas > 0 && (
                  <button
                    className="ficha-btn perigo"
                    onClick={() => {
                      atualizar((f) => ({ vidaAtual: Math.max(0, f.vidaAtual - massivoRes.falhas) }));
                      setMassivoRes(null);
                    }}
                  >
                    💥 Sofrer {massivoRes.falhas}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Talismã (pág. 103): 1×/sessão, história do talismã → Karma */}
          <div className="mec-bloco">
            <h3>📿 Talismã</h3>
            <div className="mec-mini">1×/sessão: conte uma história inédita sobre seu talismã e ganhe Karma.</div>
            <div className="save-acoes">
              <button className="ficha-btn" onClick={() => atualizar((f) => ({ karma: f.karma + 1 }))}>
                +1 Karma
              </button>
              <button className="ficha-btn" onClick={() => atualizar((f) => ({ karma: f.karma + 2 }))}>
                +2 (ligada à aventura)
              </button>
            </div>
          </div>
        </section>
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

      {/* Padrão de Vida (fantasia) ou Nível de Riqueza (Mundo Devastado) */}
      <div className="padrao-vida">
        <span className="campo-rotulo">{cenario ? "Nível de Riqueza" : "Padrão de Vida"}</span>
        <div className="padrao-opcoes">
          {(cenario ? NIVEIS_RIQUEZA : PADROES_VIDA).map((p) => (
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
