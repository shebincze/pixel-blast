import { Game } from './game.js?v=34485ecb';
import { Input } from './input.js?v=34485ecb';
import { Sound } from './audio.js?v=34485ecb';
import { VIEW_W, VIEW_H, setViewWidth } from './level.js?v=34485ecb';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const input = new Input();
input.bindTouch(document.getElementById('touch'));

const sound = new Sound();
const game = new Game(ctx, input, sound);

// Audio can only start from a user gesture.
const unlock = () => sound.unlock();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);

// Taps on the canvas are reported in game pixels so menus can be touched.
canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  input.tap = {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
});

// Typing a name needs a real input field, so the mobile keyboard shows up.
const nameOverlay = document.getElementById('name-overlay');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');

nameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  game.setPlayerName(nameInput.value);
});

// Some soft keyboards send Enter without triggering implicit form submission.
nameInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  nameForm.requestSubmit();
});

function syncNameOverlay() {
  const wanted = game.state === 'name';
  const shown = !nameOverlay.classList.contains('hidden');
  if (wanted === shown) return;
  nameOverlay.classList.toggle('hidden', !wanted);
  if (wanted) {
    nameInput.value = game.playerName === 'HRAC' ? '' : game.playerName;
    nameInput.focus();
    nameInput.select();
  } else {
    nameInput.blur();
  }
}

// Debug handle: lets the console inspect or drive the running game.
window.game = game;

// ?level=2 or ?level=3 jumps straight into a later level. Handy for trying the
// Moon or the cave without replaying everything before them.
const wantedLevel = Number(new URLSearchParams(location.search).get('level'));
if (wantedLevel === 2 || wantedLevel === 3) {
  game.hasName = true;
  if (wantedLevel === 2) game.startLevel2();
  else game.startLevel3();
}

/** Size the canvas so the picture fills the screen without stretching pixels. */
function fit() {
  // In portrait the buttons need their own strip; in landscape they sit in the
  // corners and may overlap the canvas, so the game keeps the whole screen.
  const portrait = window.innerHeight > window.innerWidth;
  const controlsHeight = document.body.classList.contains('touch') && portrait
    ? Math.min(220, window.innerHeight * 0.34)
    : 0;
  const availableWidth = window.innerWidth;
  const availableHeight = Math.max(120, window.innerHeight - controlsHeight);

  // Height sets the scale and the width follows the aspect ratio, so a phone
  // gets a full-bleed picture. When the width clamp kicks in (tall screens),
  // fall back to fitting the width so nothing overflows.
  let scale = availableHeight / VIEW_H;
  const logicalWidth = setViewWidth(availableWidth / scale);
  if (logicalWidth * scale > availableWidth) scale = availableWidth / logicalWidth;

  canvas.width = logicalWidth;
  canvas.height = VIEW_H;
  ctx.imageSmoothingEnabled = false;

  canvas.style.width = `${Math.round(logicalWidth * scale)}px`;
  canvas.style.height = `${Math.round(VIEW_H * scale)}px`;
}

function enableTouchControls() {
  document.body.classList.add('touch');
  document.getElementById('touch').classList.remove('hidden');
  fit();
}

window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 100));

if (matchMedia('(pointer: coarse)').matches) enableTouchControls();
window.addEventListener('touchstart', enableTouchControls, { once: true, passive: true });

fit();

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
let previous = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);

  let elapsed = (now - previous) / 1000;
  previous = now;
  if (elapsed > MAX_FRAME) elapsed = MAX_FRAME; // skip time lost to tab switches
  accumulator += elapsed;

  // Fixed timestep keeps the physics identical on 60 Hz and 120 Hz screens.
  while (accumulator >= STEP) {
    game.update(STEP);
    input.endFrame();
    accumulator -= STEP;
  }

  game.draw();
  syncNameOverlay();
}

requestAnimationFrame(frame);
