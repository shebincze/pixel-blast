// Coin shop: the wallet and everything bought with it survive between runs in
// localStorage. Items are permanent upgrades plus a few shirt colours.

const WALLET_KEY = 'pixelblast.wallet';
const OWNED_KEY = 'pixelblast.owned';
const SKIN_KEY = 'pixelblast.skin';
const DAILY_KEY = 'pixelblast.daily';

// Free coins once a day. The streak grows the reward up to a cap, and it resets
// as soon as a day is skipped.
const DAILY_BASE = 40;
const DAILY_STEP = 10;
const DAILY_MAX_STREAK = 6;

export const SHOP_ITEMS = [
  {
    id: 'life',
    name: 'srdce navic',
    detail: 'zacinas se 4 zivoty',
    price: 150,
  },
  {
    id: 'shield',
    name: 'startovni stit',
    detail: 'kazdy beh zacina se stitem',
    price: 220,
  },
  {
    id: 'rapid',
    name: 'rychlejsi laser',
    detail: 'stale o 25 % kratsi cooldown',
    price: 260,
  },
  {
    id: 'longpower',
    name: 'delsi power-upy',
    detail: 'bonusy vydrzi o polovinu dele',
    price: 200,
  },
  {
    id: 'magnetstart',
    name: 'magnet na mince',
    detail: 'mince pritahuje i bez bonusu',
    price: 300,
  },
  { id: 'skin_red', name: 'cerveny dres', detail: 'zmena barvy postavy', price: 100, skin: '#e2445c' },
  { id: 'skin_green', name: 'zeleny dres', detail: 'zmena barvy postavy', price: 100, skin: '#4cc26a' },
  { id: 'skin_purple', name: 'fialovy dres', detail: 'zmena barvy postavy', price: 100, skin: '#b46ce0' },
];

const DEFAULT_SKIN = '#3aa0e0';

/** Local calendar day as YYYY-MM-DD - the day the player actually sees. */
export function todayKey(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function yesterdayKey(now = new Date()) {
  const past = new Date(now);
  past.setDate(past.getDate() - 1);
  return todayKey(past);
}

/** Coins the given streak day pays out. */
export function dailyReward(streak) {
  return DAILY_BASE + Math.min(streak, DAILY_MAX_STREAK) * DAILY_STEP;
}

export class Shop {
  constructor() {
    this.coins = Number(localStorage.getItem(WALLET_KEY) || 0);
    this.owned = new Set(load(OWNED_KEY));
    this.skin = localStorage.getItem(SKIN_KEY) || DEFAULT_SKIN;
    this.daily = loadDaily();
    this.index = 0;
  }

  /** True when today's free coins are still waiting. */
  canClaimDaily(now = new Date()) {
    return this.daily.date !== todayKey(now);
  }

  /**
   * Hand out the daily coins. Returns the amount, or 0 when today is already
   * claimed. A missed day drops the streak back to one.
   */
  claimDaily(now = new Date()) {
    if (!this.canClaimDaily(now)) return 0;
    const streak = this.daily.date === yesterdayKey(now) ? this.daily.streak + 1 : 1;
    const reward = dailyReward(streak);
    this.daily = { date: todayKey(now), streak };
    saveDaily(this.daily);
    this.earn(reward);
    return reward;
  }

  /** What the next claim pays, so the shop can advertise it. */
  nextDailyReward(now = new Date()) {
    const streak = this.daily.date === yesterdayKey(now) ? this.daily.streak + 1 : 1;
    return dailyReward(streak);
  }

  has(id) {
    return this.owned.has(id);
  }

  /** Coins picked up during a run land straight in the wallet. */
  earn(amount = 1) {
    this.coins += amount;
    localStorage.setItem(WALLET_KEY, String(this.coins));
  }

  canAfford(item) {
    return this.coins >= item.price;
  }

  /**
   * Buy an item, or re-equip an already owned skin.
   * Returns 'bought' | 'equipped' | 'poor' | 'owned'.
   */
  buy(item) {
    if (this.owned.has(item.id)) {
      if (!item.skin) return 'owned';
      this.equip(item.skin);
      return 'equipped';
    }
    if (!this.canAfford(item)) return 'poor';

    this.coins -= item.price;
    this.owned.add(item.id);
    localStorage.setItem(WALLET_KEY, String(this.coins));
    save(OWNED_KEY, [...this.owned]);
    if (item.skin) this.equip(item.skin);
    return 'bought';
  }

  equip(color) {
    this.skin = color;
    localStorage.setItem(SKIN_KEY, color);
  }

  /** The default blue shirt is always available, so it needs no item. */
  equipDefault() {
    this.equip(DEFAULT_SKIN);
  }

  /** Everything worth storing in the cloud profile. */
  snapshot() {
    return {
      coins: this.coins,
      owned: [...this.owned],
      skin: this.skin,
      dailyDate: this.daily.date,
      dailyStreak: this.daily.streak,
    };
  }

  /**
   * Merge a cloud profile into the local save on sign-in: the wallet takes the
   * higher of the two, purchases are unioned, the equipped skin follows the
   * server. Returns true when the local save actually changed.
   */
  applyRemote(remote) {
    if (!remote) return false;
    let changed = false;
    if (Number(remote.coins || 0) > this.coins) {
      this.coins = Number(remote.coins);
      changed = true;
    }
    for (const id of remote.owned || []) {
      if (!this.owned.has(id)) {
        this.owned.add(id);
        changed = true;
      }
    }
    if (remote.skin && remote.skin !== this.skin) {
      this.skin = remote.skin;
      changed = true;
    }
    // A newer claim on the server wins, so the freebie cannot be taken twice.
    if (remote.dailyDate && remote.dailyDate > this.daily.date) {
      this.daily = { date: remote.dailyDate, streak: Number(remote.dailyStreak || 1) };
      saveDaily(this.daily);
      changed = true;
    }
    if (changed) {
      localStorage.setItem(WALLET_KEY, String(this.coins));
      save(OWNED_KEY, [...this.owned]);
      localStorage.setItem(SKIN_KEY, this.skin);
    }
    return changed;
  }

  get isDefaultSkin() {
    return this.skin === DEFAULT_SKIN;
  }
}

function loadDaily() {
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null');
    if (raw && typeof raw.date === 'string') {
      return { date: raw.date, streak: Number(raw.streak) || 1 };
    }
  } catch {
    // fall through to a fresh record
  }
  return { date: '', streak: 0 };
}

function saveDaily(daily) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(daily));
  } catch {
    // storage blocked - the bonus is then claimable again next session
  }
}

function load(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked - purchases simply do not persist
  }
}
