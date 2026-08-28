// Coin shop: the wallet and everything bought with it survive between runs in
// localStorage. Items are permanent upgrades plus a few shirt colours.

const WALLET_KEY = 'pixelblast.wallet';
const OWNED_KEY = 'pixelblast.owned';
const SKIN_KEY = 'pixelblast.skin';

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

export class Shop {
  constructor() {
    this.coins = Number(localStorage.getItem(WALLET_KEY) || 0);
    this.owned = new Set(load(OWNED_KEY));
    this.skin = localStorage.getItem(SKIN_KEY) || DEFAULT_SKIN;
    this.index = 0;
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

  get isDefaultSkin() {
    return this.skin === DEFAULT_SKIN;
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
