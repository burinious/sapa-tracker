function primaryKey(uid, name) {
  return `sapa_${uid}_${name}`;
}

function legacyKeys(uid, name) {
  return [
    `sapa-${uid}-${name}`,
    `sapa:${uid}:${name}`,
    `sapa_${name}_${uid}`,
    "sapa__",
  ];
}

export function read(uid, name, fallback) {
  try {
    const target = primaryKey(uid, name);
    const raw = localStorage.getItem(target);
    if (raw) return JSON.parse(raw);

    for (const oldKey of legacyKeys(uid, name)) {
      const oldRaw = localStorage.getItem(oldKey);
      if (!oldRaw) continue;
      const parsed = JSON.parse(oldRaw);
      localStorage.setItem(target, oldRaw);
      return parsed;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function write(uid, name, value) {
  try {
    localStorage.setItem(primaryKey(uid, name), JSON.stringify(value));
  } catch {
    // Local storage may be unavailable (private mode / quota exceeded).
  }
}
