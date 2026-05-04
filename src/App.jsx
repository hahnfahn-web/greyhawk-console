import React, { useEffect, useMemo, useState } from "react";

const BRIDGE_DEFAULT =
  "https://rolls-realms-discord-bridge-production.up.railway.app/api";

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

const globalStyleId = "greyhawk-console-global-style";
if (!document.getElementById(globalStyleId)) {
  const globalStyle = document.createElement("style");
  globalStyle.id = globalStyleId;
  globalStyle.innerHTML = `
    html, body, #root {
      width: 100%;
      min-width: 100%;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      background: #0b0f14;
    }

    #root {
      display: block;
    }
  `;
  document.head.appendChild(globalStyle);
}

export default function App() {
  const [log, setLog] = useState(() => loadSaved("log", []));
  const [bridgeUrl, setBridgeUrl] = useState(() =>
    loadSaved("bridgeUrl", BRIDGE_DEFAULT)
  );
  const [apiKey, setApiKey] = useState(() => loadSaved("apiKey", ""));

  const [calendar, setCalendar] = useState(() =>
    loadSaved("calendar", {
      date: "6 Sunsebb, 576 CY",
      phase: "Morning",
      session: 39,
    })
  );

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
  const [enemyName, setEnemyName] = useState("");
  const [enemyHp, setEnemyHp] = useState("");
  const [enemyInit, setEnemyInit] = useState("");

  const [round, setRound] = useState(() => loadSaved("round", 1));
  const [turnIndex, setTurnIndex] = useState(() => loadSaved("turnIndex", 0));

  const [dungeonAlert, setDungeonAlert] = useState(() =>
    loadSaved("dungeonAlert", 3)
  );
  const [earthCult, setEarthCult] = useState(() => loadSaved("earthCult", 3));
  const [nodeProgress, setNodeProgress] = useState(() =>
    loadSaved("nodeProgress", 35)
  );

  const [sessionPrep, setSessionPrep] = useState(() =>
    loadSaved("sessionPrep", "")
  );
  const [channel, setChannel] = useState(() =>
    loadSaved("channel", "bard-tales")
  );
  const [customMsg, setCustomMsg] = useState(() =>
    loadSaved("customMsg", "")
  );

  const [npcs, setNpcs] = useState(() =>
    loadSaved("npcs", [
      {
        id: 1,
        name: "Burne",
        location: "Hommlet",
        faction: "Hommlet Council",
        attitude: "Helpful",
        status: "Active",
        lastSeen: "Council meeting",
        secret: "Watching for deeper cult movement.",
      },
      {
        id: 2,
        name: "Jaroo Ashstaff",
        location: "Hommlet",
        faction: "Old Faith",
        attitude: "Concerned",
        status: "Active",
        lastSeen: "Near the grove",
        secret: "Senses the earth shifting unnaturally.",
      },
    ])
  );

  const [npcDraft, setNpcDraft] = useState({
    name: "",
    location: "Hommlet",
    faction: "",
    attitude: "Neutral",
    status: "Active",
    lastSeen: "",
    secret: "",
  });

  useEffect(() => localStorage.setItem("log", JSON.stringify(log)), [log]);
  useEffect(() => localStorage.setItem("bridgeUrl", JSON.stringify(bridgeUrl)), [bridgeUrl]);
  useEffect(() => localStorage.setItem("apiKey", JSON.stringify(apiKey)), [apiKey]);
  useEffect(() => localStorage.setItem("calendar", JSON.stringify(calendar)), [calendar]);
  useEffect(() => localStorage.setItem("party", JSON.stringify(party)), [party]);
  useEffect(() => localStorage.setItem("enemies", JSON.stringify(enemies)), [enemies]);
  useEffect(() => localStorage.setItem("round", JSON.stringify(round)), [round]);
  useEffect(() => localStorage.setItem("turnIndex", JSON.stringify(turnIndex)), [turnIndex]);
  useEffect(() => localStorage.setItem("dungeonAlert", JSON.stringify(dungeonAlert)), [dungeonAlert]);
  useEffect(() => localStorage.setItem("earthCult", JSON.stringify(earthCult)), [earthCult]);
  useEffect(() => localStorage.setItem("nodeProgress", JSON.stringify(nodeProgress)), [nodeProgress]);
  useEffect(() => localStorage.setItem("sessionPrep", JSON.stringify(sessionPrep)), [sessionPrep]);
  useEffect(() => localStorage.setItem("channel", JSON.stringify(channel)), [channel]);
  useEffect(() => localStorage.setItem("customMsg", JSON.stringify(customMsg)), [customMsg]);
  useEffect(() => localStorage.setItem("npcs", JSON.stringify(npcs)), [npcs]);

  const pushLog = (msg) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 50));

  const postToDiscord = async (targetChannel, message) => {
    if (!bridgeUrl || !apiKey) {
      pushLog("Bridge not configured.");
      return;
    }

    try {
      const res = await fetch(`${bridgeUrl}/discord/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ channel: targetChannel, message }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      pushLog(`Posted to #${targetChannel}.`);
    } catch (err) {
      pushLog(`Discord post failed: ${err.message}`);
    }
  };

  const updatePartyField = (index, field, value) => {
    setParty((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, [field]: field === "name" ? value : Number(value) || 0 }
          : p
      )
    );
  };

  const updateHp = (index, amount) => {
    setParty((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, hp: clamp(p.hp + amount, 0, p.maxHp) } : p
      )
    );
    pushLog(`${party[index].name} ${amount < 0 ? "takes" : "heals"} ${Math.abs(amount)} HP.`);
  };

  const toggleCondition = (index, condition) => {
    setParty((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const current = p.conditions || [];
        return {
          ...p,
          conditions: current.includes(condition)
            ? current.filter((c) => c !== condition)
            : [...current, condition],
        };
      })
    );
  };

  const addEnemy = () => {
    if (!enemyName || !enemyHp) return;

    setEnemies((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: enemyName,
        hp: Number(enemyHp),
        maxHp: Number(enemyHp),
        init: Number(enemyInit || 0),
      },
    ]);

    pushLog(`Added enemy: ${enemyName}.`);
    setEnemyName("");
    setEnemyHp("");
    setEnemyInit("");
  };

  const updateEnemyHp = (id, amount) => {
    const target = enemies.find((e) => e.id === id);

    setEnemies((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, hp: clamp(e.hp + amount, 0, e.maxHp) } : e
      )
    );

    if (target) pushLog(`${target.name} ${amount < 0 ? "takes" : "heals"} ${Math.abs(amount)} HP.`);
  };

  const removeEnemy = (id) => {
    const target = enemies.find((e) => e.id === id);
    setEnemies((prev) => prev.filter((e) => e.id !== id));
    if (target) pushLog(`Removed enemy: ${target.name}.`);
  };

  const loadCultAmbush = () => {
    setEnemies([
      { id: Date.now() + 1, name: "Cultist Acolyte", hp: 9, maxHp: 9, init: 12 },
      { id: Date.now() + 2, name: "Cultist Acolyte", hp: 9, maxHp: 9, init: 10 },
      { id: Date.now() + 3, name: "Dark Adept", hp: 22, maxHp: 22, init: 14 },
    ]);
    setRound(1);
    setTurnIndex(0);
    pushLog("Loaded encounter: Cult Ambush.");
  };

  const loadGnollPatrol = () => {
    setEnemies([
      { id: Date.now() + 1, name: "Gnoll", hp: 22, maxHp: 22, init: 13 },
      { id: Date.now() + 2, name: "Gnoll", hp: 22, maxHp: 22, init: 11 },
      { id: Date.now() + 3, name: "Gnoll Pack Lord", hp: 49, maxHp: 49, init: 15 },
    ]);
    setRound(1);
    setTurnIndex(0);
    pushLog("Loaded encounter: Gnoll Patrol.");
  };

  const loadEarthTempleGuard = () => {
    setEnemies([
      { id: Date.now() + 1, name: "Earth Guard", hp: 45, maxHp: 45, init: 10 },
      { id: Date.now() + 2, name: "Earth Guard", hp: 45, maxHp: 45, init: 9 },
      { id: Date.now() + 3, name: "Earth Priest", hp: 60, maxHp: 60, init: 12 },
    ]);
    setRound(1);
    setTurnIndex(0);
    pushLog("Loaded encounter: Earth Temple Guard.");
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
      pushLog(`Round ${round + 1} begins.`);
    } else {
      setTurnIndex(next);
      pushLog(`Turn advances to ${initiative[next].name}.`);
    }
  };

  const resetCombat = () => {
    setRound(1);
    setTurnIndex(0);
    pushLog("Combat reset.");
  };

  const advanceDay = () => {
    setCalendar((prev) => ({ ...prev, phase: "Morning" }));
    setDungeonAlert((v) => clamp(v + 1, 0, 5));
    setEarthCult((v) => clamp(v + 1, 0, 5));
    setNodeProgress((v) => clamp(v + 10, 0, 100));
    pushLog("Advanced one day.");
  };

  const buildSessionPrep = () => `## 🕯️ Session Prep

**Date:** ${calendar.date}, ${calendar.phase}  
**Session:** #${calendar.session}  
**Dungeon Alert:** ${dungeonAlert}/5  
**Earth Cult Alert:** ${earthCult}/5  
**Earth Node Progress:** ${nodeProgress}%  

### Notes
- Add encounter notes.
- Add NPC reactions.
- Add treasure reminders.`;

  const postSessionPrep = () =>
    postToDiscord("session-prep", sessionPrep || buildSessionPrep());

  const buildSessionSnapshot = () => {
    const partyText = party.map(p => {
      const conditions = p.conditions?.length ? ` | ${p.conditions.join(", ")}` : "";
      return `${p.name}: ${p.hp}/${p.maxHp} HP | AC ${p.ac} | Init ${p.init}${conditions}`;
    }).join("\n");

    const enemyText = enemies.length
      ? enemies.map(e => `${e.name}: ${e.hp}/${e.maxHp} HP | Init ${e.init}`).join("\n")
      : "None";

    const initiativeText = initiative
      .map((i, idx) => `${idx === turnIndex ? "▶ " : ""}${i.init} — ${i.name} (${i.type})`)
      .join("\n");

    return `📊 **SESSION SNAPSHOT**

🎯 **Combat**
Round: ${round}
Current: ${initiative[turnIndex]?.name || "N/A"}

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

  const postSessionSnapshot = () => {
    postToDiscord("dm-control-room", buildSessionSnapshot());
  };

  const postMissingNotice = () =>
    postToDiscord(
      "help-wanted-table",
      `## 📜 Missing Person Notice — Ganna of Hommlet

**Name:** Ganna, wife of Tarim the Carpenter  
**Last Seen:** Near the eastern edge of Hommlet at dusk  
**Description:** Human woman, dark hair, simple village dress  
**Distinguishing Feature:** Carved wooden pendant  
**Reward:** Offered upon safe return  
**Contact:** Tarim, Carpenter of Hommlet`
    );

  const postCultLog = () =>
    postToDiscord(
      "cult-activity-log",
      `## 👁️ Cult Activity Log

**Earth Cult Alert:** ${earthCult}/5  
**Dungeon Alert:** ${dungeonAlert}/5  
**Earth Node Progress:** ${nodeProgress}%`
    );

  const updateNpc = (id, field, value) => {
    setNpcs((prev) =>
      prev.map((npc) => (npc.id === id ? { ...npc, [field]: value } : npc))
    );
  };

  const addNpc = () => {
    if (!npcDraft.name.trim()) {
      pushLog("NPC name required.");
      return;
    }

    const npc = {
      ...npcDraft,
      id: Date.now(),
      name: npcDraft.name.trim(),
    };

    setNpcs((prev) => [...prev, npc]);
    setNpcDraft({
      name: "",
      location: "Hommlet",
      faction: "",
      attitude: "Neutral",
      status: "Active",
      lastSeen: "",
      secret: "",
    });
    pushLog(`Added NPC: ${npc.name}.`);
  };

  const removeNpc = (id) => {
    const target = npcs.find((npc) => npc.id === id);
    setNpcs((prev) => prev.filter((npc) => npc.id !== id));
    if (target) pushLog(`Removed NPC: ${target.name}.`);
  };

  const buildNpcNote = (npc) => `## 🧑‍🌾 NPC Note — ${npc.name}

**Location:** ${npc.location || "Unknown"}  
**Faction:** ${npc.faction || "None / Unknown"}  
**Attitude:** ${npc.attitude || "Neutral"}  
**Status:** ${npc.status || "Unknown"}  
**Last Seen:** ${npc.lastSeen || "Unknown"}  

### DM Secret / Note
${npc.secret || "No secret recorded."}`;

  const postNpcNote = (npc) => {
    postToDiscord("dm-control-room", buildNpcNote(npc));
  };

  const resetSavedState = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Greyhawk Command Console</h1>

        <main style={gridStyle}>
          <Panel title="Discord Bridge">
            <input style={inputStyle} value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} />
            <input style={inputStyle} value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" />
          </Panel>

          <Panel title="Calendar / Time">
            <div>{calendar.date}</div>
            <div>{calendar.phase}</div>
            <button style={buttonStyle} onClick={() => setCalendar((c) => ({ ...c, phase: "Evening" }))}>Evening</button>{" "}
            <button style={buttonStyle} onClick={advanceDay}>+1 Day</button>
          </Panel>

          <Panel title="Faction / Node">
            <div>Earth Cult: {earthCult}/5</div>
            <div>Dungeon: {dungeonAlert}/5</div>
            <div>Earth Node: {nodeProgress}%</div>
            <button style={buttonStyle} onClick={() => setEarthCult((v) => clamp(v + 1, 0, 5))}>Cult +</button>{" "}
            <button style={buttonStyle} onClick={() => setDungeonAlert((v) => clamp(v + 1, 0, 5))}>Dungeon +</button>{" "}
            <button style={buttonStyle} onClick={() => setNodeProgress((v) => clamp(v + 10, 0, 100))}>Node +</button>
          </Panel>

          <Panel title="Party Manager" span={2}>
            <div style={partyGridStyle}>
              {party.map((p, i) => (
                <div key={`${p.name}-${i}`} style={partyRowStyle}>
                  <input style={nameInputStyle} value={p.name} onChange={(e) => updatePartyField(i, "name", e.target.value)} />
                  <span>HP</span>
                  <input style={smallInputStyle} value={p.hp} onChange={(e) => updatePartyField(i, "hp", e.target.value)} />
                  <span>/</span>
                  <input style={smallInputStyle} value={p.maxHp} onChange={(e) => updatePartyField(i, "maxHp", e.target.value)} />
                  <span>AC</span>
                  <input style={smallInputStyle} value={p.ac} onChange={(e) => updatePartyField(i, "ac", e.target.value)} />
                  <span>Init</span>
                  <input style={smallInputStyle} value={p.init} onChange={(e) => updatePartyField(i, "init", e.target.value)} />
                  <button style={smallButtonStyle} onClick={() => updateHp(i, -5)}>-5</button>
                  <button style={smallButtonStyle} onClick={() => updateHp(i, 5)}>+5</button>

                  <div style={conditionWrapStyle}>
                    {CONDITIONS.map((c) => {
                      const isActive = (p.conditions || []).includes(c);
                      return (
                        <button
                          key={c}
                          style={{
                            ...conditionButtonStyle,
                            background: isActive ? "#8a6d1d" : "#252a33",
                            color: isActive ? "#fff2b8" : "#cbd5e1",
                          }}
                          onClick={() => toggleCondition(i, c)}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Combat Tracker" span={2}>
            <div>Round: {round}</div>
            <div>Current: {active ? `${active.name} (${active.type})` : "None"}</div>
            <button style={buttonStyle} onClick={nextTurn}>Next Turn</button>{" "}
            <button style={buttonStyle} onClick={resetCombat}>Reset</button>

            <div style={initiativeBoxStyle}>
              {initiative.map((c, i) => (
                <div
                  key={`${c.type}-${c.id}`}
                  style={{
                    ...initiativeRowStyle,
                    background: i === turnIndex ? "#4a3415" : "#1d222b",
                    borderColor: i === turnIndex ? "#d6a03d" : "#303845",
                  }}
                >
                  {i === turnIndex ? "▶ " : ""}
                  <strong>{c.init}</strong> — {c.name} ({c.type}) — {c.hp}/{c.maxHp}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Enemies">
            <div style={enemyInputGridStyle}>
              <input style={inputStyle} placeholder="Name" value={enemyName} onChange={(e) => setEnemyName(e.target.value)} />
              <input style={inputStyle} placeholder="HP" value={enemyHp} onChange={(e) => setEnemyHp(e.target.value)} />
              <input style={inputStyle} placeholder="Init" value={enemyInit} onChange={(e) => setEnemyInit(e.target.value)} />
              <button style={buttonStyle} onClick={addEnemy}>Add</button>
            </div>

            {enemies.map((e) => (
              <div key={e.id} style={enemyRowStyle}>
                <strong>{e.name}</strong> {e.hp}/{e.maxHp} HP Init {e.init}
                <button style={smallButtonStyle} onClick={() => updateEnemyHp(e.id, -5)}>-5</button>
                <button style={smallButtonStyle} onClick={() => updateEnemyHp(e.id, 5)}>+5</button>
                <button style={smallButtonStyle} onClick={() => removeEnemy(e.id)}>Remove</button>
              </div>
            ))}
          </Panel>

          <Panel title="NPC Tracker" span={2}>
            <div style={npcDraftGridStyle}>
              <input style={inputStyle} placeholder="NPC name" value={npcDraft.name} onChange={(e) => setNpcDraft({ ...npcDraft, name: e.target.value })} />
              <input style={inputStyle} placeholder="Location" value={npcDraft.location} onChange={(e) => setNpcDraft({ ...npcDraft, location: e.target.value })} />
              <input style={inputStyle} placeholder="Faction" value={npcDraft.faction} onChange={(e) => setNpcDraft({ ...npcDraft, faction: e.target.value })} />
              <select style={inputStyle} value={npcDraft.attitude} onChange={(e) => setNpcDraft({ ...npcDraft, attitude: e.target.value })}>
                <option>Helpful</option>
                <option>Friendly</option>
                <option>Neutral</option>
                <option>Suspicious</option>
                <option>Hostile</option>
              </select>
              <select style={inputStyle} value={npcDraft.status} onChange={(e) => setNpcDraft({ ...npcDraft, status: e.target.value })}>
                <option>Active</option>
                <option>Missing</option>
                <option>Dead</option>
                <option>Captured</option>
                <option>Unknown</option>
              </select>
              <input style={inputStyle} placeholder="Last seen" value={npcDraft.lastSeen} onChange={(e) => setNpcDraft({ ...npcDraft, lastSeen: e.target.value })} />
            </div>

            <textarea
              style={textAreaStyle}
              placeholder="Secret / DM note"
              value={npcDraft.secret}
              onChange={(e) => setNpcDraft({ ...npcDraft, secret: e.target.value })}
            />

            <button style={buttonStyle} onClick={addNpc}>Add NPC</button>

            <div style={npcListStyle}>
              {npcs.map((npc) => (
                <div key={npc.id} style={npcCardStyle}>
                  <input style={inputStyle} value={npc.name} onChange={(e) => updateNpc(npc.id, "name", e.target.value)} />
                  <div style={npcMiniGridStyle}>
                    <input style={inputStyle} value={npc.location} onChange={(e) => updateNpc(npc.id, "location", e.target.value)} />
                    <input style={inputStyle} value={npc.faction} onChange={(e) => updateNpc(npc.id, "faction", e.target.value)} />
                    <select style={inputStyle} value={npc.attitude} onChange={(e) => updateNpc(npc.id, "attitude", e.target.value)}>
                      <option>Helpful</option>
                      <option>Friendly</option>
                      <option>Neutral</option>
                      <option>Suspicious</option>
                      <option>Hostile</option>
                    </select>
                    <select style={inputStyle} value={npc.status} onChange={(e) => updateNpc(npc.id, "status", e.target.value)}>
                      <option>Active</option>
                      <option>Missing</option>
                      <option>Dead</option>
                      <option>Captured</option>
                      <option>Unknown</option>
                    </select>
                  </div>
                  <input style={inputStyle} value={npc.lastSeen} onChange={(e) => updateNpc(npc.id, "lastSeen", e.target.value)} />
                  <textarea style={textAreaStyle} value={npc.secret} onChange={(e) => updateNpc(npc.id, "secret", e.target.value)} />
                  <button style={buttonStyle} onClick={() => postNpcNote(npc)}>Post NPC Note</button>{" "}
                  <button style={dangerButtonStyle} onClick={() => removeNpc(npc.id)}>Remove</button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Encounter Presets">
            <button style={buttonStyle} onClick={loadCultAmbush}>Cult Ambush</button>{" "}
            <button style={buttonStyle} onClick={loadGnollPatrol}>Gnoll Patrol</button>{" "}
            <button style={buttonStyle} onClick={loadEarthTempleGuard}>Earth Temple Guard</button>
          </Panel>

          <Panel title="Session Prep">
            <button style={buttonStyle} onClick={() => setSessionPrep(buildSessionPrep())}>Auto Fill</button>{" "}
            <button style={buttonStyle} onClick={postSessionPrep}>Post</button>
            <textarea style={textAreaStyle} value={sessionPrep} onChange={(e) => setSessionPrep(e.target.value)} />
          </Panel>

          <Panel title="Post to Channel">
            <select style={inputStyle} value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="bard-tales">#bard-tales</option>
              <option value="session-prep">#session-prep</option>
              <option value="dm-control-room">#dm-control-room</option>
              <option value="cult-activity-log">#cult-activity-log</option>
              <option value="help-wanted-table">#help-wanted-table</option>
            </select>
            <textarea style={textAreaStyle} value={customMsg} onChange={(e) => setCustomMsg(e.target.value)} />
            <button
              style={buttonStyle}
              onClick={() => {
                if (!customMsg.trim()) return;
                postToDiscord(channel, customMsg);
                setCustomMsg("");
              }}
            >
              Post Message
            </button>
          </Panel>

          <Panel title="DM Actions">
            <button style={buttonStyle} onClick={postMissingNotice}>Missing Person Notice</button>{" "}
            <button style={buttonStyle} onClick={postCultLog}>Post Cult Log</button>{" "}
            <button style={buttonStyle} onClick={postSessionSnapshot}>📊 Snapshot</button>{" "}
            <button style={dangerButtonStyle} onClick={resetSavedState}>Reset Saved State</button>
          </Panel>

          <Panel title="Log" span={2}>
            <div style={logBoxStyle}>
              {log.length === 0 ? <p>No actions yet.</p> : log.map((l, i) => <div key={i}>• {l}</div>)}
            </div>
          </Panel>
        </main>
      </div>
    </div>
  );
}

function Panel({ title, children, span = 1 }) {
  return (
    <section
      style={{
        ...panelStyle,
        gridColumn: `span ${span}`,
      }}
    >
      <h2 style={panelTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

const pageStyle = {
  width: "100%",
  minHeight: "100vh",
  background: "radial-gradient(circle at top,#202733,#0b0f14)",
  color: "#e5e7eb",
  fontFamily: "Georgia, 'Times New Roman', serif",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const containerStyle = {
  width: "100%",
  padding: 12,
  boxSizing: "border-box",
};

const titleStyle = {
  color: "#f2d28b",
  textAlign: "center",
  fontSize: 34,
  margin: "8px 0 14px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 12,
  width: "100%",
  boxSizing: "border-box",
};

const panelStyle = {
  background: "#0d1117",
  border: "1px solid #3b4351",
  borderRadius: 8,
  padding: 10,
  minWidth: 0,
  boxSizing: "border-box",
  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
};

const panelTitleStyle = {
  color: "#f2d28b",
  fontSize: 17,
  margin: "0 0 8px",
  borderBottom: "1px solid #35291a",
  paddingBottom: 4,
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  padding: 6,
  marginBottom: 6,
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid #3b4351",
  borderRadius: 4,
  boxSizing: "border-box",
};

const nameInputStyle = {
  ...inputStyle,
  width: 110,
  marginBottom: 0,
};

const smallInputStyle = {
  ...inputStyle,
  width: 48,
  marginBottom: 0,
};

const buttonStyle = {
  background: "linear-gradient(180deg, #4b5563 0%, #252b34 100%)",
  color: "#f8fafc",
  border: "1px solid #6b7280",
  borderRadius: 4,
  padding: "4px 8px",
  cursor: "pointer",
  margin: 2,
};

const smallButtonStyle = {
  ...buttonStyle,
  padding: "2px 6px",
  fontSize: 12,
};

const dangerButtonStyle = {
  ...buttonStyle,
  background: "linear-gradient(180deg, #7f1d1d 0%, #3f1111 100%)",
  border: "1px solid #b91c1c",
};

const partyGridStyle = {
  display: "grid",
  gap: 8,
};

const partyRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  padding: 8,
  background: "#121821",
  border: "1px solid #303845",
  borderRadius: 6,
};

const conditionWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  width: "100%",
};

const conditionButtonStyle = {
  border: "1px solid #3b4351",
  borderRadius: 4,
  padding: "2px 5px",
  fontSize: 11,
  cursor: "pointer",
};

const initiativeBoxStyle = {
  marginTop: 10,
  maxHeight: 260,
  overflowY: "auto",
};

const initiativeRowStyle = {
  padding: 7,
  marginBottom: 5,
  border: "1px solid",
  borderRadius: 5,
};

const enemyInputGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 70px 70px 60px",
  gap: 6,
};

const enemyRowStyle = {
  padding: 6,
  borderBottom: "1px solid #303845",
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
};

const npcDraftGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 6,
};

const npcListStyle = {
  display: "grid",
  gap: 8,
  marginTop: 10,
  maxHeight: 420,
  overflowY: "auto",
};

const npcCardStyle = {
  background: "#121821",
  border: "1px solid #303845",
  borderRadius: 6,
  padding: 8,
};

const npcMiniGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 6,
};

const textAreaStyle = {
  width: "100%",
  minHeight: 110,
  padding: 8,
  marginTop: 6,
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid #3b4351",
  borderRadius: 4,
  boxSizing: "border-box",
};

const logBoxStyle = {
  maxHeight: 180,
  overflowY: "auto",
  fontSize: 13,
};