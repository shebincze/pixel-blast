// Centralized save data on Supabase: leaderboard, player profile, coins and
// purchases. Everything here is best-effort - if the project is not configured,
// the device is offline, or a request fails, the game keeps running on its local
// save and simply retries later.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './cloud-config.js?v=be306a75';

const DEVICE_KEY = 'pixelblast.device';
const URL_OVERRIDE = 'pixelblast.supabase.url';
const KEY_OVERRIDE = 'pixelblast.supabase.key';
const TIMEOUT = 6000;
const SAVE_DELAY = 1500; // profile writes are debounced, coins tick fast

function readSetting(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

/** Stable per-install id, so a returning player finds their own profile row. */
function deviceId() {
  let id = readSetting(DEVICE_KEY, '');
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    try {
      localStorage.setItem(DEVICE_KEY, id);
    } catch {
      // private mode: the id lives for this session only
    }
  }
  return id;
}

export class Cloud {
  constructor() {
    this.url = readSetting(URL_OVERRIDE, SUPABASE_URL).replace(/\/+$/, '');
    this.key = readSetting(KEY_OVERRIDE, SUPABASE_ANON_KEY);
    this.device = deviceId();
    this.playerId = null;
    this.status = this.enabled ? 'idle' : 'off';
    this.board = [];
    this.saveTimer = null;
    this.pending = null;
  }

  get enabled() {
    return Boolean(this.url && this.key);
  }

  async request(path, options = {}) {
    if (!this.enabled) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const response = await fetch(`${this.url}/rest/v1/${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
      this.status = 'ok';
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      this.status = 'error';
      this.lastError = String(error && error.message ? error.message : error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Claim (or create) the profile row for this install and hand back whatever the
   * server already knows. The caller merges it with the local save.
   */
  async signIn(name, local) {
    if (!this.enabled) return null;
    const rows = await this.request(
      `players?on_conflict=device_id&select=id,name,coins,owned,skin,best_score,daily_date,daily_streak`,
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          device_id: this.device,
          name,
          coins: local.coins,
          owned: local.owned,
          skin: local.skin,
          best_score: local.best,
          daily_date: local.dailyDate || null,
          daily_streak: local.dailyStreak || 0,
        }),
      },
    );
    const row = rows && rows[0];
    if (!row) return null;
    this.playerId = row.id;
    return {
      coins: Number(row.coins || 0),
      owned: Array.isArray(row.owned) ? row.owned : [],
      skin: row.skin || local.skin,
      best: Number(row.best_score || 0),
      dailyDate: row.daily_date || '',
      dailyStreak: Number(row.daily_streak || 0),
    };
  }

  /** Push wallet, purchases and best score. Debounced - coins change constantly. */
  saveProfile(profile, immediate = false) {
    if (!this.enabled) return;
    this.pending = profile;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (immediate) {
      this.flush();
      return;
    }
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DELAY);
  }

  async flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const profile = this.pending;
    if (!profile || !this.enabled) return;
    this.pending = null;
    await this.request('players?on_conflict=device_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        device_id: this.device,
        name: profile.name,
        coins: profile.coins,
        owned: profile.owned,
        skin: profile.skin,
        best_score: profile.best,
        daily_date: profile.dailyDate || null,
        daily_streak: profile.dailyStreak || 0,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  /** One finished run goes into the score table the leaderboard is built from. */
  async submitScore(entry) {
    if (!this.enabled) return;
    await this.request('scores', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        player_id: this.playerId,
        name: entry.name,
        score: entry.score,
        level: entry.level,
        coins: entry.coins,
      }),
    });
  }

  /** Top scores, best run per name. Returns [] when the cloud is unavailable. */
  async fetchBoard(limit = 10) {
    const rows = await this.request(
      `leaderboard?select=name,score,level,coins&order=score.desc&limit=${limit}`,
    );
    if (!rows) return null;
    this.board = rows.map((row) => ({
      name: row.name,
      score: Number(row.score || 0),
      level: Number(row.level || 1),
      coins: Number(row.coins || 0),
    }));
    return this.board;
  }
}
