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

function getMonsterTurnSuggestions(monster, party = []) {
  if (!monster) return [];

  const suggestions = [];
  const hpRatio = monster.maxHp ? monster.hp / monster.maxHp : 1;
  const actions = monster.actions || [];
  const actionNames = actions.map((action) =>
    typeof action === "string" ? action : action.name || "Action"
  );

  const lowestHpPc = party
    .filter((pc) => pc.hp > 0)
    .sort((a, b) => a.hp - b.hp)[0];

  const likelyCaster = party.find((pc) =>
    /fern|wizard|cleric|druid|bard|sorcerer|warlock/i.test(pc.name)
  );

  if (hpRatio <= 0.5) {
    suggestions.push("Bloodied: consider defensive positioning, calling aid, retreat, frenzy, or a desperate special action.");
  }

  if (actionNames.some((name) => /recharge/i.test(name)) || actions.some((action) => /recharge/i.test(action.type || ""))) {
    suggestions.push("Recharge action present: roll 1d6 at the start of this monster's turn if the recharge action was already used.");
  }

  if (actionNames.some((name) => /restrain|grasp|hold|root/i.test(name))) {
    suggestions.push("Control tactic: restrain an isolated target, then pressure the party to spend actions freeing them.");
  }

  if (actionNames.some((name) => /bless|command|hold person|spiritual weapon|sacred flame/i.test(name))) {
    suggestions.push("Caster tactic: use save-based spells against high-AC targets and concentration buffs early while allies remain.");
  }

  if (actionNames.some((name) => /dash|retreat|disengage|flee/i.test(name))) {
    suggestions.push("Mobility option available: reposition, flee toward reinforcements, or force the party to pursue.");
  }

  if (lowestHpPc) {
    suggestions.push("Target pressure: " + lowestHpPc.name + " is the most wounded visible PC at " + lowestHpPc.hp + "/" + lowestHpPc.maxHp + " HP.");
  }

  if (likelyCaster) {
    suggestions.push("Caster pressure: consider disrupting " + likelyCaster.name + " if the monster is intelligent or cult-directed.");
  }

  if ((monster.traits || []).some((trait) => /death burst|collapse|explodes|reduced to 0/i.test(trait))) {
    suggestions.push("Death trigger: remind players of danger when this creature drops to 0 HP; resolve burst/collapse effects immediately.");
  }

  if ((monster.tactics || []).length > 0) {
    suggestions.push("Primary tactic: " + monster.tactics[0]);
  }

  return suggestions.slice(0, 6);
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
  {
    name: "Rootbound Husk",
    size: "Medium",
    type: "plant/undead hybrid",
    alignment: "unaligned",
    hp: 22,
    maxHp: 22,
    ac: 11,
    speed: "20 ft.",
    init: -1,
    xp: 100,
    attackBonus: 4,
    spellSaveDc: 12,
    spellAttackBonus: 0,
    abilities: { str: 15, dex: 8, con: 13, int: 3, wis: 10, cha: 5 },
    saves: "Str +4",
    skills: "—",
    senses: "darkvision 60 ft., passive Perception 10",
    languages: "—",
    traits: [
      "Soil Anchor: While touching natural earth, mud, or stone, the husk has advantage on Strength checks and Strength saving throws. It cannot be forcibly moved more than 5 feet unless the effect uproots or teleports it.",
      "Unnatural Stability: Difficult terrain created by mud, marsh, roots, or undergrowth doesn't slow the husk.",
      "False Stillness: When motionless among reeds, roots, or swamp growth, the husk is difficult to distinguish from debris. A creature must succeed on a DC 13 Wisdom (Perception) check to notice it before combat begins.",
      "Death Burst: Root Collapse: When reduced to 0 hit points, each creature within 5 feet must make a DC 12 Dexterity saving throw. Failure: 1d6 piercing damage and the area becomes difficult terrain. Success: half damage and the area is not affected.",
    ],
    actions: [
      {
        name: "Grasping Slam",
        type: "Melee Weapon Attack",
        attackBonus: 4,
        reach: "5 ft.",
        target: "one target",
        hit: "6 (1d6 + 2) bludgeoning damage.",
        effect: "Target must succeed on a DC 12 Strength saving throw or become Restrained by roots and sucking mud. A restrained creature may use its action to make a DC 12 Strength check, freeing itself on a success.",
        tactics: "Use against isolated enemies, spellcasters, or relic-bearers. Try to restrain one target and hold it in hazardous terrain.",
      },
      {
        name: "Root Lash",
        type: "Recharge 5-6",
        save: "Dexterity",
        dc: 12,
        effect: "The husk tears jagged roots from the ground in a 10-foot line. Failure: target takes 1d6 piercing damage and its speed is reduced by half until the start of the husk's next turn. Success: half damage and speed is not reduced.",
        tactics: "Use when two or more enemies line up, or when a fleeing/fast target needs to be slowed.",
      },
      {
        name: "Grasping Soil",
        type: "Environmental Effect",
        save: "Strength",
        dc: 12,
        effect: "At initiative count 20, choose one 10-foot square of natural ground within 30 feet. Creatures in the area must succeed on a DC 12 Strength saving throw or become Restrained until the start of the next round.",
        tactics: "Use to shape the battlefield before the husk closes in. Best near chokepoints, mud, reeds, or hazardous terrain.",
      },
    ],
    tactics: [
      "Advance relentlessly toward isolated targets.",
      "Attempt to restrain enemies and drag the fight into mud, roots, marsh, or other hazardous terrain.",
      "Preferred targets: isolated enemies, spellcasters, and creatures carrying relics or elemental artifacts.",
      "It never retreats.",
    ],
    loot: ["mud-caked root talisman", "blackened seed-core", "1d4 grave tokens tangled in roots"],
  },
];

const DEFAULT_WANDERING_TABLES = {
  "Moathouse / Burial Crypt": [
    {
      roll: "1-2",
      type: "Hostile",
      name: "Ghoul Feeding Pack",
      monsters: [{ name: "Ghoul", quantity: 2 }],
      description: "A wet scraping echoes from the burial niches. Pale shapes crouch over old bones, their jaws working long after the meat is gone. When the light reaches them, four dead eyes turn as one.",
      dmNotes: "Use if the party is noisy, wounded, or lingering. Ghouls try to paralyze and drag victims into side crypts.",
    },
    {
      roll: "3",
      type: "Hostile",
      name: "Root-Twisted Corpse",
      monsters: [{ name: "Rootbound Husk", quantity: 1 }],
      description: "Roots push through cracked flagstones and knit themselves around a corpse. The thing rises with mud pouring from its ribs.",
      dmNotes: "Use as a sign the marsh corruption is spreading downward into the crypts.",
    },
    {
      roll: "4",
      type: "Non-Hostile",
      name: "Whispering Burial Niche",
      monsters: [],
      description: "A sealed burial niche exhales cold air. Faint voices whisper from behind the stone, repeating a name no one recognizes.",
      dmNotes: "No combat unless disturbed. DC 13 Religion or Investigation reveals old funerary wards overwritten by elemental marks.",
    },
    {
      roll: "5",
      type: "Non-Hostile",
      name: "Lost Cult Sign",
      monsters: [],
      description: "A smear of ochre and grave-mud marks the wall: a crude arrow, half-erased by claw marks, pointing deeper beneath the Moathouse.",
      dmNotes: "Useful clue. Can reveal recent cult movement or a safer route around a hazard.",
    },
    {
      roll: "6",
      type: "Hostile",
      name: "Carrion Ambush",
      monsters: [{ name: "Ghoul", quantity: 4 }],
      description: "The tunnel ahead is silent until the ceiling soil breaks open and starving dead things drop among the party in a shower of roots and grave dirt.",
      dmNotes: "Hard encounter. Use if Dungeon Alert is high or the party has ignored warning signs.",
    },
  ],
  "Moathouse Marsh": [
    {
      roll: "1-2",
      type: "Hostile",
      name: "Rootbound Husk",
      monsters: [{ name: "Rootbound Husk", quantity: 1 }],
      description: "The marsh water bulges upward. Reeds bend inward as a root-laced corpse hauls itself from the black mud.",
      dmNotes: "Use difficult terrain. The husk tries to restrain isolated targets and fight near mud.",
    },
    {
      roll: "3-4",
      type: "Non-Hostile",
      name: "Sinking Ground",
      monsters: [],
      description: "The ground breathes once beneath the party's boots. Bubbles rise from a patch of black water, carrying the smell of opened graves.",
      dmNotes: "Hazard or clue. DC 13 Survival avoids unstable ground; failure costs time or causes noise.",
    },
    {
      roll: "5",
      type: "Non-Hostile",
      name: "Shard Resonance",
      monsters: [],
      description: "The bone shard pulses like a second heartbeat. For a moment, every root nearby points toward the ruined Moathouse.",
      dmNotes: "Good navigation clue. Reinforces that the shard is pointing toward corruption rather than causing it.",
    },
    {
      roll: "6",
      type: "Hostile",
      name: "Cult Scout Pair",
      monsters: [{ name: "Cultist Acolyte", quantity: 2 }],
      description: "Two mud-streaked figures crouch among the reeds, whispering prayers into the wet earth. One clutches a black charm and reaches for a blade.",
      dmNotes: "May flee to warn others if bloodied. Good chance for interrogation if captured.",
    },
  ],
};

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
  const [workflowMode, setWorkflowMode] = useState(() => loadSaved("workflowMode", "Live"));
  const [cloudSyncStatus, setCloudSyncStatus] = useState(() => loadSaved("cloudSyncStatus", "Not synced yet"));
  const [autoCloudSave, setAutoCloudSave] = useState(() => loadSaved("autoCloudSave", false));

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
  const [monsterImportQuery, setMonsterImportQuery] = useState("");
  const [monsterImportResults, setMonsterImportResults] = useState([]);
  const [monsterImportStatus, setMonsterImportStatus] = useState("");
  const [selectedLibraryMonster, setSelectedLibraryMonster] = useState(null);
  const [monsterEditor, setMonsterEditor] = useState({
    name: "",
    hp: "",
    ac: "",
    init: "",
    xp: "",
    attackBonus: "",
    spellSaveDc: "",
    spellAttackBonus: "",
    speed: "",
    senses: "",
    languages: "",
    traits: "",
    tactics: "",
    loot: "",
  });

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
  const [sessionRecap, setSessionRecap] = useState(() => loadSaved("sessionRecap", ""));
  const [nextSessionTitle, setNextSessionTitle] = useState(() => loadSaved("nextSessionTitle", "TBD"));
  const [prepFocus, setPrepFocus] = useState(() => loadSaved("prepFocus", "Temple of Elemental Evil"));
  const [prepThreat, setPrepThreat] = useState(() => loadSaved("prepThreat", "Earth Cult pressure rises"));
  const [prepLocation, setPrepLocation] = useState(() => loadSaved("prepLocation", "Kron Hills / Temple approaches"));
  const [wanderingTables, setWanderingTables] = useState(() => loadSaved("wanderingTables", DEFAULT_WANDERING_TABLES));
  const [wanderingLocation, setWanderingLocation] = useState(() => loadSaved("wanderingLocation", "Moathouse / Burial Crypt"));
  const [wanderingResult, setWanderingResult] = useState(() => loadSaved("wanderingResult", null));
  const [wanderingEditor, setWanderingEditor] = useState(() => loadSaved("wanderingEditor", {
    location: "Moathouse / Burial Crypt",
    roll: "1",
    type: "Hostile",
    name: "",
    monstersText: "",
    description: "",
    dmNotes: "",
  }));
  const [savedEncounters, setSavedEncounters] = useState(() =>
    loadSaved("savedEncounters", DEFAULT_ENCOUNTERS)
  );
  const [encounterName, setEncounterName] = useState("");

  useEffect(() => localStorage.setItem("log", JSON.stringify(log)), [log]);
  useEffect(() => localStorage.setItem("bridgeUrl", JSON.stringify(bridgeUrl)), [bridgeUrl]);
  useEffect(() => localStorage.setItem("apiKey", JSON.stringify(apiKey)), [apiKey]);
  useEffect(() => localStorage.setItem("channel", JSON.stringify(channel)), [channel]);
  useEffect(() => localStorage.setItem("workflowMode", JSON.stringify(workflowMode)), [workflowMode]);
  useEffect(() => localStorage.setItem("cloudSyncStatus", JSON.stringify(cloudSyncStatus)), [cloudSyncStatus]);
  useEffect(() => localStorage.setItem("autoCloudSave", JSON.stringify(autoCloudSave)), [autoCloudSave]);
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
  useEffect(() => localStorage.setItem("sessionRecap", JSON.stringify(sessionRecap)), [sessionRecap]);
  useEffect(() => localStorage.setItem("nextSessionTitle", JSON.stringify(nextSessionTitle)), [nextSessionTitle]);
  useEffect(() => localStorage.setItem("prepFocus", JSON.stringify(prepFocus)), [prepFocus]);
  useEffect(() => localStorage.setItem("prepThreat", JSON.stringify(prepThreat)), [prepThreat]);
  useEffect(() => localStorage.setItem("prepLocation", JSON.stringify(prepLocation)), [prepLocation]);
  useEffect(() => localStorage.setItem("wanderingTables", JSON.stringify(wanderingTables)), [wanderingTables]);
  useEffect(() => localStorage.setItem("wanderingLocation", JSON.stringify(wanderingLocation)), [wanderingLocation]);
  useEffect(() => localStorage.setItem("wanderingResult", JSON.stringify(wanderingResult)), [wanderingResult]);
  useEffect(() => localStorage.setItem("wanderingEditor", JSON.stringify(wanderingEditor)), [wanderingEditor]);
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

    const NL = String.fromCharCode(10);
    const MAX_DISCORD_LENGTH = 1800;
    const chunks = [];
    let remaining = message.trim();

    while (remaining.length > MAX_DISCORD_LENGTH) {
      let splitAt = remaining.lastIndexOf(NL, MAX_DISCORD_LENGTH);
      if (splitAt < 500) splitAt = MAX_DISCORD_LENGTH;
      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }

    if (remaining.length) chunks.push(remaining);

    try {
      for (let index = 0; index < chunks.length; index += 1) {
        const chunkLabel = chunks.length > 1
          ? NL + NL + "_Part " + (index + 1) + "/" + chunks.length + "_"
          : "";

        const res = await fetch(`${bridgeUrl}/discord/post`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ channel: target, message: chunks[index] + chunkLabel }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }

      const partText = chunks.length > 1 ? " in " + chunks.length + " parts" : "";
      addLog(`✅ Posted to #${target}${partText}.`);
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

  const openMonsterEditor = (monster) => {
    setSelectedLibraryMonster(monster.name);

    setMonsterEditor({
      name: monster.name || "",
      hp: monster.maxHp || monster.hp || "",
      ac: monster.ac || "",
      init: monster.init || "",
      xp: monster.xp || "",
      attackBonus: monster.attackBonus || "",
      spellSaveDc: monster.spellSaveDc || "",
      spellAttackBonus: monster.spellAttackBonus || "",
      speed: monster.speed || "",
      senses: monster.senses || "",
      languages: monster.languages || "",
      traits: (monster.traits || []).join(String.fromCharCode(10)),
      tactics: (monster.tactics || []).join(String.fromCharCode(10)),
      loot: (monster.loot || []).join(String.fromCharCode(10)),
    });
  };

  const saveMonsterEditor = () => {
    if (!monsterEditor.name.trim()) {
      addLog("❌ Monster name required.");
      return;
    }

    const updatedMonster = normalizeMonster({
      name: monsterEditor.name.trim(),
      hp: Number(monsterEditor.hp || 1),
      maxHp: Number(monsterEditor.hp || 1),
      ac: Number(monsterEditor.ac || 10),
      init: Number(monsterEditor.init || 0),
      xp: Number(monsterEditor.xp || 0),
      attackBonus: Number(monsterEditor.attackBonus || 0),
      spellSaveDc: Number(monsterEditor.spellSaveDc || 10),
      spellAttackBonus: Number(monsterEditor.spellAttackBonus || 0),
      speed: monsterEditor.speed,
      senses: monsterEditor.senses,
      languages: monsterEditor.languages,
      traits: monsterEditor.traits
        .split(String.fromCharCode(10))
        .map((v) => v.trim())
        .filter(Boolean),
      tactics: monsterEditor.tactics
        .split(String.fromCharCode(10))
        .map((v) => v.trim())
        .filter(Boolean),
      loot: monsterEditor.loot
        .split(String.fromCharCode(10))
        .map((v) => v.trim())
        .filter(Boolean),
    });

    setMonsterLibrary((prev) => {
      const existingIndex = prev.findIndex(
        (entry) => entry.name.toLowerCase() === selectedLibraryMonster?.toLowerCase()
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updatedMonster, id: undefined };
        return updated;
      }

      return [...prev, { ...updatedMonster, id: undefined }];
    });

    setSelectedLibraryMonster(updatedMonster.name);
    addLog(`💾 Monster updated: ${updatedMonster.name}.`);
  };

  const saveMonsterAsNew = () => {
    if (!monsterEditor.name.trim()) {
      addLog("❌ Monster name required.");
      return;
    }

    const exists = monsterLibrary.some(
      (entry) => entry.name.toLowerCase() === monsterEditor.name.trim().toLowerCase()
    );

    if (exists) {
      addLog("❌ Monster already exists. Rename before Save As New.");
      return;
    }

    const newMonster = normalizeMonster({
      name: monsterEditor.name.trim(),
      hp: Number(monsterEditor.hp || 1),
      maxHp: Number(monsterEditor.hp || 1),
      ac: Number(monsterEditor.ac || 10),
      init: Number(monsterEditor.init || 0),
      xp: Number(monsterEditor.xp || 0),
      attackBonus: Number(monsterEditor.attackBonus || 0),
      spellSaveDc: Number(monsterEditor.spellSaveDc || 10),
      spellAttackBonus: Number(monsterEditor.spellAttackBonus || 0),
      speed: monsterEditor.speed,
      senses: monsterEditor.senses,
      languages: monsterEditor.languages,
      traits: monsterEditor.traits.split(String.fromCharCode(10)).map((v) => v.trim()).filter(Boolean),
      tactics: monsterEditor.tactics.split(String.fromCharCode(10)).map((v) => v.trim()).filter(Boolean),
      loot: monsterEditor.loot.split(String.fromCharCode(10)).map((v) => v.trim()).filter(Boolean),
    });

    setMonsterLibrary((prev) => [...prev, { ...newMonster, id: undefined }]);
    addLog(`📚 Saved new monster: ${newMonster.name}.`);
  };

  const deleteMonsterFromLibrary = (name) => {
    setMonsterLibrary((prev) => prev.filter((m) => m.name !== name));
    addLog(`🗑️ Monster deleted from library: ${name}.`);
  };

  const convertOpen5eMonster = (apiMonster) => {
    const acValue = Array.isArray(apiMonster.armor_class)
      ? Number(apiMonster.armor_class[0]?.value || apiMonster.armor_class[0] || 10)
      : Number(apiMonster.armor_class || 10);

    const hpValue = Number(apiMonster.hit_points || 1);
    const speedText = typeof apiMonster.speed === "string"
      ? apiMonster.speed
      : Object.entries(apiMonster.speed || {})
          .map(([key, value]) => `${key} ${value}`)
          .join(", ");

    const actions = (apiMonster.actions || []).map((action) => ({
      name: action.name || "Action",
      type: action.attack_bonus !== undefined ? "Attack" : "Action",
      attackBonus: action.attack_bonus,
      hit: action.damage_dice ? `${action.damage_dice}${action.damage_bonus ? " + " + action.damage_bonus : ""}` : "",
      effect: action.desc || action.description || "Resolve using source action text.",
      tactics: "Use when this action best fits the monster's instincts and battlefield position.",
    }));

    const traits = (apiMonster.special_abilities || apiMonster.traits || []).map((trait) =>
      trait.desc ? `${trait.name}: ${trait.desc}` : trait.name || String(trait)
    );

    return normalizeMonster({
      name: apiMonster.name || "Imported Monster",
      size: apiMonster.size || "Medium",
      type: apiMonster.type || "creature",
      alignment: apiMonster.alignment || "unaligned",
      hp: hpValue,
      maxHp: hpValue,
      ac: acValue,
      speed: speedText || "30 ft.",
      init: Number(apiMonster.dexterity ? Math.floor((apiMonster.dexterity - 10) / 2) : 0),
      xp: Number(apiMonster.xp || 0),
      attackBonus: Number(actions.find((action) => action.attackBonus !== undefined)?.attackBonus || 3),
      spellSaveDc: Number(apiMonster.spell_save_dc || 12),
      spellAttackBonus: Number(apiMonster.spell_attack_bonus || 4),
      abilities: {
        str: Number(apiMonster.strength || 10),
        dex: Number(apiMonster.dexterity || 10),
        con: Number(apiMonster.constitution || 10),
        int: Number(apiMonster.intelligence || 10),
        wis: Number(apiMonster.wisdom || 10),
        cha: Number(apiMonster.charisma || 10),
      },
      saves: apiMonster.saving_throws || "—",
      skills: apiMonster.skills || "—",
      senses: apiMonster.senses || `passive Perception ${apiMonster.perception || 10}`,
      languages: apiMonster.languages || "—",
      traits,
      actions: actions.length ? actions : ["Attack", "Dodge", "Disengage", "Flee"],
      tactics: [
        `Use ${apiMonster.name || "this monster"} according to its role, terrain, and instincts.`,
        "Focus isolated or wounded targets when appropriate.",
        "Use special traits before basic attacks if they change the battlefield.",
      ],
      loot: [],
    });
  };

  const searchOpen5eMonsters = async () => {
    const query = monsterImportQuery.trim();
    if (!query) {
      setMonsterImportStatus("Enter a monster name to search.");
      return;
    }

    setMonsterImportStatus("Searching Open5e...");

    try {
      const res = await fetch(`https://api.open5e.com/v1/monsters/?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const results = data.results || [];
      setMonsterImportResults(results.slice(0, 12));
      setMonsterImportStatus(`Found ${results.length} result(s).`);
      addLog(`🔎 Monster search complete: ${query}.`);
    } catch (err) {
      setMonsterImportStatus(`Search failed: ${err.message}`);
      addLog(`❌ Monster search failed: ${err.message}`);
    }
  };

  const importOpen5eMonster = (apiMonster, addToEncounter = false) => {
    const monster = convertOpen5eMonster(apiMonster);

    setMonsterLibrary((prev) => {
      const existingIndex = prev.findIndex(
        (entry) => entry.name.toLowerCase() === monster.name.toLowerCase()
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...monster, id: undefined };
        return updated;
      }

      return [...prev, { ...monster, id: undefined }];
    });

    if (addToEncounter) {
      setEnemies((prev) => [...prev, normalizeMonster({ ...monster, id: Date.now() })]);
      addLog(`📥 Imported and added ${monster.name} to encounter.`);
    } else {
      addLog(`📥 Imported ${monster.name} to Monster Library.`);
    }
  };

  const exportMonsterLibrary = () => {
    downloadJSON(monsterLibrary, "GreyhawkMonsterLibrary.json");
    addLog("📤 Monster Library exported.");
  };

  const importMonsterLibrary = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      try {
        const imported = JSON.parse(loadEvent.target.result);

        if (!Array.isArray(imported)) {
          addLog("❌ Monster Library import failed: file must contain an array.");
          return;
        }

        const normalizedImports = imported.map((monster, index) => {
          const normalized = normalizeMonster(monster, index);
          return { ...normalized, id: undefined };
        });

        setMonsterLibrary((prev) => {
          const merged = [...prev];

          normalizedImports.forEach((monster) => {
            const existingIndex = merged.findIndex(
              (entry) => entry.name.toLowerCase() === monster.name.toLowerCase()
            );

            if (existingIndex >= 0) {
              merged[existingIndex] = monster;
            } else {
              merged.push(monster);
            }
          });

          return merged;
        });

        addLog(`📥 Imported ${normalizedImports.length} monster(s) into library.`);
        event.target.value = "";
      } catch {
        addLog("❌ Monster Library import failed: invalid JSON.");
      }
    };

    reader.readAsText(file);
  };

  const syncDefaultMonsters = () => {
    let addedCount = 0;

    setMonsterLibrary((prev) => {
      const merged = [...prev];

      DEFAULT_MONSTER_LIBRARY.forEach((defaultMonster) => {
        const exists = merged.some(
          (entry) => entry.name.toLowerCase() === defaultMonster.name.toLowerCase()
        );

        if (!exists) {
          const normalized = normalizeMonster(defaultMonster);
          merged.push({ ...normalized, id: undefined });
          addedCount += 1;
        }
      });

      return merged;
    });

    addLog(`🔄 Sync Defaults complete. Added ${addedCount} monster(s).`);
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

  const saveMonsterToLibrary = (monster) => {
    const cleanedMonster = {
      ...monster,
      id: undefined,
    };

    setMonsterLibrary((prev) => {
      const existingIndex = prev.findIndex(
        (entry) => entry.name.toLowerCase() === monster.name.toLowerCase()
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = cleanedMonster;
        addLog(`💾 Updated Monster Library entry: ${monster.name}.`);
        return updated;
      }

      addLog(`💾 Saved new monster to library: ${monster.name}.`);
      return [...prev, cleanedMonster];
    });
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

  const parseWanderingMonsterText = (text) => {
    return (text || "")
      .split(String.fromCharCode(10))
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const marker = line.toLowerCase().indexOf("x ");
        if (marker > 0) {
          const quantity = Number(line.slice(0, marker).trim()) || 1;
          const name = line.slice(marker + 2).trim();
          return { quantity, name };
        }
        return { quantity: 1, name: line };
      });
  };

  const syncWanderingDefaults = () => {
    setWanderingTables((prev) => {
      const merged = { ...prev };
      Object.entries(DEFAULT_WANDERING_TABLES).forEach(([location, entries]) => {
        if (!merged[location]) {
          merged[location] = entries;
        }
      });
      return merged;
    });
    addLog("🔄 Wandering encounter defaults synced.");
  };

  const saveWanderingEntry = () => {
    if (!wanderingEditor.location.trim() || !wanderingEditor.name.trim()) {
      addLog("❌ Wandering encounter requires location and name.");
      return;
    }

    const entry = {
      roll: wanderingEditor.roll || "1",
      type: wanderingEditor.type || "Hostile",
      name: wanderingEditor.name.trim(),
      monsters: parseWanderingMonsterText(wanderingEditor.monstersText),
      description: wanderingEditor.description || "No description provided.",
      dmNotes: wanderingEditor.dmNotes || "No DM notes provided.",
    };

    const location = wanderingEditor.location.trim();

    setWanderingTables((prev) => {
      const current = prev[location] || [];
      const existingIndex = current.findIndex((item) => item.name.toLowerCase() === entry.name.toLowerCase());
      const updated = [...current];

      if (existingIndex >= 0) {
        updated[existingIndex] = entry;
      } else {
        updated.push(entry);
      }

      return { ...prev, [location]: updated };
    });

    setWanderingLocation(location);
    addLog(`💾 Wandering encounter saved: ${entry.name}.`);
  };

  const editWanderingEntry = (entry) => {
    setWanderingEditor({
      location: wanderingLocation,
      roll: entry.roll || "1",
      type: entry.type || "Hostile",
      name: entry.name || "",
      monstersText: (entry.monsters || []).map((monster) => `${monster.quantity || 1}x ${monster.name}`).join(String.fromCharCode(10)),
      description: entry.description || "",
      dmNotes: entry.dmNotes || "",
    });
    addLog(`✏️ Editing wandering encounter: ${entry.name}.`);
  };

  const deleteWanderingEntry = (entryName) => {
    setWanderingTables((prev) => ({
      ...prev,
      [wanderingLocation]: (prev[wanderingLocation] || []).filter((entry) => entry.name !== entryName),
    }));
    addLog(`🗑️ Wandering encounter deleted: ${entryName}.`);
  };

  const rollWanderingEncounter = () => {
    const table = wanderingTables[wanderingLocation] || [];
    if (!table.length) {
      addLog("❌ No wandering encounter table found for this location.");
      return;
    }

    const die = Math.floor(Math.random() * 6) + 1;
    const result = table.find((entry) => {
      if (entry.roll.includes("-")) {
        const [min, max] = entry.roll.split("-").map(Number);
        return die >= min && die <= max;
      }
      return Number(entry.roll) === die;
    }) || table[0];

    const payload = {
      ...result,
      die,
      location: wanderingLocation,
      rolledAt: new Date().toLocaleTimeString(),
    };

    setWanderingResult(payload);
    addLog(`🎲 Wandering encounter rolled: ${wanderingLocation} d6=${die} — ${result.name}.`);
  };

  const addWanderingMonstersToEncounter = () => {
    if (!wanderingResult?.monsters?.length) {
      addLog("ℹ️ Wandering result has no monsters to add.");
      return;
    }

    const additions = [];

    wanderingResult.monsters.forEach((entry) => {
      const source = monsterLibrary.find(
        (monster) => monster.name.toLowerCase() === entry.name.toLowerCase()
      );

      for (let i = 0; i < Number(entry.quantity || 1); i += 1) {
        additions.push(normalizeMonster({ ...(source || { name: entry.name, hp: 10, maxHp: 10, ac: 10, xp: 0 }), id: Date.now() + i }));
      }
    });

    setEnemies((prev) => [...prev, ...additions]);
    setActiveEncounterName(wanderingResult.name);
    setWorkflowMode("Combat");
    addLog(`⚔️ Added wandering encounter to combat: ${wanderingResult.name}.`);
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

  const buildPrep = () => `## 🕯️ Session Prep — Greyhawk Command Console

**Focus:** ${prepFocus || "Temple of Elemental Evil"}
**Primary Threat:** ${prepThreat || "Cult activity escalates"}
**Likely Location:** ${prepLocation || "Near the Temple"}

**Date:** ${calendar.date}, ${calendar.phase}, ${formatHour(calendar.time)}
**Dungeon Turn:** ${calendar.dungeonTurn || 0}
**Moon Phase:** ${calendar.moonPhase || "Waxing"}
**Session:** #${calendar.session}

## Current World State
- Earth Cult Alert: ${earthCult}/5
- Dungeon Alert: ${dungeonAlert}/5
- Earth Node Progress: ${nodeProgress}%

## Opening Recap
The road behind the party is troubled by rumor, old blood, and the slow tightening grip of hidden powers. The cults beneath the Temple do not sleep. Their watchers listen from broken halls, muddy roads, and friendly-looking taprooms.

## Likely Scenes
1. **Approach / Investigation:** Signs of cult movement, disturbed earth, frightened locals, or unnatural silence.
2. **NPC Pressure:** A suspicious villager, desperate informant, or cult-touched survivor forces a decision.
3. **Dungeon or Wilderness Threat:** Patrols, traps, ambushes, or environmental hazards reveal the enemy's preparation.
4. **Choice Point:** Press onward, retreat, negotiate, rest, or risk attracting greater attention.

## Active NPC / Faction Moves
- Earth Cult agents reinforce chokepoints and watch for relic-bearers.
- Local informants grow nervous; one may sell information to the wrong side.
- Rival cult influence may exploit any delay or visible weakness.

## Rumors / Clues
- "The ground has been breathing near the old stones."
- "A hooded priest paid silver for names of armed strangers."
- "Something root-bound and dead was seen moving in the reeds."

## Encounter Options
- Cult Ambush if the party moves openly or makes noise.
- Rootbound Husk if they pass through marsh, roots, grave-soil, or corrupted wilderness.
- Earth Temple Guard if they breach a fortified cult position.

## Treasure / Rewards Hooks
- Earth cult token or coded prayer strip.
- Mud-caked relic fragment or blackened seed-core.
- A recovered note pointing toward the next chamber, informant, or cult cell.

## DM Reminders
- Advance time after meaningful exploration.
- Escalate Dungeon Alert if the party rests loudly, leaves witnesses, or triggers alarms.
- Use bloodied monsters intelligently: flee, call aid, bargain, or die fanatically depending on morale.

## Discord Player Teaser
The old roads bend toward darker ground. Somewhere ahead, roots clutch bone, stone remembers blood, and the Temple waits beneath a silence too deliberate to be natural.`;

  const buildSnapshot = () => {
    const partyText = party
      .map((p) => {
        const cond = p.conditions.length ? ` | ${p.conditions.join(", ")}` : "";
        return `${p.name}: ${p.hp}/${p.maxHp} HP | AC ${p.ac} | Init ${p.init}${cond}`;
      })
      .join(String.fromCharCode(10));
    const enemyText = enemies.length
      ? enemies.map((e) => `${e.name}: ${e.hp}/${e.maxHp} HP | AC ${e.ac} | Init ${e.init}`).join(String.fromCharCode(10))
      : "None";
    const initiativeText = initiative
      .map((c, idx) => `${idx === turnIndex ? "▶ " : ""}${c.init} — ${c.name} (${c.type})`)
      .join(String.fromCharCode(10));
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

  const buildSessionRecap = () => {
    const NL = String.fromCharCode(10);
    const defeated = defeatedEnemies || [];
    const totalXp = defeated.reduce((sum, enemy) => sum + Number(enemy.xp || 0), 0);
    const perPlayer = Math.floor(totalXp / Math.max(party.length, 1));
    const loot = defeated.flatMap((enemy) => enemy.loot || []);
    const partyStatus = party.map((pc) => {
      const conditions = pc.conditions?.length ? " | " + pc.conditions.join(", ") : "";
      return "• " + pc.name + ": " + pc.hp + "/" + pc.maxHp + " HP" + conditions;
    }).join(NL);
    const recentLog = log.slice(0, 12).map((entry) => "• " + entry).join(NL);

    return [
      "# 📜 Session #" + (calendar.session || 41) + " Recap — The Mouth Beneath the Marsh",
      "",
      "**In-Game Time:** " + calendar.date + ", " + calendar.phase + ", " + formatHour(calendar.time),
      "**Moon:** " + (calendar.moonPhase || "Waxing"),
      "**Dungeon Turn:** " + (calendar.dungeonTurn || 0),
      "",
      "## What Happened",
      "The party confronted the rootbound horrors rising from the corrupted marsh near the Moathouse. The creatures were destroyed, but their emergence revealed something worse beneath the surface: a torn opening leading down into ghoul-haunted tunnels under the ruins.",
      "",
      "## Combat Results",
      defeated.length ? defeated.map((enemy) => "• Defeated: " + enemy.name).join(NL) : "• No defeated enemies recorded.",
      "",
      "## XP",
      "• Total XP: " + totalXp,
      "• XP per character: " + perPlayer,
      "",
      "## Loot / Discoveries",
      loot.length ? loot.map((item) => "• " + item).join(NL) : "• No loot recorded.",
      "• A sinkhole or torn marsh-mouth leads into ghoul tunnels beneath the Moathouse.",
      "",
      "## Party Status",
      partyStatus,
      "",
      "## World State Changes",
      "• Earth Cult Alert: " + earthCult + "/5",
      "• Dungeon Alert: " + dungeonAlert + "/5",
      "• Earth Node Progress: " + nodeProgress + "%",
      "• Root corruption around the Moathouse remains active.",
      "",
      "## Open Threads",
      "• What created or awakened the Rootbound Husks?",
      "• Where do the ghoul tunnels lead?",
      "• Why does the bone shard continue to resonate near the Moathouse?",
      "• Is the Moathouse being swallowed, transformed, or used as a mouth for something below?",
      "",
      "## Recent Console Log",
      recentLog || "• No recent log entries.",
    ].join(NL);
  };

  const generateSessionRecap = () => {
    const recap = buildSessionRecap();
    setSessionRecap(recap);
    addLog("📜 Session recap generated.");
  };

  const postSessionRecap = () => {
    const recap = sessionRecap || buildSessionRecap();
    postToDiscord("bard-tales", recap);
  };

  const endSessionLifecycle = async () => {
    const currentSession = Number(calendar.session || 41);
    const nextSession = currentSession + 1;
    const recap = sessionRecap || buildSessionRecap();
    const nextCalendar = {
      ...calendar,
      session: nextSession,
    };

    setSessionRecap(recap);
    setCalendar(nextCalendar);
    setEnemies([]);
    setDefeatedEnemies([]);
    setEncounterSummary("");
    setActiveEncounterName("Current Encounter");
    setRound(1);
    setTurnIndex(0);
    setWorkflowMode("Prep");
    setSessionPrep("");
    setNextSessionTitle("TBD");

    addLog(`🏁 Session #${currentSession} closed. Session #${nextSession} prepared.`);

    if (!bridgeUrl || !apiKey) {
      setCloudSyncStatus("End session complete; cloud save skipped");
      return;
    }

    try {
      const nextCampaignState = {
        party,
        enemies: [],
        defeatedEnemies: [],
        monsterLibrary,
        turnIndex: 0,
        round: 1,
        activeEncounterName: "Current Encounter",
        encounterSummary: "",
        npcs,
        encounterName,
        savedEncounters,
        earthCult,
        dungeonAlert,
        nodeProgress,
        calendar: nextCalendar,
        log,
      };

      const payload = {
        savedAt: new Date().toISOString(),
        campaign: nextCampaignState,
      };

      const res = await fetch(`${bridgeUrl}/campaign-state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const status = `Session #${nextSession} prepared and cloud saved ${new Date().toLocaleTimeString()}`;
      setCloudSyncStatus(status);
      addLog(`☁️ ${status}.`);
    } catch (err) {
      setCloudSyncStatus(`End session cloud save failed: ${err.message}`);
      addLog(`❌ End session cloud save failed: ${err.message}`);
    }
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

  const saveCampaignToCloud = async () => {
    if (!bridgeUrl || !apiKey) {
      addLog("❌ Cloud sync failed: bridge not configured.");
      setCloudSyncStatus("Cloud save failed: bridge not configured");
      return;
    }

    try {
      const payload = {
        savedAt: new Date().toISOString(),
        campaign: getCampaignState(),
      };

      const res = await fetch(`${bridgeUrl}/campaign-state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const status = `Cloud saved ${new Date().toLocaleTimeString()}`;
      setCloudSyncStatus(status);
      addLog(`☁️ ${status}.`);
    } catch (err) {
      setCloudSyncStatus(`Cloud save failed: ${err.message}`);
      addLog(`❌ Cloud save failed: ${err.message}`);
    }
  };

  const loadCampaignFromCloud = async () => {
    if (!bridgeUrl || !apiKey) {
      addLog("❌ Cloud sync failed: bridge not configured.");
      setCloudSyncStatus("Cloud load failed: bridge not configured");
      return;
    }

    try {
      const res = await fetch(`${bridgeUrl}/campaign-state`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const payload = await res.json();
      const data = payload.campaign || payload;

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

      const status = payload.savedAt
        ? `Cloud loaded ${new Date(payload.savedAt).toLocaleString()}`
        : `Cloud loaded ${new Date().toLocaleTimeString()}`;

      setCloudSyncStatus(status);
      addLog(`☁️ ${status}.`);
    } catch (err) {
      setCloudSyncStatus(`Cloud load failed: ${err.message}`);
      addLog(`❌ Cloud load failed: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!autoCloudSave) return;

    const interval = setInterval(() => {
      saveCampaignToCloud();
    }, 60000);

    return () => clearInterval(interval);
  }, [autoCloudSave, party, enemies, defeatedEnemies, monsterLibrary, turnIndex, round, activeEncounterName, encounterSummary, npcs, encounterName, savedEncounters, earthCult, dungeonAlert, nodeProgress, calendar, log, bridgeUrl, apiKey]);

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

  const workflowVisible = {
    Prep: { left: false, top: true, center: true, right: true, bottom: true },
    Live: { left: true, top: true, center: false, right: true, bottom: true },
    Combat: { left: true, top: false, center: true, right: true, bottom: true },
    "After Action": { left: false, top: true, center: true, right: true, bottom: true },
  }[workflowMode] || { left: true, top: true, center: true, right: true, bottom: true };

  const layoutStyle = isMobile ? mobileGridStyle : getDesktopGridStyle(workflowMode);
  const leftStyle = workflowVisible.left ? (isMobile ? mobileSectionStyle : leftColumnStyle) : hiddenStyle;
  const topStyle = workflowVisible.top ? (isMobile ? mobileSectionStyle : topBarStyle) : hiddenStyle;
  const centerStyle = workflowVisible.center ? (isMobile ? mobileSectionStyle : centerColumnStyle) : hiddenStyle;
  const rightStyle = workflowVisible.right ? (isMobile ? mobileSectionStyle : rightColumnStyle) : hiddenStyle;
  const bottomStyle = workflowVisible.bottom ? (isMobile ? mobileSectionStyle : bottomBarStyle) : hiddenStyle;

  return (
    <div style={pageStyle}>
      <h1 style={isMobile ? mobileTitleStyle : titleStyle}>Greyhawk Command Console v4</h1>
      <WorkflowBar
        workflowMode={workflowMode}
        setWorkflowMode={setWorkflowMode}
        cloudSyncStatus={cloudSyncStatus}
        autoCloudSave={autoCloudSave}
        setAutoCloudSave={setAutoCloudSave}
      />
      <WorkflowGuide workflowMode={workflowMode} />
      <WorkflowQuickActions
        workflowMode={workflowMode}
        setWorkflowMode={setWorkflowMode}
        setSessionPrep={setSessionPrep}
        buildPrep={buildPrep}
        loadCultAmbush={loadCultAmbush}
        advanceTime={advanceTime}
        endEncounter={endEncounter}
        postEncounterSummary={postEncounterSummary}
        postEncounterLoot={postEncounterLoot}
        saveCampaign={saveCampaign}
        exportCampaign={exportCampaign}
        generateSessionRecap={generateSessionRecap}
        postSessionRecap={postSessionRecap}
        endSessionLifecycle={endSessionLifecycle}
        saveCampaignToCloud={saveCampaignToCloud}
        loadCampaignFromCloud={loadCampaignFromCloud}
      />
      <main style={layoutStyle}>
        <div style={leftStyle}>
          {(workflowMode === "Live" || workflowMode === "Combat") && (
            <PartyPanel party={party} updatePartyField={updatePartyField} updatePartyHp={updatePartyHp} toggleCondition={toggleCondition} />
          )}
          {workflowMode === "Live" && (
            <NpcPanel npcs={npcs} npcForm={npcForm} setNpcForm={setNpcForm} addNpc={addNpc} removeNpc={removeNpc} />
          )}
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
          {(workflowMode === "Combat" || workflowMode === "After Action") && (
            <CombatDirectorPanel
              party={party}
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
              saveMonsterToLibrary={saveMonsterToLibrary}
              selectedActionInfo={selectedActionInfo}
              defeatedEnemies={defeatedEnemies}
              enemies={enemies}
              endEncounter={endEncounter}
              encounterSummary={encounterSummary}
              postEncounterSummary={postEncounterSummary}
              postEncounterLoot={postEncounterLoot}
            />
          )}

          {(workflowMode === "Prep" || workflowMode === "Combat") && (
            <EncounterLibraryPanel encounterName={encounterName} setEncounterName={setEncounterName} saveCurrentEncounter={saveCurrentEncounter} savedEncounters={savedEncounters} loadEncounter={loadEncounter} deleteEncounter={deleteEncounter} />
          )}
        </div>

        <div style={rightStyle}>
          {workflowMode === "Combat" && (
            <>
              <MonsterLibraryPanel
                monsterLibrary={monsterLibrary}
                monsterSearch={monsterSearch}
                setMonsterSearch={setMonsterSearch}
                addMonsterFromLibrary={addMonsterFromLibrary}
                deleteMonsterFromLibrary={deleteMonsterFromLibrary}
                openMonsterEditor={openMonsterEditor}
                monsterEditor={monsterEditor}
                setMonsterEditor={setMonsterEditor}
                saveMonsterEditor={saveMonsterEditor}
                saveMonsterAsNew={saveMonsterAsNew}
                exportMonsterLibrary={exportMonsterLibrary}
                importMonsterLibrary={importMonsterLibrary}
                syncDefaultMonsters={syncDefaultMonsters}
                monsterImportQuery={monsterImportQuery}
                setMonsterImportQuery={setMonsterImportQuery}
                monsterImportResults={monsterImportResults}
                monsterImportStatus={monsterImportStatus}
                searchOpen5eMonsters={searchOpen5eMonsters}
                importOpen5eMonster={importOpen5eMonster}
              />
              <EnemiesPanel enemies={enemies} enemyForm={enemyForm} setEnemyForm={setEnemyForm} addEnemy={addEnemy} updateEnemyHp={updateEnemyHp} removeEnemy={removeEnemy} toggleEnemyCondition={toggleEnemyCondition} saveFormToMonsterLibrary={saveFormToMonsterLibrary} />
            </>
          )}
          {(workflowMode === "Prep" || workflowMode === "Live") && (
            <WanderingEncounterPanel
              wanderingTables={wanderingTables}
              wanderingLocation={wanderingLocation}
              setWanderingLocation={setWanderingLocation}
              wanderingResult={wanderingResult}
              rollWanderingEncounter={rollWanderingEncounter}
              addWanderingMonstersToEncounter={addWanderingMonstersToEncounter}
              wanderingEditor={wanderingEditor}
              setWanderingEditor={setWanderingEditor}
              saveWanderingEntry={saveWanderingEntry}
              editWanderingEntry={editWanderingEntry}
              deleteWanderingEntry={deleteWanderingEntry}
              syncWanderingDefaults={syncWanderingDefaults}
            />
          )}

          {(workflowMode === "Prep" || workflowMode === "Live") && (
            <SessionPrepGeneratorPanel
              sessionPrep={sessionPrep}
              setSessionPrep={setSessionPrep}
              buildPrep={buildPrep}
              postToDiscord={postToDiscord}
              addLog={addLog}
              prepFocus={prepFocus}
              setPrepFocus={setPrepFocus}
              prepThreat={prepThreat}
              setPrepThreat={setPrepThreat}
              prepLocation={prepLocation}
              setPrepLocation={setPrepLocation}
            />
          )}

          {workflowMode === "After Action" && (
            <Panel title="Session Recap">
              <div style={buttonWrapStyle}>
                <button style={buttonStyle} onClick={generateSessionRecap}>📜 Generate Recap</button>
                <button style={buttonStyle} onClick={postSessionRecap}>Post to #bard-tales</button>
                <button style={buttonStyle} onClick={endSessionLifecycle}>🏁 End Session / Prepare Next</button>
              </div>
              <textarea
                style={{ ...textAreaStyle, minHeight: 320 }}
                value={sessionRecap}
                onChange={(event) => setSessionRecap(event.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Next session title"
                value={nextSessionTitle}
                onChange={(event) => setNextSessionTitle(event.target.value)}
              />
            </Panel>
          )}

          {(workflowMode === "Prep" || workflowMode === "Live" || workflowMode === "After Action") && (
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
          )}

          {(workflowMode === "Prep" || workflowMode === "After Action") && (
            <Panel title="DM Actions">
              <button style={buttonStyle} onClick={() => postToDiscord("dm-control-room", buildSnapshot())}>📊 DM Snapshot</button>
              <button style={buttonStyle} onClick={saveCampaign}>💾 Save Campaign</button>
              <button style={buttonStyle} onClick={loadCampaign}>📂 Load Campaign</button>
              <button style={buttonStyle} onClick={exportCampaign}>📤 Export JSON</button>
              <button style={buttonStyle} onClick={saveCampaignToCloud}>☁️ Save to Cloud</button>
              <button style={buttonStyle} onClick={loadCampaignFromCloud}>☁️ Load from Cloud</button>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>Cloud: {cloudSyncStatus}</div>
              <label style={buttonStyle}>📥 Import JSON<input type="file" accept=".json" onChange={importCampaign} style={{ display: "none" }} /></label>
              <button style={dangerButtonStyle} onClick={resetSavedState}>Reset Saved State</button>
            </Panel>
          )}
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

function WorkflowBar({ workflowMode, setWorkflowMode, cloudSyncStatus, autoCloudSave, setAutoCloudSave }) {
  const modes = ["Prep", "Live", "Combat", "After Action"];

  return (
    <div style={workflowBarStyle}>
      <div style={workflowLabelStyle}>DM Workflow Mode</div>
      <div style={workflowButtonWrapStyle}>
        {modes.map((mode) => {
          const active = workflowMode === mode;
          return (
            <button
              key={mode}
              style={active ? workflowButtonActiveStyle : workflowButtonStyle}
              onClick={() => setWorkflowMode(mode)}
            >
              {mode}
            </button>
          );
        })}
      </div>
      <div style={workflowStatusStyle}>
        <div>Current Mode: {workflowMode}</div>
        <div>Cloud: {cloudSyncStatus}</div>
        <button
          style={autoCloudSave ? workflowMiniButtonActiveStyle : workflowMiniButtonStyle}
          onClick={() => setAutoCloudSave(!autoCloudSave)}
        >
          ☁️ Auto Save: {autoCloudSave ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}

function WorkflowGuide({ workflowMode }) {
  const guides = {
    Prep: {
      title: "Prep Mode",
      text: "Build tonight's session, review world state, prepare Discord posts, and stage encounters before the table sits down.",
      steps: ["Auto Fill Session Prep", "Review World Clock", "Check Faction / Node state", "Prepare encounters"],
    },
    Live: {
      title: "Live Mode",
      text: "Run exploration, NPC interactions, rumors, time passage, and general table management without the combat panels taking over.",
      steps: ["Track party status", "Update NPCs", "Advance time", "Post notes to Discord"],
    },
    Combat: {
      title: "Combat Mode",
      text: "Run initiative, monster turns, HP, conditions, tactics, XP, loot, and encounter summaries in real time.",
      steps: ["Load or add monsters", "Use Next Turn", "Use monster actions", "End Encounter when foes fall"],
    },
    "After Action": {
      title: "After Action Mode",
      text: "Close the loop after play: summarize events, post loot, export campaign state, and preserve the record of the session.",
      steps: ["Generate encounter summary", "Post loot", "Save campaign", "Export backup JSON"],
    },
  };

  const guide = guides[workflowMode] || guides.Live;

  return (
    <div style={workflowGuideStyle}>
      <div style={workflowGuideTitleStyle}>{guide.title}</div>
      <div style={workflowGuideTextStyle}>{guide.text}</div>
      <div style={workflowGuideStepsStyle}>
        {guide.steps.map((step) => (
          <span key={step} style={workflowGuideStepStyle}>{step}</span>
        ))}
      </div>
    </div>
  );
}

function WorkflowQuickActions({
  workflowMode,
  setWorkflowMode,
  setSessionPrep,
  buildPrep,
  loadCultAmbush,
  advanceTime,
  endEncounter,
  postEncounterSummary,
  postEncounterLoot,
  saveCampaign,
  exportCampaign,
  generateSessionRecap,
  postSessionRecap,
  endSessionLifecycle,
  saveCampaignToCloud,
  loadCampaignFromCloud,
}) {
  if (workflowMode === "Prep") {
    return (
      <div style={quickActionsStyle}>
        <button style={quickActionButtonStyle} onClick={() => setSessionPrep(buildPrep())}>🕯️ Auto Fill Prep</button>
        <button style={quickActionButtonStyle} onClick={() => advanceTime(1, 0)}>🕒 Advance 1 Hour</button>
        <button style={quickActionButtonStyle} onClick={() => setWorkflowMode("Live")}>▶ Begin Live Session</button>
      </div>
    );
  }

  if (workflowMode === "Live") {
    return (
      <div style={quickActionsStyle}>
        <button style={quickActionButtonStyle} onClick={() => advanceTime(0, 10)}>🕯️ Dungeon Turn +10 Min</button>
        <button style={quickActionButtonStyle} onClick={() => advanceTime(1, 0)}>🕒 +1 Hour</button>
        <button style={quickActionButtonStyle} onClick={() => setWorkflowMode("Combat")}>⚔️ Enter Combat Mode</button>
      </div>
    );
  }

  if (workflowMode === "Combat") {
    return (
      <div style={quickActionsStyle}>
        <button style={quickActionButtonStyle} onClick={loadCultAmbush}>⚔️ Load Cult Ambush</button>
        <button style={quickActionButtonStyle} onClick={endEncounter}>🏁 End Encounter</button>
        <button style={quickActionButtonStyle} onClick={() => setWorkflowMode("After Action")}>📜 After Action</button>
      </div>
    );
  }

  return (
    <div style={quickActionsStyle}>
      <button style={quickActionButtonStyle} onClick={generateSessionRecap}>📜 Generate Recap</button>
      <button style={quickActionButtonStyle} onClick={postSessionRecap}>📡 Post Recap</button>
      <button style={quickActionButtonStyle} onClick={endSessionLifecycle}>🏁 End Session</button>
      <button style={quickActionButtonStyle} onClick={postEncounterSummary}>📡 Post Summary</button>
      <button style={quickActionButtonStyle} onClick={postEncounterLoot}>💰 Post Loot</button>
      <button style={quickActionButtonStyle} onClick={saveCampaign}>💾 Save Campaign</button>
      <button style={quickActionButtonStyle} onClick={saveCampaignToCloud}>☁️ Save Cloud</button>
      <button style={quickActionButtonStyle} onClick={loadCampaignFromCloud}>☁️ Load Cloud</button>
      <button style={quickActionButtonStyle} onClick={exportCampaign}>📤 Export Backup</button>
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

function CombatDirectorPanel({ party, round, active, initiative, turnIndex, nextTurn, resetCombat, loadCultAmbush, recordMonsterAction, startEditingAction, editingMonsterId, editingActionIndex, actionEditor, setActionEditor, saveEditedAction, saveMonsterToLibrary, selectedActionInfo, defeatedEnemies, enemies, endEncounter, encounterSummary, postEncounterSummary, postEncounterLoot }) {
  const currentMonster = active?.type === "Enemy" ? active : null;
  const allEnemiesDefeated = enemies.length === 0 && defeatedEnemies.length > 0;
  const turnSuggestions = currentMonster ? getMonsterTurnSuggestions(currentMonster, party) : [];

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
          <div style={combatAdvisorStyle}>
            <strong>Combat Advisor v2</strong>
            <ul style={{ marginTop: 6 }}>
              {turnSuggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Monster Tactics</strong>
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
              <button style={buttonStyle} onClick={() => saveMonsterToLibrary(currentMonster)}>📚 Save Monster to Library</button>
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

function WanderingEncounterPanel({
  wanderingTables,
  wanderingLocation,
  setWanderingLocation,
  wanderingResult,
  rollWanderingEncounter,
  addWanderingMonstersToEncounter,
  wanderingEditor,
  setWanderingEditor,
  saveWanderingEntry,
  editWanderingEntry,
  deleteWanderingEntry,
  syncWanderingDefaults,
}) {
  const locations = Object.keys(wanderingTables);
  const currentTable = wanderingTables[wanderingLocation] || [];

  return (
    <Panel title="Wandering Encounters">
      <select
        style={inputStyle}
        value={wanderingLocation}
        onChange={(event) => setWanderingLocation(event.target.value)}
      >
        {locations.map((location) => (
          <option key={location} value={location}>{location}</option>
        ))}
      </select>

      <div style={buttonWrapStyle}>
        <button style={buttonStyle} onClick={rollWanderingEncounter}>🎲 Roll Encounter</button>
        <button style={smallButtonStyle} onClick={syncWanderingDefaults}>🔄 Sync Defaults</button>
      </div>

      <div style={wanderingEditorStyle}>
        <h3 style={subHeaderStyle}>Table Editor</h3>
        <input
          style={inputStyle}
          placeholder="Location"
          value={wanderingEditor.location}
          onChange={(event) => setWanderingEditor({ ...wanderingEditor, location: event.target.value })}
        />
        <div style={miniGridStyle}>
          <input
            style={inputStyle}
            placeholder="Roll, e.g. 1 or 1-2"
            value={wanderingEditor.roll}
            onChange={(event) => setWanderingEditor({ ...wanderingEditor, roll: event.target.value })}
          />
          <select
            style={inputStyle}
            value={wanderingEditor.type}
            onChange={(event) => setWanderingEditor({ ...wanderingEditor, type: event.target.value })}
          >
            <option>Hostile</option>
            <option>Non-Hostile</option>
          </select>
        </div>
        <input
          style={inputStyle}
          placeholder="Encounter name"
          value={wanderingEditor.name}
          onChange={(event) => setWanderingEditor({ ...wanderingEditor, name: event.target.value })}
        />
        <textarea
          style={textAreaStyle}
          placeholder={'Monsters, one per line, e.g. 4x Ghoul'}
          value={wanderingEditor.monstersText}
          onChange={(event) => setWanderingEditor({ ...wanderingEditor, monstersText: event.target.value })}
        />
        <textarea
          style={textAreaStyle}
          placeholder="Read-aloud / DM description"
          value={wanderingEditor.description}
          onChange={(event) => setWanderingEditor({ ...wanderingEditor, description: event.target.value })}
        />
        <textarea
          style={textAreaStyle}
          placeholder="DM notes"
          value={wanderingEditor.dmNotes}
          onChange={(event) => setWanderingEditor({ ...wanderingEditor, dmNotes: event.target.value })}
        />
        <button style={buttonStyle} onClick={saveWanderingEntry}>💾 Save Table Entry</button>
      </div>

      <div style={wanderingTableListStyle}>
        <h3 style={subHeaderStyle}>Current Table</h3>
        {currentTable.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No entries for this location yet.</div>
        ) : (
          currentTable.map((entry) => (
            <div key={`${entry.roll}-${entry.name}`} style={innerCardStyle}>
              <strong>{entry.roll}: {entry.name}</strong>
              <div style={{ fontSize: 12, color: entry.type === "Hostile" ? "#fca5a5" : "#93c5fd" }}>{entry.type}</div>
              <button style={smallButtonStyle} onClick={() => editWanderingEntry(entry)}>✏️ Edit</button>
              <button style={dangerButtonStyle} onClick={() => deleteWanderingEntry(entry.name)}>Delete</button>
            </div>
          ))
        )}
      </div>

      {wanderingResult && (
        <div style={innerCardStyle}>
          <div style={{ fontSize: 13, color: "#f2d28b" }}>
            {wanderingResult.location} — d6: {wanderingResult.die} — {wanderingResult.type}
          </div>
          <h3 style={subHeaderStyle}>{wanderingResult.name}</h3>
          <p><strong>Read-Aloud / DM Description:</strong></p>
          <p>{wanderingResult.description}</p>
          <p><strong>DM Notes:</strong> {wanderingResult.dmNotes}</p>

          {wanderingResult.monsters?.length > 0 ? (
            <div>
              <strong>Monsters:</strong>
              <ul>
                {wanderingResult.monsters.map((monster, index) => (
                  <li key={index}>{monster.quantity}x {monster.name}</li>
                ))}
              </ul>
              <button style={buttonStyle} onClick={addWanderingMonstersToEncounter}>
                ⚔️ Add to Encounter
              </button>
            </div>
          ) : (
            <div style={{ color: "#cbd5e1" }}>No hostile monsters. Use as clue, hazard, atmosphere, or roleplay beat.</div>
          )}
        </div>
      )}
    </Panel>
  );
}

function SessionPrepGeneratorPanel({
  sessionPrep,
  setSessionPrep,
  buildPrep,
  postToDiscord,
  addLog,
  prepFocus,
  setPrepFocus,
  prepThreat,
  setPrepThreat,
  prepLocation,
  setPrepLocation,
}) {
  const generatePrep = () => {
    setSessionPrep(buildPrep());
    addLog("🕯️ Session prep generated.");
  };

  const postPrep = async () => {
    const message = sessionPrep?.trim() ? sessionPrep : buildPrep();

    if (!sessionPrep?.trim()) {
      setSessionPrep(message);
    }

    addLog("📡 Sending session prep to #session-prep...");
    await postToDiscord("session-prep", message);
  };

  return (
    <Panel title="Session Prep Generator">
      <div style={miniGridStyle}>
        <input
          style={inputStyle}
          placeholder="Session focus"
          value={prepFocus}
          onChange={(event) => setPrepFocus(event.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Primary threat"
          value={prepThreat}
          onChange={(event) => setPrepThreat(event.target.value)}
        />
      </div>

      <input
        style={inputStyle}
        placeholder="Likely location"
        value={prepLocation}
        onChange={(event) => setPrepLocation(event.target.value)}
      />

      <div style={buttonWrapStyle}>
        <button style={buttonStyle} onClick={generatePrep}>🕯️ Generate Prep</button>
        <button style={buttonStyle} onClick={postPrep}>Post to #session-prep</button>
      </div>

      <textarea
        style={{ ...textAreaStyle, minHeight: 320 }}
        value={sessionPrep}
        onChange={(event) => setSessionPrep(event.target.value)}
      />
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

function MonsterLibraryPanel({
  monsterLibrary,
  monsterSearch,
  setMonsterSearch,
  addMonsterFromLibrary,
  deleteMonsterFromLibrary,
  openMonsterEditor,
  monsterEditor,
  setMonsterEditor,
  saveMonsterEditor,
  saveMonsterAsNew,
  exportMonsterLibrary,
  importMonsterLibrary,
  syncDefaultMonsters,
  monsterImportQuery,
  setMonsterImportQuery,
  monsterImportResults,
  monsterImportStatus,
  searchOpen5eMonsters,
  importOpen5eMonster,
}) {
  const query = monsterSearch.trim().toLowerCase();
  const filteredMonsters = monsterLibrary.filter((monster) =>
    monster.name.toLowerCase().includes(query)
  );

  return (
    <Panel title="Monster Library">
      <div style={monsterImporterStyle}>
        <h3 style={subHeaderStyle}>Monster Importer v1</h3>
        <div style={buttonWrapStyle}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: "1 1 220px" }}
            placeholder="Search Open5e / SRD monsters, e.g. ghoul"
            value={monsterImportQuery}
            onChange={(event) => setMonsterImportQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") searchOpen5eMonsters();
            }}
          />
          <button style={buttonStyle} onClick={searchOpen5eMonsters}>🔎 Search</button>
        </div>
        <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>{monsterImportStatus}</div>
        <div style={monsterImportResultsStyle}>
          {(monsterImportResults || []).map((monster) => (
            <div key={monster.slug || monster.name} style={innerCardStyle}>
              <strong>{monster.name}</strong>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                CR {monster.challenge_rating || "?"} | HP {monster.hit_points || "?"} | AC {Array.isArray(monster.armor_class) ? monster.armor_class[0]?.value || monster.armor_class[0] : monster.armor_class || "?"}
              </div>
              <button style={smallButtonStyle} onClick={() => importOpen5eMonster(monster, false)}>Import to Library</button>
              <button style={smallButtonStyle} onClick={() => importOpen5eMonster(monster, true)}>Import + Add</button>
            </div>
          ))}
        </div>
      </div>

      <input
        style={inputStyle}
        placeholder="Search monsters"
        value={monsterSearch}
        onChange={(event) => setMonsterSearch(event.target.value)}
      />

      <div style={buttonWrapStyle}>
        <button style={smallButtonStyle} onClick={exportMonsterLibrary}>
          📤 Export Library
        </button>
        <button style={smallButtonStyle} onClick={syncDefaultMonsters}>
          🔄 Sync Defaults
        </button>
        <label style={smallButtonStyle}>
          📥 Import Library
          <input
            type="file"
            accept=".json"
            onChange={importMonsterLibrary}
            style={{ display: "none" }}
          />
        </label>
      </div>

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
                {(monster.actions || [])
                  .slice(0, 4)
                  .map((action) => (typeof action === "string" ? action : action.name))
                  .join(" • ")}
              </div>
              <button style={smallButtonStyle} onClick={() => addMonsterFromLibrary(monster)}>
                Add to Encounter
              </button>
              <button style={smallButtonStyle} onClick={() => openMonsterEditor(monster)}>
                ✏️ Edit
              </button>
              <button style={dangerButtonStyle} onClick={() => deleteMonsterFromLibrary(monster.name)}>
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      <div style={monsterEditorPanelStyle}>
        <h3 style={subHeaderStyle}>Monster Editor</h3>
        <input style={inputStyle} placeholder="Name" value={monsterEditor.name} onChange={(e) => setMonsterEditor({ ...monsterEditor, name: e.target.value })} />
        <div style={miniGridStyle}>
          <input style={inputStyle} placeholder="HP" value={monsterEditor.hp} onChange={(e) => setMonsterEditor({ ...monsterEditor, hp: e.target.value })} />
          <input style={inputStyle} placeholder="AC" value={monsterEditor.ac} onChange={(e) => setMonsterEditor({ ...monsterEditor, ac: e.target.value })} />
          <input style={inputStyle} placeholder="Init" value={monsterEditor.init} onChange={(e) => setMonsterEditor({ ...monsterEditor, init: e.target.value })} />
          <input style={inputStyle} placeholder="XP" value={monsterEditor.xp} onChange={(e) => setMonsterEditor({ ...monsterEditor, xp: e.target.value })} />
        </div>
        <div style={miniGridStyle}>
          <input style={inputStyle} placeholder="Attack Bonus" value={monsterEditor.attackBonus} onChange={(e) => setMonsterEditor({ ...monsterEditor, attackBonus: e.target.value })} />
          <input style={inputStyle} placeholder="Spell Save DC" value={monsterEditor.spellSaveDc} onChange={(e) => setMonsterEditor({ ...monsterEditor, spellSaveDc: e.target.value })} />
          <input style={inputStyle} placeholder="Spell Attack Bonus" value={monsterEditor.spellAttackBonus} onChange={(e) => setMonsterEditor({ ...monsterEditor, spellAttackBonus: e.target.value })} />
          <input style={inputStyle} placeholder="Speed" value={monsterEditor.speed} onChange={(e) => setMonsterEditor({ ...monsterEditor, speed: e.target.value })} />
        </div>
        <input style={inputStyle} placeholder="Senses" value={monsterEditor.senses} onChange={(e) => setMonsterEditor({ ...monsterEditor, senses: e.target.value })} />
        <input style={inputStyle} placeholder="Languages" value={monsterEditor.languages} onChange={(e) => setMonsterEditor({ ...monsterEditor, languages: e.target.value })} />
        <textarea style={textAreaStyle} placeholder="Traits (one per line)" value={monsterEditor.traits} onChange={(e) => setMonsterEditor({ ...monsterEditor, traits: e.target.value })} />
        <textarea style={textAreaStyle} placeholder="Tactics (one per line)" value={monsterEditor.tactics} onChange={(e) => setMonsterEditor({ ...monsterEditor, tactics: e.target.value })} />
        <textarea style={textAreaStyle} placeholder="Loot (one per line)" value={monsterEditor.loot} onChange={(e) => setMonsterEditor({ ...monsterEditor, loot: e.target.value })} />
        <div style={buttonWrapStyle}>
          <button style={buttonStyle} onClick={saveMonsterEditor}>💾 Save Monster</button>
          <button style={buttonStyle} onClick={saveMonsterAsNew}>📚 Save As New</button>
        </div>
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
const titleStyle = { textAlign: "center", color: "#f2d28b", margin: "8px 0 10px" };
const workflowBarStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", background: "#0d1117", border: "1px solid #3b4351", borderRadius: 8, padding: 10, marginBottom: 12 };
const workflowLabelStyle = { color: "#f2d28b", fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 };
const workflowButtonWrapStyle = { display: "flex", flexWrap: "wrap", gap: 6 };
const workflowButtonStyle = { background: "linear-gradient(180deg, #374151 0%, #1f2937 100%)", color: "#e5e7eb", border: "1px solid #4b5563", borderRadius: 6, padding: "9px 12px", cursor: "pointer", fontSize: 14 };
const workflowButtonActiveStyle = { ...workflowButtonStyle, background: "linear-gradient(180deg, #8a6d1d 0%, #4a3415 100%)", color: "#fff2b8", border: "1px solid #d6a03d", boxShadow: "0 0 10px rgba(214,160,61,0.35)" };
const workflowStatusStyle = { color: "#cbd5e1", fontSize: 13, display: "grid", gap: 4, justifyItems: "end" };
const workflowMiniButtonStyle = { background: "#1f2937", color: "#e5e7eb", border: "1px solid #4b5563", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 12 };
const workflowMiniButtonActiveStyle = { ...workflowMiniButtonStyle, background: "linear-gradient(180deg, #166534 0%, #14532d 100%)", border: "1px solid #22c55e", color: "#dcfce7" };
const workflowGuideStyle = { background: "#111827", border: "1px solid #374151", borderRadius: 8, padding: 10, marginBottom: 12 };
const workflowGuideTitleStyle = { color: "#f2d28b", fontWeight: "bold", marginBottom: 4, textTransform: "uppercase" };
const workflowGuideTextStyle = { color: "#d1d5db", fontSize: 14, marginBottom: 8 };
const workflowGuideStepsStyle = { display: "flex", flexWrap: "wrap", gap: 6 };
const workflowGuideStepStyle = { background: "#1f2937", border: "1px solid #4b5563", borderRadius: 999, padding: "4px 8px", fontSize: 12, color: "#e5e7eb" };
const quickActionsStyle = { display: "flex", flexWrap: "wrap", gap: 8, background: "#0d1117", border: "1px solid #374151", borderRadius: 8, padding: 10, marginBottom: 12 };
const quickActionButtonStyle = { background: "linear-gradient(180deg, #4b5563 0%, #252b34 100%)", color: "#f8fafc", border: "1px solid #6b7280", borderRadius: 6, padding: "9px 12px", cursor: "pointer", fontSize: 14 };
const mobileTitleStyle = { ...titleStyle, fontSize: 36, lineHeight: 1 };
const hiddenStyle = { display: "none" };

function getDesktopGridStyle(mode) {
  const base = {
    display: "grid",
    gap: 12,
    width: "100%",
    maxWidth: "100%",
    alignItems: "start",
  };

  if (mode === "Prep") {
    return {
      ...base,
      gridTemplateColumns: "minmax(320px, 0.9fr) minmax(520px, 1.4fr) minmax(340px, 0.9fr)",
      gridTemplateAreas: `"top center right" "bottom bottom bottom"`,
    };
  }

  if (mode === "Live") {
    return {
      ...base,
      gridTemplateColumns: "minmax(320px, 0.9fr) minmax(520px, 1.4fr) minmax(340px, 0.9fr)",
      gridTemplateAreas: `"left top right" "bottom bottom bottom"`,
    };
  }

  if (mode === "After Action") {
    return {
      ...base,
      gridTemplateColumns: "minmax(320px, 0.9fr) minmax(620px, 1.5fr) minmax(340px, 0.9fr)",
      gridTemplateAreas: `"top center right" "bottom bottom bottom"`,
    };
  }

  return {
    ...base,
    gridTemplateColumns: "minmax(320px, 0.85fr) minmax(640px, 1.6fr) minmax(360px, 0.9fr)",
    gridTemplateAreas: `"left center right" "bottom bottom bottom"`,
  };
}

const desktopGridStyle = getDesktopGridStyle("Combat");
const mobileGridStyle = { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
const mobileSectionStyle = { display: "grid", gap: 12, alignContent: "start", minWidth: 0 };
const leftColumnStyle = { gridArea: "left", display: "grid", gap: 12, alignContent: "start", minWidth: 0 };
const topBarStyle = { gridArea: "top", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignContent: "start", minWidth: 0 };
const centerColumnStyle = { gridArea: "center", display: "grid", gap: 12, alignContent: "start", minWidth: 0 };
const rightColumnStyle = { gridArea: "right", display: "grid", gap: 12, alignContent: "start", minWidth: 0 };
const bottomBarStyle = { gridArea: "bottom", display: "grid", gap: 12, minWidth: 0 };
const cardStyle = { background: "#0d1117", border: "1px solid #3b4351", borderRadius: 8, padding: 12, boxSizing: "border-box", minWidth: 0 };
const innerCardStyle = { background: "#121821", border: "1px solid #303845", borderRadius: 6, padding: 8, marginBottom: 8 };
const directorCardStyle = { ...innerCardStyle, background: "#151b25", border: "1px solid #8a6d1d" };
const actionDetailStyle = { marginTop: 10, padding: 10, background: "#0f172a", border: "1px solid #8a6d1d", borderRadius: 6 };
const monsterStatCardStyle = { marginTop: 10, padding: 12, background: "#111827", border: "1px solid #4b5563", borderRadius: 6 };
const actionEditorStyle = { marginTop: 10, padding: 12, background: "#161f2d", border: "1px solid #4b5563", borderRadius: 6 };
const combatAdvisorStyle = { marginTop: 10, padding: 12, background: "#172033", border: "1px solid #d6a03d", borderRadius: 6, color: "#e5e7eb" };
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
const monsterEditorPanelStyle = { marginTop: 14, paddingTop: 12, borderTop: "1px solid #374151" };
const monsterImporterStyle = { marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #374151" };
const monsterImportResultsStyle = { marginTop: 8, maxHeight: 220, overflowY: "auto" };
const wanderingEditorStyle = { marginTop: 12, paddingTop: 12, borderTop: "1px solid #374151" };
const wanderingTableListStyle = { marginTop: 12, maxHeight: 260, overflowY: "auto" };
const logBoxStyle = { maxHeight: 135, overflowY: "auto", fontSize: 13 };
const linkButtonStyle = { display: "inline-block", textDecoration: "none", color: "#fff", background: "linear-gradient(180deg, #4b5563 0%, #252b34 100%)", border: "1px solid #6b7280", borderRadius: 6, padding: "10px 14px", fontWeight: "bold" };
const miniGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 };
