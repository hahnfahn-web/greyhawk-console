import React, { useEffect, useMemo, useState } from "react";

const BRIDGE_DEFAULT =
  "https://rolls-realms-discord-bridge-production.up.railway.app/api";

const CONDITIONS = [
  "Blessed", "Raging", "Prone", "Poisoned", "Frightened",
  "Restrained", "Stunned", "Invisible", "Concentrating", "Unconscious",
];

const DEFAULT_ENCOUNTERS = [
  {
    name: "Cult Ambush",
    enemies: [
      { name: "Cultist Acolyte", hp: 9, maxHp: 9, init: 12 },
      { name: "Cultist Acolyte", hp: 9, maxHp: 9, init: 10 },
      { name: "Dark Adept", hp: 22, maxHp: 22, init: 14 },
    ],
  },
  {
    name: "Gnoll Patrol",
    enemies: [
      { name: "Gnoll", hp: 22, maxHp: 22, init: 13 },
      { name: "Gnoll", hp: 22, maxHp: 22, init: 11 },
      { name: "Gnoll Pack Lord", hp: 49, maxHp: 49, init: 15 },
    ],
  },
  {
    name: "Earth Temple Guard",
    enemies: [
      { name: "Earth Guard", hp: 45, maxHp: 45, init: 10 },
      { name: "Earth Guard", hp: 45, maxHp: 45, init: 9 },
      { name: "Earth Priest", hp: 60, maxHp: 60, init: 12 },
    ],
  },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function loadSaved(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function App() {
  const isMobile = useIsMobile();

  const [log, setLog] = useState(() => loadSaved("log", []));
  const [bridgeUrl, setBridgeUrl] = useState(() => loadSaved("bridgeUrl", BRIDGE_DEFAULT));
  const [apiKey, setApiKey] = useState(() => loadSaved("apiKey", ""));
  const [channel, setChannel] = useState(() => loadSaved("channel", "dm-control-room"));
  const [customMsg, setCustomMsg] = useState("");

  const [calendar, setCalendar] = useState(() =>
    loadSaved("calendar", { date: "6 Sunsebb, 576 CY", phase: "Morning", session: 39 })
  );

  const [earthCult, setEarthCult] = useState(() => loadSaved("earthCult", 3));
  const [dungeonAlert, setDungeonAlert] = useState(() => loadSaved("dungeonAlert", 3));
  const [nodeProgress, setNodeProgress] = useState(() => loadSaved("nodeProgress", 35));

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
  const [enemyForm, setEnemyForm] = useState({ name: "", hp: "", init: "" });

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

  const [sessionPrep, setSessionPrep] = useState(() => loadSaved("sessionPrep", ""));
  const [savedEncounters, setSavedEncounters] = useState(() =>
    loadSaved("savedEncounters", DEFAULT_ENCOUNTERS)
  );
  const [encounterName, setEncounterName] = useState("");

  useEffect(() => localStorage.setItem("log", JSON.stringify(log)), [log]);
  useEffect(() => localStorage.setItem("bridgeUrl", JSON.stringify(bridgeUrl)), [bridgeUrl]);
  useEffect(() => localStorage.setItem("apiKey", JSON.stringify(apiKey)), [apiKey]);
  useEffect(() => localStorage.setItem("channel", JSON.stringify(channel)), [channel]);
  useEffect(() => localStorage.setItem("calendar", JSON.stringify(calendar)), [calendar]);
  useEffect(() => localStorage.setItem("earthCult", JSON.stringify(earthCult)), [earthCult]);
  useEffect(() => localStorage.setItem("dungeonAlert", JSON.stringify(dungeonAlert)), [dungeonAlert]);
  useEffect(() => localStorage.setItem("nodeProgress", JSON.stringify(nodeProgress)), [nodeProgress]);
  useEffect(() => localStorage.setItem("party", JSON.stringify(party)), [party]);
  useEffect(() => localStorage.setItem("enemies", JSON.stringify(enemies)), [enemies]);
  useEffect(() => localStorage.setItem("round", JSON.stringify(round)), [round]);
  useEffect(() => localStorage.setItem("turnIndex", JSON.stringify(turnIndex)), [turnIndex]);
  useEffect(() => localStorage.setItem("npcs", JSON.stringify(npcs)), [npcs]);
  useEffect(() => localStorage.setItem("sessionPrep", JSON.stringify(sessionPrep)), [sessionPrep]);
  useEffect(() => localStorage.setItem("savedEncounters", JSON.stringify(savedEncounters)), [savedEncounters]);

  const addLog = (msg) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 50));

  const postToDiscord = async (target, message) => {
    if (!bridgeUrl || !apiKey) {
      addLog("❌ Bridge not configured.");
      return;
    }
    if (!message?.trim()) {
      addLog("❌ Nothing to post.");
      return;
    }
    try {
      const res = await fetch(`${bridgeUrl}/discord/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ channel: target, message }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addLog(`✅ Posted to #${target}.`);
    } catch (err) {
      addLog(`❌ Post failed: ${err.message}`);
    }
  };

  const updatePartyField = (i, field, value) => {
    setParty((prev) =>
      prev.map((pc, idx) =>
        idx === i
          ? { ...pc, [field]: field === "name" ? value : Number(value) || 0 }
          : pc
      )
    );
  };

  const updatePartyHp = (i, amount) => {
    const pc = party[i];
    setParty((prev) =>
      prev.map((p, idx) =>
        idx === i ? { ...p, hp: clamp(p.hp + amount, 0, p.maxHp) } : p
      )
    );
    addLog(`${pc.name} ${amount < 0 ? "takes" : "heals"} ${Math.abs(amount)} HP.`);
  };

  const toggleCondition = (i, condition) => {
    setParty((prev) =>
      prev.map((pc, idx) => {
        if (idx !== i) return pc;
        const has = pc.conditions.includes(condition);
        return {
          ...pc,
          conditions: has
            ? pc.conditions.filter((c) => c !== condition)
            : [...pc.conditions, condition],
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
    addLog(`Enemy added: ${enemy.name}.`);
  };

  const updateEnemyHp = (id, amount) => {
    setEnemies((prev) => {
      return prev.flatMap((e) => {
        if (e.id !== id) return [e];
        const newHp = clamp(e.hp + amount, 0, e.maxHp);

        if (newHp <= 0) {
          addLog(`☠️ ${e.name} has fallen.`);
          return [];
        }

        if (newHp <= Math.floor(e.maxHp / 2) && e.hp > Math.floor(e.maxHp / 2)) {
          addLog(`🩸 ${e.name} is bloodied.`);
        }

        return [{ ...e, hp: newHp }];
      });
    });
  };

  const removeEnemy = (id) => {
    const enemy = enemies.find((e) => e.id === id);
    setEnemies((prev) => prev.filter((e) => e.id !== id));
    if (enemy) addLog(`Enemy removed: ${enemy.name}.`);
  };

  const addNpc = () => {
    if (!npcForm.name.trim()) return;
    const npc = { id: Date.now(), ...npcForm, name: npcForm.name.trim() };
    setNpcs((prev) => [...prev, npc]);
    setNpcForm({ name: "", role: "", faction: "", attitude: "Neutral", notes: "" });
    addLog(`NPC added: ${npc.name}.`);
  };

  const removeNpc = (id) => {
    const npc = npcs.find((n) => n.id === id);
    setNpcs((prev) => prev.filter((n) => n.id !== id));
    if (npc) addLog(`NPC removed: ${npc.name}.`);
  };

  const saveCurrentEncounter = () => {
    const name = encounterName.trim();
    if (!name) {
      addLog("❌ Encounter name required.");
      return;
    }
    if (!enemies.length) {
      addLog("❌ No enemies to save.");
      return;
    }

    const newEncounter = {
      name,
      enemies: enemies.map((e) => ({
        name: e.name,
        hp: e.hp,
        maxHp: e.maxHp,
        init: e.init,
      })),
    };

    setSavedEncounters((prev) => {
      const exists = prev.some((enc) => enc.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        addLog(`❌ Encounter already exists: ${name}.`);
        return prev;
      }
      addLog(`💾 Encounter saved: ${name}.`);
      return [...prev, newEncounter];
    });

    setEncounterName("");
  };

  const loadEncounter = (encounter) => {
    setEnemies(
      encounter.enemies.map((e, idx) => ({
        id: Date.now() + idx,
        name: e.name,
        hp: e.hp,
        maxHp: e.maxHp || e.hp,
        init: e.init || 0,
      }))
    );
    setRound(1);
    setTurnIndex(0);
    addLog(`⚔️ Encounter loaded: ${encounter.name}.`);
  };

  const deleteEncounter = (name) => {
    setSavedEncounters((prev) => prev.filter((enc) => enc.name !== name));
    addLog(`🗑️ Encounter deleted: ${name}.`);
  };

  const initiative = useMemo(() => {
    const pcs = party.map((p, i) => ({ ...p, id: `pc-${i}`, type: "PC" }));
    const foes = enemies.map((e) => ({ ...e, id: `enemy-${e.id}`, type: "Enemy" }));
    return [...pcs, ...foes].sort((a, b) => b.init - a.init || a.name.localeCompare(b.name));
  }, [party, enemies]);

  const active = initiative[turnIndex] || null;

  const nextTurn = () => {
    if (!initiative.length) return;
    const next = turnIndex + 1;
    if (next >= initiative.length) {
      setTurnIndex(0);
      setRound((r) => r + 1);
      addLog(`Round ${round + 1} begins.`);
    } else {
      setTurnIndex(next);
      addLog(`Turn advances to ${initiative[next].name}.`);
    }
  };

  const resetCombat = () => {
    setRound(1);
    setTurnIndex(0);
    addLog("Combat reset.");
  };

  const loadCultAmbush = () => {
    loadEncounter(DEFAULT_ENCOUNTERS[0]);
  };

  const buildPrep = () => `## 🕯️ Session Prep

**Date:** ${calendar.date}, ${calendar.phase}
**Session:** #${calendar.session}
**Earth Cult Alert:** ${earthCult}/5
**Dungeon Alert:** ${dungeonAlert}/5
**Earth Node Progress:** ${nodeProgress}%

### Notes
- Encounter ideas
- NPC reactions
- Treasure hooks`;

  const buildSnapshot = () => {
    const partyText = party
      .map((p) => {
        const cond = p.conditions.length ? ` | ${p.conditions.join(", ")}` : "";
        return `${p.name}: ${p.hp}/${p.maxHp} HP | AC ${p.ac} | Init ${p.init}${cond}`;
      })
      .join("\n");

    const enemyText = enemies.length
      ? enemies.map((e) => `${e.name}: ${e.hp}/${e.maxHp} HP | Init ${e.init}`).join("\n")
      : "None";

    const initiativeText = initiative
      .map((c, idx) => `${idx === turnIndex ? "▶ " : ""}${c.init} — ${c.name} (${c.type})`)
      .join("\n");

    return `📊 **SESSION SNAPSHOT**

🎯 **Combat**
Round: ${round}
Current: ${active ? active.name : "N/A"}

🧙 **Party**
${partyText}

👹 **Enemies**
${enemyText}

⚔️ **Initiative**
${initiativeText}

🌍 **World State**
Earth Cult Alert: ${earthCult}/5
Dungeon Alert: ${dungeonAlert}/5
Earth Node Progress: ${nodeProgress}%`;
  };

  const resetSavedState = () => {
    localStorage.clear();
    window.location.reload();
  };

  const layoutStyle = isMobile ? mobileGridStyle : desktopGridStyle;
  const leftStyle = isMobile ? mobileSectionStyle : leftColumnStyle;
  const topStyle = isMobile ? mobileSectionStyle : topBarStyle;
  const centerStyle = isMobile ? mobileSectionStyle : centerColumnStyle;
  const rightStyle = isMobile ? mobileSectionStyle : rightColumnStyle;
  const bottomStyle = isMobile ? mobileSectionStyle : bottomBarStyle;

  return (
    <div style={pageStyle}>
      <h1 style={isMobile ? mobileTitleStyle : titleStyle}>
        Greyhawk Command Console v2
      </h1>

      <main style={layoutStyle}>
        <div style={leftStyle}>
          <PartyPanel
            party={party}
            updatePartyField={updatePartyField}
            updatePartyHp={updatePartyHp}
            toggleCondition={toggleCondition}
          />
          <NpcPanel
            npcs={npcs}
            npcForm={npcForm}
            setNpcForm={setNpcForm}
            addNpc={addNpc}
            removeNpc={removeNpc}
          />
        </div>

        <div style={topStyle}>
          <Panel title="Discord Bridge">
            <input style={inputStyle} value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} />
            <input style={inputStyle} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </Panel>

          <Panel title="Calendar / Time">
            <div>{calendar.date}</div>
            <div>{calendar.phase}</div>
            <button style={buttonStyle} onClick={() => setCalendar((c) => ({ ...c, phase: "Evening" }))}>Evening</button>
            <button style={buttonStyle} onClick={() => setCalendar((c) => ({ ...c, phase: "Morning" }))}>Morning</button>
          </Panel>

          <Panel title="Faction / Node">
            <div>Earth Cult: {earthCult}/5</div>
            <div>Dungeon: {dungeonAlert}/5</div>
            <div>Earth Node: {nodeProgress}%</div>
            <button style={smallButtonStyle} onClick={() => setEarthCult((v) => clamp(v + 1, 0, 5))}>Cult +</button>
            <button style={smallButtonStyle} onClick={() => setDungeonAlert((v) => clamp(v + 1, 0, 5))}>Dungeon +</button>
            <button style={smallButtonStyle} onClick={() => setNodeProgress((v) => clamp(v + 10, 0, 100))}>Node +</button>
          </Panel>
        </div>

        <div style={centerStyle}>
          <CombatPanel
            round={round}
            active={active}
            initiative={initiative}
            turnIndex={turnIndex}
            nextTurn={nextTurn}
            resetCombat={resetCombat}
            loadCultAmbush={loadCultAmbush}
          />

          <EncounterLibraryPanel
            encounterName={encounterName}
            setEncounterName={setEncounterName}
            saveCurrentEncounter={saveCurrentEncounter}
            savedEncounters={savedEncounters}
            loadEncounter={loadEncounter}
            deleteEncounter={deleteEncounter}
          />
        </div>

        <div style={rightStyle}>
          <EnemiesPanel
            enemies={enemies}
            enemyForm={enemyForm}
            setEnemyForm={setEnemyForm}
            addEnemy={addEnemy}
            updateEnemyHp={updateEnemyHp}
            removeEnemy={removeEnemy}
          />

          <Panel title="Session Prep">
            <button style={buttonStyle} onClick={() => setSessionPrep(buildPrep())}>Auto Fill</button>
            <button style={buttonStyle} onClick={() => postToDiscord("session-prep", sessionPrep || buildPrep())}>Post</button>
            <textarea style={textAreaStyle} value={sessionPrep} onChange={(e) => setSessionPrep(e.target.value)} />
          </Panel>

          <Panel title="Post to Channel">
            <select style={inputStyle} value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="dm-control-room">#dm-control-room</option>
              <option value="bard-tales">#bard-tales</option>
              <option value="session-prep">#session-prep</option>
              <option value="cult-activity-log">#cult-activity-log</option>
              <option value="help-wanted-table">#help-wanted-table</option>
            </select>
            <textarea style={textAreaStyle} value={customMsg} onChange={(e) => setCustomMsg(e.target.value)} />
            <button style={buttonStyle} onClick={() => postToDiscord(channel, customMsg)}>Post Message</button>
          </Panel>

          <Panel title="DM Actions">
            <button style={buttonStyle} onClick={() => postToDiscord("dm-control-room", buildSnapshot())}>📊 DM Snapshot</button>
            <button style={dangerButtonStyle} onClick={resetSavedState}>Reset Saved State</button>
          </Panel>
        </div>

        <div style={bottomStyle}>
          <Panel title="Log">
            <div style={logBoxStyle}>
              {log.length === 0 ? <p>No actions yet.</p> : log.map((l, i) => <div key={i}>• {l}</div>)}
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section style={cardStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

function CombatPanel({ round, active, initiative, turnIndex, nextTurn, resetCombat, loadCultAmbush }) {
  return (
    <Panel title="Combat">
      <div><strong>Round:</strong> {round}</div>
      <div><strong>Current:</strong> {active ? `${active.name} (${active.type})` : "None"}</div>
      <button style={buttonStyle} onClick={resetCombat}>Reset</button>
      <button style={buttonStyle} onClick={loadCultAmbush}>Cult Ambush</button>

      <div style={{ marginTop: 10 }}>
        {initiative.map((c, i) => (
          <div
            key={`${c.type}-${c.id}`}
            style={{
              ...(i === turnIndex ? activeRowStyle : rowStyle),
              ...(c.hp <= Math.floor(c.maxHp / 2) ? bloodiedStyle : {}),
              ...(c.hp <= 0 ? deadStyle : {}),
            }}
          >
            {i === turnIndex ? "▶ " : ""}
            <strong>{c.init}</strong> — {c.name} ({c.type}) — {c.hp}/{c.maxHp} HP
            {c.hp > 0 && c.hp <= Math.floor(c.maxHp / 2) && (
              <span style={{ color: "#f87171", marginLeft: 8 }}>🩸 Bloodied</span>
            )}
          </div>
        ))}
      </div>

      <div style={stickyTurnBarStyle}>
        <button style={{ ...buttonStyle, width: "100%" }} onClick={nextTurn}>▶ Next Turn</button>
      </div>
    </Panel>
  );
}

function EncounterLibraryPanel({
  encounterName,
  setEncounterName,
  saveCurrentEncounter,
  savedEncounters,
  loadEncounter,
  deleteEncounter,
}) {
  return (
    <Panel title="Encounter Library">
      <input
        style={inputStyle}
        placeholder="Encounter name"
        value={encounterName}
        onChange={(e) => setEncounterName(e.target.value)}
      />
      <button style={buttonStyle} onClick={saveCurrentEncounter}>💾 Save Current Encounter</button>

      <div style={encounterListStyle}>
        {savedEncounters.map((enc) => (
          <div key={enc.name} style={innerCardStyle}>
            <strong>{enc.name}</strong>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              {enc.enemies.length} enemy/enemies
            </div>
            <button style={smallButtonStyle} onClick={() => loadEncounter(enc)}>Load</button>
            <button style={dangerButtonStyle} onClick={() => deleteEncounter(enc.name)}>Delete</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PartyPanel({ party, updatePartyField, updatePartyHp, toggleCondition }) {
  return (
    <Panel title="Party">
      {party.map((p, i) => (
        <div key={`${p.name}-${i}`} style={innerCardStyle}>
          <input style={inputStyle} value={p.name} onChange={(e) => updatePartyField(i, "name", e.target.value)} />
          <div style={flexRowStyle}>
            <span>HP</span>
            <input style={smallInputStyle} value={p.hp} onChange={(e) => updatePartyField(i, "hp", e.target.value)} />
            <span>/</span>
            <input style={smallInputStyle} value={p.maxHp} onChange={(e) => updatePartyField(i, "maxHp", e.target.value)} />
            <span>AC</span>
            <input style={smallInputStyle} value={p.ac} onChange={(e) => updatePartyField(i, "ac", e.target.value)} />
            <span>Init</span>
            <input style={smallInputStyle} value={p.init} onChange={(e) => updatePartyField(i, "init", e.target.value)} />
            <button style={smallButtonStyle} onClick={() => updatePartyHp(i, -5)}>-5</button>
            <button style={smallButtonStyle} onClick={() => updatePartyHp(i, 5)}>+5</button>
          </div>
          <div style={conditionWrapStyle}>
            {CONDITIONS.map((c) => {
              const activeCondition = p.conditions.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCondition(i, c)}
                  style={{
                    ...conditionButtonStyle,
                    background: activeCondition ? "#8a6d1d" : "#1f2937",
                    color: activeCondition ? "#fff2b8" : "#e5e7eb",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Panel>
  );
}

function EnemiesPanel({ enemies, enemyForm, setEnemyForm, addEnemy, updateEnemyHp, removeEnemy }) {
  return (
    <Panel title="Enemies">
      <input style={inputStyle} placeholder="Enemy name" value={enemyForm.name} onChange={(e) => setEnemyForm({ ...enemyForm, name: e.target.value })} />
      <input style={inputStyle} placeholder="HP" value={enemyForm.hp} onChange={(e) => setEnemyForm({ ...enemyForm, hp: e.target.value })} />
      <input style={inputStyle} placeholder="Initiative" value={enemyForm.init} onChange={(e) => setEnemyForm({ ...enemyForm, init: e.target.value })} />
      <button style={buttonStyle} onClick={addEnemy}>Add Enemy</button>
      {enemies.map((e) => (
        <div
          key={e.id}
          style={{
            ...innerCardStyle,
            ...(e.hp <= Math.floor(e.maxHp / 2) ? bloodiedStyle : {}),
            ...(e.hp <= 0 ? deadStyle : {}),
          }}
        >
          <strong>{e.name}</strong>
          <div>{e.hp}/{e.maxHp} HP | Init {e.init}</div>
          <button style={smallButtonStyle} onClick={() => updateEnemyHp(e.id, -5)}>-5</button>
          <button style={smallButtonStyle} onClick={() => updateEnemyHp(e.id, 5)}>+5</button>
          <button style={dangerButtonStyle} onClick={() => removeEnemy(e.id)}>Remove</button>
        </div>
      ))}
    </Panel>
  );
}

function NpcPanel({ npcs, npcForm, setNpcForm, addNpc, removeNpc }) {
  return (
    <Panel title="NPC Tracker">
      <input style={inputStyle} placeholder="NPC name" value={npcForm.name} onChange={(e) => setNpcForm({ ...npcForm, name: e.target.value })} />
      <input style={inputStyle} placeholder="Role" value={npcForm.role} onChange={(e) => setNpcForm({ ...npcForm, role: e.target.value })} />
      <input style={inputStyle} placeholder="Faction" value={npcForm.faction} onChange={(e) => setNpcForm({ ...npcForm, faction: e.target.value })} />
      <select style={inputStyle} value={npcForm.attitude} onChange={(e) => setNpcForm({ ...npcForm, attitude: e.target.value })}>
        <option>Friendly</option>
        <option>Neutral</option>
        <option>Suspicious</option>
        <option>Hostile</option>
      </select>
      <textarea style={textAreaStyle} placeholder="Notes" value={npcForm.notes} onChange={(e) => setNpcForm({ ...npcForm, notes: e.target.value })} />
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
    </Panel>
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

const desktopGridStyle = {
  display: "grid",
  gridTemplateColumns: "320px 1fr 320px",
  gridTemplateRows: "auto 1fr 180px",
  gridTemplateAreas: `
    "left top right"
    "left center right"
    "bottom bottom bottom"
  `,
  gap: 12,
  minHeight: "calc(100vh - 80px)",
};

const mobileGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
};

const mobileSectionStyle = {
  display: "grid",
  gap: 12,
  alignContent: "start",
  minWidth: 0,
};

const mobileTitleStyle = {
  textAlign: "center",
  color: "#f2d28b",
  margin: "8px 0 14px",
  fontSize: 36,
  lineHeight: 1,
};

const leftColumnStyle = {
  gridArea: "left",
  display: "grid",
  gap: 12,
  alignContent: "start",
  minHeight: 0,
  overflowY: "auto",
};

const topBarStyle = {
  gridArea: "top",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  alignContent: "start",
};

const centerColumnStyle = {
  gridArea: "center",
  minHeight: 0,
  overflowY: "auto",
};

const rightColumnStyle = {
  gridArea: "right",
  display: "grid",
  gap: 12,
  alignContent: "start",
  minHeight: 0,
  overflowY: "auto",
};

const bottomBarStyle = {
  gridArea: "bottom",
  minHeight: 0,
};

const cardStyle = {
  background: "#0d1117",
  border: "1px solid #3b4351",
  borderRadius: 8,
  padding: 12,
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

const panelTitleStyle = {
  color: "#f2d28b",
  margin: "0 0 8px",
  borderBottom: "1px solid #35291a",
  paddingBottom: 4,
  textTransform: "uppercase",
  fontSize: 17,
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
};

const smallButtonStyle = {
  ...buttonStyle,
  padding: "6px 9px",
  fontSize: 13,
};

const dangerButtonStyle = {
  ...smallButtonStyle,
  background: "linear-gradient(180deg, #7f1d1d 0%, #3f1111 100%)",
  border: "1px solid #b91c1c",
};

const flexRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
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
  cursor: "pointer",
};

const rowStyle = {
  padding: 14,
  marginBottom: 8,
  border: "1px solid #303845",
  borderRadius: 6,
  fontSize: 18,
  background: "#1d222b",
};

const activeRowStyle = {
  ...rowStyle,
  background: "linear-gradient(90deg, #6b4f1d, #2a2112)",
  border: "1px solid #d6a03d",
  fontWeight: "bold",
};

const bloodiedStyle = {
  border: "1px solid #dc2626",
  boxShadow: "0 0 10px rgba(220,38,38,0.45)",
  background: "linear-gradient(90deg,#3a1616,#1f1414)",
};

const deadStyle = {
  opacity: 0.45,
  background: "#1a0f0f",
  border: "1px solid #7f1d1d",
  textDecoration: "line-through",
};

const stickyTurnBarStyle = {
  position: "sticky",
  bottom: 0,
  background: "#0d1117",
  paddingTop: 10,
  marginTop: 10,
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

const encounterListStyle = {
  marginTop: 10,
  maxHeight: 260,
  overflowY: "auto",
};

const logBoxStyle = {
  maxHeight: 135,
  overflowY: "auto",
  fontSize: 13,
};