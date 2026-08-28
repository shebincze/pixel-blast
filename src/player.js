import { sprites, drawSprite } from './sprites.js?v=5739d7e2';
import { VIEW_H } from './level.js?v=5739d7e2';

const GRAVITY = 900;
const MAX_FALL = 340;
const MOVE_SPEED = 92;
const ACCELERATION = 800;
const GROUND_FRICTION = 900;
const AIR_FRICTION = 300;
const JUMP_VELOCITY = -272;
const DOUBLE_JUMP_VELOCITY = -230;
const JUMP_CUTOFF = 0.45; // upward velocity kept when the jump key is released
const COYOTE_TIME = 0.09;
const JUMP_BUFFER = 0.12;
const HURT_INVULN = 1.2;

export class Player {
  constructor(x, y) {
    this.reset(x, y);
  }

  reset(x, y) {
    // Gravity scale survives a reset: it belongs to the level, not the life.
    if (this.gravityScale === undefined) this.gravityScale = 1;
    // So does the shop's speed upgrade: it belongs to the run.
    if (this.speedScale === undefined) this.speedScale = 1;
    this.x = x;
    this.y = y;
    this.w = 8;
    this.h = 14;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facingLeft = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.canDoubleJump = false;
    this.animTime = 0;
    this.invuln = 0;
    this.jumped = 0; // 1 = ground jump, 2 = double jump, read and cleared by Game
  }

  get hitbox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt, input, level) {
    const left = input.isDown('left');
    const right = input.isDown('right');
    const direction = (right ? 1 : 0) - (left ? 1 : 0);

    if (direction !== 0) {
      const top = MOVE_SPEED * this.speedScale;
      this.vx += direction * ACCELERATION * this.speedScale * dt;
      this.vx = Math.max(-top, Math.min(top, this.vx));
      this.facingLeft = direction < 0;
    } else {
      const friction = (this.onGround ? GROUND_FRICTION : AIR_FRICTION) * dt;
      if (Math.abs(this.vx) <= friction) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * friction;
    }

    if (input.wasPressed('jump')) this.jumpBuffer = JUMP_BUFFER;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    if (this.jumpBuffer > 0) {
      if (this.onGround || this.coyote > 0) {
        this.vy = JUMP_VELOCITY;
        this.onGround = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.canDoubleJump = true;
        this.jumped = 1;
      } else if (this.canDoubleJump) {
        this.vy = DOUBLE_JUMP_VELOCITY;
        this.jumpBuffer = 0;
        this.canDoubleJump = false;
        this.jumped = 2;
      }
    }

    // Releasing jump early cuts the rise, giving variable jump height.
    if (!input.isDown('jump') && this.vy < 0) this.vy *= 1 - (1 - JUMP_CUTOFF) * Math.min(1, dt * 30);

    this.vy = Math.min(MAX_FALL * this.gravityScale, this.vy + GRAVITY * this.gravityScale * dt);

    this.moveAndCollide(dt, level);

    this.animTime += dt;
  }

  moveAndCollide(dt, level) {
    const wasOnGround = this.onGround;
    const margin = 40;
    const solids = level.solidsInRange(this.x - margin, this.x + this.w + margin);

    this.x += this.vx * dt;
    for (const solid of solids) {
      if (!overlaps(this, solid)) continue;
      if (this.vx > 0) this.x = solid.x - this.w;
      else if (this.vx < 0) this.x = solid.x + solid.w;
      this.vx = 0;
    }

    this.onGround = false;
    this.y += this.vy * dt;
    for (const solid of solids) {
      if (!overlaps(this, solid)) continue;
      if (this.vy > 0) {
        this.y = solid.y - this.h;
        this.onGround = true;
      } else if (this.vy < 0) {
        this.y = solid.y + solid.h;
      }
      this.vy = 0;
    }

    if (this.onGround) {
      this.coyote = COYOTE_TIME;
      this.canDoubleJump = true;
    } else if (wasOnGround && this.vy >= 0) {
      this.coyote = COYOTE_TIME;
    }
  }

  fellOutOfWorld() {
    return this.y > VIEW_H + 24;
  }

  hurt() {
    if (this.invuln > 0) return false;
    this.invuln = HURT_INVULN;
    return true;
  }

  currentSprite() {
    if (!this.onGround) return this.vy < 0 ? sprites.playerJump : sprites.playerFall;
    if (Math.abs(this.vx) > 8) {
      return Math.floor(this.animTime * 10) % 2 === 0 ? sprites.playerRunA : sprites.playerRunB;
    }
    return sprites.playerIdle;
  }

  draw(ctx, cameraX) {
    // Blink while invulnerable after a hit.
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;
    const sprite = this.currentSprite();
    const screenX = this.x - cameraX - 1;
    drawSprite(ctx, sprite, screenX, this.y, this.facingLeft);
    // Pistol is drawn on top so it stays in the hand across all animation frames.
    const gunX = this.facingLeft ? screenX - 3 : screenX + 8;
    drawSprite(ctx, sprites.pistol, gunX, this.y + 8, this.facingLeft);
  }
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
