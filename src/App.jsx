import React, { useEffect, useMemo, useState } from "react";

const BRIDGE_DEFAULT =
  "https://rolls-realms-discord-bridge-production.up.railway.app/api";

const CONDITIONS = [
  "Blessed", "Raging", "Prone", "Poisoned", "Frightened",
  "Restrained", "Stunned", "Invisible", "Concentrating", "Unconscious",
];

const MONSTER_CONDITIONS = [
  "Prone", "Poisoned", "Restrained", "Frightened", "Stunned",
  "Invisible", "Concentrating", "Charmed", "Grappled", "Dead",
];

const ACTION_DETAILS = {
  Scimitar: {
    roll: "Melee Weapon Attack: d20 + attack bonus vs target AC.",
    effect: "On hit, deal slashing damage. Use this when adjacent to a vulnerable or isolated PC.",
    note: "Typical cultist attack. Pick a wounded or lightly armored target if possible.",
  },
  "Dark Prayer": {
    roll: "No attack roll by default unless you decide it mimics a cantrip or cult feature.",
    effect: "Use as a sinister support action: grant advantage to an ally's next attack, call for aid, or intensify cult morale.",
    note: "Good for atmosphere when the cultist cannot reach a target.",
  },
  Dodge: {
    roll: "No roll. Attacks against the creature have disadvantage until its next turn if it can see the attacker.",
    effect: "Defensive action. Also gives advantage on Dexterity saving throws.",
    note: "Use while guarding a doorway, priest, ritual object, or alarm point.",
  },
  Disengage: {
    roll: "No roll.",
    effect: "Movement does not provoke opportunity attacks for the rest of the turn.",
    note: "Use to reposition, flee, protect a leader, or reach an alarm gong.",
  },
  Retreat: {
    roll: "Usually no roll unless contested by terrain, grapples, or chase rules.",
    effect: "Move toward reinforcements, cover, a defensible chokepoint, or escape route.",
    note: "Best when bloodied, outnumbered, or when the monster has useful information to preserve.",
  },
  Mace: {
    roll: "Melee Weapon Attack: d20 + attack bonus vs target AC.",
    effect: "On hit, deal bludgeoning damage.",
    note: "Use when the caster/priest is cornered or conserving spells.",
  },
  "Sacred Flame": {
    roll: "Target makes a Dexterity saving throw vs the caster's spell save DC.",
    effect: "On failed save, target takes radiant damage. No effect on a successful save.",
    note: "Good against high-AC targets because it uses a saving throw instead of an attack roll.",
  },
  Bless: {
    roll: "No attack roll. Concentration spell.",
    effect: "Up to three allies add 1d4 to attack rolls and saving throws while the spell lasts.",
    note: "Best in round 1 if several allies are alive. Mark the caster as Concentrating.",
  },
  Command: {
    roll: "Target makes a Wisdom saving throw vs spell save DC.",
    effect: "On failed save, target follows a one-word command on its next turn if the command is not directly harmful.",
    note: "Strong options: Drop, Flee, Grovel, Halt, Approach.",
  },
  Bite: {
    roll: "Melee Weapon Attack: d20 + attack bonus vs target AC.",
    effect: "On hit, deal piercing damage.",
    note: "Gnolls favor wounded prey and isolated targets.",
  },
  Spear: {
    roll: "Melee or Ranged Weapon Attack: d20 + attack bonus vs target AC.",
    effect: "On hit, deal piercing damage.",
    note: "Use thrown spear if the gnoll cannot reach the target this turn.",
  },
  Rampage: {
    roll: "Triggered after reducing a creature to 0 HP with a melee attack on its turn.",
    effect: "The gnoll can move up to half its speed and make a bite attack as a bonus action.",
    note: "Use immediately if available; it makes gnolls feel savage and dangerous.",
  },
  Dash: {
    roll: "No roll.",
    effect: "Gain extra movement equal to speed for the turn.",
    note: "Use to close distance, flee, reach cover, or surround a weak target.",
  },
  Glaive: {
    roll: "Melee Weapon Attack: d20 + attack bonus vs target AC, usually reach 10 ft if using a glaive profile.",
    effect: "On hit, deal slashing damage.",
    note: "Good for controlling space and striking from behind allies.",
  },
  "Incite Rampage": {
    roll: "No standard 5E roll unless you assign a morale check.",
    effect: "Use as a commander action: order nearby gnolls to focus a wounded PC or press the attack.",
    note: "Great for pack leaders; reinforces brutal pack tactics.",
  },
  Threaten: {
    roll: "Optional Charisma (Intimidation) check contested by Wisdom (Insight) or set a DC.",
    effect: "Demoralize, delay, demand surrender, or force hesitation narratively.",
    note: "Use when the leader wants captives or to buy time.",
  },
  Warhammer: {
    roll: "Melee Weapon Attack: d20 + attack bonus vs target AC.",
    effect: "On hit, deal bludgeoning damage.",
    note: "Earth guards prefer steady, disciplined attacks in chokepoints.",
  },
  "Shield Bash": {
    roll: "Use an opposed Strength (Athletics) check or target Strength/Dexterity saving throw, DM choice.",
    effect: "On success, shove the target 5 ft or knock it prone.",
    note: "Use to break formations, push PCs into hazards, or protect a priest.",
  },
  "Guard Priest": {
    roll: "No roll.",
    effect: "Move to block access, impose tactical pressure, or use Help/Dodge to protect the priest.",
    note: "Best if the Earth Priest is concentrating or bloodied.",
  },
  "Hold Person": {
    roll: "Humanoid target makes a Wisdom saving throw vs spell save DC.",
    effect: "On failed save, target is paralyzed. Repeat save at end of each of its turns.",
    note: "Very strong against melee threats. Remember: attacks within 5 ft against paralyzed targets are critical hits if they hit.",
  },
  "Spiritual Weapon": {
    roll: "Melee Spell Attack: d20 + spell attack bonus vs target AC.",
    effect: "On hit, deal force damage. Usually bonus action to cast and bonus action to move/attack on later turns.",
    note: "Excellent because it does not require concentration in 2014 5E.",
  },
  "Cure Wounds": {
    roll: "Healing roll based on spell slot and spellcasting modifier.",
    effect: "Restore HP to a touched ally or self.",
    note: "Use if it keeps a leader or key defender alive. Avoid wasting it on doomed minions.",
  },
  "Command Retreat": {
    roll: "No roll unless morale is contested.",
    effect: "Order allies to fall back, regroup, raise alarm, or protect the ritual area.",
    note: "Use when the fight is turning against the cult.",
  },
  Attack: {
    roll: "Attack roll: d20 + attack bonus vs target AC.",
    effect: "On hit, deal the monster's normal weapon or natural attack damage.",
    note: "Default option when no special action applies.",
  },
  Flee: {
    roll: "No roll unless chase, difficult terrain, or grappling applies.",
    effect: "The creature prioritizes survival or warning allies.",
    note: "Use for intelligent enemies who are bloodied, isolated, or outmatched.",
  },
};

function getActionDetails(monster, action) {
  const actionObject = typeof action === "string" ? { name: action } : action;
  const actionName = actionObject.name || "Action";

  if (actionObject.roll || actionObject.effect || actionObject.hit || actionObject.save) {
    const roll = actionObject.roll
      || (actionObject.attackBonus !== undefined
        ? `${actionObject.type || "Attack"}: d20 +${actionObject.attackBonus} vs AC.`
        : actionObject.save
          ? `Target makes a DC ${actionObject.dc || monster.spellSaveDc || 12} ${actionObject.save} saving throw.`
          : "No roll unless the DM calls for one.");

    return {
      roll,
      effect: actionObject.effect || actionObject.hit || "Resolve according to the monster's action text.",
      note: actionObject.tactics || actionObject.note || "Use when tactically appropriate.",
    };
  }

  const fallback = ACTION_DETAILS[actionName];
  if (!fallback) {
    return {
      roll: "Use the most appropriate 2014 5E roll: attack roll, saving throw, ability check, or no roll if purely tactical.",
      effect: "Resolve based on the monster's stat block or your encounter notes.",
      note: "Use this action if it fits the creature's instincts, orders, and battlefield position.",
    };
  }

  let roll = fallback.roll;
  if (roll.includes("d20 + attack bonus")) {
    roll = roll.replace("d20 + attack bonus", `d20 +${monster.attackBonus || 3}`);
  }
  if (roll.includes("spell save DC")) {
    roll = roll.replace("spell save DC", `DC ${monster.spellSaveDc || 12}`);
  }
  if (roll.includes("spell attack bonus")) {
    roll = roll.replace("spell attack bonus", `+${monster.spellAttackBonus || 4}`);
  }

  return {
    roll,
    effect: fallback.effect,
    note: fallback.note,
  };
}

const DEFAULT_MONSTER_LIBRARY = [
  {
    name: "Cultist Acolyte",
    hp: 9,
    maxHp: 9,
    ac: 12,
    init: 10,
    xp: 25,
    actions: ["Scimitar", "Dark Prayer", "Dodge", "Disengage"],
    tactics: ["Swarm isolated targets.", "Protect the adept.", "Flee if alone and bloodied."],
    loot: ["1d6 sp", "earth cult token"],
  },
  {
    name: "Dark Adept",
    hp: 22,
    maxHp: 22,
    ac: 13,
    init: 14,
    xp: 100,
    actions: ["Mace", "Sacred Flame", "Bless", "Command", "Retreat"],
    tactics: ["Open with Bless if allies remain.", "Target wounded or isolated PCs.", "Retreat toward reinforcements when bloodied."],
    loot: ["ritual dagger", "black earth charm", "12 sp"],
  },
  {
    name: "Gnoll",
    hp: 22,
    maxHp: 22,
    ac: 15,
    init: 11,
    xp: 100,
    actions: ["Bite", "Spear", "Rampage", "Dash"],
    tactics: ["Flank with allies.", "Attack wounded targets.", "Retreat if pack lord dies."],
    loot: ["crude spear", "3d6 cp"],
  },
  {
    name: "Gnoll Pack Lord",
    hp: 49,
    maxHp: 49,
    ac: 15,
    init: 15,
    xp: 450,
    actions: ["Glaive", "Bite", "Incite Rampage", "Threaten", "Retreat"],
    tactics: ["Lead from the front.", "Focus the strongest-looking warrior.", "Use allies to surround spellcasters."],
    loot: ["iron torc", "bloody battle standard", "2d10 sp"],
  },
  {
    name: "Earth Guard",
    hp: 45,
    maxHp: 45,
    ac: 16,
    init: 10,
    xp: 200,
    actions: ["Warhammer", "Shield Bash", "Guard Priest", "Dodge"],
    tactics: ["Hold chokepoints.", "Protect the priest.", "Do not pursue far from assigned post."],
    loot: ["heavy shield", "earth temple tabard"],
  },
  {
    name: "Earth Priest",
    hp: 60,
    maxHp: 60,
    ac: 14,
    init: 12,
    xp: 450,
    actions: ["Mace", "Hold Person", "Spiritual Weapon", "Cure Wounds", "Command Retreat"],
    tactics: ["Disable dangerous melee attackers.", "Use guards as cover.", "Heal only if it preserves command of the fight."],
    loot: ["obsidian holy symbol", "scroll fragment", "25 sp"],
  },
];

const DEFAULT_ENCOUNTERS = [
  {
    name: "Cult Ambush",
    enemies: [
      {
        name: "Cultist Acolyte",
        hp: 9,
        maxHp: 9,
        ac: 12,
        init: 12,
        xp: 25,
        actions: ["Scimitar", "Dark Prayer", "Dodge", "Disengage"],
        tactics: ["Swarm isolated targets.", "Protect the adept.", "Flee if alone and bloodied."],
        loot: ["2d6 cp", "earth cult token"],
      },
      {
        name: "Cultist Acolyte",
        hp: 9,
        maxHp: 9,
        ac: 12,
        init: 10,
        xp: 25,
        actions: ["Scimitar", "Dark Prayer", "Dodge", "Disengage"],
        tactics: ["Swarm isolated targets.", "Protect the adept.", "Flee if alone and bloodied."],
        loot: ["1d6 sp"],
      },
      {
        name: "Dark Adept",
        hp: 22,
        maxHp: 22,
        ac: 13,
        init: 14,
        xp: 100,
        actions: ["Mace", "Sacred Flame", "Bless", "Command", "Retreat"],
        tactics: ["Open with Bless if allies remain.", "Target wounded or isolated PCs.", "Retreat toward reinforcements when bloodied."],
        loot: ["ritual dagger", "black earth charm", "12 sp"],
      },
    ],
  },
  {
    name: "Gnoll Patrol",
    enemies: [
      {
        name: "Gnoll",
        hp: 22,
        maxHp: 22,
        ac: 15,
        init: 13,
        xp: 100,
        actions: ["Bite", "Spear", "Rampage", "Dash"],
        tactics: ["Attack wounded targets.", "Use Rampage after dropping a foe.", "Fight brutally unless leader falls."],
        loot: ["crude spear", "3d6 cp"],
      },
      {
        name: "Gnoll",
        hp: 22,
        maxHp: 22,
        ac: 15,
        init: 11,
        xp: 100,
        actions: ["Bite", "Spear", "Rampage", "Dash"],
        tactics: ["Flank with allies.", "Attack lightly armored PCs.", "Retreat if pack lord dies."],
        loot: ["bone charm", "1d6 sp"],
      },
      {
        name: "Gnoll Pack Lord",
        hp: 49,
        maxHp: 49,
        ac: 15,
        init: 15,
        xp: 450,
        actions: ["Glaive", "Bite", "Incite Rampage", "Threaten", "Retreat"],
        tactics: ["Lead from the front.", "Focus the strongest-looking warrior.", "Use allies to surround spellcasters."],
        loot: ["iron torc", "bloody battle standard", "2d10 sp"],
      },
    ],
  },
  {
    name: "Earth Temple Guard",
    enemies: [
      {
        name: "Earth Guard",
        hp: 45,
        maxHp: 45,
        ac: 16,
        init: 10,
        xp: 200,
        actions: ["Warhammer", "Shield Bash", "Guard Priest", "Dodge"],
        tactics: ["Hold chokepoints.", "Protect the priest.", "Do not pursue far from assigned post."],
        loot: ["heavy shield", "earth temple tabard"],
      },
      {
        name: "Earth Guard",
        hp: 45,
        maxHp: 45,
        ac: 16,
        init: 9,
        xp: 200,
        actions: ["Warhammer", "Shield Bash", "Guard Priest", "Dodge"],
        tactics: ["Block exits.", "Target intruders near the priest.", "Call alarm if outmatched."],
        loot: ["warhammer", "8 sp"],
      },
      {
        name: "Earth Priest",
        hp: 60,
        maxHp: 60,
        ac: 14,
        init: 12,
        xp: 450,
        actions: ["Mace", "Hold Person", "Spiritual Weapon", "Cure Wounds", "Command Retreat"],
        tactics: ["Disable dangerous melee attackers.", "Use guards as cover.", "Heal only if it preserves command of the fight."],
        loot: ["obsidian holy symbol", "scroll fragment", "25 sp"],
      },
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

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeMonster(monster, index = 0) {
  const base = {
    id: monster.id || Date.now() + index,
    name: monster.name || "Unknown Foe",
    size: monster.size || "Medium",
    type: monster.type || "humanoid",
    alignment: monster.alignment || "unaligned",
    hp: Number(monster.hp ?? monster.maxHp ?? 1),
    maxHp: Number(monster.maxHp ?? monster.hp ?? 1),
    ac: Number(monster.ac ?? 12),
    speed: monster.speed || "30 ft.",
    init: Number(monster.init ?? 0),
    xp: Number(monster.xp ?? 0),
    attackBonus: Number(monster.attackBonus ?? 3),
    spellSaveDc: Number(monster.spellSaveDc ?? 12),
    spellAttackBonus: Number(monster.spellAttackBonus ?? 4),
    abilities: monster.abilities || {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    },
    saves: monster.saves || "—",
    skills: monster.skills || "—",
    senses: monster.senses || "passive Perception 10",
    languages: monster.languages || "—",
    traits: monster.traits || [],
    conditions: monster.conditions || [],
    tactics: monster.tactics || ["Attack the nearest threat.", "Use cover if available.", "Retreat if bloodied."],
    loot: monster.loot || [],
  };

  base.actions = (monster.actions || ["Attack", "Dodge", "Disengage", "Flee"]).map((action) =>
    typeof action === "string" ? { name: action } : action
  );

  return base;
}

function getPhase(hour) {
  if (hour >= 6 && hour <= 11) return "Morning";
  if (hour >= 12 && hour <= 16) return "Afternoon";
  if (hour >= 17 && hour <= 20) return "Evening";
  return "Night";
}

function formatHour(hour) {
  const safeHour = typeof hour === "number" ? hour : 8;
  const suffix = safeHour >= 12 ? "PM" : "AM";
  const normalized = safeHour % 12 || 12;
  return `${normalized}:00 ${suffix}`;
}

function nextMoonPhase(current) {
  const phases = ["New Moon", "Waxing", "Full Moon", "Waning"];
  const idx = phases.indexOf(current);
  return phases[(idx + 1) % phases.length];
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
    loadSaved("calendar", {
      date: "6 Sunsebb, 576 CY",
      phase: "Morning",
      time: 8,
      day: 6,
      month: "Sunsebb",
      year: 576,
      dungeonTurn: 0,
      moonPhase: "Waxing",
      session: 39,
    })
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
  const [defeatedEnemies, setDefeatedEnemies] = useState(() => loadSaved("defeatedEnemies", []));
  const [enemyForm, setEnemyForm] = useState({ name: "", hp: "", ac: "", init: "", xp: "" });
  const [monsterLibrary, setMonsterLibrary] = useState(() => loadSaved("monsterLibrary", DEFAULT_MONSTER_LIBRARY));
  const [monsterSearch, setMonsterSearch] = useState("");

  const [round, setRound] = useState(() => loadSaved("round", 1));
  const [turnIndex, setTurnIndex] = useState(() => loadSaved("turnIndex", 0));
  const [activeEncounterName, setActiveEncounterName] = useState(() => loadSaved("activeEncounterName", "Current Encounter"));
  const [encounterSummary, setEncounterSummary] = useState(() => loadSaved("encounterSummary", ""));
  const [selectedActionInfo, setSelectedActionInfo] = useState(() => loadSaved("selectedActionInfo", null));
  const [editingMonsterId, setEditingMonsterId] = useState(null);
  const [editingActionIndex, setEditingActionIndex] = useState(null);
  const [actionEditor, setActionEditor] = useState({
    name: "",
    attackBonus: "",
    save: "",
    dc: "",
    hit: "",
    effect: "",
    tactics: "",
  });

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
  useEffect(() => localStorage.setItem("defeatedEnemies", JSON.stringify(defeatedEnemies)), [defeatedEnemies]);
  useEffect(() => localStorage.setItem("monsterLibrary", JSON.stringify(monsterLibrary)), [monsterLibrary]);
  useEffect(() => localStorage.setItem("round", JSON.stringify(round)), [round]);
  useEffect(() => localStorage.setItem("turnIndex", JSON.stringify(turnIndex)), [turnIndex]);
  useEffect(() => localStorage.setItem("activeEncounterName", JSON.stringify(activeEncounterName)), [activeEncounterName]);
  useEffect(() => localStorage.setItem("encounterSummary", JSON.stringify(encounterSummary)), [encounterSummary]);
  useEffect(() => localStorage.setItem("selectedActionInfo", JSON.stringify(selectedActionInfo)), [selectedActionInfo]);
  useEffect(() => localStorage.setItem("npcs", JSON.stringify(npcs)), [npcs]);
  useEffect(() => localStorage.setItem("sessionPrep", JSON.stringify(sessionPrep)), [sessionPrep]);
  useEffect(() => localStorage.setItem("savedEncounters", JSON.stringify(savedEncounters)), [savedEncounters]);

  const addLog = (msg) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 75));

  const initiative = useMemo(() => {
    const pcs = party.map((p, i) => ({ ...p, id: `pc-${i}`, type: "PC" }));
    const foes = enemies.map((e) => ({ ...e, id: `enemy-${e.id}`, type: "Enemy" }));
    return [...pcs, ...foes].sort((a, b) => b.init - a.init || a.name.localeCompare(b.name));
  }, [party, enemies]);

  const active = initiative[turnIndex] || null;

  const getCampaignState = () => ({
    party,
    enemies,
    defeatedEnemies,
    monsterLibrary,
    turnIndex,
    round,
    activeEncounterName,
    encounterSummary,
    npcs,
    encounterName,
    savedEncounters,
    earthCult,
    dungeonAlert,
    nodeProgress,
    calendar,
    log,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem("greyhawkCampaignAutosave", JSON.stringify(getCampaignState()));
    }, 60000);
    return () => clearInterval(interval);
  }, [party, enemies, defeatedEnemies, monsterLibrary, turnIndex, round, activeEncounterName, encounterSummary, npcs, encounterName, savedEncounters, earthCult, dungeonAlert, nodeProgress, calendar, log]);

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
    const enemy = normalizeMonster({
      id: Date.now(),
      name: enemyForm.name.trim(),
      hp: Number(enemyForm.hp),
      maxHp: Number(enemyForm.hp),
      ac: Number(enemyForm.ac || 12),
      init: Number(enemyForm.init || 0),
      xp: Number(enemyForm.xp || 0),
    });
    setEnemies((prev) => [...prev, enemy]);
    setEnemyForm({ name: "", hp: "", ac: "", init: "", xp: "" });
    addLog(`Enemy added: ${enemy.name}.`);
  };

  const addMonsterFromLibrary = (monster) => {
    const enemy = normalizeMonster({ ...monster, id: Date.now() });
    setEnemies((prev) => [...prev, enemy]);
    addLog(`📚 Added ${enemy.name} from Monster Library.`);
  };

  const saveFormToMonsterLibrary = () => {
    if (!enemyForm.name.trim() || !enemyForm.hp) {
      addLog("❌ Monster name and HP required to save.");
      return;
    }

    const monster = normalizeMonster({
      name: enemyForm.name.trim(),
      hp: Number(enemyForm.hp),
      maxHp: Number(enemyForm.hp),
      ac: Number(enemyForm.ac || 12),
      init: Number(enemyForm.init || 0),
      xp: Number(enemyForm.xp || 0),
    });

    setMonsterLibrary((prev) => {
      const exists = prev.some((m) => m.name.toLowerCase() === monster.name.toLowerCase());
      if (exists) {
        addLog(`❌ Monster already exists in library: ${monster.name}.`);
        return prev;
      }
      addLog(`💾 Monster saved to library: ${monster.name}.`);
      return [...prev, { ...monster, id: undefined }];
    });
  };

  const deleteMonsterFromLibrary = (name) => {
    setMonsterLibrary((prev) => prev.filter((m) => m.name !== name));
    addLog(`🗑️ Monster deleted from library: ${name}.`);
  };

  const updateEnemyHp = (id, amount) => {
    setEnemies((prev) => {
      return prev.flatMap((e) => {
        if (e.id !== id) return [e];
        const newHp = clamp(e.hp + amount, 0, e.maxHp);

        if (newHp <= 0) {
          const defeated = { ...e, hp: 0, conditions: [...new Set([...(e.conditions || []), "Dead"])] };
          setDefeatedEnemies((old) => [...old, defeated]);
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

  const toggleEnemyCondition = (id, condition) => {
    if (condition === "Dead") {
      updateEnemyHp(id, -9999);
      return;
    }
    setEnemies((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const current = e.conditions || [];
        const has = current.includes(condition);
        return {
          ...e,
          conditions: has ? current.filter((c) => c !== condition) : [...current, condition],
        };
      })
    );
  };

  const removeEnemy = (id) => {
    const enemy = enemies.find((e) => e.id === id);
    setEnemies((prev) => prev.filter((e) => e.id !== id));
    if (enemy) addLog(`Enemy removed: ${enemy.name}.`);
  };

  const recordMonsterAction = (monster, action) => {
    const actionName = typeof action === "string" ? action : action.name;
    const details = getActionDetails(monster, action);
    setSelectedActionInfo({ monsterName: monster.name, action: actionName, ...details });
    addLog(`🎲 ${monster.name} considers ${actionName}.`);
  };

  const startEditingAction = (monster, action, actionIndex) => {
    const actionObject = typeof action === "string" ? { name: action } : action;

    setEditingMonsterId(monster.id);
    setEditingActionIndex(actionIndex);

    setActionEditor({
      name: actionObject.name || "",
      attackBonus: actionObject.attackBonus || monster.attackBonus || "",
      save: actionObject.save || "",
      dc: actionObject.dc || monster.spellSaveDc || "",
      hit: actionObject.hit || "",
      effect: actionObject.effect || "",
      tactics: actionObject.tactics || actionObject.note || "",
    });
  };

  const saveEditedAction = () => {
    if (editingMonsterId === null || editingActionIndex === null) return;

    setEnemies((prev) =>
      prev.map((monster) => {
        if (monster.id !== editingMonsterId) return monster;

        const updatedActions = [...(monster.actions || [])];

        updatedActions[editingActionIndex] = {
          name: actionEditor.name,
          attackBonus: Number(actionEditor.attackBonus || monster.attackBonus || 0),
          save: actionEditor.save,
          dc: Number(actionEditor.dc || monster.spellSaveDc || 0),
          hit: actionEditor.hit,
          effect: actionEditor.effect,
          tactics: actionEditor.tactics,
        };

        return {
          ...monster,
          actions: updatedActions,
        };
      })
    );

    addLog(`✏️ Updated action: ${actionEditor.name}.`);

    setEditingMonsterId(null);
    setEditingActionIndex(null);
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
      enemies: enemies.map((e) => ({ ...e, id: undefined })),
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
    setEnemies(encounter.enemies.map((e, idx) => normalizeMonster(e, idx)));
    setDefeatedEnemies([]);
    setEncounterSummary("");
    setActiveEncounterName(encounter.name);
    setRound(1);
    setTurnIndex(0);
    addLog(`⚔️ Encounter loaded: ${encounter.name}.`);
  };

  const deleteEncounter = (name) => {
    setSavedEncounters((prev) => prev.filter((enc) => enc.name !== name));
    addLog(`🗑️ Encounter deleted: ${name}.`);
  };

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
    setDefeatedEnemies([]);
    setEncounterSummary("");
    addLog("Combat reset.");
  };

  const loadCultAmbush = () => {
    loadEncounter(DEFAULT_ENCOUNTERS[0]);
  };

  const advanceTime = (hours = 0, minutes = 0) => {
    setCalendar((prev) => {
      let newHour = typeof prev.time === "number" ? prev.time : 8;
      let newTurn = prev.dungeonTurn || 0;
      if (minutes >= 10) newTurn += Math.floor(minutes / 10);
      newHour += hours;
      let newDay = prev.day || 6;
      let newMoon = prev.moonPhase || "Waxing";
      while (newHour >= 24) {
        newHour -= 24;
        newDay += 1;
        newMoon = nextMoonPhase(newMoon);
        addLog("🌙 A new day dawns over Greyhawk.");
      }
      const phase = getPhase(newHour);
      addLog(`🕒 Time advances to ${formatHour(newHour)} (${phase}).`);
      return {
        ...prev,
        day: newDay,
        time: newHour,
        phase,
        dungeonTurn: newTurn,
        moonPhase: newMoon,
        date: `${newDay} ${prev.month || "Sunsebb"}, ${prev.year || 576} CY`,
      };
    });
  };

  const buildPrep = () => `## 🕯️ Session Prep

**Date:** ${calendar.date}, ${calendar.phase}, ${formatHour(calendar.time)}
**Dungeon Turn:** ${calendar.dungeonTurn || 0}
**Moon Phase:** ${calendar.moonPhase || "Waxing"}
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
      ? enemies.map((e) => `${e.name}: ${e.hp}/${e.maxHp} HP | AC ${e.ac} | Init ${e.init}`).join("\n")
      : "None";
    const initiativeText = initiative
      .map((c, idx) => `${idx === turnIndex ? "▶ " : ""}${c.init} — ${c.name} (${c.type})`)
      .join("\n");
    return `📊 **SESSION SNAPSHOT**

🎯 **Combat**
Encounter: ${activeEncounterName}
Round: ${round}
Current: ${active ? active.name : "N/A"}

🧙 **Party**
${partyText}

👹 **Enemies**
${enemyText}

⚔️ **Initiative**
${initiativeText}

🌍 **World State**
Date: ${calendar.date}, ${calendar.phase}, ${formatHour(calendar.time)}
Moon: ${calendar.moonPhase || "Waxing"}
Dungeon Turn: ${calendar.dungeonTurn || 0}
Earth Cult Alert: ${earthCult}/5
Dungeon Alert: ${dungeonAlert}/5
Earth Node Progress: ${nodeProgress}%`;
  };

  const buildEncounterSummary = () => {
    const NL = String.fromCharCode(10);

    const defeated = defeatedEnemies || [];

    const totalXp = defeated.reduce(
      (sum, enemy) => sum + Number(enemy.xp || 0),
      0
    );

    const partyCount = Math.max(party.length, 1);
    const perPlayer = Math.floor(totalXp / partyCount);

    const loot = defeated.flatMap((enemy) => enemy.loot || []);

    const defeatedLines = defeated.length
      ? defeated
          .map((enemy) => "• " + enemy.name + " (" + (enemy.xp || 0) + " XP)")
          .join(NL)
      : "None recorded";

    const lootLines = loot.length
      ? loot.map((item) => "• " + item).join(NL)
      : "No treasure recorded.";

    const noteLines = log.length
      ? log.slice(0, 10).map((entry) => "• " + entry).join(NL)
      : "No combat notes recorded.";

    return [
      "## ⚔️ Encounter Complete — " + (activeEncounterName || "Current Encounter"),
      "",
      "Rounds: " + round,
      "",
      "=== Enemies Defeated ===",
      defeatedLines,
      "",
      "=== XP Awarded ===",
      "Total XP: " + totalXp,
      "Per Character: " + perPlayer,
      "",
      "=== Treasure / Loot ===",
      lootLines,
      "",
      "=== Combat Notes ===",
      noteLines,
    ].join(NL);
  };

  const endEncounter = () => {
    const summary = buildEncounterSummary();
    setEncounterSummary(summary);
    addLog("⚔️ Encounter summary generated.");
  };

  const postEncounterSummary = () => {
    const summary = encounterSummary || buildEncounterSummary();
    postToDiscord(channel, summary);
    addLog(`📡 Encounter summary posted to #${channel}.`);
  };

  const postEncounterLoot = () => {
    const NL = String.fromCharCode(10);
    const loot = defeatedEnemies.flatMap((e) => e.loot || []);
    const lootLines = loot.length
      ? loot.map((item) => "• " + item).join(NL)
      : "No treasure recorded.";

    const lootMessage = [
      "## 💰 Treasure / Loot — " + activeEncounterName,
      "",
      lootLines,
    ].join(NL);

    postToDiscord("treasure-loot", lootMessage);
    addLog("💰 Loot posted to #treasure-loot.");
  };

  const saveCampaign = () => {
    localStorage.setItem("greyhawkCampaignSave", JSON.stringify(getCampaignState()));
    addLog("💾 Campaign saved.");
  };

  const loadCampaign = () => {
    const raw = localStorage.getItem("greyhawkCampaignSave");
    if (!raw) {
      addLog("⚠️ No campaign save found.");
      return;
    }
    try {
      const data = JSON.parse(raw);
      setParty(data.party || []);
      setEnemies(data.enemies || []);
      setDefeatedEnemies(data.defeatedEnemies || []);
      setMonsterLibrary(data.monsterLibrary || DEFAULT_MONSTER_LIBRARY);
      setTurnIndex(data.turnIndex || 0);
      setRound(data.round || 1);
      setActiveEncounterName(data.activeEncounterName || "Current Encounter");
      setEncounterSummary(data.encounterSummary || "");
      setNpcs(data.npcs || []);
      setEncounterName(data.encounterName || "");
      setSavedEncounters(data.savedEncounters || DEFAULT_ENCOUNTERS);
      setEarthCult(data.earthCult ?? 3);
      setDungeonAlert(data.dungeonAlert ?? 3);
      setNodeProgress(data.nodeProgress ?? 35);
      setCalendar(data.calendar || calendar);
      setLog(data.log || []);
      addLog("📂 Campaign loaded.");
    } catch {
      addLog("❌ Campaign load failed.");
    }
  };

  const exportCampaign = () => {
    downloadJSON(getCampaignState(), `GreyhawkCampaign_Session${calendar.session}.json`);
    addLog("📤 Campaign exported.");
  };

  const importCampaign = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setParty(data.party || []);
        setEnemies(data.enemies || []);
        setDefeatedEnemies(data.defeatedEnemies || []);
      setMonsterLibrary(data.monsterLibrary || DEFAULT_MONSTER_LIBRARY);
        setTurnIndex(data.turnIndex || 0);
        setRound(data.round || 1);
        setActiveEncounterName(data.activeEncounterName || "Current Encounter");
        setEncounterSummary(data.encounterSummary || "");
        setNpcs(data.npcs || []);
        setEncounterName(data.encounterName || "");
        setSavedEncounters(data.savedEncounters || DEFAULT_ENCOUNTERS);
        setEarthCult(data.earthCult ?? 3);
        setDungeonAlert(data.dungeonAlert ?? 3);
        setNodeProgress(data.nodeProgress ?? 35);
        setCalendar(data.calendar || calendar);
        setLog(data.log || []);
        addLog("📥 Campaign imported.");
      } catch {
        addLog("❌ Campaign import failed.");
      }
    };
    reader.readAsText(file);
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
      <h1 style={isMobile ? mobileTitleStyle : titleStyle}>Greyhawk Command Console v3</h1>
      <main style={layoutStyle}>
        <div style={leftStyle}>
          <PartyPanel party={party} updatePartyField={updatePartyField} updatePartyHp={updatePartyHp} toggleCondition={toggleCondition} />
          <NpcPanel npcs={npcs} npcForm={npcForm} setNpcForm={setNpcForm} addNpc={addNpc} removeNpc={removeNpc} />
        </div>

        <div style={topStyle}>
          <Panel title="Discord Bridge">
            <input style={inputStyle} value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} />
            <input style={inputStyle} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </Panel>
          <WorldClockPanel calendar={calendar} advanceTime={advanceTime} />
          <Panel title="Faction / Node">
            <div>Earth Cult: {earthCult}/5</div>
            <div>Dungeon: {dungeonAlert}/5</div>
            <div>Earth Node: {nodeProgress}%</div>
            <button style={smallButtonStyle} onClick={() => setEarthCult((v) => clamp(v + 1, 0, 5))}>Cult +</button>
            <button style={smallButtonStyle} onClick={() => setDungeonAlert((v) => clamp(v + 1, 0, 5))}>Dungeon +</button>
            <button style={smallButtonStyle} onClick={() => setNodeProgress((v) => clamp(v + 10, 0, 100))}>Node +</button>
          </Panel>
          <Panel title="Fantasy Calendar">
            <div style={{ marginBottom: 10 }}>Greyhawk Campaign Calendar</div>
            <a href="https://app.fantasy-calendar.com/calendars/448b4c997c5b2eacf40f46c3fc43fdba" target="_blank" rel="noreferrer" style={linkButtonStyle}>Open Fantasy Calendar</a>
          </Panel>
        </div>

        <div style={centerStyle}>
          <CombatDirectorPanel
            round={round}
            active={active}
            initiative={initiative}
            turnIndex={turnIndex}
            nextTurn={nextTurn}
            resetCombat={resetCombat}
            loadCultAmbush={loadCultAmbush}
            recordMonsterAction={recordMonsterAction}
            startEditingAction={startEditingAction}
            editingMonsterId={editingMonsterId}
            editingActionIndex={editingActionIndex}
            actionEditor={actionEditor}
            setActionEditor={setActionEditor}
            saveEditedAction={saveEditedAction}
            selectedActionInfo={selectedActionInfo}
            defeatedEnemies={defeatedEnemies}
            enemies={enemies}
            endEncounter={endEncounter}
            encounterSummary={encounterSummary}
            postEncounterSummary={postEncounterSummary}
            postEncounterLoot={postEncounterLoot}
          />
          <EncounterLibraryPanel encounterName={encounterName} setEncounterName={setEncounterName} saveCurrentEncounter={saveCurrentEncounter} savedEncounters={savedEncounters} loadEncounter={loadEncounter} deleteEncounter={deleteEncounter} />
        </div>

        <div style={rightStyle}>
          <MonsterLibraryPanel
            monsterLibrary={monsterLibrary}
            monsterSearch={monsterSearch}
            setMonsterSearch={setMonsterSearch}
            addMonsterFromLibrary={addMonsterFromLibrary}
            deleteMonsterFromLibrary={deleteMonsterFromLibrary}
          />
          <EnemiesPanel enemies={enemies} enemyForm={enemyForm} setEnemyForm={setEnemyForm} addEnemy={addEnemy} updateEnemyHp={updateEnemyHp} removeEnemy={removeEnemy} toggleEnemyCondition={toggleEnemyCondition} saveFormToMonsterLibrary={saveFormToMonsterLibrary} />
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
            <button style={buttonStyle} onClick={saveCampaign}>💾 Save Campaign</button>
            <button style={buttonStyle} onClick={loadCampaign}>📂 Load Campaign</button>
            <button style={buttonStyle} onClick={exportCampaign}>📤 Export JSON</button>
            <label style={buttonStyle}>📥 Import JSON<input type="file" accept=".json" onChange={importCampaign} style={{ display: "none" }} /></label>
            <button style={dangerButtonStyle} onClick={resetSavedState}>Reset Saved State</button>
          </Panel>
        </div>

        <div style={bottomStyle}>
          <Panel title="Log">
            <div style={logBoxStyle}>{log.length === 0 ? <p>No actions yet.</p> : log.map((l, i) => <div key={i}>• {l}</div>)}</div>
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

function WorldClockPanel({ calendar, advanceTime }) {
  return (
    <Panel title="World Clock">
      <div style={{ fontSize: 20, marginBottom: 6 }}>📅 {calendar.date}</div>
      <div style={{ fontSize: 18, color: "#f2d28b", marginBottom: 6 }}>☀️ {calendar.phase}</div>
      <div style={{ fontSize: 18, marginBottom: 6 }}>🕒 {formatHour(calendar.time)}</div>
      <div style={{ marginBottom: 6 }}>🌙 Moon: {calendar.moonPhase || "Waxing"}</div>
      <div style={{ marginBottom: 12 }}>🏰 Dungeon Turn: {calendar.dungeonTurn || 0}</div>
      <button style={smallButtonStyle} onClick={() => advanceTime(0, 10)}>+10 Min</button>
      <button style={smallButtonStyle} onClick={() => advanceTime(1, 0)}>+1 Hour</button>
      <button style={smallButtonStyle} onClick={() => advanceTime(4, 0)}>+4 Hours</button>
      <button style={smallButtonStyle} onClick={() => advanceTime(24, 0)}>Next Day</button>
    </Panel>
  );
}

function CombatDirectorPanel({ round, active, initiative, turnIndex, nextTurn, resetCombat, loadCultAmbush, recordMonsterAction, startEditingAction, editingMonsterId, editingActionIndex, actionEditor, setActionEditor, saveEditedAction, selectedActionInfo, defeatedEnemies, enemies, endEncounter, encounterSummary, postEncounterSummary, postEncounterLoot }) {
  const currentMonster = active?.type === "Enemy" ? active : null;
  const allEnemiesDefeated = enemies.length === 0 && defeatedEnemies.length > 0;

  return (
    <Panel title="Combat Director">
      <div><strong>Round:</strong> {round}</div>
      <div><strong>Current:</strong> {active ? `${active.name} (${active.type})` : "None"}</div>
      <button style={buttonStyle} onClick={resetCombat}>Reset</button>
      <button style={buttonStyle} onClick={loadCultAmbush}>Cult Ambush</button>

      {currentMonster && (
        <div style={directorCardStyle}>
          <h3 style={subHeaderStyle}>Monster Turn: {currentMonster.name}</h3>
          <div><strong>HP:</strong> {currentMonster.hp}/{currentMonster.maxHp} | <strong>AC:</strong> {currentMonster.ac}</div>
          <div style={{ marginTop: 8 }}>
            <strong>Suggested Tactics</strong>
            <ul style={{ marginTop: 4 }}>
              {(currentMonster.tactics || []).map((t, i) => <li key={i}>{t}</li>)}
              {currentMonster.hp <= Math.floor(currentMonster.maxHp / 2) && <li>Bloodied: consider retreat, defensive action, or calling for aid.</li>}
            </ul>
          </div>
          <div style={buttonWrapStyle}>
            {(currentMonster.actions || []).map((action, actionIndex) => {
              const actionName = typeof action === "string" ? action : action.name;
              return (
                <div key={actionName} style={{ marginBottom: 6 }}>
                  <button
                    style={buttonStyle}
                    onClick={() => recordMonsterAction(currentMonster, action)}
                  >
                    {actionName}
                  </button>

                  <button
                    style={smallButtonStyle}
                    onClick={() => startEditingAction(currentMonster, action, actionIndex)}
                  >
                    ✏️ Edit
                  </button>
                </div>
              );
            })}
          </div>

          <div style={monsterStatCardStyle}>
            <h4 style={subHeaderStyle}>{currentMonster.name}</h4>
            <div><strong>AC:</strong> {currentMonster.ac} | <strong>HP:</strong> {currentMonster.hp}/{currentMonster.maxHp}</div>
            <div><strong>Speed:</strong> {currentMonster.speed || "30 ft."}</div>
            <div>
              <strong>Attack:</strong> +{currentMonster.attackBonus || 3} |
              <strong> Spell DC:</strong> {currentMonster.spellSaveDc || 12} |
              <strong> Spell Atk:</strong> +{currentMonster.spellAttackBonus || 4}
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Abilities:</strong>
              <div>
                STR {currentMonster.abilities?.str || 10} | DEX {currentMonster.abilities?.dex || 10} | CON {currentMonster.abilities?.con || 10}
              </div>
              <div>
                INT {currentMonster.abilities?.int || 10} | WIS {currentMonster.abilities?.wis || 10} | CHA {currentMonster.abilities?.cha || 10}
              </div>
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Senses:</strong> {currentMonster.senses || "passive Perception 10"}
            </div>
            <div>
              <strong>Languages:</strong> {currentMonster.languages || "—"}
            </div>

            {(currentMonster.traits || []).length > 0 && (
              <div style={{ marginTop: 6 }}>
                <strong>Traits:</strong>
                <ul style={{ marginTop: 4 }}>
                  {currentMonster.traits.map((trait, index) => (
                    <li key={index}>{trait}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {editingMonsterId === currentMonster.id && editingActionIndex !== null && (
            <div style={actionEditorStyle}>
              <h4 style={subHeaderStyle}>Edit Monster Action</h4>

              <input style={inputStyle} placeholder="Action Name" value={actionEditor.name} onChange={(e) => setActionEditor({ ...actionEditor, name: e.target.value })} />

              <div style={miniGridStyle}>
                <input style={inputStyle} placeholder="Attack Bonus" value={actionEditor.attackBonus} onChange={(e) => setActionEditor({ ...actionEditor, attackBonus: e.target.value })} />

                <input style={inputStyle} placeholder="Save DC" value={actionEditor.dc} onChange={(e) => setActionEditor({ ...actionEditor, dc: e.target.value })} />
              </div>

              <input style={inputStyle} placeholder="Saving Throw Type" value={actionEditor.save} onChange={(e) => setActionEditor({ ...actionEditor, save: e.target.value })} />

              <textarea style={textAreaStyle} placeholder="Hit / Damage" value={actionEditor.hit} onChange={(e) => setActionEditor({ ...actionEditor, hit: e.target.value })} />

              <textarea style={textAreaStyle} placeholder="Effect" value={actionEditor.effect} onChange={(e) => setActionEditor({ ...actionEditor, effect: e.target.value })} />

              <textarea style={textAreaStyle} placeholder="Tactics" value={actionEditor.tactics} onChange={(e) => setActionEditor({ ...actionEditor, tactics: e.target.value })} />

              <button style={buttonStyle} onClick={saveEditedAction}>💾 Save Action</button>
            </div>
          )}

          {selectedActionInfo && selectedActionInfo.monsterName === currentMonster.name && (
            <div style={actionDetailStyle}>
              <h4 style={subHeaderStyle}>{selectedActionInfo.action}</h4>
              <div><strong>Roll Needed:</strong> {selectedActionInfo.roll}</div>
              <div style={{ marginTop: 6 }}><strong>Effect:</strong> {selectedActionInfo.effect}</div>
              <div style={{ marginTop: 6 }}><strong>Tactical Note:</strong> {selectedActionInfo.note}</div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        {initiative.map((c, i) => (
          <div key={`${c.type}-${c.id}`} style={{ ...(i === turnIndex ? activeRowStyle : rowStyle), ...(c.hp <= Math.floor(c.maxHp / 2) ? bloodiedStyle : {}) }}>
            {i === turnIndex ? "▶ " : ""}<strong>{c.init}</strong> — {c.name} ({c.type}) — {c.hp}/{c.maxHp} HP
            {c.hp > 0 && c.hp <= Math.floor(c.maxHp / 2) && <span style={{ color: "#f87171", marginLeft: 8 }}>🩸 Bloodied</span>}
            {c.conditions?.length > 0 && <span style={{ color: "#f2d28b", marginLeft: 8 }}>({c.conditions.join(", ")})</span>}
          </div>
        ))}
      </div>

      <div style={stickyTurnBarStyle}>
        <button style={{ ...buttonStyle, width: "100%" }} onClick={nextTurn}>▶ Next Turn</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <button style={allEnemiesDefeated ? buttonStyle : disabledButtonStyle} onClick={endEncounter} disabled={!allEnemiesDefeated}>⚔️ End Encounter</button>
        <button style={encounterSummary ? buttonStyle : disabledButtonStyle} onClick={postEncounterSummary} disabled={!encounterSummary}>Post Summary</button>
        <button style={encounterSummary ? buttonStyle : disabledButtonStyle} onClick={postEncounterLoot} disabled={!encounterSummary}>💰 Post Loot</button>
      </div>

      {encounterSummary && <textarea style={{ ...textAreaStyle, minHeight: 220 }} value={encounterSummary} readOnly />}
    </Panel>
  );
}

function EncounterLibraryPanel({ encounterName, setEncounterName, saveCurrentEncounter, savedEncounters, loadEncounter, deleteEncounter }) {
  return (
    <Panel title="Encounter Library">
      <input style={inputStyle} placeholder="Encounter name" value={encounterName} onChange={(e) => setEncounterName(e.target.value)} />
      <button style={buttonStyle} onClick={saveCurrentEncounter}>💾 Save Current Encounter</button>
      <div style={encounterListStyle}>
        {savedEncounters.map((enc) => (
          <div key={enc.name} style={innerCardStyle}>
            <strong>{enc.name}</strong>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{enc.enemies.length} enemy/enemies</div>
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
              return <button key={c} onClick={() => toggleCondition(i, c)} style={{ ...conditionButtonStyle, background: activeCondition ? "#8a6d1d" : "#1f2937", color: activeCondition ? "#fff2b8" : "#e5e7eb" }}>{c}</button>;
            })}
          </div>
        </div>
      ))}
    </Panel>
  );
}

function MonsterLibraryPanel({ monsterLibrary, monsterSearch, setMonsterSearch, addMonsterFromLibrary, deleteMonsterFromLibrary }) {
  const query = monsterSearch.trim().toLowerCase();
  const filteredMonsters = monsterLibrary.filter((monster) =>
    monster.name.toLowerCase().includes(query)
  );

  return (
    <Panel title="Monster Library">
      <input
        style={inputStyle}
        placeholder="Search monsters"
        value={monsterSearch}
        onChange={(event) => setMonsterSearch(event.target.value)}
      />

      <div style={monsterLibraryListStyle}>
        {filteredMonsters.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No monsters found.</div>
        ) : (
          filteredMonsters.map((monster) => (
            <div key={monster.name} style={innerCardStyle}>
              <strong>{monster.name}</strong>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                HP {monster.hp}/{monster.maxHp} | AC {monster.ac} | XP {monster.xp}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {(monster.actions || []).slice(0, 4).join(" • ")}
              </div>
              <button style={smallButtonStyle} onClick={() => addMonsterFromLibrary(monster)}>
                Add to Encounter
              </button>
              <button style={dangerButtonStyle} onClick={() => deleteMonsterFromLibrary(monster.name)}>
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function EnemiesPanel({ enemies, enemyForm, setEnemyForm, addEnemy, updateEnemyHp, removeEnemy, toggleEnemyCondition, saveFormToMonsterLibrary }) {
  return (
    <Panel title="Monster Control">
      <input style={inputStyle} placeholder="Enemy name" value={enemyForm.name} onChange={(e) => setEnemyForm({ ...enemyForm, name: e.target.value })} />
      <div style={miniGridStyle}>
        <input style={inputStyle} placeholder="HP" value={enemyForm.hp} onChange={(e) => setEnemyForm({ ...enemyForm, hp: e.target.value })} />
        <input style={inputStyle} placeholder="AC" value={enemyForm.ac} onChange={(e) => setEnemyForm({ ...enemyForm, ac: e.target.value })} />
        <input style={inputStyle} placeholder="Init" value={enemyForm.init} onChange={(e) => setEnemyForm({ ...enemyForm, init: e.target.value })} />
        <input style={inputStyle} placeholder="XP" value={enemyForm.xp} onChange={(e) => setEnemyForm({ ...enemyForm, xp: e.target.value })} />
      </div>
      <button style={buttonStyle} onClick={addEnemy}>Add Monster</button>
      <button style={buttonStyle} onClick={saveFormToMonsterLibrary}>💾 Save to Library</button>
      {enemies.map((e) => (
        <div key={e.id} style={{ ...innerCardStyle, ...(e.hp <= Math.floor(e.maxHp / 2) ? bloodiedStyle : {}) }}>
          <strong>{e.name}</strong>
          <div>{e.hp}/{e.maxHp} HP | AC {e.ac} | Init {e.init} | XP {e.xp}</div>
          <div style={buttonWrapStyle}>
            <button style={smallButtonStyle} onClick={() => updateEnemyHp(e.id, -1)}>-1</button>
            <button style={smallButtonStyle} onClick={() => updateEnemyHp(e.id, -5)}>-5</button>
            <button style={smallButtonStyle} onClick={() => updateEnemyHp(e.id, -10)}>-10</button>
            <button style={smallButtonStyle} onClick={() => updateEnemyHp(e.id, 5)}>+5</button>
            <button style={dangerButtonStyle} onClick={() => toggleEnemyCondition(e.id, "Dead")}>Dead</button>
            <button style={dangerButtonStyle} onClick={() => removeEnemy(e.id)}>Remove</button>
          </div>
          <div style={conditionWrapStyle}>
            {MONSTER_CONDITIONS.map((c) => {
              const activeCondition = (e.conditions || []).includes(c);
              return <button key={c} onClick={() => toggleEnemyCondition(e.id, c)} style={{ ...conditionButtonStyle, background: activeCondition ? "#8a6d1d" : "#1f2937", color: activeCondition ? "#fff2b8" : "#e5e7eb" }}>{c}</button>;
            })}
          </div>
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
        <option>Friendly</option><option>Neutral</option><option>Suspicious</option><option>Hostile</option>
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

const pageStyle = { minHeight: "100vh", width: "100vw", maxWidth: "100vw", overflowX: "hidden", background: "radial-gradient(circle at top,#202733,#0b0f14)", color: "#e5e7eb", fontFamily: "Georgia, 'Times New Roman', serif", padding: 12, boxSizing: "border-box" };
const titleStyle = { textAlign: "center", color: "#f2d28b", margin: "8px 0 14px" };
const mobileTitleStyle = { ...titleStyle, fontSize: 36, lineHeight: 1 };
const desktopGridStyle = { display: "grid", gridTemplateColumns: "minmax(360px, 440px) minmax(620px, 1fr) minmax(360px, 440px)", gridTemplateRows: "auto 1fr 180px", gridTemplateAreas: `"left top right" "left center right" "bottom bottom bottom"`, gap: 12, width: "100%", maxWidth: "100%", minHeight: "calc(100vh - 80px)" };
const mobileGridStyle = { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
const mobileSectionStyle = { display: "grid", gap: 12, alignContent: "start", minWidth: 0 };
const leftColumnStyle = { gridArea: "left", display: "grid", gap: 12, alignContent: "start", minHeight: 0, overflowY: "auto" };
const topBarStyle = { gridArea: "top", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignContent: "start" };
const centerColumnStyle = { gridArea: "center", minHeight: 0, overflowY: "auto" };
const rightColumnStyle = { gridArea: "right", display: "grid", gap: 12, alignContent: "start", minHeight: 0, overflowY: "auto" };
const bottomBarStyle = { gridArea: "bottom", minHeight: 0 };
const cardStyle = { background: "#0d1117", border: "1px solid #3b4351", borderRadius: 8, padding: 12, boxSizing: "border-box", minWidth: 0 };
const innerCardStyle = { background: "#121821", border: "1px solid #303845", borderRadius: 6, padding: 8, marginBottom: 8 };
const directorCardStyle = { ...innerCardStyle, background: "#151b25", border: "1px solid #8a6d1d" };
const actionDetailStyle = { marginTop: 10, padding: 10, background: "#0f172a", border: "1px solid #8a6d1d", borderRadius: 6 };
const monsterStatCardStyle = { marginTop: 10, padding: 12, background: "#111827", border: "1px solid #4b5563", borderRadius: 6 };
const actionEditorStyle = { marginTop: 10, padding: 12, background: "#161f2d", border: "1px solid #4b5563", borderRadius: 6 };
const panelTitleStyle = { color: "#f2d28b", margin: "0 0 8px", borderBottom: "1px solid #35291a", paddingBottom: 4, textTransform: "uppercase", fontSize: 17 };
const subHeaderStyle = { color: "#f2d28b", margin: "4px 0 8px" };
const inputStyle = { width: "100%", padding: 9, marginBottom: 8, background: "#111827", color: "#e5e7eb", border: "1px solid #3b4351", borderRadius: 6, boxSizing: "border-box", fontSize: 14 };
const smallInputStyle = { width: 54, padding: 7, background: "#111827", color: "#e5e7eb", border: "1px solid #3b4351", borderRadius: 6 };
const buttonStyle = { background: "linear-gradient(180deg, #4b5563 0%, #252b34 100%)", color: "#f8fafc", border: "1px solid #6b7280", borderRadius: 6, padding: "9px 12px", cursor: "pointer", margin: 4, fontSize: 14 };
const disabledButtonStyle = { ...buttonStyle, opacity: 0.45, cursor: "not-allowed" };
const smallButtonStyle = { ...buttonStyle, padding: "6px 9px", fontSize: 13 };
const dangerButtonStyle = { ...smallButtonStyle, background: "linear-gradient(180deg, #7f1d1d 0%, #3f1111 100%)", border: "1px solid #b91c1c" };
const flexRowStyle = { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" };
const buttonWrapStyle = { display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginTop: 6 };
const conditionWrapStyle = { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 };
const conditionButtonStyle = { border: "1px solid #3b4351", borderRadius: 4, padding: "4px 6px", fontSize: 11, cursor: "pointer" };
const rowStyle = { padding: 14, marginBottom: 8, border: "1px solid #303845", borderRadius: 6, fontSize: 18, background: "#1d222b" };
const activeRowStyle = { ...rowStyle, background: "linear-gradient(90deg, #6b4f1d, #2a2112)", border: "1px solid #d6a03d", fontWeight: "bold" };
const bloodiedStyle = { border: "1px solid #dc2626", boxShadow: "0 0 10px rgba(220,38,38,0.45)", background: "linear-gradient(90deg,#3a1616,#1f1414)" };
const stickyTurnBarStyle = { position: "sticky", bottom: 0, background: "#0d1117", paddingTop: 10, marginTop: 10 };
const textAreaStyle = { width: "100%", minHeight: 120, padding: 10, marginBottom: 8, background: "#111827", color: "#e5e7eb", border: "1px solid #3b4351", borderRadius: 6, boxSizing: "border-box", fontSize: 14 };
const encounterListStyle = { marginTop: 10, maxHeight: 260, overflowY: "auto" };
const monsterLibraryListStyle = { marginTop: 10, maxHeight: 320, overflowY: "auto" };
const logBoxStyle = { maxHeight: 135, overflowY: "auto", fontSize: 13 };
const linkButtonStyle = { display: "inline-block", textDecoration: "none", color: "#fff", background: "linear-gradient(180deg, #4b5563 0%, #252b34 100%)", border: "1px solid #6b7280", borderRadius: 6, padding: "10px 14px", fontWeight: "bold" };
const miniGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 };
