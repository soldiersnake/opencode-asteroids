'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz (asteroide especial) ───────────────────────────────────────
class ShootingStar {
  constructor() {
    // Aparece en un borde aleatorio, cruza el campo en diagonal
    const side  = randInt(0, 3);
    const angle = rand(-0.5, 0.5);
    const speed = rand(160, 240);

    if (side === 0) { this.x = 0;   this.y = rand(0, H); this.angle = angle; }
    if (side === 1) { this.x = W;   this.y = rand(0, H); this.angle = Math.PI + angle; }
    if (side === 2) { this.y = 0;   this.x = rand(0, W); this.angle = Math.PI / 2 + angle; }
    if (side === 3) { this.y = H;   this.x = rand(0, W); this.angle = -Math.PI / 2 + angle; }

    this.vx     = Math.cos(this.angle) * speed;
    this.vy     = Math.sin(this.angle) * speed;
    this.radius = 12;
    this.ttl    = 7;
    this.dead   = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea en su último segundo de vida
    if (this.ttl < 1 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Cola: trazo desvanecido opuesto a la velocidad
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-this.vx * 0.09, -this.vy * 0.09);
    ctx.stroke();

    // Cabeza brillante
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
// Cada skin define silueta (path), color de trazo, color de la llama,
// escala de la nave (scale) y multiplicador de puntos (mult)
const SKINS = [
  {
    name: 'CLÁSICA',
    stroke: '#fff',
    flame: 'rgba(255, 130, 0, 0.85)',
    path: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    lifePath: [[9, 0], [-6, -5], [-3, 0], [-6, 5]],
    scale: 1,
    mult: 1,
  },
  {
    name: 'ROJA',
    stroke: '#ff4d4d',
    flame: 'rgba(255, 80, 80, 0.9)',
    path: [[22, 0], [-14, -10], [-6, 0], [-14, 10]],
    lifePath: [[9, 0], [-6, -5], [-3, 0], [-6, 5]],
    scale: 1,
    mult: 1,
  },
  {
    name: 'AZUL',
    stroke: '#4dd2ff',
    flame: 'rgba(80, 200, 255, 0.9)',
    path: [[22, 0], [-10, -11], [-4, -3], [-4, 3], [-10, 11]],
    lifePath: [[9, 0], [-5, -6], [-2, 0], [-5, 6]],
    scale: 1,
    mult: 1,
  },
  {
    name: 'VERDE',
    stroke: '#5dff5d',
    flame: 'rgba(180, 255, 80, 0.9)',
    path: [[18, 0], [-12, -8], [-12, 0], [-12, 8]],
    lifePath: [[8, 0], [-5, -4], [-3, 0], [-5, 4]],
    scale: 1,
    mult: 1,
  },
  {
    name: 'MORADA',
    stroke: '#b366ff',
    flame: 'rgba(190, 110, 255, 0.9)',
    path: [[40, 0], [-24, -18], [-14, 0], [-24, 18]],
    lifePath: [[9, 0], [-6, -5], [-3, 0], [-6, 5]],
    scale: 2,   // El doble de grande que la nave original
    mult: 2,    // Otorga el doble de puntos
  },
];

let currentSkin = 0;
let skinFlash = 0;   // Indicador temporal en el HUD tras cambiar de skin

function currentSkinOf() {
  return SKINS[currentSkin];
}

function loadSkin() {
  try {
    const saved = parseInt(localStorage.getItem('asteroids-skin'), 10);
    if (Number.isInteger(saved) && saved >= 0 && saved < SKINS.length)
      currentSkin = saved;
  } catch { /* localStorage puede estar bloqueado */ }
}

function saveSkin() {
  try {
    localStorage.setItem('asteroids-skin', String(currentSkin));
  } catch { /* localStorage puede estar bloqueado */ }
}

// Cicla a la siguiente skin (tecla S)
function nextSkin() {
  currentSkin = (currentSkin + 1) % SKINS.length;
  skinFlash = 1.5;
  saveSkin();
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12 * currentSkinOf().scale;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shield        = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    // El tamaño se ajusta a la skin activa (permite cambiarla en pleno vuelo)
    this.radius = 12 * currentSkinOf().scale;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;
    if (this.shield        > 0) this.shield        -= dt;

    const ROT    = 3.5;    // rad/s
    const THRUST = 260;    // px/s²
    const DRAG   = 0.987;

    // Power-up "Velocidad": doble propulsión durante 5 s
    const thrust = this.speedBoost > 0 ? THRUST * 2 : THRUST;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21 * currentSkinOf().scale;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    // Power-up "Triple disparo": 3 balas paralelas durante 5 s
    if (this.tripleShot > 0) {
      const GAP   = 8;  // separación lateral entre balas
      const px    = -Math.sin(this.angle) * GAP;
      const py    =  Math.cos(this.angle) * GAP;
      return [
        new Bullet(ox + px, oy + py, this.angle),
        new Bullet(ox,      oy,      this.angle),
        new Bullet(ox - px, oy - py, this.angle),
      ];
    }

    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const skin = currentSkinOf();
    const s    = skin.scale;
    ctx.strokeStyle = skin.stroke;
    ctx.lineWidth   = 1.5 * s;
    ctx.lineJoin    = 'round';

    // Silueta según la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.path[0][0], skin.path[0][1]);
    for (let i = 1; i < skin.path.length; i++)
      ctx.lineTo(skin.path[i][0], skin.path[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8 * s, -4 * s);
      ctx.lineTo(-8 * s - rand(6, 14) * s, 0);
      ctx.lineTo(-8 * s,  4 * s);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }

    ctx.restore();

    // Burbuja de escudo
    if (this.shield > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = `rgba(120, 200, 255, ${this.shield < 1 && Math.floor(this.shield * 8) % 2 === 0 ? 0.15 : 0.7})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 22 * currentSkinOf().scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp (velocidad / triple disparo / escudo) ────────────────────────────
const POWERUP_TIPOS = ['velocidad', 'triple', 'escudo'];

class PowerUp {
  constructor(x, y, type = POWERUP_TIPOS[randInt(0, POWERUP_TIPOS.length - 1)]) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 10;
    this.vx = rand(-20, 20);
    this.vy = rand(-20, 20);
    this.ttl = 10;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea en su último segundo de vida
    if (this.ttl < 1 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    if (this.type === 'escudo') {
      // Contorno de escudo
      ctx.beginPath();
      ctx.moveTo( 0, -7);
      ctx.lineTo( 6, -4);
      ctx.lineTo( 6,  2);
      ctx.lineTo( 0,  7);
      ctx.lineTo(-6,  2);
      ctx.lineTo(-6, -4);
      ctx.closePath();
      ctx.stroke();
    } else if (this.type === 'triple') {
      // Tres trazos en fila: símbolo de triple disparo
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 6, -5);
        ctx.lineTo(i * 6,  5);
        ctx.stroke();
      }
    } else {
      // Doble chevron: símbolo de velocidad
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo( 0,  0);
      ctx.lineTo(-6,  6);
      ctx.moveTo( 0, -6);
      ctx.lineTo( 6,  0);
      ctx.lineTo( 0,  6);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, stars;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;  // Temporizador de aparición de estrella fugaz

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  stars     = [];
  starTimer = rand(10, 15);
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  stars     = [];
  starTimer = rand(10, 15);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Suma puntos aplicando el multiplicador de la skin activa
function addScore(points) {
  score += points * currentSkinOf().mult;
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead       = true;
  ship.speedBoost = 0;  // El power-up se pierde al morir
  ship.tripleShot = 0;
  ship.shield     = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

function updateStars(dt) {
  stars.forEach(s => s.update(dt));
  stars = stars.filter(s => {
    if (!s.dead) return true;
    if (s.ttl <= 0) explode(s.x, s.y, 6);  // Expiró: se desvanece en partículas
    return false;
  });
}

// ── Update ────────────────────────────────────────────────────────────────────
function updateSkinFlash(dt) {
  if (skinFlash > 0) skinFlash -= dt;
}

function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    updateSkinFlash(dt);
    if (pressed('KeyS')) nextSkin();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerUps.forEach(p => p.update(dt));
    updateStars(dt);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Cambiar de skin
  if (pressed('KeyS')) nextSkin();
  updateSkinFlash(dt);

  // Aparición de estrella fugaz (máximo 1 en el campo)
  if (stars.length === 0) {
    starTimer -= dt;
    if (starTimer <= 0) {
      stars.push(new ShootingStar());
      starTimer = rand(12, 20);
    }
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));
  updateStars(dt);

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        addScore(POINTS[a.size]);
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());

        // Probabilidad de soltar power-up (máximo 1 en el campo)
        if (powerUps.length === 0 && Math.random() < 0.15)
          powerUps.push(new PowerUp(a.x, a.y));
      }
    }
  }
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz (bonus)
  for (const b of bullets) {
    for (const s of stars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        addScore(250);
        explode(s.x, s.y, 10);
      }
    }
  }

  // Recoger power-up
  for (const pu of powerUps) {
    if (dist(ship, pu) < ship.radius + pu.radius) {
      pu.dead = true;
      if (pu.type === 'triple')      ship.tripleShot = 5;
      else if (pu.type === 'escudo') ship.shield     = 6;
      else                           ship.speedBoost = 5;
      explode(ship.x, ship.y, 6);
    }
  }

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shield > 0) {
          // El escudo absorbe el impacto y destruye el asteroide
          a.dead = true;
          addScore(POINTS[a.size]);
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());

          // Probabilidad de soltar power-up (máximo 1 en el campo)
          if (powerUps.length === 0 && Math.random() < 0.15)
            powerUps.push(new PowerUp(a.x, a.y));
        } else {
          killShip();
          break;
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);

  // Nave vs estrella fugaz
  if (ship.invincible <= 0) {
    for (const s of stars) {
      if (dist(ship, s) < ship.radius + s.radius * 0.82) {
        if (ship.shield > 0) {
          // El escudo absorbe el impacto: solo se gana el bonus
          s.dead = true;
          addScore(250);
          explode(s.x, s.y, 10);
        } else {
          s.dead = true;
          killShip();
          break;
        }
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = currentSkinOf();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.lifePath[0][0], skin.lifePath[0][1]);
  for (let i = 1; i < skin.lifePath.length; i++)
    ctx.lineTo(skin.lifePath[i][0], skin.lifePath[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicador temporal de la skin activa
  if (skinFlash > 0) {
    const alpha = Math.min(1, skinFlash / 0.5).toFixed(2);
    const mult  = currentSkinOf().mult;
    ctx.textAlign  = 'right';
    ctx.fillStyle  = `rgba(255,255,255,${alpha})`;
    ctx.font       = '13px monospace';
    ctx.fillText(`SKIN: ${currentSkinOf().name}${mult > 1 ? `  PUNTOS x${mult}` : ''}`, W - 14, H - 14);
  }

  if (ship.speedBoost > 0)
    ctx.fillText(`VELOCIDAD ${ship.speedBoost.toFixed(1)}s`, 14, H - 14);
  if (ship.shield > 0)
    ctx.fillText(`ESCUDO ${ship.shield.toFixed(1)}s`, 14, H - 32);
  if (ship.tripleShot > 0)
    ctx.fillText(`TRIPLE ${ship.tripleShot.toFixed(1)}s`, 14, H - 50);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  stars.forEach(s => s.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
loadSkin();
requestAnimationFrame(loop);
