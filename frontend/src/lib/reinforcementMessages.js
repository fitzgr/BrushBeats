const AGE_GROUPS = ["infant", "toddler", "primary", "mixed", "adult"];
const MESSAGE_POOL_SIZE = 50;

const GROUP_LIBRARY = {
  infant: {
    openers: ["Tiny smile, giant progress", "Little brusher, big focus", "Bright little grin", "You handled that perfectly", "Strong little routine"],
    middles: ["your teeth are growing cleaner every day", "that gentle rhythm is building healthy habits", "your sparkle is getting brighter", "great job staying with the brush map", "you just leveled up your clean"],
    closers: ["keep shining", "star-level clean", "sparkle mode on", "you are a clean champion", "your smile glows"]
  },
  toddler: {
    openers: ["Steady toddler smile", "Great brushing energy", "Awesome routine today", "Clean-team momentum", "You brushed with confidence"],
    middles: ["you kept every section moving", "your timing was super consistent", "your smile routine is growing stronger", "you showed fantastic brushing control", "your clean rhythm looked great"],
    closers: ["sparkle and shine", "you are glowing", "keep that bright smile", "star-clean finish", "you crushed it"]
  },
  primary: {
    openers: ["Primary teeth powerhouse", "Great consistency", "Solid brushing session", "Strong focus all session", "Precision brushing unlocked"],
    middles: ["your smile gets stronger with each pass", "you protected every corner of your mouth", "your clean rhythm was locked in", "you built excellent daily momentum", "you stayed on beat and on target"],
    closers: ["bright smile victory", "sparkling finish", "gold-star clean", "clean and confident", "shine bright"]
  },
  mixed: {
    openers: ["Mixed-smile mastery", "Excellent control", "Confident brushing run", "Strong brushing discipline", "Powerful clean session"],
    middles: ["you balanced every section with precision", "your timing and technique were excellent", "you gave each surface real attention", "you kept the habit strong", "your tempo made every pass count"],
    closers: ["your smile is shining", "super clean finish", "bright-star result", "daily win unlocked", "you nailed the routine"]
  },
  adult: {
    openers: ["Adult smile, pro routine", "Elite consistency", "That was a focused clean", "Disciplined brushing complete", "Strong oral-care execution"],
    middles: ["you gave your full smile a thorough pass", "your pace and coverage were excellent", "you protected your smile with precision", "you stayed steady from start to finish", "you turned routine into results"],
    closers: ["clean and radiant", "star-bright finish", "habit locked in", "your smile shines", "excellent work today"]
  }
};

function stableNumber(seedText) {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

function toPhase(agePhase) {
  return AGE_GROUPS.includes(agePhase) ? agePhase : "adult";
}

export function getAgeMessageGroupCount() {
  return AGE_GROUPS.length;
}

export function buildReinforcementPool(phase, teethCount = 32) {
  const groupKey = toPhase(phase);
  const group = GROUP_LIBRARY[groupKey];
  const seedBase = stableNumber(`${groupKey}:${Math.max(0, Math.floor(Number(teethCount) || 0))}`);
  const combinations = [];

  for (let i = 0; i < group.openers.length; i += 1) {
    for (let j = 0; j < group.middles.length; j += 1) {
      for (let k = 0; k < group.closers.length; k += 1) {
        const message = `${group.openers[i]} - ${group.middles[j]}, ${group.closers[k]}.`;
        const orderSeed = stableNumber(`${seedBase}:${i}:${j}:${k}`);
        combinations.push({ message, orderSeed });
      }
    }
  }

  combinations.sort((left, right) => left.orderSeed - right.orderSeed);

  return combinations.slice(0, MESSAGE_POOL_SIZE).map((item) => item.message);
}

export function pickReinforcementMessage(pool, lastMessage = "") {
  const safePool = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (safePool.length === 0) {
    return "Great brushing session. Keep your smile shining.";
  }

  if (safePool.length === 1) {
    return safePool[0];
  }

  const candidates = safePool.filter((entry) => entry !== lastMessage);
  const source = candidates.length > 0 ? candidates : safePool;
  const index = Math.floor(Math.random() * source.length);
  return source[index];
}
