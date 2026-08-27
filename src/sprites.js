// Pixel sprites defined inline so the game needs no external assets.
// '.' is transparent, every other character maps to a palette color.

const PALETTE = {
  h: '#6b3f1e', // hair
  s: '#f0c090', // skin
  e: '#1a1a26', // eyes
  b: '#3aa0e0', // shirt
  p: '#2b3a67', // pants
  o: '#e05a3a', // shoes
  k: '#8a8aa0', // stone / metal
  d: '#5a5a70', // stone shade
  w: '#8b5a2b', // wood
  W: '#6b4420', // wood shade
  y: '#ffd24a', // coin
  Y: '#e0a020', // coin shade
  r: '#e2445c', // enemy body / heart
  R: '#8f2f3f', // enemy shade
  n: '#1a1a26', // outline
  g: '#4cc26a', // leaf
  c: '#7ef2ff', // laser core
  C: '#2ab4d8', // laser glow
  m: '#b8c0d0', // metal
  M: '#6f7889', // metal shade
  v: '#ff6a3a', // enemy eye / lens
  z: '#ffe14a', // power-up gold
  Z: '#c98f18', // power-up gold shade
  i: '#9ad8ff', // shield light
  I: '#3a7fd0', // shield dark
  P: '#b46ce0', // magnet body
  G: '#2f8a48', // alien shell shade
  d: '#3a3a48', // dark armour
  D: '#22222c', // dark armour shade
};

const PLAYER_IDLE = [
  '...hhhh...',
  '..hhhhhh..',
  '..hssssh..',
  '..sesses..',
  '..ssssss..',
  '...ssss...',
  '..bbbbbb..',
  '.sbbbbbbs.',
  '.sbbbbbbs.',
  '..bbbbbb..',
  '..pppppp..',
  '..pp..pp..',
  '..pp..pp..',
  '.oo...oo..',
];

const PLAYER_RUN_A = [
  '...hhhh...',
  '..hhhhhh..',
  '..hssssh..',
  '..sesses..',
  '..ssssss..',
  '...ssss...',
  '..bbbbbb..',
  'sbbbbbbb..',
  '.bbbbbbbs.',
  '..bbbbbb..',
  '..pppppp..',
  '.ppp..pp..',
  '.pp....pp.',
  'oo......oo',
];

const PLAYER_RUN_B = [
  '..........',
  '...hhhh...',
  '..hhhhhh..',
  '..hssssh..',
  '..sesses..',
  '..ssssss..',
  '...ssss...',
  '..bbbbbb..',
  '.sbbbbbbs.',
  '..bbbbbb..',
  '..pppppp..',
  '..pppppp..',
  '...pppp...',
  '..oo..oo..',
];

const PLAYER_JUMP = [
  's..hhhh..s',
  '.shhhhhhs.',
  '..hssssh..',
  '..sesses..',
  '..ssssss..',
  '...ssss...',
  '..bbbbbb..',
  '.bbbbbbbb.',
  '.bbbbbbbb.',
  '..bbbbbb..',
  '..pppppp..',
  '.pp....pp.',
  '.pp....pp.',
  'oo......oo',
];

const PLAYER_FALL = [
  '...hhhh...',
  '..hhhhhh..',
  '..hssssh..',
  '..sesses..',
  '..ssssss..',
  '...ssss...',
  '..bbbbbb..',
  '.sbbbbbbs.',
  '.sbbbbbbs.',
  '..bbbbbb..',
  '..pppppp..',
  '..pp..pp..',
  '.pp....pp.',
  'oo......oo',
];

// Laser pistol, drawn over the player's hand.
const PISTOL = [
  '.mmmm',
  'mmmmC',
  'Mm...',
];

const LASER = [
  '.CccccC.',
  'CccccccC',
  '.CccccC.',
];

// Ground enemy: a stubby patrolling robot, two frames of leg animation.
const WALKER_A = [
  '..mmmmmm..',
  '.mMMMMMMm.',
  '.mMvvvvMm.',
  '.mMvMMvMm.',
  '.mMMMMMMm.',
  '.mmmmmmmm.',
  '..MmmmmM..',
  '..m....m..',
  '.mm....mm.',
  'MM......MM',
];

const WALKER_B = [
  '..........',
  '..mmmmmm..',
  '.mMMMMMMm.',
  '.mMvvvvMm.',
  '.mMvMMvMm.',
  '.mMMMMMMm.',
  '.mmmmmmmm.',
  '..MmmmmM..',
  '...mmmm...',
  '..MM..MM..',
];

// Mini boss: an armored hover drone with side cannons.

const BOSS_A = [
  '......mmmmmmmm......',
  '....mmMMMMMMMMmm....',
  '...mMMMMMMMMMMMMm...',
  '...mMMvvvvvvvvMMm...',
  '...mMvvvccccvvvMm...',
  '...mMMvvvvvvvvMMm...',
  '...mMMMMMMMMMMMMm...',
  '..MMmMMMMMMMMMMmMM..',
  '..MMmMMMMMMMMMMmMM..',
  '...mmMMMMMMMMMMmm...',
  '...mmmMMMMMMMMmmm...',
  '...mmmmMMMMMMmmmm...',
  '.....mmmm..mmmm.....',
  '.....cc......cc.....',
];

const BOSS_B = [
  '......mmmmmmmm......',
  '....mmMMMMMMMMmm....',
  '...mMMMMMMMMMMMMm...',
  '...mMMvvvvvvvvMMm...',
  '...mMvvvCCCCvvvMm...',
  '...mMMvvvvvvvvMMm...',
  '...mMMMMMMMMMMMMm...',
  '..MMmMMMMMMMMMMmMM..',
  '..MMmMMMMMMMMMMmMM..',
  '...mmMMMMMMMMMMmm...',
  '...mmmMMMMMMMMmmm...',
  '...mmmmMMMMMMmmmm...',
  '.....mmmm..mmmm.....',
  '.....Cc......cC.....',
];

// Power-up pickups: rapid fire, spread shot, coin magnet, shield.
const POWER_RAPID = [
  '..ZzzZ..',
  '.ZzzZ...',
  'Zzzz....',
  'ZzzzzzZ.',
  '.ZzzzzZ.',
  '...zzZ..',
  '..zzZ...',
  '..zZ....',
];

const POWER_SPREAD = [
  '.C....C.',
  '..C..C..',
  '...cc...',
  'ccccccc.',
  '...cc...',
  '..C..C..',
  '.C....C.',
  '........',
];

const POWER_MAGNET = [
  '.PP..PP.',
  'PMMPPMMP',
  'PMP..PMP',
  'PMP..PMP',
  'PMMPPMMP',
  '.mm..mm.',
  '.cc..cc.',
  '........',
];

const POWER_SHIELD = [
  '.iiiiii.',
  'iIIIIIIi',
  'iIiiiiIi',
  'iIicciIi',
  'iIicciIi',
  '.IicciI.',
  '..IiiI..',
  '...II...',
];

// Heart pickup dropped by a defeated boss.
const HEART_PICKUP = [
  '.RR.RR.',
  'RrrRrrR',
  'RrrrrrR',
  '.RrrrR.',
  '..RrR..',
  '...R...',
];

// Plasma shot the boss fires back at the player.

const BOSS_SHOT = [
  '.rrrr.',
  'rrvvrr',
  'rvvvvr',
  'rvvvvr',
  'rrvvrr',
  '.rrrr.',
];

// Level-one final boss: a huge war mech, two animation frames.

const FINAL_BOSS_A = [
  '............vvvv............',
  '..........mmvvvvmm..........',
  '........mmMMMMMMMMmm........',
  '.......mMMMMMMMMMMMMm.......',
  '.......mMMvvvvvvvvMMm.......',
  '.......mMvvccccccvvMm.......',
  '.......mMvvccccccvvMm.......',
  '.......mMMvvvvvvvvMMm.......',
  '.......mMMMMMMMMMMMMm.......',
  '......MMmMMMMMMMMMMmMM......',
  '......MMmMMMMMMMMMMmMM......',
  '......MMmmMMMMMMMMmmMM......',
  '......mmMMMMMMMMMMMMmm......',
  '......mMMMMMMMMMMMMMMm......',
  '......mmMMMMMMMMMMMMmm......',
  '......rrmmMMMMMMMMmmrr......',
  '......rrrmmMMMMMMmmrrr......',
  '......mmmmMMMMMMMMmmmm......',
  '......mmmm..mmmm..mmmm......',
  '.......cc..cc..cc..cc.......',
];

const FINAL_BOSS_B = [
  '............cccc............',
  '..........mmccccmm..........',
  '........mmMMMMMMMMmm........',
  '.......mMMMMMMMMMMMMm.......',
  '.......mMMccccccccMMm.......',
  '.......mMccvvvvvvccMm.......',
  '.......mMccvvvvvvccMm.......',
  '.......mMMccccccccMMm.......',
  '.......mMMMMMMMMMMMMm.......',
  '......MMmMMMMMMMMMMmMM......',
  '......MMmMMMMMMMMMMmMM......',
  '......MMmmMMMMMMMMmmMM......',
  '......mmMMMMMMMMMMMMmm......',
  '......mMMMMMMMMMMMMMMm......',
  '......mmMMMMMMMMMMMMmm......',
  '......rrmmMMMMMMMMmmrr......',
  '......rrrmmMMMMMMmmrrr......',
  '......mmmmMMMMMMMMmmmm......',
  '.......mmm..mmmm..mm........',
  '.......Cc..Cc..cC..cC.......',
];

// Ending cutscene: the rescue rocket and the astronaut who steps out of it.

const SHIP = [
  '........mm........',
  '.......mmmm.......',
  '......mMMMMm......',
  '......mMIIMm......',
  '......mMiiMm......',
  '......mMIIMm......',
  '......mMMMMm......',
  '.....mMMMMMMm.....',
  '.....mMMMMMMm.....',
  '.....mMMMMMMm.....',
  '.....mMMMMMMm.....',
  '.....rMMMMMMr.....',
  '.....rrMMMMrr.....',
  '.....rrmMMmrr.....',
  '.....rrrmmrrr.....',
  '.......mmmm.......',
];

const ASTRONAUT = [
  '...mmmm...',
  '..mmmmmm..',
  '..mIIIIm..',
  '..mIiiIm..',
  '..mIIIIm..',
  '..mmmmmm..',
  '.mmmmmmmm.',
  '.mmMMMMmm.',
  '.mmMMMMmm.',
  '.mmmmmmmm.',
  '..mm..mm..',
  '..mm..mm..',
  '..MM..MM..',
];

// Opening scene props: bed, bedside table and Honzik asleep.

const BED = [
  'ww..........................',
  'ww..........................',
  'wwmmmmiiiiiiiiiiiiiiiiiiii..',
  'wwmmmmIIIIIIIIIIIIIIIIIIII..',
  'wwiiiiiiiiiiiiiiiiiiiiiiii..',
  'wwIIIIIIIIIIIIIIIIIIIIIIII..',
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'WwwwwwwwwwwwwwwwwwwwwwwwwwwW',
  'WW........................WW',
  'WW........................WW',
  'WW........................WW',
  'WW........................WW',
];

const TABLE = [
  'wwwwwwwwwwwwww',
  'WWWWWWWWWWWWWW',
  '.WW........WW.',
  '.WW........WW.',
  '.WW........WW.',
  '.WW........WW.',
  '.WW........WW.',
  '.WW........WW.',
  '.WW........WW.',
];

const PLAYER_SLEEP = [
  '...hhhh.....',
  '..hhhhhh....',
  '..hssssh....',
  '..seeses....',
  '..ssssss....',
  '...ssss.....',
];

// Moon variants of the enemies: alien shells instead of earth robots.

const MOON_WALKER_A = [
  '...gggggg...',
  '..gGGGGGGg..',
  '.gGGvvvvGGg.',
  '.gGvvrrvvGg.',
  '.gGGvvvvGGg.',
  '..gGGGGGGg..',
  '...PgggggP..',
  '...P....P...',
  '..PP....PP..',
  '.PP......PP.',
];

const MOON_WALKER_B = [
  '............',
  '...gggggg...',
  '..gGGGGGGg..',
  '.gGGvvvvGGg.',
  '.gGvvrrvvGg.',
  '.gGGvvvvGGg.',
  '..gGGGGGGg..',
  '...PgggggP..',
  '....PPPP....',
  '...PP..PP...',
];

const MOON_FLYER_A = [
  '...P....P...',
  '...PP..PP...',
  '..gggggggg..',
  '.gGgvvvvgGg.',
  '..ggrggrgg..',
  '...gggggg...',
  '....PPPP....',
  '.....PP.....',
];

const MOON_FLYER_B = [
  '............',
  '.PP......PP.',
  '..gggggggg..',
  '.gGgvvvvgGg.',
  '..ggrggrgg..',
  '..gggggggg..',
  '...PPPPPP...',
  '.....PP.....',
];

// The robot that gatecrashes the ending, and the ultra boss it unleashes.

const ROBOT = [
  '..mmmm..',
  '.mMMMMm.',
  'mMrrrrMm',
  'mMrvvrMm',
  'mMrrrrMm',
  '.mMMMMm.',
  '...mm...',
  'mmmmmmmm',
  'mMMMMMMm',
  'mMrrrrMm',
  'mMMMMMMm',
  'mmmmmmmm',
  '.mm..mm.',
  '.mm..mm.',
  'MMM..MMM',
];

const ULTRA_BOSS_A = [
  '......rrrr......',
  '.....rvvvvr.....',
  '....ddrrrrdd....',
  '...dDDDDDDDDd...',
  '..dDDrrrrrrDDd..',
  '..dDrrvvvvrrDd..',
  '..dDrvvrrvvrDd..',
  '..dDrrvvvvrrDd..',
  '..dDDrrrrrrDDd..',
  '..ddDDDDDDDDdd..',
  '.rrddDDDDDDddrr.',
  '.rrrddDDDDddrrr.',
  '.ddDDDDDDDDDDdd.',
  '.dDDDDrrrrDDDDd.',
  '.dDDDrvvvvrDDDd.',
  '.dDDDDrrrrDDDDd.',
  '.ddDDDDDDDDDDdd.',
  '.rrddDDDDDDddrr.',
  '..ddddDDDDdddd..',
  '..dd..dddd..dd..',
  '..rr..rrrr..rr..',
];

const ULTRA_BOSS_B = [
  '......vvvv......',
  '.....vrrrrv.....',
  '....ddvvvvdd....',
  '...dDDDDDDDDd...',
  '..dDDvvvvvvDDd..',
  '..dDvvrrrrvvDd..',
  '..dDvrrvvrrvDd..',
  '..dDvvrrrrvvDd..',
  '..dDDvvvvvvDDd..',
  '..ddDDDDDDDDdd..',
  '.vvddDDDDDDddvv.',
  '.vvvddDDDDddvvv.',
  '.ddDDDDDDDDDDdd.',
  '.dDDDDvvvvDDDDd.',
  '.dDDDvrrrrvDDDd.',
  '.dDDDDvvvvDDDDd.',
  '.ddDDDDDDDDDDdd.',
  '.vvddDDDDDDddvv.',
  '..ddddDDDDdddd..',
  '..dd..dddd..dd..',
  '..vv..vvvv..vv..',
];

// Moon bosses: alien pods instead of earth machines.

const MOON_BOSS_A = [
  '.......gggggg.......',
  '......gGGGGGGg......',
  '.....gGvvvvvvGg.....',
  '.....gGvrrrrvGg.....',
  '.....gGvvvvvvGg.....',
  '......gGGGGGGg......',
  '.....P.gggggg.P.....',
  '.....PP.PPPP.PP.....',
  '......PP....PP......',
  '.......P....P.......',
];

const MOON_BOSS_B = [
  '.......gggggg.......',
  '......gGGGGGGg......',
  '.....gGvvvvvvGg.....',
  '.....gGrrvvrrGg.....',
  '.....gGvvvvvvGg.....',
  '......gGGGGGGg......',
  '.......gggggg.......',
  '.....P..PPPP..P.....',
  '.....PP.P..P.PP.....',
  '......P......P......',
];

const MOON_FINAL_A = [
  '............gggg............',
  '...........gGGGGg...........',
  '..........ggvvvvgg..........',
  '.........gGGGGGGGGg.........',
  '........gGGvvvvvvGGg........',
  '........gGvvrrrrvvGg........',
  '........gGvrrvvrrvGg........',
  '........gGvvrrrrvvGg........',
  '........gGGvvvvvvGGg........',
  '........ggGGGGGGGGgg........',
  '.......PPggGGGGGGggPP.......',
  '.......PPPggGGGGggPPP.......',
  '.......ggGGGGGGGGGGgg.......',
  '.......gGGGGvvvvGGGGg.......',
  '.......gGGGvrrrrvGGGg.......',
  '.......gGGGGvvvvGGGGg.......',
  '.......ggGGGGGGGGGGgg.......',
  '.......PPggGGGGGGggPP.......',
  '........PPPPGGGGPPPP........',
  '........PP..PPPP..PP........',
];

const MOON_FINAL_B = [
  '............vvvv............',
  '...........vggggv...........',
  '..........ggrrrrgg..........',
  '.........gGGGGGGGGg.........',
  '........gGGrrrrrrGGg........',
  '........gGrrvvvvrrGg........',
  '........gGrvvrrvvrGg........',
  '........gGrrvvvvrrGg........',
  '........gGGrrrrrrGGg........',
  '........ggGGGGGGGGgg........',
  '.......PPggGGGGGGggPP.......',
  '.......PPPggGGGGggPPP.......',
  '.......ggGGGGGGGGGGgg.......',
  '.......gGGGGrrrrGGGGg.......',
  '.......gGGGrvvvvrGGGg.......',
  '.......gGGGGrrrrGGGGg.......',
  '.......ggGGGGGGGGGGgg.......',
  '.......PPggGGGGGGggPP.......',
  '........PPPPGGGGPPPP........',
  '........vv..vvvv..vv........',
];

const SPIKE = [
  '...nn...',
  '..nkkn..',
  '..nkkn..',
  '.nkkkkn.',
  '.nkkddn.',
  'nkkdddn.',
  'nkddddn.',
  'nnnnnnnn',
];

const CRATE = [
  'WWWWWWWW',
  'WwwwwwwW',
  'WwWwwWwW',
  'WwwWWwwW',
  'WwwWWwwW',
  'WwWwwWwW',
  'WwwwwwwW',
  'WWWWWWWW',
];

const COIN = [
  '..yyyy..',
  '.yyyyyy.',
  'yyYYYYyy',
  'yyYyyYyy',
  'yyYyyYyy',
  'yyYYYYyy',
  '.yyyyyy.',
  '..yyyy..',
];

const FLYER_A = [
  '..r....r..',
  '..rr..rr..',
  '.rrrrrrrr.',
  'rrRrrrrRrr',
  '.rrnrrnrr.',
  '..rrrrrr..',
  '...RRRR...',
  '....rr....',
];

const FLYER_B = [
  '..........',
  '..........',
  'rr......rr',
  '.rrrrrrrr.',
  'rrRnrrnRrr',
  '.rrrrrrrr.',
  '..RRRRRR..',
  '....rr....',
];

/** Rasterize a string-rows sprite into an offscreen canvas (1 char = 1 pixel). */
function bake(rows) {
  const w = rows[0].length;
  const h = rows.length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      const color = PALETTE[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** Horizontally mirrored copy, so sprites can face left without per-draw transforms. */
function mirror(canvas) {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(canvas, 0, 0);
  return out;
}

function pair(rows) {
  const right = bake(rows);
  return { right, left: mirror(right), w: right.width, h: right.height };
}

export const sprites = {
  playerIdle: pair(PLAYER_IDLE),
  playerRunA: pair(PLAYER_RUN_A),
  playerRunB: pair(PLAYER_RUN_B),
  playerJump: pair(PLAYER_JUMP),
  playerFall: pair(PLAYER_FALL),
  spike: pair(SPIKE),
  crate: pair(CRATE),
  coin: pair(COIN),
  flyerA: pair(FLYER_A),
  flyerB: pair(FLYER_B),
  pistol: pair(PISTOL),
  laser: pair(LASER),
  walkerA: pair(WALKER_A),
  walkerB: pair(WALKER_B),
  bossA: pair(BOSS_A),
  bossB: pair(BOSS_B),
  bossShot: pair(BOSS_SHOT),
  heart: pair(HEART_PICKUP),
  powerRapid: pair(POWER_RAPID),
  powerSpread: pair(POWER_SPREAD),
  powerMagnet: pair(POWER_MAGNET),
  powerShield: pair(POWER_SHIELD),
  finalBossA: pair(FINAL_BOSS_A),
  finalBossB: pair(FINAL_BOSS_B),
  ship: pair(SHIP),
  astronaut: pair(ASTRONAUT),
  bed: pair(BED),
  table: pair(TABLE),
  playerSleep: pair(PLAYER_SLEEP),
  moonWalkerA: pair(MOON_WALKER_A),
  moonWalkerB: pair(MOON_WALKER_B),
  moonFlyerA: pair(MOON_FLYER_A),
  moonFlyerB: pair(MOON_FLYER_B),
  moonBossA: pair(MOON_BOSS_A),
  moonBossB: pair(MOON_BOSS_B),
  moonFinalA: pair(MOON_FINAL_A),
  moonFinalB: pair(MOON_FINAL_B),
  robot: pair(ROBOT),
  ultraBossA: pair(ULTRA_BOSS_A),
  ultraBossB: pair(ULTRA_BOSS_B),
};

// Tinted copies are baked once per (sprite, color) and reused, so a hit flash
// follows the sprite's real silhouette instead of a rectangle.
const tintCache = new WeakMap();

function tinted(canvas, color) {
  let byColor = tintCache.get(canvas);
  if (!byColor) {
    byColor = new Map();
    tintCache.set(canvas, byColor);
  }
  let out = byColor.get(color);
  if (!out) {
    out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, out.width, out.height);
    byColor.set(color, out);
  }
  return out;
}

/** Draw the sprite's silhouette in a flat color — used for damage flashes. */
export function drawSpriteTinted(ctx, sprite, x, y, facingLeft, color, alpha = 1, scale = 1) {
  const source = facingLeft ? sprite.left : sprite.right;
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    tinted(source, color),
    Math.round(x), Math.round(y),
    source.width * scale, source.height * scale,
  );
  ctx.globalAlpha = previous;
}

/** Draw a sprite pair at integer pixel coords, optionally facing left. */
export function drawSprite(ctx, sprite, x, y, facingLeft = false, scale = 1) {
  const source = facingLeft ? sprite.left : sprite.right;
  if (scale === 1) {
    ctx.drawImage(source, Math.round(x), Math.round(y));
    return;
  }
  // Whole-number scaling only, so the pixels stay square.
  ctx.drawImage(source, Math.round(x), Math.round(y), source.width * scale, source.height * scale);
}
