// Keyboard + touch input. Exposes held state plus edge-triggered presses.

const KEY_MAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  ArrowDown: 'menuDown',
  KeyS: 'menuDown',
  Space: 'jump',
  KeyX: 'shoot',
  KeyK: 'shoot',
  KeyJ: 'shoot',
  KeyM: 'mute',
  Enter: 'start',
  KeyR: 'restart',
};

/**
 * True while the event went to a text field. The game maps plain letters (A, D,
 * W, S, X, M, R...) to actions and swallows them, which would make those letters
 * impossible to type into the name field.
 */
function isTyping(event) {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest('input, textarea, [contenteditable="true"]'));
}

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.touchUsed = false;
    this.tap = null; // last tap in canvas pixels, consumed once per frame

    window.addEventListener('keydown', (event) => {
      if (isTyping(event)) return;
      // Arrow up doubles as menu navigation; the game decides which it means.
      if (event.code === 'ArrowUp' || event.code === 'KeyW') this.pressed.add('menuUp');
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    });

    window.addEventListener('keyup', (event) => {
      if (isTyping(event)) return;
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      this.held.delete(action);
    });

    window.addEventListener('blur', () => this.held.clear());
  }

  /** Wire the on-screen buttons; also reveals them once a touch is detected. */
  bindTouch(root) {
    const buttons = root.querySelectorAll('[data-key]');
    for (const button of buttons) {
      const action = button.dataset.key;
      const down = (event) => {
        event.preventDefault();
        this.touchUsed = true;
        if (!this.held.has(action)) this.pressed.add(action);
        this.held.add(action);
      };
      const up = (event) => {
        event.preventDefault();
        this.held.delete(action);
      };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('pointerleave', up);
    }

    // A tap anywhere else counts as start/restart, so menus work without buttons.
    window.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-key]')) return;
      // Tapping the name overlay must not count as "start" for the menu behind it.
      if (target instanceof Element && target.closest('#name-overlay')) return;
      this.touchUsed = true;
      this.pressed.add('start');
    });
  }

  isDown(action) {
    return this.held.has(action);
  }

  wasPressed(action) {
    return this.pressed.has(action);
  }

  /** Call once per frame, after the frame consumed its edge triggers. */
  endFrame() {
    this.pressed.clear();
    this.tap = null;
  }
}
