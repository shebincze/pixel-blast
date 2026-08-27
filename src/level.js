// Endless level built from randomly chosen chunks, generated just ahead of the
// camera and pruned behind it, so memory stays flat no matter how far you run.

export const TILE = 8;
// The logical width follows the screen's aspect ratio so phones get a full-bleed
// picture instead of black bars; the height stays fixed, the world is designed
// around it. Live binding: importers see the updated value.
export let VIEW_W = 320;
export const VIEW_H = 180;

export function setViewWidth(width) {
  VIEW_W = Math.max(320, Math.min(560, Math.round(width / 2) * 2));
  return VIEW_W;
}
export const GROUND_Y = 144; // top edge of the ground strip

const CHUNK_AHEAD = 480; // world pixels of level kept in front of the camera
const CHUNK_BEHIND = 320; // world pixels kept behind before pruning

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Level {
  constructor(seed = (Math.random() * 1e9) | 0, theme = 'earth') {
    this.random = mulberry32(seed);
    this.theme = theme;
    this.solids = [];
    this.hazards = [];
    this.coins = [];
    this.hearts = [];
    this.powerups = [];
    this.enemies = [];
    this.checkpoints = [];
    this.nextX = 0;
    this.chunkIndex = 0;

    // Safe runway before the first hazard.
    this.addGround(0, 30);
    this.nextX = 30 * TILE;
    this.checkpoints.push({ x: 3 * TILE, y: GROUND_Y - 20 });
  }

  addGround(tileX, tileW) {
    this.solids.push({
      x: tileX * TILE,
      y: GROUND_Y,
      w: tileW * TILE,
      h: VIEW_H - GROUND_Y + TILE,
      ground: true,
    });
  }

  addPlatform(tileX, tileY, tileW) {
    this.solids.push({ x: tileX * TILE, y: tileY * TILE, w: tileW * TILE, h: TILE, ground: false });
  }

  addSpikes(tileX, count) {
    for (let i = 0; i < count; i++) {
      this.hazards.push({ x: (tileX + i) * TILE, y: GROUND_Y - TILE, w: TILE, h: TILE });
    }
  }

  addCoin(px, py) {
    this.coins.push({ x: px, y: py, w: 8, h: 8, taken: false });
  }

  /** Extra-life pickup, dropped when a boss goes down. */
  addHeart(px, py) {
    this.hearts.push({ x: px, y: py, w: 7, h: 6, taken: false });
  }

  /** Floating power-up pickup. kind: rapid | spread | magnet | shield */
  addPowerup(px, py, kind) {
    this.powerups.push({ x: px, y: py, w: 8, h: 8, kind, taken: false });
  }

  /** Roughly one pickup every few chunks, kind picked at random. */
  maybeAddPowerup(tileX, tileW, height = 3) {
    if (this.random() > 0.22) return;
    const kinds = ['rapid', 'spread', 'magnet', 'shield'];
    const kind = kinds[Math.floor(this.random() * kinds.length)];
    this.addPowerup((tileX + Math.floor(tileW / 2)) * TILE, GROUND_Y - height * TILE, kind);
  }

  addFlyer(px, py, range) {
    const moon = this.theme === 'moon';
    this.enemies.push({
      type: 'flyer',
      variant: this.theme,
      x: px, y: py, w: moon ? 12 : 10, h: 8,
      baseY: py, range, phase: this.random() * Math.PI * 2,
      hp: moon ? 2 : 1, // moon creatures take twice the beating
      dead: false, hitFlash: 0, facingLeft: true,
    });
  }

  /** Ground robot that patrols between minX and maxX and dies to two laser hits. */
  addWalker(px, minX, maxX) {
    const moon = this.theme === 'moon';
    this.enemies.push({
      type: 'walker',
      variant: this.theme,
      x: px, y: GROUND_Y - 10, w: moon ? 12 : 10, h: 10,
      hp: moon ? 4 : 2, // moon creatures take twice the beating
      dead: false, hitFlash: 0,
      dir: -1, speed: 18 + this.random() * 14,
      minX, maxX, anim: this.random(),
      facingLeft: true,
    });
  }

  /** Sprinkle a patrolling robot onto a stretch of solid ground. */
  maybeAddWalker(tileX, tileW, difficulty) {
    if (this.random() > 0.35 + difficulty * 0.4) return;
    const minX = (tileX + 1) * TILE;
    const maxX = (tileX + tileW - 2) * TILE;
    if (maxX - minX < 3 * TILE) return;
    this.addWalker((minX + maxX) / 2, minX, maxX);
  }

  int(min, max) {
    return min + Math.floor(this.random() * (max - min + 1));
  }

  /** Difficulty ramps with distance but saturates, so late game stays playable. */
  difficulty() {
    return Math.min(1, this.chunkIndex / 40);
  }

  ensureAhead(cameraX) {
    while (this.nextX < cameraX + VIEW_W + CHUNK_AHEAD) {
      this.generateChunk();
    }
  }

  generateChunk() {
    const tileX = Math.floor(this.nextX / TILE);
    const difficulty = this.difficulty();
    const roll = this.random();
    let width;

    if (roll < 0.20) {
      width = this.flatChunk(tileX, difficulty);
    } else if (roll < 0.42) {
      width = this.pitChunk(tileX, difficulty);
    } else if (roll < 0.60) {
      width = this.spikeChunk(tileX, difficulty);
    } else if (roll < 0.78) {
      width = this.platformChunk(tileX, difficulty);
    } else if (roll < 0.90) {
      width = this.crateChunk(tileX, difficulty);
    } else {
      width = this.flyerChunk(tileX, difficulty);
    }

    this.checkpoints.push({ x: (tileX + 1) * TILE, y: GROUND_Y - 20 });
    this.nextX = (tileX + width) * TILE;
    this.chunkIndex++;
  }

  flatChunk(tileX, difficulty) {
    const width = this.int(8, 12);
    this.addGround(tileX, width);
    if (this.random() < 0.6) {
      this.addCoin((tileX + 3) * TILE, GROUND_Y - 3 * TILE);
      this.addCoin((tileX + 5) * TILE, GROUND_Y - 3 * TILE);
    }
    this.maybeAddWalker(tileX, width, difficulty);
    this.maybeAddPowerup(tileX, width);
    return width;
  }

  pitChunk(tileX, difficulty) {
    const lead = 4;
    const gap = this.int(2, 3 + Math.round(difficulty * 2));
    const tail = 5;
    this.addGround(tileX, lead);
    this.addGround(tileX + lead + gap, tail);
    // Coin arc over the gap rewards the jump.
    for (let i = 0; i < gap; i++) {
      const t = (i + 0.5) / gap;
      const arc = Math.sin(t * Math.PI) * 20;
      this.addCoin((tileX + lead + i) * TILE, GROUND_Y - 3 * TILE - arc);
    }
    return lead + gap + tail;
  }

  spikeChunk(tileX, difficulty) {
    const width = this.int(10, 14);
    this.addGround(tileX, width);
    const count = 1 + Math.round(difficulty * 2);
    let cursor = tileX + 3;
    for (let i = 0; i < count && cursor < tileX + width - 3; i++) {
      const run = this.int(1, 2);
      this.addSpikes(cursor, run);
      this.addCoin((cursor + run / 2) * TILE, GROUND_Y - 4 * TILE);
      cursor += run + this.int(3, 5);
    }
    this.maybeAddWalker(tileX, width, difficulty * 0.5);
    this.maybeAddPowerup(tileX, width, 4);
    return width;
  }

  platformChunk(tileX, difficulty) {
    const width = this.int(12, 16);
    this.addGround(tileX, 4);
    this.addGround(tileX + width - 4, 4);

    let px = tileX + 5;
    let py = 14;
    const steps = this.int(2, 3);
    for (let i = 0; i < steps && px < tileX + width - 6; i++) {
      const platWidth = this.int(2, 4);
      this.addPlatform(px, py, platWidth);
      this.addCoin((px + platWidth / 2) * TILE - 4, py * TILE - 12);
      px += platWidth + this.int(2, 3);
      py = Math.max(8, Math.min(15, py + (this.random() < 0.5 ? -2 : 1)));
    }
    return width;
  }

  crateChunk(tileX, difficulty) {
    const width = this.int(10, 14);
    this.addGround(tileX, width);
    const stackX = tileX + this.int(3, 5);
    const height = this.int(1, 2 + Math.round(difficulty));
    for (let i = 0; i < height; i++) {
      this.solids.push({
        x: stackX * TILE,
        y: GROUND_Y - (i + 1) * TILE,
        w: TILE,
        h: TILE,
        crate: true,
      });
    }
    this.addCoin(stackX * TILE, GROUND_Y - (height + 2) * TILE);
    this.maybeAddWalker(stackX + 2, width - (stackX - tileX) - 2, difficulty);
    return width;
  }

  flyerChunk(tileX, difficulty) {
    const width = this.int(12, 16);
    this.addGround(tileX, width);
    this.maybeAddPowerup(tileX, width, 3);
    const count = 1 + Math.round(difficulty);
    for (let i = 0; i < count; i++) {
      const px = (tileX + 4 + i * 5) * TILE;
      this.addFlyer(px, GROUND_Y - this.int(4, 7) * TILE, 10 + difficulty * 14);
    }
    return width;
  }

  update(time, dt) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

      if (enemy.type === 'boss') continue; // the boss is steered by the game loop

      if (enemy.type === 'flyer') {
        enemy.y = enemy.baseY + Math.sin(time * 1.6 + enemy.phase) * enemy.range;
        continue;
      }

      enemy.x += enemy.dir * enemy.speed * dt;
      if (enemy.x <= enemy.minX) { enemy.x = enemy.minX; enemy.dir = 1; }
      if (enemy.x + enemy.w >= enemy.maxX) { enemy.x = enemy.maxX - enemy.w; enemy.dir = -1; }
      enemy.facingLeft = enemy.dir < 0;
      enemy.anim += dt * (enemy.speed / 10);
    }
  }

  prune(cameraX) {
    const limit = cameraX - CHUNK_BEHIND;
    const alive = (item) => item.x + (item.w || TILE) > limit;
    this.solids = this.solids.filter(alive);
    this.hazards = this.hazards.filter(alive);
    this.coins = this.coins.filter(alive);
    this.hearts = this.hearts.filter((heart) => alive(heart) && !heart.taken);
    this.powerups = this.powerups.filter((power) => alive(power) && !power.taken);
    // The boss chases the player, so it is never pruned for being behind.
    this.enemies = this.enemies.filter(
      (enemy) => !enemy.dead && (enemy.type === 'boss' || alive(enemy)),
    );
    this.checkpoints = this.checkpoints.filter((point) => point.x > limit);
  }

  /** Solids overlapping a horizontal band — the only ones collision needs to test. */
  solidsInRange(x0, x1) {
    const result = [];
    for (const solid of this.solids) {
      if (solid.x + solid.w > x0 && solid.x < x1) result.push(solid);
    }
    return result;
  }

  /** Spawn a mini boss just off the right edge of the screen. */
  addBoss(px, hp) {
    const moon = this.theme === 'moon';
    // Late moon bosses grow into the bigger alien machine.
    const big = moon && hp >= 18;
    const boss = {
      type: 'boss',
      variant: this.theme,
      big,
      x: px,
      y: big ? GROUND_Y - 40 : GROUND_Y - 20,
      w: big ? 48 : 20,
      h: big ? 40 : 14,
      scale: big ? 2 : 1,
      hp,
      maxHp: hp,
      dead: false,
      hitFlash: 0,
      facingLeft: true,
      bob: 0,
      shotTimer: 1.2,
      dashTimer: 3,
    };
    this.enemies.push(boss);
    return boss;
  }

  /** Level-one final boss: bigger, tougher, and it fights in two phases. */
  addFinalBoss(px, hp) {
    const boss = {
      type: 'boss',
      isFinal: true,
      // The hitbox reaches the ground so the player's waist-high laser always
      // connects, no matter how high the boss is bobbing.
      x: px, y: GROUND_Y - 44, w: 48, h: 44, scale: 2,
      hp, maxHp: hp,
      dead: false, hitFlash: 0, facingLeft: true,
      bob: 0, shotTimer: 1.4, dashTimer: 5, spawnTimer: 6, phase: 1,
    };
    this.enemies.push(boss);
    return boss;
  }

  /** The very last fight: the robot's ultra boss, drawn at triple size. */
  addUltraBoss(px, hp) {
    const boss = {
      type: 'boss',
      isFinal: true,
      isUltra: true,
      variant: this.theme,
      x: px, y: GROUND_Y - 52, w: 44, h: 52, scale: 3,
      hp, maxHp: hp,
      dead: false, hitFlash: 0, facingLeft: true,
      bob: 0, shotTimer: 1.2, dashTimer: 4, spawnTimer: 5, phase: 1, volley: 0,
    };
    this.enemies.push(boss);
    return boss;
  }

  /** Nearest checkpoint at or behind x, used to respawn after a death. */
  checkpointBefore(x) {
    let best = this.checkpoints[0] || { x: 24, y: GROUND_Y - 20 };
    for (const point of this.checkpoints) {
      if (point.x <= x && point.x > best.x) best = point;
    }
    return best;
  }
}
