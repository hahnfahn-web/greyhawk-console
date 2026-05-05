import React, { useEffect, useMemo, useState } from "react";

const CONDITIONS = [
  "Blessed",
  "Raging",
  "Prone",
  "Poisoned",
  "Frightened",
  "Restrained",
  "Stunned",
  "Invisible",
  "Concentrating",
  "Unconscious",
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadSaved(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [log, setLog] = useState(() => loadSaved("log", []));

  const [party, setParty] = useState(() =>
    loadSaved("party", [
      { name: "Ryder", hp: 33, maxHp: 33, ac: 19, init: 12, conditions: [] },
      { name: "Rhilly", hp: 29, maxHp: 29, ac: 17, init: 10, conditions: [] },
      { name: "Rapp", hp: 34, maxHp: 34, ac: 20, init: 8, conditions: [] },
      { name: "Fern", hp: 30, maxHp: 30, ac: 18, init: 14, conditions: [] },
      { name: "Belgar", hp: 30, maxHp: 30, ac: 15, init: 16, conditions: [] },
    ])
  );

  const [enemies, setEnemies] = useState(() => loadSaved("enemies", []));
  const [enemyForm, setEnemyForm] = useState({
    name: "",
    hp: "",
    init: "",
  });

  const [round, setRound] = useState(() => loadSaved("round", 1));
  const [turnIndex, setTurnIndex] = useState(() => loadSaved("turnIndex", 0));

  const [npcs, setNpcs] = useState(() => loadSaved("npcs", []));
  const [npcForm, setNpcForm] = useState({
    name: "",
    role: "",
    faction: "",
    attitude: "Neutral",
    notes: "",
  });

  useEffect(() => localStorage.setItem("log", JSON.stringify(log)), [log]);
  useEffect(() => localStorage.setItem("party", JSON.stringify(party)), [party]);
  useEffect(() => localStorage.setItem("enemies", JSON.stringify(enemies)), [enemies]);
  useEffect(() => localStorage.setItem("round", JSON.stringify(round)), [round]);
  useEffect(() => localStorage.setItem("turnIndex", JSON.stringify(turnIndex)), [turnIndex]);
  useEffect(() => localStorage.setItem("npcs", JSON.stringify(npcs)), [npcs]);

  const addLog = (msg) => {
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 50));
  };

  const updatePartyField = (index, field, value) => {
    setParty((prev) =>
      prev.map((pc, i) =>
        i === index
          ? {
              ...pc,
              [field]: field === "name" ? value : Number(value) || 0,
            }
          : pc
      )
    );
  };

  const updatePartyHp = (index, amount) => {
    const pc = party[index];

    setParty((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, hp: clamp(p.hp + amount, 0, p.maxHp) } : p
      )
    );

    addLog(`${pc.name} ${amount < 0 ? "takes" : "heals"} ${Math.abs(amount)} HP`);
  };

  const toggleCondition = (index, condition) => {
    setParty((prev) =>
      prev.map((pc, i) => {
        if (i !== index) return pc;

        const current = pc.conditions || [];
        const active = current.includes(condition);

        return {
          ...pc,
          conditions: active
            ? current.filter((c) => c !== condition)
            : [...current, condition],
        };
      })
    );
  };

  const addEnemy = () => {
    if (!enemyForm.name.trim() || !enemyForm.hp) return;

    const enemy = {
      id: Date.now(),
      name: enemyForm.name.trim(),
      hp: Number(enemyForm.hp),
      maxHp: Number(enemyForm.hp),
      init: Number(enemyForm.init || 0),
    };

    setEnemies((prev) => [...prev, enemy]);
    setEnemyForm({ name: "", hp: "", init: "" });
    addLog(`Enemy added: ${enemy.name}`);
  };

  const updateEnemyHp = (id, amount) => {
    const enemy = enemies.find((e) => e.id === id);

    setEnemies((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, hp: clamp(e.hp + amount, 0, e.maxHp) } : e
      )
    );

    if (enemy) {
      addLog(`${enemy.name} ${amount < 0 ? "takes" : "heals"} ${Math.abs(amount)} HP`);
    }
  };

  const removeEnemy = (id) => {
    const enemy = enemies.find((e) => e.id === id);
    setEnemies((prev) => prev.filter((e) => e.id !== id));
    if (enemy) addLog(`Enemy removed: ${enemy.name}`);
  };

  const addNpc = () => {
    if (!npcForm.name.trim()) return;

    const npc = {
      id: Date.now(),
      ...npcForm,
      name: npcForm.name.trim(),
    };

    setNpcs((prev) => [...prev, npc]);
    setNpcForm({
      name: "",
      role: "",
      faction: "",
      attitude: "Neutral",
      notes: "",
    });

    addLog(`NPC added: ${npc.name}`);
  };

  const removeNpc = (id) => {
    const npc = npcs.find((n) => n.id === id);
    setNpcs((prev) => prev.filter((n) => n.id !== id));
    if (npc) addLog(`NPC removed: ${npc.name}`);
  };

  const initiative = useMemo(() => {
    const pcs = party.map((p, i) => ({ ...p, id: `pc-${i}`, type: "PC" }));
    const foes = enemies.map((e) => ({ ...e, id: `enemy-${e.id}`, type: "Enemy" }));

    return [...pcs, ...foes].sort(
      (a, b) => b.init - a.init || a.name.localeCompare(b.name)
    );
  }, [party, enemies]);

  const active = initiative[turnIndex] || null;

  const nextTurn = () => {
    if (!initiative.length) return;

    const next = turnIndex + 1;

    if (next >= initiative.length) {
      setTurnIndex(0);
      setRound((r) => r + 1);
      addLog(`Round ${round + 1} begins`);
    } else {
      setTurnIndex(next);
      addLog(`Turn advances to ${initiative[next].name}`);
    }
  };

  const resetCombat = () => {
    setRound(1);
    setTurnIndex(0);
    addLog("Combat reset");
  };

  const loadCultAmbush = () => {
    setEnemies([
      { id: Date.now() + 1, name: "Cultist Acolyte", hp: 9, maxHp: 9, init: 12 },
      { id: Date.now() + 2, name: "Cultist Acolyte", hp: 9, maxHp: 9, init: 10 },
      { id: Date.now() + 3, name: "Dark Adept", hp: 22, maxHp: 22, init: 14 },
    ]);

    setRound(1);
    setTurnIndex(0);
    addLog("Encounter loaded: Cult Ambush");
  };

  const resetSavedState = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Greyhawk Command Console</h1>

      <main style={gridStyle}>
        <section style={cardStyle}>
          <h2 style={headerStyle}>Combat</h2>
          <p>
            <strong>Round:</strong> {round}
          </p>
          <p>
            <strong>Current:</strong> {active ? `${active.name} (${active.type})` : "None"}
          </p>

          <button style={buttonStyle} onClick={nextTurn}>Next Turn</button>
          <button style={buttonStyle} onClick={resetCombat}>Reset Combat</button>
          <button style={buttonStyle} onClick={loadCultAmbush}>Load Cult Ambush</button>

          <div style={{ marginTop: 10 }}>
            {initiative.map((actor, i) => (
              <div
                key={`${actor.type}-${actor.id}`}
                style={i === turnIndex ? activeRowStyle : initRowStyle}
              >
                {i === turnIndex ? "▶ " : ""}
                <strong>{actor.init}</strong> — {actor.name} ({actor.type}) — {actor.hp}/{actor.maxHp} HP
              </div>
            ))}
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={headerStyle}>Party</h2>

          {party.map((pc, i) => (
            <div key={pc.name} style={innerCardStyle}>
              <input
                style={inputStyle}
                value={pc.name}
                onChange={(e) => updatePartyField(i, "name", e.target.value)}
              />

              <div style={rowStyle}>
                <span>HP</span>
                <input
                  style={smallInputStyle}
                  value={pc.hp}
                  onChange={(e) => updatePartyField(i, "hp", e.target.value)}
                />
                <span>/</span>
                <input
                  style={smallInputStyle}
                  value={pc.maxHp}
                  onChange={(e) => updatePartyField(i, "maxHp", e.target.value)}
                />
                <span>AC</span>
                <input
                  style={smallInputStyle}
                  value={pc.ac}
                  onChange={(e) => updatePartyField(i, "ac", e.target.value)}
                />
                <span>Init</span>
                <input
                  style={smallInputStyle}
                  value={pc.init}
                  onChange={(e) => updatePartyField(i, "init", e.target.value)}
                />
              </div>

              <button style={smallButtonStyle} onClick={() => updatePartyHp(i, -5)}>-5</button>
              <button style={smallButtonStyle} onClick={() => updatePartyHp(i, 5)}>+5</button>

              <div style={conditionWrapStyle}>
                {CONDITIONS.map((condition) => {
                  const active = pc.conditions.includes(condition);
                  return (
                    <button
                      key={condition}
                      onClick={() => toggleCondition(i, condition)}
                      style={{
                        ...conditionButtonStyle,
                        background: active ? "#8a6d1d" : "#1f2937",
                        color: active ? "#fff2b8" : "#e5e7eb",
                      }}
                    >
                      {condition}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <h2 style={headerStyle}>Enemies</h2>

          <input
            style={inputStyle}
            placeholder="Enemy name"
            value={enemyForm.name}
            onChange={(e) => setEnemyForm({ ...enemyForm, name: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="HP"
            value={enemyForm.hp}
            onChange={(e) => setEnemyForm({ ...enemyForm, hp: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Initiative"
            value={enemyForm.init}
            onChange={(e) => setEnemyForm({ ...enemyForm, init: e.target.value })}
          />

          <button style={buttonStyle} onClick={addEnemy}>Add Enemy</button>

          {enemies.map((enemy) => (
            <div key={enemy.id} style={innerCardStyle}>
              <strong>{enemy.name}</strong>
              <div>{enemy.hp}/{enemy.maxHp} HP | Init {enemy.init}</div>
              <button style={smallButtonStyle} onClick={() => updateEnemyHp(enemy.id, -5)}>-5</button>
              <button style={smallButtonStyle} onClick={() => updateEnemyHp(enemy.id, 5)}>+5</button>
              <button style={dangerButtonStyle} onClick={() => removeEnemy(enemy.id)}>Remove</button>
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <h2 style={headerStyle}>NPC Tracker</h2>

          <input
            style={inputStyle}
            placeholder="NPC name"
            value={npcForm.name}
            onChange={(e) => setNpcForm({ ...npcForm, name: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Role"
            value={npcForm.role}
            onChange={(e) => setNpcForm({ ...npcForm, role: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Faction"
            value={npcForm.faction}
            onChange={(e) => setNpcForm({ ...npcForm, faction: e.target.value })}
          />

          <select
            style={inputStyle}
            value={npcForm.attitude}
            onChange={(e) => setNpcForm({ ...npcForm, attitude: e.target.value })}
          >
            <option>Friendly</option>
            <option>Neutral</option>
            <option>Suspicious</option>
            <option>Hostile</option>
          </select>

          <textarea
            style={textAreaStyle}
            placeholder="Notes"
            value={npcForm.notes}
            onChange={(e) => setNpcForm({ ...npcForm, notes: e.target.value })}
          />

          <button style={buttonStyle} onClick={addNpc}>Add NPC</button>

          {npcs.map((npc) => (
            <div key={npc.id} style={innerCardStyle}>
              <strong>{npc.name}</strong>
              <div>{npc.role || "Unknown role"} | {npc.faction || "No faction"}</div>
              <div><em>{npc.attitude}</em></div>
              <p>{npc.notes}</p>
              <button style={dangerButtonStyle} onClick={() => removeNpc(npc.id)}>Remove</button>
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <h2 style={headerStyle}>Log</h2>
          <button style={dangerButtonStyle} onClick={resetSavedState}>Reset Saved State</button>
          <div style={logBoxStyle}>
            {log.length === 0 ? (
              <p>No actions yet.</p>
            ) : (
              log.map((entry, i) => <div key={i}>• {entry}</div>)
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  width: "100%",
  overflowX: "hidden",
  background: "radial-gradient(circle at top,#202733,#0b0f14)",
  color: "#e5e7eb",
  fontFamily: "Georgia, 'Times New Roman', serif",
  padding: 12,
  boxSizing: "border-box",
};

const titleStyle = {
  textAlign: "center",
  color: "#f2d28b",
  margin: "8px 0 14px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
  width: "100%",
  boxSizing: "border-box",
};

const cardStyle = {
  background: "#0d1117",
  border: "1px solid #3b4351",
  borderRadius: 8,
  padding: 10,
  boxSizing: "border-box",
  minWidth: 0,
};

const innerCardStyle = {
  background: "#121821",
  border: "1px solid #303845",
  borderRadius: 6,
  padding: 8,
  marginBottom: 8,
};

const headerStyle = {
  color: "#f2d28b",
  marginTop: 0,
  borderBottom: "1px solid #35291a",
  paddingBottom: 4,
};

const rowStyle = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  padding: 9,
  marginBottom: 8,
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid #3b4351",
  borderRadius: 6,
  boxSizing: "border-box",
  fontSize: 14,
  minHeight: 38,
};

const smallInputStyle = {
  width: 54,
  padding: 7,
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid #3b4351",
  borderRadius: 6,
};

const buttonStyle = {
  background: "linear-gradient(180deg, #4b5563 0%, #252b34 100%)",
  color: "#f8fafc",
  border: "1px solid #6b7280",
  borderRadius: 6,
  padding: "9px 12px",
  cursor: "pointer",
  margin: 4,
  fontSize: 14,
  minHeight: 38,
};

const smallButtonStyle = {
  ...buttonStyle,
  padding: "6px 9px",
  fontSize: 13,
  minHeight: 34,
};

const dangerButtonStyle = {
  ...smallButtonStyle,
  background: "linear-gradient(180deg, #7f1d1d 0%, #3f1111 100%)",
  border: "1px solid #b91c1c",
};

const conditionWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  marginTop: 6,
};

const conditionButtonStyle = {
  border: "1px solid #3b4351",
  borderRadius: 4,
  padding: "4px 6px",
  fontSize: 11,
};

const initRowStyle = {
  padding: 10,
  marginBottom: 6,
  border: "1px solid #303845",
  borderRadius: 6,
  fontSize: 16,
  background: "#1d222b",
};

const activeRowStyle = {
  ...initRowStyle,
  background: "#4a3415",
  border: "1px solid #d6a03d",
};

const textAreaStyle = {
  width: "100%",
  minHeight: 120,
  padding: 10,
  marginBottom: 8,
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid #3b4351",
  borderRadius: 6,
  boxSizing: "border-box",
  fontSize: 14,
};

const logBoxStyle = {
  maxHeight: 250,
  overflowY: "auto",
  fontSize: 13,
};