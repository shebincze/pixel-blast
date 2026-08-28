import { Level, TILE, VIEW_W, VIEW_H, GROUND_Y } from './level.js';
import { Player, overlaps } from './player.js';
import { sprites, drawSprite, drawSpriteTinted, setPlayerShirt } from './sprites.js';
import { Shop, SHOP_ITEMS } from './shop.js';
import { Cloud } from './cloud.js';
import { drawText, normalizeText } from './font.js';

const START_LIVES = 3;
const CAMERA_LERP = 8;
const CAMERA_OFFSET = 110; // how far from the left edge the player sits
const BEST_KEY = 'pixelblast.best';
const BOARD_KEY = 'pixelblast.board';
const NAME_KEY = 'pixelblast.name';
const BOARD_SIZE = 10;

const MENU_Y = 78;
const MENU_STEP = 16;

const MENU_ITEMS = [
  { id: 'new', label: 'nova hra' },
  { id: 'shop', label: 'obchod' },
  { id: 'board', label: 'leaderboard' },
  { id: 'name', label: 'zmenit jmeno' },
];

const PAUSE_ROW_Y = 82;

const PAUSE_ITEMS = [
  { id: 'resume', label: 'pokracovat' },
  { id: 'menu', label: 'hlavni menu' },
];

const SHOP_ROW_Y = 42;
const SHOP_ROW_STEP = 11;
const SHOT_COOLDOWN = 0.28;
const BULLET_SPEED = 280;
const BULLET_LIFE = 1.1;
const KILL_SCORE = 25;
const BOSS_INTERVAL = 500; // every 500 points a mini boss shows up
const BOSS_KILL_SCORE = 150;
const MAX_LIVES = 5;
const HIT_FLASH_TIME = 0.16;
const RAPID_TIME = 14;
const SPREAD_TIME = 16;
const MAGNET_TIME = 16;
const MAGNET_RANGE = 64;
const RAPID_COOLDOWN_SCALE = 0.35;

const POWER_SPRITES = {
  rapid: 'powerRapid',
  spread: 'powerSpread',
  magnet: 'powerMagnet',
  shield: 'powerShield',
};

const FINAL_BOSS_SCORE = 2000; // level one ends with this fight
const MOON_GRAVITY_SCALE = 0.45;
const SHIP_SCALE = 2; // the rocket is drawn at double size
const LEVEL2_END_SCORE = 4000; // the robot shows up once the moon run gets this far
const SPACE_TRAVEL_TIME = 7; // seconds of Earth-to-Moon flight
const ROOM_SCALE = 2; // the bedroom intro is a close-up, drawn at double size
const ROOM_FLOOR_Y = 140;
const TABLE_X = 172;

const POWER_NAMES = {
  rapid: 'RYCHLOPALBA',
  spread: 'TROJITY LASER',
  magnet: 'MAGNET',
  shield: 'STIT',
};
const BOSS_SHOT_SPEED = 84;
// Fixed firing lanes measured from the ground, so a shot is always dodgeable:
// LOW is jumped over, HIGH is ducked under by simply staying on the ground.
const SHOT_LANE_LOW = GROUND_Y - 14;
const SHOT_LANE_HIGH = GROUND_Y - 40;
const SHOT_LANE_TOP = GROUND_Y - 56;

const HEART = [
  '.rr.rr.',
  'rrrrrrr',
  'rrrrrrr',
  '.rrrrr.',
  '..rrr..',
  '...r...',
];

export class Game {
  constructor(ctx, input, sound) {
    this.ctx = ctx;
    this.input = input;
    this.sound = sound;
    this.state = 'menu';
    this.time = 0;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    // The name is asked once; after that every run reuses it and it can only be
    // changed from the menu.
    this.hasName = Boolean(localStorage.getItem(NAME_KEY));
    this.playerName = localStorage.getItem(NAME_KEY) || 'HRAC';
    this.shop = new Shop();
    setPlayerShirt(this.shop.skin);
    this.shopMessage = '';
    this.shopMessageTime = 0;
    this.board = loadBoard();
    this.cloud = new Cloud();
    this.boardSource = 'local';
    this.boardLoading = false;
    this.menuIndex = 0;
    this.clouds = Array.from({ length: 8 }, (_, i) => ({
      x: i * 90 + (i % 3) * 17,
      y: 14 + (i % 4) * 13,
      scale: 1 + (i % 3) * 0.4,
    }));
    this.newRun();
    // A returning player is already known, so the cloud profile can load right away.
    if (this.hasName) this.signInCloud();
  }

  newRun() {
    this.levelIndex = 1;
    this.finalBossDone = false;
    this.cutscene = null;
    this.intro = null;
    this.levelBanner = 0;
    this.ultraStarted = false;
    this.level = new Level(undefined, 'earth');
    this.stars = makeStars();
    this.bullets = [];
    this.particles = [];
    this.shotCooldown = 0;
    this.muzzle = 0;
    this.kills = 0;
    this.boss = null;
    this.bossBullets = [];
    this.bossesBeaten = 0;
    this.bossBanner = 0;
    this.nextBossScore = BOSS_INTERVAL;
    this.bonusScore = 0;
    // Shop upgrades apply from the first frame of the run.
    this.power = { rapid: 0, spread: 0, magnet: 0, shield: this.shop.has('shield') };
    this.powerBanner = 0;
    this.powerBannerText = '';
    this.player = new Player(24, GROUND_Y - 14);
    this.player.gravityScale = 1;
    this.cameraX = 0;
    this.lives = START_LIVES + (this.shop.has('life') ? 1 : 0);
    this.coins = 0;
    this.distance = 0;
    this.distanceBase = 0;
    this.maxX = this.player.x;
    this.shake = 0;
  }

  get score() {
    return this.coins * 10 + this.kills * KILL_SCORE + this.bonusScore + Math.floor(this.distance / 8);
  }

  update(dt) {
    this.time += dt;

    if (this.input.wasPressed('mute')) {
      const muted = this.sound.toggleMute();
      this.muteBanner = 1.4;
      this.muteBannerText = muted ? 'zvuk vypnut' : 'zvuk zapnut';
    }
    this.muteBanner = Math.max(0, (this.muteBanner || 0) - dt);
    this.syncMusic();

    if (this.state === 'menu') {
      this.updateMenu();
      return;
    }

    if (this.state === 'name') return; // the HTML overlay owns this step

    if (this.state === 'shop') {
      this.updateShop(dt);
      return;
    }

    if (this.state === 'leaderboard') {
      if (this.input.wasPressed('start') || this.input.wasPressed('jump')
        || this.input.wasPressed('restart') || this.input.wasPressed('pause') || this.input.tap) {
        this.state = 'menu';
      }
      return;
    }

    if (this.state === 'ending') {
      this.endingTime = (this.endingTime || 0) + dt;
      if (this.endingTime > 1.5 && (this.input.wasPressed('start') || this.input.wasPressed('jump')
        || this.input.wasPressed('restart') || this.input.tap)) {
        this.endingTime = 0;
        this.state = 'menu';
      }
      return;
    }

    if (this.state === 'paused') {
      this.updatePause();
      return;
    }

    if (this.state === 'intro') {
      this.updateIntro(dt);
      return;
    }

    if (this.state === 'cutscene') {
      this.updateCutscene(dt);
      return;
    }

    if (this.state === 'dead') {
      if (this.input.wasPressed('start') || this.input.wasPressed('jump') || this.input.wasPressed('restart')) {
        this.newRun();
        this.state = 'play';
      }
      if (this.input.wasPressed('menuDown') || this.input.wasPressed('menuUp')
        || this.input.wasPressed('pause')) this.state = 'menu';
      return;
    }

    if (this.input.wasPressed('pause')) return this.pauseRun();

    this.level.ensureAhead(this.cameraX);
    this.level.update(this.time, dt);
    this.player.update(dt, this.input, this.level);
    if (this.player.jumped) {
      if (this.player.jumped === 1) this.sound.jump();
      else this.sound.doubleJump();
      this.player.jumped = 0;
    }
    this.updatePowers(dt);
    this.updateShooting(dt);
    this.updateBullets(dt);
    this.updateBoss(dt);
    this.updateParticles(dt);

    // The player cannot walk back out of the generated world.
    if (this.player.x < this.cameraX + 2) {
      this.player.x = this.cameraX + 2;
      if (this.player.vx < 0) this.player.vx = 0;
    }

    this.maxX = Math.max(this.maxX, this.player.x);
    this.distance = Math.max(this.distance, this.distanceBase + this.maxX - 24);

    this.collectCoins();
    this.checkHazards();

    if (this.player.fellOutOfWorld()) this.loseLife();

    const targetX = Math.max(0, this.player.x - CAMERA_OFFSET);
    this.cameraX += (targetX - this.cameraX) * Math.min(1, CAMERA_LERP * dt);
    this.cameraX = Math.max(this.cameraX, targetX - 40);
    this.level.prune(this.cameraX);

    this.shake = Math.max(0, this.shake - dt * 4);
    this.levelBanner = Math.max(0, this.levelBanner - dt);

    if (this.levelIndex === 2 && !this.ultraStarted && !this.boss && this.score >= LEVEL2_END_SCORE) {
      this.startRobotScene();
    }
  }

  /** Music runs during play only, and switches scale between the two levels. */
  syncMusic() {
    const wanted = this.state === 'play' ? (this.level.theme === 'moon' ? 'moon' : 'earth') : null;
    if (wanted === this.musicTheme) return;
    this.musicTheme = wanted;
    if (wanted) this.sound.startMusic(wanted);
    else this.sound.stopMusic();
  }

  /** Spawn a boss on every BOSS_INTERVAL of score, one at a time. */
  maybeSpawnBoss() {
    if (this.boss) return;

    // Level one is capped by the final boss; it takes priority over mini bosses.
    if (this.levelIndex === 1 && !this.finalBossDone && this.score >= FINAL_BOSS_SCORE) {
      this.boss = this.level.addFinalBoss(this.cameraX + VIEW_W + 20, 26);
      this.bossBanner = 3;
      this.sound.bossAppear();
      return;
    }

    if (this.score < this.nextBossScore) return;
    if (this.levelIndex === 1 && this.score >= FINAL_BOSS_SCORE) return;
    // On the moon the robot scene takes over once the run reaches its end score.
    if (this.levelIndex === 2 && !this.ultraStarted && this.score >= LEVEL2_END_SCORE) return;
    const hp = (6 + this.bossesBeaten * 3) * (this.levelIndex === 2 ? 2 : 1);
    this.boss = this.level.addBoss(this.cameraX + VIEW_W + 16, hp);
    this.bossBanner = 2;
    this.sound.bossAppear();
  }

  updateBoss(dt) {
    this.bossBanner = Math.max(0, this.bossBanner - dt);
    this.maybeSpawnBoss();
    this.updateBossBullets(dt);

    const boss = this.boss;
    if (!boss) return;

    if (boss.dead) {
      this.defeatBoss(boss);
      return;
    }

    const player = this.player;
    const gap = boss.x - player.x;
    boss.facingLeft = gap > 0;

    const previousX = boss.x;

    // Keep a duelling distance: close in when far, back off when the player charges.
    const desired = 78;
    const speed = 34 + this.bossesBeaten * 6;
    if (Math.abs(gap) > desired + 12) boss.x -= Math.sign(gap) * speed * dt;
    else if (Math.abs(gap) < desired - 18) boss.x += Math.sign(gap) * speed * dt;

    // Never let the boss drift off-screen, or the fight stalls.
    boss.x = Math.max(this.cameraX + 8, Math.min(this.cameraX + VIEW_W - boss.w - 8, boss.x));

    boss.bob += dt;
    // Hovering low enough that the player's waist-high laser always reaches,
    // but it climbs over crates and walls instead of sliding through them.
    const baseY = boss.isFinal
      ? GROUND_Y - boss.h + Math.sin(boss.bob * 1.8) * 4
      : GROUND_Y - boss.h - 2 + Math.sin(boss.bob * 2.2) * 3;
    const target = this.bossHoverTarget(boss, baseY, Math.sign(boss.x - previousX));
    if (boss.hoverY === undefined) boss.hoverY = baseY;
    boss.hoverY += (target - boss.hoverY) * Math.min(1, dt * 6);
    boss.y = boss.hoverY;
    this.blockBossX(boss, previousX);

    if (boss.isFinal) {
      this.updateFinalBoss(boss, dt);
      return;
    }

    boss.shotTimer -= dt;
    if (boss.shotTimer <= 0) {
      boss.shotTimer = Math.max(0.8, 1.9 - this.bossesBeaten * 0.2);
      this.fireBossShot(boss);
    }
  }

  /**
   * Walls the boss has to respect: crates and platforms that sit in the band the
   * boss normally hovers in. The ground slab itself is skipped, it is the floor.
   */
  bossWalls(boss, baseY, x0, x1) {
    const walls = [];
    for (const solid of this.level.solidsInRange(x0, x1)) {
      if (solid.ground) continue;
      if (solid.y >= baseY + boss.h || solid.y + solid.h <= baseY) continue;
      walls.push(solid);
    }
    return walls;
  }

  /** Hover height that clears the wall the boss is about to run into. */
  bossHoverTarget(boss, baseY, direction) {
    const look = 14 * direction;
    const x0 = Math.min(boss.x, boss.x + look) - 2;
    const x1 = Math.max(boss.x + boss.w, boss.x + boss.w + look) + 2;
    let target = baseY;
    for (const wall of this.bossWalls(boss, baseY, x0, x1)) {
      target = Math.min(target, wall.y - boss.h - 2);
    }
    return Math.max(12, target);
  }

  /** Stop the boss at a wall it has not risen above yet. */
  blockBossX(boss, previousX) {
    if (boss.x === previousX) return;
    const movingRight = boss.x > previousX;
    for (const solid of this.level.solidsInRange(boss.x - 4, boss.x + boss.w + 4)) {
      if (solid.ground) continue;
      if (boss.y + boss.h <= solid.y + 1 || boss.y >= solid.y + solid.h) continue;
      if (boss.x + boss.w <= solid.x || boss.x >= solid.x + solid.w) continue;
      boss.x = movingRight ? solid.x - boss.w : solid.x + solid.w;
    }
  }

  /** Final boss: volleys, minions, and a faster second phase under half health. */
  updateFinalBoss(boss, dt) {

    if (boss.phase === 1 && boss.hp <= boss.maxHp / 2) {
      boss.phase = 2;
      boss.hitFlash = HIT_FLASH_TIME;
      this.shake = 1.2;
      this.bossBanner = 1.4;
      this.spawnSparks(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ff7a3a', 14);
    }

    boss.shotTimer -= dt;
    if (boss.shotTimer <= 0) {
      const base = boss.isUltra ? 1.2 : 1.6;
      boss.shotTimer = boss.phase === 2 ? base * 0.6 : base;
      boss.volley = (boss.volley || 0) + 1;

      // Alternating patterns; every one of them leaves the player a way out.
      if (boss.volley % 2 === 1) {
        // Low sweep - jump over it (phase two adds a harmless top shot).
        this.fireBossShot(boss, SHOT_LANE_LOW);
        if (boss.phase === 2) this.fireBossShot(boss, SHOT_LANE_TOP);
      } else {
        // High sweep - stay on the ground and let it pass overhead.
        this.fireBossShot(boss, SHOT_LANE_HIGH);
      }
    }

    boss.spawnTimer -= dt;
    if (boss.spawnTimer <= 0) {
      boss.spawnTimer = boss.isUltra ? 4 : (boss.phase === 2 ? 5 : 8);
      this.level.addFlyer(boss.x, GROUND_Y - 40, 12);
    }

    boss.dashTimer -= dt;
    if (boss.dashTimer <= 0) {
      boss.dashTimer = boss.phase === 2 ? 3.5 : 5.5;
      const dashFrom = boss.x;
      boss.x += (this.player.x - boss.x) * 0.35;
      this.blockBossX(boss, dashFrom);
      this.shake = 0.7;
    }
  }

  fireBossShot(boss, laneY) {
    const direction = boss.facingLeft ? -1 : 1;
    this.sound.bossShot();
    this.bossBullets.push({
      x: boss.facingLeft ? boss.x - 6 : boss.x + boss.w,
      y: laneY === undefined ? SHOT_LANE_LOW : laneY,
      w: 6,
      h: 6,
      vx: direction * BOSS_SHOT_SPEED,
      life: 4,
    });
  }

  updateBossBullets(dt) {
    for (const shot of this.bossBullets) {
      shot.x += shot.vx * dt;
      shot.life -= dt;
      if (shot.x < this.cameraX - 30 || shot.x > this.cameraX + VIEW_W + 30) shot.life = 0;
      if (shot.life <= 0) continue;

      // Plasma stops on crates and walls, so cover works against the boss too.
      for (const solid of this.level.solidsInRange(shot.x - 8, shot.x + 14)) {
        if (overlaps(shot, solid)) {
          this.spawnSparks(shot.x + shot.w / 2, shot.y + shot.h / 2, '#ff8a4a', 4);
          shot.life = 0;
          break;
        }
      }
      if (shot.life <= 0) continue;

      if (overlaps(this.player.hitbox, shot)) {
        shot.life = 0;
        this.loseLife();
      }
    }
    this.bossBullets = this.bossBullets.filter((shot) => shot.life > 0);
  }

  defeatBoss(boss) {
    this.boss = null;

    if (boss.isUltra) {
      this.shake = 3;
      this.sound.explosion();
      this.sound.victory();
      this.bossBullets.length = 0;
      this.level.enemies.length = 0;
      this.bonusScore += 1500;
      for (let i = 0; i < 40; i++) {
        this.spawnSparks(boss.x + boss.w / 2, boss.y + boss.h / 2, i % 2 ? '#ff8a4a' : '#7ef2ff', 6);
      }
      this.submitScore();
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem(BEST_KEY, String(this.best));
        this.queueCloudSave(true);
      }
      this.state = 'ending';
      return;
    }

    if (boss.isFinal) {
      this.finalBossDone = true;
      this.sound.explosion();
      this.bonusScore += 600;
      this.shake = 2.5;
      this.bossBullets.length = 0;
      this.level.enemies.length = 0;
      for (let i = 0; i < 30; i++) {
        this.spawnSparks(boss.x + boss.w / 2, boss.y + boss.h / 2, i % 2 ? '#ff8a4a' : '#ffe14a', 6);
      }
      this.startCutscene();
      return;
    }

    this.bossesBeaten++;
    this.bonusScore += BOSS_KILL_SCORE;
    this.sound.explosion();
    this.shake = 1.6;
    this.bossBullets.length = 0;
    this.spawnSparks(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ff8a4a', 16);
    this.spawnSparks(boss.x + boss.w / 2, boss.y + boss.h / 2, '#7ef2ff', 10);
    for (let i = 0; i < 3; i++) {
      this.level.addCoin(boss.x + i * 8 - 4, boss.y - 6);
    }
    this.level.addHeart(boss.x + boss.w / 2 - 3, boss.y + 2);
    const kinds = ['rapid', 'spread', 'magnet', 'shield'];
    this.level.addPowerup(boss.x + boss.w / 2 + 12, boss.y + 2, kinds[this.bossesBeaten % kinds.length]);
    // Next boss waits for the following multiple of BOSS_INTERVAL.
    this.nextBossScore = (Math.floor(this.score / BOSS_INTERVAL) + 1) * BOSS_INTERVAL;
  }

  updatePowers(dt) {
    const power = this.power;
    power.rapid = Math.max(0, power.rapid - dt);
    power.spread = Math.max(0, power.spread - dt);
    power.magnet = Math.max(0, power.magnet - dt);
    this.powerBanner = Math.max(0, this.powerBanner - dt);

    // The bought magnet works all the time, just with a shorter reach.
    const range = power.magnet > 0 ? MAGNET_RANGE : (this.shop.has('magnetstart') ? MAGNET_RANGE * 0.55 : 0);
    if (range <= 0) return;
    // Coins in range curve toward the player instead of waiting to be touched.
    const centerX = this.player.x + this.player.w / 2;
    const centerY = this.player.y + this.player.h / 2;
    for (const coin of this.level.coins) {
      if (coin.taken) continue;
      const dx = centerX - (coin.x + 4);
      const dy = centerY - (coin.y + 4);
      const distance = Math.hypot(dx, dy);
      if (distance > range || distance < 0.01) continue;
      const pull = (1 - distance / range) * 220 * dt;
      coin.x += (dx / distance) * pull;
      coin.y += (dy / distance) * pull;
    }
  }

  applyPower(kind) {
    const factor = this.shop.has('longpower') ? 1.5 : 1;
    if (kind === 'rapid') this.power.rapid = RAPID_TIME * factor;
    else if (kind === 'spread') this.power.spread = SPREAD_TIME * factor;
    else if (kind === 'magnet') this.power.magnet = MAGNET_TIME * factor;
    else if (kind === 'shield') this.power.shield = true;
    this.powerBanner = 1.6;
    this.powerBannerText = POWER_NAMES[kind] || '';
  }

  updateShooting(dt) {
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    this.muzzle = Math.max(0, this.muzzle - dt);
    if (!this.input.isDown('shoot') || this.shotCooldown > 0) return;

    const player = this.player;
    const direction = player.facingLeft ? -1 : 1;
    const x = player.facingLeft ? player.x - 6 : player.x + player.w - 2;
    const y = player.y + 8;
    // The spread shot adds an upward and a downward lane to the straight one.
    const lanes = this.power.spread > 0 ? [-70, 0, 70] : [0];

    for (const vy of lanes) {
      this.bullets.push({
        x, y, w: 8, h: 3,
        vx: direction * BULLET_SPEED,
        vy,
        facingLeft: player.facingLeft,
        life: BULLET_LIFE,
      });
    }

    const baseCooldown = SHOT_COOLDOWN * (this.shop.has('rapid') ? 0.75 : 1);
    this.shotCooldown = this.power.rapid > 0 ? baseCooldown * RAPID_COOLDOWN_SCALE : baseCooldown;
    this.muzzle = 0.07;
    this.sound.shoot();
  }

  updateBullets(dt) {
    const level = this.level;
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += (bullet.vy || 0) * dt;
      bullet.life -= dt;

      if (bullet.life <= 0 || bullet.x < this.cameraX - 40 || bullet.x > this.cameraX + VIEW_W + 40) {
        bullet.life = 0;
        continue;
      }

      // Lasers stop on walls and crates, so cover actually protects enemies.
      for (const solid of level.solidsInRange(bullet.x - 8, bullet.x + 16)) {
        if (overlaps(bullet, solid)) {
          this.spawnSparks(bullet.x + (bullet.facingLeft ? 0 : bullet.w), bullet.y, '#7ef2ff', 3);
          bullet.life = 0;
          break;
        }
      }
      if (bullet.life <= 0) continue;

      for (const enemy of level.enemies) {
        if (enemy.dead || !overlaps(bullet, enemy)) continue;
        bullet.life = 0;
        enemy.hp--;
        enemy.hitFlash = HIT_FLASH_TIME;
        this.sound.hit();
        this.spawnImpact(bullet.x + (bullet.facingLeft ? 0 : bullet.w), bullet.y + 1, bullet.facingLeft ? 1 : -1);
        if (enemy.hp <= 0) {
          enemy.dead = true;
          this.kills++;
          this.sound.kill();
          this.spawnSparks(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ff8a4a', 10);
        }
        break;
      }
    }
    this.bullets = this.bullets.filter((bullet) => bullet.life > 0);
  }

  /** Sparks that spray back out of a laser hit, opposite the shot direction. */
  spawnImpact(x, y, direction) {
    for (let i = 0; i < 6; i++) {
      const spread = (i / 5 - 0.5) * 1.6;
      const speed = 40 + (i % 3) * 30;
      this.particles.push({
        x, y,
        color: i % 2 === 0 ? '#ffe6c8' : '#7ef2ff',
        vx: direction * Math.cos(spread) * speed,
        vy: Math.sin(spread) * speed - 15,
        life: 0.18 + (i % 3) * 0.05,
      });
    }
  }

  spawnSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + this.time;
      const speed = 30 + (i % 3) * 25;
      this.particles.push({
        x, y, color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.3 + (i % 4) * 0.06,
      });
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 260 * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  /**
   * Enter, a tap, or the jump button confirm a menu row - but not the arrow that
   * moved the cursor in the same frame: ArrowUp doubles as "up" and as jump.
   */
  get confirmPressed() {
    const input = this.input;
    return input.wasPressed('start') || (input.wasPressed('jump') && !input.wasPressed('menuUp'));
  }

  updateMenu() {
    const input = this.input;
    if (input.wasPressed('menuDown')) {
      this.menuIndex = (this.menuIndex + 1) % MENU_ITEMS.length;
      this.sound.select();
    }
    if (input.wasPressed('menuUp')) {
      this.menuIndex = (this.menuIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
      this.sound.select();
    }
    // The touch pad has no up/down, so its arrows walk the menu as well.
    if (input.wasPressed('right')) {
      this.menuIndex = (this.menuIndex + 1) % MENU_ITEMS.length;
      this.sound.select();
    }
    if (input.wasPressed('left')) {
      this.menuIndex = (this.menuIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
      this.sound.select();
    }

    // A tap picks the item it landed on, so the menu works without a keyboard.
    if (input.tap) {
      const hit = MENU_ITEMS.findIndex((item, index) => {
        const y = MENU_Y + index * MENU_STEP;
        return input.tap.y > y - 3 && input.tap.y < y + 13;
      });
      if (hit >= 0) {
        this.menuIndex = hit;
        return this.chooseMenuItem();
      }
      return undefined;
    }

    if (this.confirmPressed) return this.chooseMenuItem();
    return undefined;
  }

  /** Stop the run and show the pause menu. Music stops with the state change. */
  pauseRun() {
    this.state = 'paused';
    this.pauseIndex = 0;
    this.sound.select();
    return undefined;
  }

  updatePause() {
    const input = this.input;
    if (input.wasPressed('pause')) {
      this.state = 'play';
      this.sound.confirm();
      return;
    }
    if (input.wasPressed('menuDown')) {
      this.pauseIndex = (this.pauseIndex + 1) % PAUSE_ITEMS.length;
      this.sound.select();
    }
    if (input.wasPressed('menuUp')) {
      this.pauseIndex = (this.pauseIndex - 1 + PAUSE_ITEMS.length) % PAUSE_ITEMS.length;
      this.sound.select();
    }

    if (input.tap) {
      const hit = PAUSE_ITEMS.findIndex((item, index) => {
        const y = PAUSE_ROW_Y + index * MENU_STEP;
        return input.tap.y > y - 3 && input.tap.y < y + 13;
      });
      if (hit < 0) return;
      this.pauseIndex = hit;
      return this.choosePauseItem();
    }

    if (this.confirmPressed) this.choosePauseItem();
  }

  choosePauseItem() {
    this.sound.confirm();
    if (PAUSE_ITEMS[this.pauseIndex].id === 'resume') {
      this.state = 'play';
      return undefined;
    }
    // Leaving mid-run drops the score; coins picked up so far stay in the wallet.
    this.queueCloudSave(true);
    this.newRun();
    this.state = 'menu';
    this.menuIndex = 0;
    return undefined;
  }

  chooseMenuItem() {
    this.sound.confirm();
    const item = MENU_ITEMS[this.menuIndex];
    if (item.id === 'new') {
      if (this.hasName) this.startIntro();
      else this.state = 'name';
    } else if (item.id === 'name') this.state = 'name';
    else if (item.id === 'shop') this.openShop();
    else if (item.id === 'board') {
      this.state = 'leaderboard';
      this.refreshBoard();
    }
    return undefined;
  }

  /** Rows shown in the shop: the items, the free default shirt, and a way out. */
  get shopRows() {
    return [
      // First row, not last: on a phone the bottom corners sit under the
      // on-screen buttons, so a row down there cannot be tapped.
      { id: 'back', name: 'zpet do menu' },
      { id: 'daily', name: 'denni bonus', detail: 'mince zdarma, kazdy den vic' },
      ...SHOP_ITEMS,
      { id: 'skin_default', name: 'modry dres', detail: 'vychozi barva postavy', price: 0, skin: '#3aa0e0' },
    ];
  }

  openShop() {
    this.state = 'shop';
    this.shopIndex = 1; // start on the first item, not on "back"
    this.shopMessage = '';
  }

  updateShop(dt) {
    const input = this.input;
    const rows = this.shopRows;
    this.shopMessageTime = Math.max(0, this.shopMessageTime - dt);
    if (this.shopMessageTime <= 0) this.shopMessage = '';

    if (input.wasPressed('menuDown')) {
      this.shopIndex = (this.shopIndex + 1) % rows.length;
      this.sound.select();
    }
    if (input.wasPressed('menuUp')) {
      this.shopIndex = (this.shopIndex - 1 + rows.length) % rows.length;
      this.sound.select();
    }
    if (input.wasPressed('right')) {
      this.shopIndex = (this.shopIndex + 1) % rows.length;
      this.sound.select();
    }
    if (input.wasPressed('left')) {
      this.shopIndex = (this.shopIndex - 1 + rows.length) % rows.length;
      this.sound.select();
    }
    if (input.wasPressed('restart') || input.wasPressed('pause')) {
      this.state = 'menu';
      this.sound.confirm();
      return;
    }

    if (input.tap) {
      const hit = rows.findIndex((row, index) => {
        const y = SHOP_ROW_Y + index * SHOP_ROW_STEP;
        return input.tap.y > y - 2 && input.tap.y < y + 9;
      });
      if (hit < 0) return;
      this.shopIndex = hit;
      this.buyShopRow(rows[hit]);
      return;
    }

    if (this.confirmPressed) this.buyShopRow(rows[this.shopIndex]);
  }

  buyShopRow(row) {
    if (row.id === 'back') {
      this.sound.confirm();
      this.state = 'menu';
      return;
    }

    if (row.id === 'daily') {
      const reward = this.shop.claimDaily();
      if (!reward) {
        this.showShopMessage('dnes uz vybrano', '#8a8aa0');
        this.sound.select();
        return;
      }
      this.queueCloudSave(true);
      this.showShopMessage(`+${reward} minci, den ${this.shop.daily.streak}`, '#ffd24a');
      this.sound.power();
      return;
    }

    if (row.id === 'skin_default') {
      this.shop.equipDefault();
      setPlayerShirt(this.shop.skin);
      this.queueCloudSave();
      this.showShopMessage('nasazeno', '#8fe08f');
      this.sound.confirm();
      return;
    }

    const result = this.shop.buy(row);
    if (result === 'bought' || result === 'equipped') this.queueCloudSave();
    if (result === 'bought') {
      if (row.skin) setPlayerShirt(this.shop.skin);
      this.showShopMessage('koupeno!', '#8fe08f');
      this.sound.power();
    } else if (result === 'equipped') {
      setPlayerShirt(this.shop.skin);
      this.showShopMessage('nasazeno', '#8fe08f');
      this.sound.confirm();
    } else if (result === 'poor') {
      this.showShopMessage(`chybi ${row.price - this.shop.coins} minci`, '#ff6b6b');
      this.sound.hurt();
    } else {
      this.showShopMessage('uz vlastnis', '#8a8aa0');
      this.sound.select();
    }
  }

  showShopMessage(text, color) {
    this.shopMessage = text;
    this.shopMessageColor = color;
    this.shopMessageTime = 2;
  }

  /** Called by the HTML name field once the player confirms. */
  setPlayerName(rawName) {
    // Any letters are welcome - accents included; the font folds whatever it
    // cannot draw down to its plain latin base.
    const cleaned = normalizeText(rawName || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12);
    this.playerName = cleaned || 'HONZIK';
    this.hasName = true;
    localStorage.setItem(NAME_KEY, this.playerName);
    this.signInCloud();
    this.startIntro();
  }

  /**
   * Claim the cloud profile for this install, pull coins and purchases down, then
   * push the merged state back. Runs in the background: a failure just leaves the
   * game on its local save.
   */
  async signInCloud() {
    if (!this.cloud.enabled) return;
    const local = { ...this.shop.snapshot(), best: this.best };
    const remote = await this.cloud.signIn(this.playerName, local);
    if (remote) {
      if (this.shop.applyRemote(remote)) setPlayerShirt(this.shop.skin);
      if (remote.best > this.best) {
        this.best = remote.best;
        localStorage.setItem(BEST_KEY, String(this.best));
      }
    }
    this.queueCloudSave(true);
  }

  /** Mirror wallet, purchases and record to the cloud profile. */
  queueCloudSave(immediate = false) {
    if (!this.cloud.enabled) return;
    this.cloud.saveProfile(
      { name: this.playerName, best: this.best, ...this.shop.snapshot() },
      immediate,
    );
  }

  /** Pull the shared leaderboard; keep showing the local one until it lands. */
  async refreshBoard() {
    if (!this.cloud.enabled || this.boardLoading) return;
    this.boardLoading = true;
    const rows = await this.cloud.fetchBoard(BOARD_SIZE);
    this.boardLoading = false;
    if (rows) {
      this.board = rows;
      this.boardSource = 'cloud';
    } else {
      this.boardSource = 'offline';
    }
  }

  /** Store the finished run in the local top ten. */
  submitScore() {
    this.board.push({
      name: this.playerName,
      score: this.score,
      level: this.levelIndex,
      coins: this.coins,
    });
    this.board.sort((a, b) => b.score - a.score);
    this.board = this.board.slice(0, BOARD_SIZE);
    saveBoard(this.board);
    this.cloud.submitScore({
      name: this.playerName,
      score: this.score,
      level: this.levelIndex,
      coins: this.coins,
    });
    this.queueCloudSave(true);
  }

  /** Opening scene: Honzik wakes up, spots the laser pistol, and the run begins. */
  startIntro() {
    this.newRun();
    this.state = 'intro';
    this.intro = {
      phase: 0,
      timer: 0,
      elapsed: 0,
      playerX: 36,
      hasGun: false,
      dialog: '',
      fade: 0,
    };
  }

  updateIntro(dt) {
    const scene = this.intro;
    if (!scene) return this.finishIntro();

    scene.timer += dt;
    scene.elapsed += dt;
    this.player.animTime += dt;
    this.updateParticles(dt);

    if (scene.elapsed > 1.2 && (this.input.wasPressed('start') || this.input.wasPressed('restart'))) {
      return this.finishIntro();
    }

    switch (scene.phase) {
      case 0: // asleep
        if (scene.timer > 2.6) { scene.phase = 1; scene.timer = 0; }
        break;
      case 1: // out of bed
        if (scene.timer > 1) { scene.phase = 2; scene.timer = 0; }
        break;
      case 2: // walk over to the table
        scene.playerX += Math.min(58 * dt, Math.max(0, TABLE_X - scene.playerX));
        if (scene.playerX >= TABLE_X - 1) {
          scene.phase = 3;
          scene.timer = 0;
          scene.hasGun = true;
          scene.dialog = 'laserova pistole!';
          this.sound.power();
          this.spawnSparks(TABLE_X + 14, 116, '#ffe14a', 8);
        }
        break;
      case 3: // hold it up
        if (scene.timer > 1.8) { scene.phase = 4; scene.timer = 0; scene.dialog = ''; }
        break;
      default:
        scene.fade = Math.min(1, scene.timer / 0.9);
        if (scene.fade >= 1) this.finishIntro();
    }

    return undefined;
  }

  finishIntro() {
    this.intro = null;
    this.state = 'play';
  }

  /** The bedroom: wall, window, bed, table and the pistol that starts it all. */
  drawIntro() {
    const ctx = this.ctx;
    const scene = this.intro;
    if (!scene) return;

    ctx.fillStyle = '#2b2438';
    ctx.fillRect(0, 0, VIEW_W, ROOM_FLOOR_Y);
    ctx.fillStyle = '#4a3a2c';
    ctx.fillRect(0, ROOM_FLOOR_Y, VIEW_W, VIEW_H - ROOM_FLOOR_Y);
    ctx.fillStyle = '#5d4a38';
    ctx.fillRect(0, ROOM_FLOOR_Y, VIEW_W, 3);

    // The room is authored in a 320-wide box; centre it on wider screens.
    ctx.save();
    ctx.translate(Math.round((VIEW_W - 320) / 2), 0);

    // Night sky through the window.
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(210, 26, 76, 52);
    ctx.fillStyle = '#6b5a48';
    ctx.strokeStyle = '#6b5a48';
    ctx.lineWidth = 2;
    ctx.strokeRect(209, 25, 78, 54);
    ctx.fillRect(247, 26, 2, 52);
    ctx.fillRect(210, 51, 76, 2);
    for (const star of this.stars.slice(0, 16)) {
      ctx.globalAlpha = 0.4 + Math.sin(this.time * star.twinkle + star.x) * 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(214 + (star.x % 68), 30 + (star.y % 44), 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e8e8d0';
    ctx.beginPath();
    ctx.arc(266, 42, 8, 0, Math.PI * 2);
    ctx.fill();

    drawSprite(ctx, sprites.bed, 16, ROOM_FLOOR_Y - 24, false, ROOM_SCALE);
    drawSprite(ctx, sprites.table, TABLE_X + 4, ROOM_FLOOR_Y - 18, false, ROOM_SCALE);

    if (!scene.hasGun) {
      drawSprite(ctx, sprites.pistol, TABLE_X + 8, ROOM_FLOOR_Y - 24, false, ROOM_SCALE);
    }

    if (scene.phase === 0) {
      drawSprite(ctx, sprites.playerSleep, 30, ROOM_FLOOR_Y - 36, false, ROOM_SCALE);
      const bob = Math.sin(this.time * 2) * 2;
      drawText(ctx, 'zzz', 84, ROOM_FLOOR_Y - 52 + bob, { color: '#9ad8ff', scale: 2 });
    } else {
      const walking = scene.phase === 2;
      const frame = walking
        ? (Math.floor(this.time * 8) % 2 === 0 ? sprites.playerRunA : sprites.playerRunB)
        : sprites.playerIdle;
      const px = Math.round(scene.playerX);
      drawSprite(ctx, frame, px, ROOM_FLOOR_Y - 28, false, ROOM_SCALE);
      if (scene.hasGun) {
        const raised = scene.phase === 3 ? -6 : 0;
        drawSprite(ctx, sprites.pistol, px + 16, ROOM_FLOOR_Y - 12 + raised, false, ROOM_SCALE);
      }
    }

    if (scene.dialog) {
      // Kept left of the window so the box never covers it.
      const x = 12;
      const boxWidth = 176;
      ctx.fillStyle = '#0b0b16e0';
      ctx.fillRect(x, 18, boxWidth, 26);
      ctx.strokeStyle = '#ffe14a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, 18.5, boxWidth - 1, 25);
      drawText(ctx, this.playerName, x + boxWidth / 2, 23, { color: '#ffe14a', align: 'center' });
      drawText(ctx, scene.dialog, x + boxWidth / 2, 34, { align: 'center' });
    }

    for (const particle of this.particles) {
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 2);
    }

    ctx.restore();

    if (scene.fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${scene.fade})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    drawText(ctx, 'enter = preskocit', VIEW_W / 2, VIEW_H - 12, { color: '#6a6a80', align: 'center' });
  }

  /** The robot that congratulates you, laughs, and drops the ultra boss. */
  startRobotScene() {
    this.state = 'cutscene';
    this.player.invuln = 0;
    this.player.vx = 0;
    this.bullets.length = 0;
    this.bossBullets.length = 0;
    this.level.enemies.length = 0;
    this.cutscene = {
      kind: 'robot',
      phase: 0,
      timer: 0,
      elapsed: 0,
      robotX: this.player.x + 70,
      robotY: -40,
      dialog: '',
      fade: 0,
      space: false,
    };
  }

  updateRobotScene(dt) {
    const scene = this.cutscene;

    switch (scene.phase) {
      case 0: { // lands in front of the player
        const t = Math.min(1, scene.timer / 1.6);
        scene.robotY = -40 + (GROUND_Y - 15 + 40) * t * t;
        if (t >= 1) {
          scene.phase = 1;
          scene.timer = 0;
          scene.dialog = 'dohral jsi hru! super!';
          this.shake = 1;
          this.sound.confirm();
          this.spawnSparks(scene.robotX + 8, GROUND_Y, '#c8c8d8', 10);
        }
        break;
      }
      case 1:
        if (scene.timer > 2.8) { scene.phase = 2; scene.timer = 0; scene.dialog = 'ha ha ha ha!'; }
        break;
      case 2:
        // Shaking with laughter.
        if (scene.timer < dt * 2) this.sound.laugh();
        scene.robotY = GROUND_Y - 15 + Math.sin(this.time * 26) * 2;
        if (scene.timer > 2.6) { scene.phase = 3; scene.timer = 0; scene.dialog = ''; }
        break;
      default: { // flies off and leaves the ultra boss behind
        scene.robotY -= 120 * dt;
        this.shake = 1.6;
        if (scene.robotY < -40) this.startUltraFight();
      }
    }
  }

  startUltraFight() {
    this.cutscene = null;
    this.state = 'play';
    this.ultraStarted = true;
    this.boss = this.level.addUltraBoss(this.cameraX + VIEW_W + 24, 40);
    this.bossBanner = 3;
    this.shake = 2;
    this.sound.bossAppear();
  }

  startCutscene() {
    this.state = 'cutscene';
    // Clear the post-hit blink, otherwise Honzik is invisible for his own scene.
    this.player.invuln = 0;
    this.player.vx = 0;
    this.cutscene = {
      phase: 0,
      timer: 0,
      shipX: this.player.x + 66,
      shipY: -40,
      shipLandedY: GROUND_Y - 32,
      astroX: 0,
      astroVisible: false,
      playerAboard: false,
      dialog: '',
      fade: 0,
      elapsed: 0,
      space: false,
      travel: 0,
      landing: 0,
    };
  }

  /** Timed ending: rocket lands, astronaut invites Honzik, both fly to the Moon. */
  updateCutscene(dt) {
    const scene = this.cutscene;
    if (!scene) return this.startLevel2();

    scene.elapsed += dt;
    // Ignore taps for the first moment, so a stray tap right after the fight
    // does not skip the whole ending.
    if (scene.elapsed > 1.5 && (this.input.wasPressed('start') || this.input.wasPressed('restart'))) {
      return scene.kind === 'robot' ? this.startUltraFight() : this.startLevel2();
    }

    scene.timer += dt;
    this.player.animTime += dt;
    this.updateParticles(dt);
    this.shake = Math.max(0, this.shake - dt * 4);

    if (scene.kind === 'robot') {
      this.updateRobotScene(dt);
      return undefined;
    }

    switch (scene.phase) {
      case 0: { // rocket descends
        const t = Math.min(1, scene.timer / 2.2);
        scene.shipY = -40 + (scene.shipLandedY + 40) * t * t;
        if (t >= 1) {
          this.shake = 0.8;
          this.spawnSparks(scene.shipX + 18, scene.shipLandedY + 32, '#ffe14a', 12);
          scene.phase = 1;
          scene.timer = 0;
          scene.astroX = scene.shipX + 4;
          scene.astroVisible = true;
          this.sound.hit();
        }
        break;
      }
      case 1: { // astronaut steps out
        scene.astroX -= 16 * dt;
        if (scene.timer > 1.2) { scene.phase = 2; scene.timer = 0; scene.dialog = 'Pojd se mnou na Mesic!'; }
        break;
      }
      case 2: { // he speaks
        if (scene.timer > 3.2) { scene.phase = 3; scene.timer = 0; scene.dialog = ''; }
        break;
      }
      case 3: { // the astronaut climbs in first, Honzik follows
        const door = scene.shipX + 12;
        scene.astroX += Math.min(34 * dt, Math.max(0, door + 4 - scene.astroX));
        if (scene.astroX >= door + 3) scene.astroVisible = false;

        this.player.facingLeft = false;
        this.player.vx = 60; // keeps the run animation going while we drive x
        this.player.x += Math.min(60 * dt, Math.max(0, door - this.player.x));

        if (this.player.x >= door - 1) scene.playerAboard = true;
        if (scene.playerAboard && !scene.astroVisible) {
          scene.phase = 4;
          scene.timer = 0;
        }
        break;
      }
      case 4: { // liftoff
        const t = scene.timer;
        scene.shipY = scene.shipLandedY - 30 * t * t;
        if (Math.floor(t * 30) % 2 === 0) {
          this.spawnSparks(scene.shipX + 18, scene.shipY + 32, '#ffb04a', 4);
        }
        if (scene.shipY < -60) {
          scene.phase = 5;
          scene.timer = 0;
          scene.space = true; // hand the screen over to the flight scene
          this.particles.length = 0;
          this.sound.rocket();
        }
        break;
      }
      case 5: { // the long haul from Earth to the Moon
        scene.travel = Math.min(1, scene.timer / SPACE_TRAVEL_TIME);
        if (scene.travel >= 1) { scene.phase = 6; scene.timer = 0; }
        break;
      }
      case 6: { // touchdown in the dust
        const t = Math.min(1, scene.timer / 2.4);
        scene.landing = t;
        if (Math.floor(scene.timer * 20) % 2 === 0) {
          this.spawnSparks(VIEW_W / 2, 60 + t * 74, '#c8c8d8', 2);
        }
        if (t >= 1) { scene.phase = 7; scene.timer = 0; this.sound.hit(); }
        break;
      }
      default: { // fade out into level two
        scene.fade = Math.min(1, scene.timer / 1.1);
        if (scene.fade >= 1) this.startLevel2();
      }
    }

    this.cameraX += (Math.max(0, this.player.x - CAMERA_OFFSET) - this.cameraX) * Math.min(1, 3 * dt);
    return undefined;
  }

  /** Second level: the Moon — low gravity, grey dust, Earth in the sky. */
  startLevel2() {
    this.levelIndex = 2;
    this.level = new Level(undefined, 'moon');
    this.stars = makeStars();
    this.cutscene = null;
    this.state = 'play';

    this.distanceBase = this.distance;
    this.player.reset(24, GROUND_Y - 14);
    this.player.gravityScale = MOON_GRAVITY_SCALE;
    this.cameraX = 0;
    this.maxX = this.player.x;
    this.boss = null;
    this.bullets.length = 0;
    this.bossBullets.length = 0;
    this.particles.length = 0;
    this.nextBossScore = (Math.floor(this.score / BOSS_INTERVAL) + 1) * BOSS_INTERVAL;
    this.levelBanner = 3.5;
  }

  collectCoins() {
    for (const coin of this.level.coins) {
      if (coin.taken) continue;
      if (overlaps(this.player.hitbox, coin)) {
        coin.taken = true;
        this.coins++;
        this.shop.earn();
        this.queueCloudSave();
        this.sound.coin();
      }
    }

    for (const power of this.level.powerups) {
      if (power.taken || !overlaps(this.player.hitbox, power)) continue;
      power.taken = true;
      this.applyPower(power.kind);
      this.sound.power();
      this.spawnSparks(power.x + 4, power.y + 4, '#ffe14a', 8);
    }

    for (const heart of this.level.hearts) {
      if (heart.taken || !overlaps(this.player.hitbox, heart)) continue;
      heart.taken = true;
      this.lives = Math.min(MAX_LIVES, this.lives + 1);
      this.sound.heart();
      this.spawnSparks(heart.x + heart.w / 2, heart.y + heart.h / 2, '#e2445c', 6);
    }
  }

  checkHazards() {
    const box = this.player.hitbox;
    for (const hazard of this.level.hazards) {
      if (overlaps(box, hazard)) return this.loseLife();
    }
    for (const enemy of this.level.enemies) {
      if (!enemy.dead && overlaps(box, enemy)) return this.loseLife();
    }
    return undefined;
  }

  loseLife() {
    if (this.player.invuln > 0) return;

    if (this.power.shield) {
      this.power.shield = false;
      this.player.hurt();
      this.sound.hit();
      this.shake = 0.6;
      this.spawnSparks(this.player.x + this.player.w / 2, this.player.y + 7, '#9ad8ff', 12);
      return;
    }

    if (!this.player.hurt()) return;
    this.lives--;
    this.shake = 1;
    this.sound.hurt();
    if (this.lives <= 0) {
      this.state = 'dead';
      this.sound.gameOver();
      this.submitScore();
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem(BEST_KEY, String(this.best));
        this.queueCloudSave(true);
      }
      return;
    }
    const point = this.level.checkpointBefore(this.player.x);
    // Clear the respawn area so the player never wakes up inside an enemy.
    for (const enemy of this.level.enemies) {
      if (enemy.type === 'boss') continue; // the boss fight survives a lost life
      if (Math.abs(enemy.x - point.x) < 48) enemy.dead = true;
    }
    this.bullets.length = 0;
    this.bossBullets.length = 0;
    const invuln = this.player.invuln;
    this.player.reset(point.x, point.y);
    this.player.invuln = invuln;
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // never inherit a transform from last frame

    if (this.state === 'intro') {
      this.drawIntro();
      return;
    }

    if (this.state === 'shop') {
      this.drawShop();
      return;
    }

    if (this.state === 'leaderboard') {
      this.drawLeaderboard();
      return;
    }

    if (this.state === 'ending') {
      this.drawEnding();
      return;
    }

    if (this.state === 'cutscene' && this.cutscene && this.cutscene.space) {
      this.drawSpace();
      return;
    }

    const shakeX = this.shake > 0 ? Math.round(Math.sin(this.time * 60) * this.shake * 2) : 0;
    const shakeY = this.shake > 0 ? Math.round(Math.cos(this.time * 70) * this.shake * 2) : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawBackground();
    this.drawLevel();
    if (!(this.cutscene && this.cutscene.playerAboard)) {
      this.player.draw(ctx, this.cameraX);
      this.drawShield();
    }
    this.drawCutsceneActors();
    ctx.restore();

    if (this.state === 'cutscene') {
      this.drawCutscene();
      return;
    }

    // The HUD belongs to a run, not to the menus.
    if (this.state === 'play' || this.state === 'dead' || this.state === 'paused') this.drawHud();
    if (this.state === 'paused') this.drawPause();
    if (this.state === 'menu' || this.state === 'name') this.drawMenu();
    if (this.state === 'dead') this.drawGameOver();
  }

  drawBackground() {
    if (this.level.theme === 'moon') return this.drawMoonBackground();
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, '#1b2a4a');
    sky.addColorStop(0.6, '#39406b');
    sky.addColorStop(1, '#6b4f6b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Far hills (slowest parallax layer).
    ctx.fillStyle = '#2c3357';
    const farOffset = -(this.cameraX * 0.2) % 160;
    for (let i = -1; i < 4; i++) {
      const baseX = farOffset + i * 160;
      this.drawHill(baseX, 120, 96, 44, '#2c3357');
      this.drawHill(baseX + 70, 128, 78, 32, '#333a61');
    }

    // Clouds.
    ctx.fillStyle = '#4a5486';
    for (const cloud of this.clouds) {
      const x = mod(cloud.x - this.cameraX * 0.35, VIEW_W + 60) - 30;
      this.drawCloud(x, cloud.y, cloud.scale);
    }

    // Near hills.
    const nearOffset = -(this.cameraX * 0.5) % 120;
    for (let i = -1; i < 5; i++) {
      this.drawHill(nearOffset + i * 120, 136, 72, 34, '#3c4470');
    }
  }

  /** Airless moon sky: stars, a distant Earth and pale grey crater hills. */
  drawMoonBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = '#07070f';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    for (const star of this.stars) {
      const x = mod(star.x - this.cameraX * 0.08, VIEW_W + 8) - 4;
      ctx.globalAlpha = 0.35 + Math.sin(this.time * star.twinkle + star.x) * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x), star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    // Earth hangs low over the horizon and barely drifts.
    const earthX = mod(240 - this.cameraX * 0.05, VIEW_W + 120) - 60;
    ctx.fillStyle = '#2f6ec0';
    ctx.beginPath();
    ctx.arc(Math.round(earthX), 44, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4c9a5a';
    ctx.fillRect(Math.round(earthX) - 10, 38, 8, 5);
    ctx.fillRect(Math.round(earthX) + 1, 46, 9, 6);
    ctx.fillRect(Math.round(earthX) - 4, 30, 6, 4);

    const farOffset = -(this.cameraX * 0.2) % 160;
    for (let i = -1; i < 4; i++) {
      this.drawHill(farOffset + i * 160, 124, 100, 40, '#2a2a34');
      this.drawHill(farOffset + i * 160 + 74, 130, 80, 28, '#33333f');
    }
    const nearOffset = -(this.cameraX * 0.5) % 120;
    for (let i = -1; i < 5; i++) {
      this.drawHill(nearOffset + i * 120, 138, 76, 30, '#3d3d4a');
    }
  }

  drawHill(x, baseY, width, height, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + width / 2, baseY - height);
    ctx.lineTo(x + width, baseY);
    ctx.closePath();
    ctx.fill();
  }

  drawCloud(x, y, scale) {
    const ctx = this.ctx;
    const w = Math.round(14 * scale);
    const h = Math.round(4 * scale);
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
    ctx.fillRect(Math.round(x + w * 0.25), Math.round(y - h), Math.round(w * 0.5), h);
  }

  drawLevel() {
    const ctx = this.ctx;
    const camera = Math.round(this.cameraX);
    const level = this.level;

    for (const solid of level.solids) {
      const sx = solid.x - camera;
      if (sx > VIEW_W || sx + solid.w < 0) continue;

      if (solid.crate) {
        drawSprite(ctx, sprites.crate, sx, solid.y);
        continue;
      }

      const moon = this.level.theme === 'moon';
      ctx.fillStyle = solid.ground ? (moon ? '#4b4b58' : '#5a3a2a') : (moon ? '#5c5c6e' : '#4a4a66');
      ctx.fillRect(Math.round(sx), solid.y, solid.w, solid.h);
      ctx.fillStyle = solid.ground ? (moon ? '#9d9db2' : '#4cc26a') : (moon ? '#8a8aa0' : '#6d6d95');
      ctx.fillRect(Math.round(sx), solid.y, solid.w, 3);

      // Dirt speckles give the ground some texture without a tileset.
      if (solid.ground) {
        ctx.fillStyle = moon ? '#3c3c48' : '#4a2e20';
        for (let x = 0; x < solid.w; x += TILE) {
          const worldX = solid.x + x;
          ctx.fillRect(Math.round(sx + x + (worldX / TILE) % 3 + 1), solid.y + 7, 2, 2);
          ctx.fillRect(Math.round(sx + x + ((worldX / TILE) % 4) + 3), solid.y + 14, 2, 2);
        }
      }
    }

    for (const hazard of level.hazards) {
      const sx = hazard.x - camera;
      if (sx > VIEW_W || sx + hazard.w < 0) continue;
      drawSprite(ctx, sprites.spike, sx, hazard.y);
    }

    for (const coin of level.coins) {
      if (coin.taken) continue;
      const sx = coin.x - camera;
      if (sx > VIEW_W || sx + coin.w < 0) continue;
      const bob = Math.sin(this.time * 4 + coin.x * 0.1) * 1.5;
      drawSprite(ctx, sprites.coin, sx, coin.y + bob);
    }

    for (const power of level.powerups) {
      if (power.taken) continue;
      const sx = power.x - camera;
      if (sx > VIEW_W || sx + power.w < 0) continue;
      const bob = Math.sin(this.time * 3.5 + power.x * 0.1) * 2;
      // Cross-shaped glow behind the icon reads as a sparkle, not a box.
      const gx = Math.round(sx);
      const gy = Math.round(power.y + bob);
      ctx.globalAlpha = 0.2 + Math.sin(this.time * 6 + power.x) * 0.07;
      ctx.fillStyle = '#ffe14a';
      ctx.fillRect(gx - 3, gy + 2, 14, 4);
      ctx.fillRect(gx + 2, gy - 3, 4, 14);
      ctx.globalAlpha = 1;
      drawSprite(ctx, sprites[POWER_SPRITES[power.kind]], sx, power.y + bob);
    }

    for (const heart of level.hearts) {
      if (heart.taken) continue;
      const sx = heart.x - camera;
      if (sx > VIEW_W || sx + heart.w < 0) continue;
      const bob = Math.sin(this.time * 3 + heart.x * 0.1) * 1.5;
      drawSprite(ctx, sprites.heart, sx, heart.y + bob);
    }

    for (const enemy of level.enemies) {
      if (enemy.dead) continue;
      const sx = enemy.x - camera;
      if (sx > VIEW_W || sx + enemy.w < 0) continue;

      let frame;
      if (enemy.type === 'flyer') {
        const even = Math.floor(this.time * 8) % 2 === 0;
        frame = enemy.variant === 'moon'
          ? (even ? sprites.moonFlyerA : sprites.moonFlyerB)
          : (even ? sprites.flyerA : sprites.flyerB);
      } else if (enemy.type === 'boss') {
        if (enemy.isUltra) {
          frame = Math.floor(this.time * 6) % 2 === 0 ? sprites.ultraBossA : sprites.ultraBossB;
        } else if (enemy.isFinal) {
          frame = Math.floor(this.time * 5) % 2 === 0 ? sprites.finalBossA : sprites.finalBossB;
        } else if (enemy.variant === 'moon') {
          const even = Math.floor(this.time * 6) % 2 === 0;
          frame = enemy.big
            ? (even ? sprites.moonFinalA : sprites.moonFinalB)
            : (even ? sprites.moonBossA : sprites.moonBossB);
        } else {
          frame = Math.floor(this.time * 6) % 2 === 0 ? sprites.bossA : sprites.bossB;
        }
      } else {
        const even = Math.floor(enemy.anim * 6) % 2 === 0;
        frame = enemy.variant === 'moon'
          ? (even ? sprites.moonWalkerA : sprites.moonWalkerB)
          : (even ? sprites.walkerA : sprites.walkerB);
      }
      const scale = enemy.scale || 1;
      const drawX = enemy.type === 'boss' ? sx - scale : sx;
      // A hit knocks the sprite back a pixel and lights a hot rim behind it.
      // The rim is drawn first so the enemy itself stays fully readable.
      const strength = enemy.hitFlash > 0 ? enemy.hitFlash / HIT_FLASH_TIME : 0;
      const recoil = strength > 0 ? (enemy.facingLeft ? 1 : -1) : 0;

      if (strength > 0) {
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          drawSpriteTinted(ctx, frame, drawX + recoil + ox, enemy.y + oy, enemy.facingLeft, '#ff7a3a', strength, scale);
        }
      }

      drawSprite(ctx, frame, drawX + recoil, enemy.y, enemy.facingLeft, scale);

      if (strength > 0) {
        drawSpriteTinted(ctx, frame, drawX + recoil, enemy.y, enemy.facingLeft, '#ffd9a0', strength * 0.3, scale);
      }
    }

    for (const shot of this.bossBullets) {
      const sx = shot.x - camera;
      if (sx > VIEW_W || sx + shot.w < 0) continue;
      drawSprite(ctx, sprites.bossShot, sx, shot.y);
    }

    for (const bullet of this.bullets) {
      const sx = bullet.x - camera;
      if (sx > VIEW_W || sx + bullet.w < 0) continue;
      drawSprite(ctx, sprites.laser, sx, bullet.y - 1, bullet.facingLeft);
    }

    if (this.muzzle > 0) {
      const player = this.player;
      const flashX = (player.facingLeft ? player.x - 5 : player.x + player.w + 1) - camera;
      ctx.fillStyle = '#dffcff';
      ctx.fillRect(Math.round(flashX), Math.round(player.y + 8), 4, 3);
    }

    for (const particle of this.particles) {
      const sx = particle.x - camera;
      if (sx < -4 || sx > VIEW_W + 4) continue;
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(sx), Math.round(particle.y), 2, 2);
    }
  }

  /** Rocket and astronaut live in world space, drawn with the level. */
  drawCutsceneActors() {
    const scene = this.cutscene;
    if (!scene) return;
    const ctx = this.ctx;

    if (scene.kind === 'robot') {
      drawSprite(ctx, sprites.robot, scene.robotX - this.cameraX, scene.robotY, true, 2);
      return;
    }

    drawSprite(ctx, sprites.ship, scene.shipX - this.cameraX, scene.shipY, false, SHIP_SCALE);

    if (scene.astroVisible) {
      drawSprite(ctx, sprites.astronaut, scene.astroX - this.cameraX, GROUND_Y - 13, true);
    }
  }

  /** The flight itself: Earth shrinking away, the Moon growing closer. */
  drawSpace() {
    const ctx = this.ctx;
    const scene = this.cutscene;
    const travel = scene.travel;
    const landing = scene.landing;

    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Stars streak downward to sell the speed.
    for (const star of this.stars) {
      const y = mod(star.y * 1.6 + this.time * 90, VIEW_H + 10) - 5;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.5 + (star.size === 2 ? 0.4 : 0.1);
      ctx.fillRect(star.x % VIEW_W, Math.round(y), 1, star.size + 1);
    }
    ctx.globalAlpha = 1;

    // Earth falls away below, the Moon swells above.
    const earthR = 52 - travel * 44;
    const earthY = 158 + travel * 80;
    if (earthR > 1) {
      ctx.fillStyle = '#2f6ec0';
      ctx.beginPath();
      ctx.arc(VIEW_W / 2, earthY, earthR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4c9a5a';
      ctx.fillRect(VIEW_W / 2 - earthR * 0.5, earthY - earthR * 0.5, earthR * 0.5, earthR * 0.3);
      ctx.fillRect(VIEW_W / 2 + earthR * 0.1, earthY - earthR * 0.2, earthR * 0.4, earthR * 0.35);
    }

    const moonR = 6 + travel * 42 + landing * 72;
    // On approach the Moon slides down so the rocket settles on its surface.
    const moonY = -22 + travel * 40 + landing * 232;
    ctx.fillStyle = '#c9c9d6';
    ctx.beginPath();
    ctx.arc(VIEW_W / 2, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a8a8ba';
    ctx.beginPath();
    ctx.arc(VIEW_W / 2 - moonR * 0.35, moonY - moonR * 0.2, moonR * 0.22, 0, Math.PI * 2);
    ctx.arc(VIEW_W / 2 + moonR * 0.3, moonY + moonR * 0.35, moonR * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Rocket: nose up while cruising, settling down on approach.
    const shipY = landing > 0 ? 34 + landing * 70 : 60 + Math.sin(this.time * 3) * 3;
    drawSprite(ctx, sprites.ship, VIEW_W / 2 - 18, shipY, false, SHIP_SCALE);
    if (Math.floor(this.time * 20) % 2 === 0) {
      ctx.fillStyle = '#ffb04a';
      ctx.fillRect(VIEW_W / 2 - 6, shipY + 32, 4, 6);
      ctx.fillRect(VIEW_W / 2 + 2, shipY + 32, 4, 6);
    }

    for (const particle of this.particles) {
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 2);
    }

    // Dark band keeps the caption readable once the Moon fills the screen.
    ctx.fillStyle = 'rgba(4, 4, 10, 0.72)';
    ctx.fillRect(0, 6, VIEW_W, 26);
    drawText(ctx, landing > 0 ? 'pristani na mesici' : 'let na mesic', VIEW_W / 2, 12, {
      color: '#9ad8ff',
      align: 'center',
    });

    // Progress bar from Earth to Moon.
    const barWidth = 160;
    const barX = (VIEW_W - barWidth) / 2;
    ctx.fillStyle = '#20202c';
    ctx.fillRect(barX, 24, barWidth, 3);
    ctx.fillStyle = '#9ad8ff';
    ctx.fillRect(barX, 24, Math.round(barWidth * Math.min(1, travel + landing)), 3);
    drawText(ctx, 'zeme', barX - 4, 22, { color: '#6a6a80', align: 'right' });
    drawText(ctx, 'mesic', barX + barWidth + 4, 22, { color: '#6a6a80' });

    if (scene.fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${scene.fade})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    drawText(ctx, 'enter = preskocit', VIEW_W / 2, VIEW_H - 12, { color: '#6a6a80', align: 'center' });
  }

  /** Dialogue box and fade for the ending scene. */
  drawCutscene() {
    const ctx = this.ctx;
    const scene = this.cutscene;
    if (!scene) return;

    if (scene.dialog) {
      const boxWidth = 200;
      const x = (VIEW_W - boxWidth) / 2;
      ctx.fillStyle = '#0b0b16e0';
      ctx.fillRect(x, 24, boxWidth, 30);
      ctx.strokeStyle = '#9ad8ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, 24.5, boxWidth - 1, 29);

      const speaker = scene.kind === 'robot' ? 'ROBOT' : 'KOSMONAUT';
      const speakerColor = scene.kind === 'robot' ? '#ff6b6b' : '#9ad8ff';
      drawText(ctx, speaker, VIEW_W / 2, 30, { color: speakerColor, align: 'center' });
      drawText(ctx, scene.dialog, VIEW_W / 2, 42, { color: '#ffffff', align: 'center' });
    }

    if (scene.fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${scene.fade})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    drawText(ctx, 'ENTER = preskocit', VIEW_W / 2, VIEW_H - 12, { color: '#6a6a80', align: 'center' });
  }

  drawShield() {
    if (!this.power.shield) return;
    const ctx = this.ctx;
    const player = this.player;
    const cx = Math.round(player.x + player.w / 2 - this.cameraX);
    const cy = Math.round(player.y + player.h / 2);
    ctx.globalAlpha = 0.55 + Math.sin(this.time * 8) * 0.15;
    ctx.strokeStyle = '#9ad8ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Active power-ups as icons with a draining time bar. */
  drawPowerHud() {
    const ctx = this.ctx;
    const active = [];
    if (this.power.rapid > 0) active.push(['rapid', this.power.rapid / RAPID_TIME]);
    if (this.power.spread > 0) active.push(['spread', this.power.spread / SPREAD_TIME]);
    if (this.power.magnet > 0) active.push(['magnet', this.power.magnet / MAGNET_TIME]);
    if (this.power.shield) active.push(['shield', 1]);

    active.forEach(([kind, fraction], index) => {
      const x = 4 + index * 13;
      const y = 15;
      drawSprite(ctx, sprites[POWER_SPRITES[kind]], x, y);
      ctx.fillStyle = '#00000060';
      ctx.fillRect(x, y + 9, 8, 2);
      ctx.fillStyle = kind === 'shield' ? '#9ad8ff' : '#ffe14a';
      ctx.fillRect(x, y + 9, Math.max(1, Math.round(8 * fraction)), 2);
    });
  }

  drawBossHud() {
    const ctx = this.ctx;
    const boss = this.boss;
    if (!boss) return;

    const barWidth = boss.isFinal ? 180 : 120;
    const x = (VIEW_W - barWidth) / 2;
    ctx.fillStyle = '#00000080';
    ctx.fillRect(x - 2, 24, barWidth + 4, 9);
    ctx.fillStyle = '#3a1a1a';
    ctx.fillRect(x, 26, barWidth, 5);
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(x, 26, Math.max(0, Math.round((boss.hp / boss.maxHp) * barWidth)), 5);

    const label = boss.isUltra ? 'ULTRA BOSS' : (boss.isFinal ? 'HLAVNI BOSS' : 'MINI BOSS');
    drawText(ctx, label, VIEW_W / 2, 15, {
      color: boss.isFinal ? '#ff6b6b' : '#ffd24a',
      align: 'center',
    });
  }

  drawHud() {
    const ctx = this.ctx;
    for (let i = 0; i < this.lives; i++) {
      drawPixelRows(ctx, HEART, 4 + i * 9, 5, { r: '#e2445c' });
    }

    drawText(ctx, `${this.score}`, VIEW_W - 4, 4, { color: '#ffffff', align: 'right' });
    drawText(ctx, `x${this.coins}`, VIEW_W - 4, 13, { color: '#ffd24a', align: 'right' });

    this.drawPowerHud();
    this.drawBossHud();

    if (this.muteBanner > 0) {
      drawText(ctx, this.muteBannerText, VIEW_W / 2, 30, { color: '#9ad8ff', align: 'center' });
    }

    if (this.levelBanner > 0) {
      drawText(ctx, 'LEVEL 2', VIEW_W / 2, 50, { color: '#9ad8ff', align: 'center', scale: 2 });
      drawText(ctx, 'MESIC - nizka gravitace', VIEW_W / 2, 70, { color: '#9ad8ff', align: 'center' });
    }

    if (this.powerBanner > 0) {
      drawText(ctx, this.powerBannerText, VIEW_W / 2, 40 - (1.6 - this.powerBanner) * 6, {
        color: '#ffe14a',
        align: 'center',
      });
    }

    if (this.bossBanner > 0 && blink(this.time * 3)) {
      const bannerText = this.boss && this.boss.isUltra
        ? 'ULTRA BOSS!'
        : (this.boss && this.boss.isFinal ? 'HLAVNI BOSS!' : 'MINI BOSS!');
      drawText(ctx, bannerText, VIEW_W / 2, 56, {
        color: '#ff6b6b',
        align: 'center',
        scale: 2,
      });
    }
  }

  drawMenu() {
    const ctx = this.ctx;
    dim(ctx);
    const mid = VIEW_W / 2;

    drawText(ctx, 'PIXEL', mid, 18, { color: '#7ef2ff', align: 'center', scale: 3 });
    drawText(ctx, 'BLAST', mid, 42, { color: '#ffe14a', align: 'center', scale: 3 });
    drawText(ctx, `${this.playerName}   mince: ${this.shop.coins}`, mid, 68, {
      color: '#ffd24a',
      align: 'center',
    });

    MENU_ITEMS.forEach((item, index) => {
      const y = MENU_Y + index * MENU_STEP;
      const active = index === this.menuIndex;
      const color = active ? (blink(this.time) ? '#8fe08f' : '#5fa05f') : '#c8c8d8';
      // A waiting daily bonus is worth pointing at from the menu.
      const flag = item.id === 'shop' && this.shop.canClaimDaily() ? ' !' : '';
      drawText(ctx, `${active ? '> ' : '  '}${item.label}${flag}`, mid, y, {
        color,
        align: 'center',
        scale: 2,
      });
    });

    if (this.state === 'name') {
      drawText(ctx, 'zadej jmeno postavy', mid, 142, { color: '#ffe14a', align: 'center' });
    } else {
      drawText(ctx, 'sipky = vyber, enter / tap = potvrdit', mid, 142, { color: '#8a8aa0', align: 'center' });
    }

    drawText(ctx, 'X = laser, mezernik = skok (2x dvojskok)', mid, 151, {
      color: '#8a8aa0',
      align: 'center',
    });
    drawText(ctx, `M = zvuk ${this.sound.muted ? 'zapnout' : 'vypnout'}`, mid, 160, {
      color: '#8a8aa0',
      align: 'center',
    });
    if (this.best > 0) {
      drawText(ctx, `rekord: ${this.best}`, mid, 169, { color: '#a0a0c0', align: 'center' });
    }
  }

  /** Victory screen after the ultra boss: to be continued. */
  drawEnding() {
    const ctx = this.ctx;
    ctx.fillStyle = '#06060e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const mid = VIEW_W / 2;

    for (const star of this.stars) {
      ctx.globalAlpha = 0.3 + Math.sin(this.time * star.twinkle + star.x) * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(star.x % VIEW_W, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    drawText(ctx, 'ULTRA BOSS', mid, 24, { color: '#ff6b6b', align: 'center', scale: 2 });
    drawText(ctx, 'porazen!', mid, 44, { color: '#ffe14a', align: 'center', scale: 2 });

    drawText(ctx, `${this.playerName}: ${this.score} bodu`, mid, 78, { align: 'center' });
    drawText(ctx, `mince ${this.coins}   roboti ${this.kills}   bossove ${this.bossesBeaten}`, mid, 90, {
      color: '#a0a0c0',
      align: 'center',
    });

    drawText(ctx, 'pokracovani priste', mid, 118, {
      color: blink(this.time) ? '#7ef2ff' : '#3a7fa0',
      align: 'center',
      scale: 2,
    });

    drawText(ctx, 'enter / tap = menu', mid, VIEW_H - 20, { color: '#8a8aa0', align: 'center' });
  }

  /** The coin shop: rows of upgrades, wallet on top, detail of the selection. */
  drawShop() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0b0b16';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const mid = VIEW_W / 2;
    const rows = this.shopRows;

    drawText(ctx, 'OBCHOD', mid, 10, { color: '#ffe14a', align: 'center', scale: 2 });
    drawSprite(ctx, sprites.coin, mid - 34, 28);
    drawText(ctx, `${this.shop.coins}`, mid - 22, 29, { color: '#ffd24a' });

    rows.forEach((row, index) => {
      const y = SHOP_ROW_Y + index * SHOP_ROW_STEP;
      const active = index === this.shopIndex;
      const owned =
        row.id !== 'back' && row.id !== 'daily' && row.id !== 'skin_default' && this.shop.has(row.id);
      const equipped = row.skin && this.shop.skin === row.skin;

      let color = '#c8c8d8';
      if (active) color = blink(this.time) ? '#ffffff' : '#a0a0c0';
      else if (owned) color = '#7ea0a0';

      drawText(ctx, `${active ? '>' : ' '} ${row.name}`, 22, y, { color });

      if (row.id === 'back') return;
      if (row.id === 'daily') {
        const ready = this.shop.canClaimDaily();
        drawText(ctx, ready ? `+${this.shop.nextDailyReward()}` : 'zitra', VIEW_W - 22, y, {
          color: ready ? '#ffd24a' : '#7ea0a0',
          align: 'right',
        });
        return;
      }
      if (equipped) {
        drawText(ctx, 'nasazeno', VIEW_W - 22, y, { color: '#8fe08f', align: 'right' });
      } else if (owned) {
        drawText(ctx, row.skin ? 'nasadit' : 'koupeno', VIEW_W - 22, y, { color: '#8fe08f', align: 'right' });
      } else {
        const affordable = this.shop.coins >= row.price;
        drawText(ctx, `${row.price}`, VIEW_W - 22, y, { color: affordable ? '#ffd24a' : '#7a5a3a', align: 'right' });
      }
    });

    const selected = rows[this.shopIndex];
    if (selected && selected.detail) {
      drawText(ctx, selected.detail, mid, VIEW_H - 20, { color: '#8a8aa0', align: 'center' });
    }

    if (this.shopMessage) {
      drawText(ctx, this.shopMessage, mid + 40, 29, { color: this.shopMessageColor });
    }

    drawText(ctx, 'tap = koupit, R / tlacitko v rohu = zpet', mid, VIEW_H - 9, {
      color: '#6a6a80',
      align: 'center',
    });
  }

  drawPause() {
    const ctx = this.ctx;
    dim(ctx);
    const mid = VIEW_W / 2;

    drawText(ctx, 'PAUZA', mid, 34, { color: '#ffe14a', align: 'center', scale: 3 });
    drawText(ctx, `skore: ${this.score}   mince: ${this.coins}`, mid, 62, {
      color: '#a0a0c0',
      align: 'center',
    });

    PAUSE_ITEMS.forEach((item, index) => {
      const y = PAUSE_ROW_Y + index * MENU_STEP;
      const active = index === this.pauseIndex;
      const color = active ? (blink(this.time) ? '#8fe08f' : '#5fa05f') : '#c8c8d8';
      drawText(ctx, `${active ? '> ' : '  '}${item.label}`, mid, y, { color, align: 'center', scale: 2 });
    });

    drawText(ctx, 'z menu se beh nedohraje', mid, 128, { color: '#8a8aa0', align: 'center' });
    drawText(ctx, 'ESC / P / tlacitko v rohu = zpet do hry', mid, 140, {
      color: '#8a8aa0',
      align: 'center',
    });
  }

  drawLeaderboard() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0b0b16';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const mid = VIEW_W / 2;

    drawText(ctx, 'LEADERBOARD', mid, 12, { color: '#ffe14a', align: 'center', scale: 2 });

    const note =
      this.boardSource === 'cloud'
        ? 'online zebricek'
        : this.boardLoading
          ? 'nacitam online...'
          : this.cloud.enabled
            ? 'offline - jen tento telefon'
            : '';
    if (note) drawText(ctx, note, mid, 29, { color: '#6a6a80', align: 'center' });

    if (!this.board.length) {
      drawText(ctx, 'zatim zadne skore', mid, 80, { color: '#8a8aa0', align: 'center' });
    } else {
      this.board.forEach((entry, index) => {
        const y = 40 + index * 12;
        const color = entry.name === this.playerName ? '#8fe08f' : '#c8c8d8';
        drawText(ctx, `${index + 1}.`, 24, y, { color });
        drawText(ctx, entry.name, 48, y, { color });
        drawText(ctx, `lvl ${entry.level || 1}`, 176, y, { color: '#8a8aa0' });
        drawText(ctx, `${entry.score}`, VIEW_W - 24, y, { color, align: 'right' });
      });
    }

    drawText(ctx, 'enter / tap = zpet', mid, VIEW_H - 14, {
      color: blink(this.time) ? '#8fe08f' : '#4a7a4a',
      align: 'center',
    });
  }

  drawGameOver() {
    const ctx = this.ctx;
    dim(ctx);
    const mid = VIEW_W / 2;

    drawText(ctx, 'KONEC', mid, 30, { color: '#ff6b6b', align: 'center', scale: 3 });
    drawText(ctx, this.playerName, mid, 54, { color: '#ffe14a', align: 'center' });

    drawText(ctx, `skore: ${this.score}`, mid, 70, { align: 'center' });
    drawText(ctx, `mince: ${this.coins}`, mid, 80, { align: 'center' });
    drawText(ctx, `roboti: ${this.kills}`, mid, 92, { align: 'center' });
    drawText(ctx, `bossove: ${this.bossesBeaten}${this.finalBossDone ? ' + hlavni' : ''}`, mid, 104, {
      color: '#ff9a6a',
      align: 'center',
    });
    drawText(ctx, `level: ${this.levelIndex}${this.levelIndex === 2 ? ' (mesic)' : ''}`, mid, 116, {
      align: 'center',
    });
    drawText(ctx, `rekord: ${this.best}`, mid, 132, { color: '#ffd24a', align: 'center' });

    drawText(ctx, 'r / tap = znovu', mid, 148, {
      color: blink(this.time) ? '#8fe08f' : '#4a7a4a',
      align: 'center',
    });
    drawText(ctx, 'sipka nahoru/dolu = menu', mid, 160, { color: '#8a8aa0', align: 'center' });
  }
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(10, 10, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function blink(time) {
  return Math.floor(time * 2) % 2 === 0;
}

function mod(value, m) {
  return ((value % m) + m) % m;
}

function drawPixelRows(ctx, rows, x, y, palette) {
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      const ch = rows[row][col];
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}

/** Star field for the moon sky: fixed positions, gentle twinkle. */
function makeStars() {
  return Array.from({ length: 70 }, (_, i) => ({
    x: (i * 61) % (VIEW_W + 8),
    y: (i * 37) % 110,
    size: i % 7 === 0 ? 2 : 1,
    twinkle: 1.5 + (i % 5) * 0.6,
  }));
}

function loadBoard() {
  try {
    const raw = JSON.parse(localStorage.getItem(BOARD_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((entry) => entry && typeof entry.score === 'number') : [];
  } catch {
    return []; // corrupted storage should never block the game
  }
}

function saveBoard(board) {
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(board));
  } catch {
    // storage full or blocked - the run simply is not recorded
  }
}
