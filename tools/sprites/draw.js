/* Holdout sprite generator. Runs in a browser (see build.mjs) and paints every battle
   sprite with Canvas 2D, then packs them into one atlas. All art here is original. */
'use strict';
(() => {
const CW = 88, CH = 96, SC = 2, COLS = 13;
const AX = 36, AY = 90; // feet anchor inside a cell, in sprite units
const SOLDIERS = ['rifleman', 'sniper', 'brawler', 'medic'];

// ---------- helpers ----------
const V = (x, y) => ({ x, y });
const add = (a, b) => V(a.x + b.x, a.y + b.y);
const mul = (a, k) => V(a.x * k, a.y * k);
// Angle measured from straight down; positive swings toward +x (the way the figure faces).
const dir = (ang, len) => V(Math.sin(ang) * len, Math.cos(ang) * len);
const rot = (p, a) => V(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255];
  const m = c.map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return '#' + m.map(v => v.toString(16).padStart(2, '0')).join('');
}
function ik(a, b, l1, l2, down) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let d = Math.hypot(dx, dy) || 0.01;
  const reach = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const h = V(a.x + dx / d * reach, a.y + dy / d * reach);
  const base = Math.atan2(dy, dx), k = Math.acos((l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach));
  const e1 = V(a.x + Math.cos(base + k) * l1, a.y + Math.sin(base + k) * l1);
  const e2 = V(a.x + Math.cos(base - k) * l1, a.y + Math.sin(base - k) * l1);
  return { e: down ? (e1.y > e2.y ? e1 : e2) : (e1.y < e2.y ? e1 : e2), h };
}
function poly(c, pts, col) { c.fillStyle = col; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); c.fill(); }
function circ(c, p, r, col) { c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); }
function limb(c, a, b, wa, wb, col) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  poly(c, [V(a.x + nx * wa / 2, a.y + ny * wa / 2), V(b.x + nx * wb / 2, b.y + ny * wb / 2), V(b.x - nx * wb / 2, b.y - ny * wb / 2), V(a.x - nx * wa / 2, a.y - ny * wa / 2)], col);
  circ(c, a, wa / 2, col); circ(c, b, wb / 2, col);
}

// ---------- body ----------
const THIGH = 18, SHIN = 18, UARM = 13.5, FARM = 12.5, SPINE = 25;

function legPose(hip, t, flex) {
  const knee = add(hip, dir(t, THIGH));
  const s = t - flex;
  const ankle = add(knee, dir(s, SHIN));
  const foot = -s * (s < 0 ? 0.8 : 0.35);
  return { hip, knee, ankle, foot };
}
function soleLow(l) { // lowest y of the boot sole
  const heel = add(l.ankle, rot(V(-2.8, 2.6), l.foot)), toe = add(l.ankle, rot(V(8.2, 2.6), l.foot));
  return Math.max(heel.y, toe.y);
}
function shiftLeg(l, dy) { for (const k of ['hip', 'knee', 'ankle']) l[k] = V(l[k].x, l[k].y + dy); }
// Legs from angles, then lift/drop the body so the lowest foot rests on the ground (y = 0).
function standOn(legs, hipX, lift = 0) {
  const ls = legs.map(([t, f]) => legPose(V(hipX, 0), t, f));
  const low = Math.max(...ls.map(soleLow));
  ls.forEach(l => shiftLeg(l, -low - lift));
  return { far: ls[0], near: ls[1], hip: ls[1].hip };
}
function frame(hip, lean) {
  const up = V(Math.sin(lean), -Math.cos(lean)), fw = V(Math.cos(lean), Math.sin(lean));
  return (u, v) => V(hip.x + up.x * u + fw.x * v, hip.y + up.y * u + fw.y * v);
}

function drawBoot(c, l, col) {
  c.save(); c.translate(l.ankle.x, l.ankle.y); c.rotate(l.foot);
  poly(c, [V(-2.7, -3.2), V(2.4, -3.4), V(3.4, -0.2), V(7.6, 0.6), V(8.4, 2.6), V(-2.9, 2.6)], col);
  c.fillStyle = shade(col, -0.45); c.fillRect(-2.9, 1.7, 11.3, 0.9);
  c.restore();
}
function drawLeg(c, l, P, far) {
  const k = far ? -0.28 : 0;
  const pants = shade(P.pants, k);
  if (P.stump && far === P.stump.far) {
    limb(c, l.hip, l.knee, 8.4, 6.2, pants);
    circ(c, l.knee, 2.4, shade(P.skin, -0.35)); circ(c, l.knee, 1.4, '#4a1c17');
    return;
  }
  limb(c, l.hip, l.knee, 8.4, 6.2, pants);
  limb(c, l.knee, l.ankle, 6.2, 4.6, pants);
  if (P.torn && !far) { // ripped trouser leg with skin showing
    const m = V((l.knee.x + l.ankle.x) / 2, (l.knee.y + l.ankle.y) / 2);
    limb(c, m, l.ankle, 3.6, 3.4, shade(P.skin, -0.1));
  }
  drawBoot(c, l, shade(P.boots, k));
}
function drawArm(c, sh, a, P, far, sleeveShort) {
  const k = far ? -0.3 : 0;
  const sleeve = shade(P.sleeve || P.shirt, k), skin = shade(P.skin, k);
  limb(c, sh, a.e, 5.4, 4.4, sleeve);
  if (P.armband && !far) {
    const m = V(sh.x + (a.e.x - sh.x) * 0.35, sh.y + (a.e.y - sh.y) * 0.35);
    circ(c, m, 2.6, '#d6d0bd'); poly(c, [V(m.x - 0.5, m.y - 1.6), V(m.x + 0.5, m.y - 1.6), V(m.x + 0.5, m.y + 1.6), V(m.x - 0.5, m.y + 1.6)], '#a2241f');
    poly(c, [V(m.x - 1.6, m.y - 0.5), V(m.x + 1.6, m.y - 0.5), V(m.x + 1.6, m.y + 0.5), V(m.x - 1.6, m.y + 0.5)], '#a2241f');
  }
  limb(c, a.e, a.h, 4.4, 3.4, sleeveShort ? skin : sleeve);
  if (sleeveShort) limb(c, a.e, a.e, 4.6, 4.6, skin);
  circ(c, a.h, 2.1, P.gloves ? shade(P.gloves, k) : skin);
  if (P.claws && !far) { c.strokeStyle = shade(P.skin, -0.5); c.lineWidth = 0.7; c.beginPath(); c.moveTo(a.h.x, a.h.y); c.lineTo(a.h.x + 2.6, a.h.y + 1.6); c.moveTo(a.h.x, a.h.y); c.lineTo(a.h.x + 2.8, a.h.y + 0.2); c.stroke(); }
}
function drawTorso(c, T, P) {
  // Side-on torso outline in spine space (u up the spine, v forward).
  const back = [V(-5.2, 0), V(-5.6, 6), V(-5.0, 12), V(-6.0, 19), V(-4.0, 24), V(-2.0, 26)];
  const front = [V(2.2, 26), V(5.8, 21), V(6.6, 16), V(5.2, 10), V(5.6, 4), V(4.6, -0.5)];
  const pts = back.concat(front).map(p => T(p.y, p.x));
  poly(c, pts, P.shirt);
  // pelvis
  const hip = T(0, 0);
  c.fillStyle = P.pants; c.beginPath(); c.ellipse(hip.x, hip.y, 6, 4.6, 0, 0, Math.PI * 2); c.fill();
  // belt
  if (P.belt) poly(c, [T(1.2, -5.6), T(1.2, 5.2), T(3, 5.2), T(3, -5.6)], P.belt);
  // shirt hem / torn edge
  if (P.torn) {
    const r = rng(P.seed || 3); const hem = [];
    for (let v = -5.4; v <= 5.4; v += 1.35) hem.push(T(2.2 + r() * 2.4, v));
    poly(c, [T(-0.5, -5.2), ...hem, T(-0.5, 5)], P.pants);
    // skin through a rip
    c.fillStyle = shade(P.skin, -0.05); c.beginPath(); const rp = T(13, 3.5); c.ellipse(rp.x, rp.y, 2.4, 1.3, 0.5, 0, Math.PI * 2); c.fill();
  }
  if (P.blood) { const r = rng(P.seed || 9); for (let i = 0; i < 6; i++) { const p = T(16 + r() * 9, 1 + r() * 5); c.fillStyle = `rgba(${70 + r() * 30},14,12,${0.55 + r() * 0.3})`; c.beginPath(); c.ellipse(p.x, p.y, 1 + r() * 2.2, 0.8 + r() * 1.6, r() * 3, 0, Math.PI * 2); c.fill(); } }
  if (P.collar) poly(c, [T(22.5, -3.5), T(26.4, -2.5), T(26.6, 2.8), T(23.5, 3.5)], P.collar);
  if (P.vest) {
    const v = P.vest;
    poly(c, [T(6, -6.4), T(23, -6.8), T(23.5, -4), T(23.5, 6.8), T(7, 7.4), T(5.5, 7)], v);
    for (const [u0, u1] of [[6.5, 11.5], [12.2, 17.2]]) {
      poly(c, [T(u0, 6.8), T(u1, 6.8), T(u1, 9.4), T(u0 + 0.4, 9.6)], shade(v, -0.12));
      poly(c, [T(u1 - 1.2, 6.8), T(u1, 6.8), T(u1, 9.4), T(u1 - 1.2, 9.4)], shade(v, -0.3));
    }
    poly(c, [T(19, 6.6), T(22.8, 6.6), T(22.8, 7.5), T(19, 7.5)], shade(v, 0.15));
    c.strokeStyle = shade(v, -0.35); c.lineWidth = 0.6; c.beginPath(); const s1 = T(23.4, -2.5), s2 = T(26, 0.5); c.moveTo(s1.x, s1.y); c.lineTo(s2.x, s2.y); c.stroke();
  }
  if (P.pack) {
    poly(c, [T(7, -4.8), T(21, -5.4), T(21.5, -10.5), T(8, -10.4)], P.pack);
    poly(c, [T(8, -10.2), T(13, -10.2), T(13, -11.6), T(8.5, -11.4)], shade(P.pack, -0.25));
    const m = T(15, -8); circ(c, m, 2.4, '#d6d0bd');
    c.fillStyle = '#a2241f'; c.fillRect(m.x - 0.55, m.y - 1.7, 1.1, 3.4); c.fillRect(m.x - 1.7, m.y - 0.55, 3.4, 1.1);
  }
  if (P.sling) { c.strokeStyle = '#2a2a20'; c.lineWidth = 0.9; c.beginPath(); const a = T(23, -4), b = T(6, 6); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
}
function drawHead(c, nb, ang, P, mouthOpen) {
  const up = V(Math.sin(ang), -Math.cos(ang));
  limb(c, nb, add(nb, mul(up, 4)), 4.4, 4, shade(P.skin, -0.12));
  const hc = add(nb, mul(up, 7.2));
  c.save(); c.translate(hc.x, hc.y); c.rotate(ang);
  const skin = P.skin;
  circ(c, V(-0.6, -0.6), 4.8, skin);
  // face profile: brow, nose, lips, chin, jaw
  const jaw = mouthOpen ? 2.2 : 0;
  poly(c, [V(1.5, -4.2), V(4.1, -2.7), V(4.3, -1.3), V(5.6, 0.7), V(4.5, 1.3), V(4.6, 2.3), V(4.3, 2.9 + jaw * 0.3), V(4.2, 3.7 + jaw), V(3, 5 + jaw), V(0.6, 4.7 + jaw * 0.6), V(-1.6, 3.6), V(-2.2, 0)], skin);
  if (mouthOpen) poly(c, [V(4.3, 2.8), V(4.1, 3.6 + jaw), V(2.4, 3.2)], '#2a0f0d');
  // eye socket + eye
  circ(c, V(2.9, -1.2), 1.15, shade(skin, -0.32));
  circ(c, V(3.25, -1.2), 0.55, P.eye || '#1d1a17');
  // ear
  c.fillStyle = shade(skin, -0.2); c.beginPath(); c.ellipse(-1.1, 0.1, 1.1, 1.6, 0, 0, Math.PI * 2); c.fill();
  if (P.stubble) { c.fillStyle = 'rgba(30,25,20,.35)'; c.beginPath(); c.moveTo(-1.4, 2.4); c.lineTo(4.4, 2.6); c.lineTo(3.2, 5); c.lineTo(0.4, 4.8); c.closePath(); c.fill(); }
  if (P.mouthBlood) { c.fillStyle = 'rgba(90,16,12,.85)'; c.beginPath(); c.moveTo(2.6, 2.6); c.lineTo(4.6, 2.9); c.lineTo(4.1, 6 + jaw); c.lineTo(3.2, 4.4 + jaw); c.closePath(); c.fill(); }
  if (P.hair) {
    c.fillStyle = P.hair; c.beginPath(); c.arc(-0.8, -0.8, 5.1, Math.PI * 0.95, Math.PI * 1.85); c.lineTo(1.4, -4.2); c.lineTo(-2, -2.4); c.lineTo(-4.5, 1.8); c.closePath(); c.fill();
    if (P.longHair) { poly(c, [V(-4.6, -1), V(-2.4, -1.6), V(-2.6, 5), V(-1.2, 8.5), V(-4.4, 8), V(-5.6, 3)], P.hair); }
  }
  if (P.helmet) {
    const h = P.helmet;
    c.fillStyle = h; c.beginPath(); c.arc(-0.6, -1.1, 6.1, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill();
    poly(c, [V(-6.9, -0.9), V(5.8, -1.6), V(6.2, -0.5), V(-7.1, 0.4)], shade(h, -0.2));
    c.fillStyle = shade(h, 0.1); c.fillRect(-4.5, -6.2, 4, 1.1); // band
    c.strokeStyle = '#25231c'; c.lineWidth = 0.55; c.beginPath(); c.moveTo(-0.4, 0); c.lineTo(1.8, 4.6); c.stroke();
    if (P.cross) { const m = V(-3.4, -3.6); c.fillStyle = '#d6d0bd'; c.fillRect(m.x - 1.4, m.y - 1.4, 2.8, 2.8); c.fillStyle = '#a2241f'; c.fillRect(m.x - 0.4, m.y - 1.1, 0.8, 2.2); c.fillRect(m.x - 1.1, m.y - 0.4, 2.2, 0.8); }
  }
  if (P.boonie) {
    const h = P.boonie;
    c.fillStyle = h; c.beginPath(); c.arc(-0.6, -1.4, 5.3, Math.PI, Math.PI * 2); c.closePath(); c.fill();
    poly(c, [V(-8.5, -0.6), V(7.4, -1.4), V(7.8, -0.4), V(-8.8, 0.6)], shade(h, -0.15));
    const r = rng(41); c.strokeStyle = shade(h, -0.3); c.lineWidth = 0.6;
    for (let i = 0; i < 9; i++) { const x = -7 + i * 1.7; c.beginPath(); c.moveTo(x, -1.2); c.lineTo(x - 1 + r() * 2, 1 + r() * 2.5); c.stroke(); }
  }
  if (P.cap) {
    const h = P.cap;
    c.fillStyle = h; c.beginPath(); c.arc(-0.7, -1.2, 5.3, Math.PI * 0.98, Math.PI * 2.02); c.closePath(); c.fill();
    c.fillStyle = shade(h, -0.2); c.fillRect(-6, -1.6, 10.8, 1.5);
  }
  if (P.wound) { c.fillStyle = 'rgba(80,18,14,.8)'; c.beginPath(); c.ellipse(-2.6, -3, 1.7, 1.1, -0.4, 0, Math.PI * 2); c.fill(); }
  c.restore();
}

// ---------- weapons (local: origin at trigger hand, +x toward the muzzle) ----------
const WEAPONS = {
  rifle: {
    grip: V(0, 0), support: V(11.5, 0.6), muzzle: V(23.5, -1.6),
    draw(c) {
      const m = '#22231e', d = '#2c2d26', p = '#3d3b31';
      poly(c, [V(-15.5, -2.4), V(-7, -2.2), V(-6.5, 0.6), V(-12, 1.6), V(-15.5, 4.6)], p); // stock
      poly(c, [V(-15.8, -2.6), V(-15, -2.6), V(-15, 4.9), V(-15.8, 4.9)], '#18181a');
      poly(c, [V(-7, -3.2), V(5.5, -3.2), V(5.5, 0.4), V(-7, 0.6)], d); // receiver
      poly(c, [V(-2.4, 0.2), V(0.4, 0.2), V(-0.4, 5.2), V(-3, 5)], m); // pistol grip
      poly(c, [V(1.2, 0.4), V(4.6, 0.4), V(5, 4), V(4.2, 7.6), V(1, 7.2), V(1.6, 3.6)], '#1c1c19'); // magazine
      poly(c, [V(5.5, -3), V(16.5, -2.8), V(16.5, 0), V(5.5, 0.4)], p); // handguard
      for (let x = 7; x < 16; x += 2.2) poly(c, [V(x, -2.1), V(x + 1.1, -2.1), V(x + 1.1, -1.4), V(x, -1.4)], shade(p, -0.25));
      poly(c, [V(16.5, -2), V(23.5, -1.9), V(23.5, -1.1), V(16.5, -1)], m); // barrel
      poly(c, [V(21.4, -2.2), V(23.6, -2.2), V(23.6, -0.8), V(21.4, -0.8)], '#151513'); // muzzle device
      poly(c, [V(-3, -5.6), V(3, -5.6), V(3.4, -3.2), V(-3.4, -3.2)], '#191a17'); // optic
      circ(c, V(3.2, -4.4), 1.1, '#3b4a52');
      poly(c, [V(-1.6, 0.4), V(1.4, 0.4), V(1, 2), V(-1, 2)], 'rgba(0,0,0,0)');
      c.strokeStyle = m; c.lineWidth = 0.5; c.beginPath(); c.arc(-0.6, 1.4, 1.3, 0, Math.PI); c.stroke(); // trigger guard
    },
  },
  sniper: {
    grip: V(0, 0), support: V(13, 0.8), muzzle: V(32, -1.7),
    draw(c) {
      const wood = '#5b4632', m = '#1f201c';
      poly(c, [V(-16, -2.6), V(-4, -1.8), V(-1.8, 1), V(1, 1.6), V(16, 0.8), V(16, -1.6), V(-2, -2.6), V(-6, -3.3), V(-14, -4), V(-16.3, -3.6), V(-16.6, 4.6), V(-13, 3.8), V(-6, 1.6), V(-2.6, 4.8), V(-0.4, 4.6), V(-0.8, 1.6)], wood);
      poly(c, [V(-16.8, -3.8), V(-16, -3.8), V(-16, 4.9), V(-16.8, 4.9)], '#1a1714');
      poly(c, [V(-4, -3.6), V(8, -3.6), V(8, -1.6), V(-4, -1.6)], m); // action
      poly(c, [V(-3, -1.8), V(-1.8, -1.8), V(-1.4, 0.2), V(-3.2, 0.4)], m);
      circ(c, V(-3.6, -1.2), 1, '#2a2a26'); // bolt knob
      poly(c, [V(8, -2.6), V(32, -2.1), V(32, -1.2), V(8, -1.3)], m); // barrel
      poly(c, [V(-5, -7), V(9, -7), V(9, -4.6), V(-5, -4.6)], '#151613'); // scope tube
      poly(c, [V(-7.5, -7.8), V(-5, -7.4), V(-5, -4.2), V(-7.5, -3.8)], '#151613');
      poly(c, [V(9, -7.4), V(12.4, -8.2), V(12.4, -3.4), V(9, -4.2)], '#151613');
      circ(c, V(12.3, -5.8), 1.3, '#41535c');
      poly(c, [V(0, -4.8), V(1.2, -4.8), V(1.2, -3.4), V(0, -3.4)], '#151613');
      c.strokeStyle = '#26261f'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(15, 0.5); c.lineTo(23, 1.2); c.stroke(); // folded bipod
    },
  },
  axe: {
    grip: V(0, 0), support: V(-8, 0), muzzle: V(26, 0),
    draw(c) {
      poly(c, [V(-12, -1), V(25, -1.2), V(25, 1.1), V(-12, 1.2)], '#6b4a2c');
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-12, 0.3, 37, 0.9);
      poly(c, [V(21, -1.6), V(26, -1.6), V(26.5, -3.4), V(30, -6.4), V(31.5, 2), V(28.5, 1.4), V(26, 1.6), V(21, 1.6)], '#5a5b57');
      poly(c, [V(29.5, -5.8), V(31.5, 2), V(30.6, 1.9), V(28.8, -4.9)], '#9d9d96'); // honed edge
      poly(c, [V(21, -1.6), V(18, -4.6), V(20.5, -4.8), V(23, -1.6)], '#4a4b47'); // spike
      poly(c, [V(23, -2), V(23, 2), V(22, 2), V(22, -2)], '#8b2a20');
    },
  },
};
function weaponPts(w) { const W = WEAPONS[w.type]; const at = p => add(w.pos, rot(p, w.ang)); return { grip: at(W.grip), support: at(W.support), muzzle: at(W.muzzle) }; }
function drawWeapon(c, w) { c.save(); c.translate(w.pos.x, w.pos.y); c.rotate(w.ang); WEAPONS[w.type].draw(c); c.restore(); }

// ---------- one figure ----------
function drawFigure(c, P, pose) {
  const T = frame(pose.hip, pose.lean);
  const shN = T(21, -0.2), shF = T(21.4, -1.6), nb = T(25, 0.6);
  let wp = null;
  if (pose.weapon) {
    const w = pose.weapon;
    w.pos = typeof w.at === 'function' ? w.at(shN, T) : w.pos;
    wp = weaponPts(w);
  }
  const handN = pose.handN ? pose.handN(shN, T, wp) : wp.grip;
  const handF = pose.handF ? pose.handF(shF, T, wp) : wp.support;
  const aN = ik(shN, handN, UARM, FARM, pose.elbowUpN ? false : true);
  const aF = ik(shF, handF, UARM, FARM, pose.elbowUpF ? false : true);
  const short = P.shortSleeve;
  if (pose.weaponBehind && pose.weapon) drawWeapon(c, pose.weapon);
  drawArm(c, shF, aF, P, true, short);
  drawLeg(c, pose.legs.far, P, true);
  drawLeg(c, pose.legs.near, P, false);
  drawTorso(c, T, P);
  drawHead(c, nb, pose.lean + (pose.tilt || 0), P, pose.mouth);
  if (pose.weapon && !pose.weaponBehind) drawWeapon(c, pose.weapon);
  drawArm(c, shN, aN, P, false, short);
  return wp;
}

// ---------- characters ----------
const SOLDIER_LOOK = {
  rifleman: { skin: '#b38866', shirt: '#565a40', pants: '#4b4f3a', boots: '#2b2620', gloves: '#3a3328', helmet: '#4b4f38', belt: '#2e2b22', collar: '#4d5139', sling: true, stubble: true },
  sniper: { skin: '#8a5e44', shirt: '#625a43', pants: '#585040', boots: '#2e2820', gloves: '#3d3529', boonie: '#5e573f', belt: '#2e2b22', collar: '#5a533d' },
  brawler: { skin: '#c49a7a', shirt: '#5e402c', sleeve: '#5a3d2a', pants: '#3d4352', boots: '#2a2421', gloves: '#4b3a2a', cap: '#33383a', belt: '#231f1b', collar: '#4a3222', stubble: true },
  medic: { skin: '#a77a5b', shirt: '#6a6650', pants: '#575642', boots: '#2b2620', helmet: '#575b43', cross: true, pack: '#4f4c3a', armband: true, belt: '#2e2b22', collar: '#5f5b47' },
};
const VEST = '#3d4030';
const ZOMBIES = [
  { skin: '#8d927d', shirt: '#6b3a2e', pants: '#3b4656', boots: '#2e2925', hair: '#2a2420', torn: true, blood: true, mouthBlood: true, eye: '#d8d6b8', seed: 5 },
  { skin: '#7f8786', shirt: '#9e9887', pants: '#6d6450', boots: '#3a3129', shortSleeve: true, torn: true, blood: true, mouthBlood: true, wound: true, eye: '#d8d6b8', seed: 8 },
  { skin: '#9a9474', shirt: '#4b5a6a', pants: '#383733', boots: '#2b2723', hair: '#3b2f26', longHair: true, torn: true, blood: true, mouthBlood: true, eye: '#e0dcbc', seed: 13 },
  { skin: '#a08f80', shirt: '#55585a', pants: '#3a4558', boots: '#d0ccc0', hair: '#1f1c19', torn: true, blood: true, mouthBlood: true, eye: '#e8d9a0', seed: 21 },
  { skin: '#998674', shirt: '#7a2c26', pants: '#2f2f30', boots: '#25221f', shortSleeve: true, hair: '#4a3a2a', torn: true, blood: true, mouthBlood: true, eye: '#e8d9a0', seed: 34 },
  { skin: '#868b78', shirt: '#56604a', pants: '#4a4234', boots: '#2b2620', hair: '#2a2420', torn: true, blood: true, mouthBlood: true, wound: true, eye: '#d8d6b8', stump: { far: true }, seed: 55 },
];
const ZROW0 = 8, FXROW = 14, ROWS = 15;

// ---------- poses ----------
const walkLegs = (ph, amp = 0.42, flex = 0.95) => [0, Math.PI].map(o => {
  const p = ph + o; const t = amp * Math.sin(p);
  return [t, 0.12 + flex * Math.pow(Math.max(0, Math.cos(p)), 1.4)];
});
// Rifle carried at low ready, rifle shouldered, recoil, and a buttstroke.
function gunPose(kind, type, col) {
  const long = type === 'sniper';
  if (col < 8) {
    const ph = col / 8 * Math.PI * 2;
    const L = walkLegs(ph);
    const s = standOn(L, 0);
    const bob = Math.abs(Math.cos(ph)) * 0.4;
    return { legs: s, hip: s.hip, lean: 0.12, tilt: 0.05, weapon: { type, ang: long ? 0.55 : 0.42, at: sh => add(sh, V(5.5 - bob, 10.5)) } };
  }
  const s = standOn([[-0.22, 0.2], [0.28, 0.32]], 0);
  if (col === 8 || col === 9) {
    const kick = col === 9 ? 1 : 0;
    const lean = 0.16 - kick * 0.05;
    return { legs: s, hip: s.hip, lean, tilt: 0.28, weapon: { type, ang: -kick * 0.07, at: sh => add(sh, V((long ? 15.2 : 14.2) - kick * 1.6, 1.4)) } };
  }
  if (col === 10) return { legs: s, hip: s.hip, lean: 0.02, tilt: 0.1, weapon: { type, ang: -0.35, at: sh => add(sh, V(3, 4)) } };
  return { legs: standOn([[-0.35, 0.15], [0.45, 0.4]], 0), get hip() { return this.legs.hip; }, lean: 0.32, tilt: 0.1, weapon: { type, ang: 0.08, at: sh => add(sh, V(19, 2)) } };
}
function axePose(col) {
  if (col < 8) {
    const ph = col / 8 * Math.PI * 2;
    const s = standOn(walkLegs(ph), 0);
    return { legs: s, hip: s.hip, lean: 0.14, tilt: 0.04, weapon: { type: 'axe', ang: -1.05, at: sh => add(sh, V(5, 12)) } };
  }
  const s = standOn([[-0.25, 0.2], [0.32, 0.35]], 0);
  if (col === 8) return { legs: s, hip: s.hip, lean: 0.18, tilt: 0.12, weapon: { type: 'axe', ang: -0.75, at: sh => add(sh, V(7, 11)) } };
  if (col === 10) return { legs: s, hip: s.hip, lean: -0.05, tilt: 0.1, weapon: { type: 'axe', ang: -2.35, at: sh => add(sh, V(2, -3)) }, weaponBehind: true, elbowUpN: true, elbowUpF: true };
  const s2 = standOn([[-0.38, 0.12], [0.5, 0.45]], 0);
  if (col === 11) return { legs: s2, hip: s2.hip, lean: 0.36, tilt: 0.12, weapon: { type: 'axe', ang: -0.15, at: sh => add(sh, V(11, 5)) } };
  return { legs: s2, hip: s2.hip, lean: 0.42, tilt: 0.15, weapon: { type: 'axe', ang: 0.65, at: sh => add(sh, V(9, 11)) } }; // follow-through
}
function medicPose(col) {
  if (col < 8) {
    const ph = col / 8 * Math.PI * 2;
    const s = standOn(walkLegs(ph), 0);
    const sw = Math.sin(ph) * 0.55;
    return { legs: s, hip: s.hip, lean: 0.1, tilt: 0.05, handN: sh => add(sh, dir(-sw, 24)), handF: sh => add(sh, dir(sw, 24)) };
  }
  if (col === 8 || col === 9) {
    const s = standOn([[-0.12, 0.1], [0.14, 0.12]], 0);
    return { legs: s, hip: s.hip, lean: 0.06, tilt: col === 9 ? 0.2 : 0, handN: sh => add(sh, V(3, 23)), handF: sh => add(sh, V(2, 23)) };
  }
  // kneeling over a casualty: far foot planted, near knee down
  const hip = V(0, -22);
  const far = legPose(hip, 1.25, 2.05), near = legPose(hip, 0.15, -1.6);
  near.knee = add(hip, dir(0.15, THIGH)); near.ankle = add(near.knee, dir(-1.45, SHIN)); near.foot = 1.4;
  const low = Math.max(soleLow(far), near.knee.y + 3);
  [far, near].forEach(l => shiftLeg(l, -low)); hip.y -= low;
  const reach = col === 10 ? V(15, 14) : V(13, 17);
  return { legs: { far, near }, hip: near.hip, lean: 0.48, tilt: 0.3, handN: sh => add(sh, reach), handF: sh => add(sh, V(reach.x + 3, reach.y - 3)) };
}
function zedPose(z, col, run) {
  const tw = (z.seed % 5) * 0.03;
  if (col < 8) {
    const ph = col / 8 * Math.PI * 2;
    if (run) {
      const L = walkLegs(ph, 0.72, 1.45);
      const s = standOn(L, 0, Math.max(0, Math.sin(ph * 2)) * 2.2);
      const sw = Math.sin(ph);
      return { legs: s, hip: s.hip, lean: 0.48 + tw, tilt: -0.25, mouth: true, handN: sh => add(sh, dir(1.9 + sw * 0.5, 23)), handF: sh => add(sh, dir(1.5 - sw * 0.6, 23)) };
    }
    // shamble: near leg stays stiff and drags, far leg does the work
    const t = Math.sin(ph);
    const s = standOn([[0.42 * t, 0.15 + 0.8 * Math.max(0, Math.cos(ph))], [-0.32 * t - 0.05, 0.08]], 0);
    const sw = Math.sin(ph + 0.6);
    return { legs: s, hip: s.hip, lean: 0.3 + tw + 0.04 * t, tilt: 0.35 + 0.06 * sw, mouth: col % 4 === 1, handN: sh => add(sh, dir(1.62 + sw * 0.1, 24)), handF: sh => add(sh, dir(0.4 - sw * 0.25, 24)) };
  }
  const s = standOn([[-0.2, 0.2], [0.3, 0.35]], 0);
  if (col === 8) return { legs: s, hip: s.hip, lean: 0.5, tilt: -0.1, mouth: true, handN: sh => add(sh, dir(1.85, 24)), handF: sh => add(sh, dir(1.7, 23)) };
  if (col === 9) return { legs: s, hip: s.hip, lean: 0.62, tilt: -0.2, mouth: true, handN: sh => add(sh, dir(1.45, 23)), handF: sh => add(sh, dir(2.4, 22)), elbowUpN: true };
  if (col === 10) { const s3 = standOn([[0.25, 0.15], [-0.15, 0.1]], 0); return { legs: s3, hip: s3.hip, lean: -0.18, tilt: -0.3, mouth: true, handN: sh => add(sh, dir(0.8, 23)), handF: sh => add(sh, dir(-0.4, 23)) }; }
  return null;
}
function crawlPose(col) {
  const ph = (col < 8 ? col / 8 : 0) * Math.PI * 2;
  const hip = V(-14, -5.5);
  const lean = 1.38;
  const far = legPose(hip, -1.5, -0.1), near = legPose(hip, -1.38, -0.25);
  far.foot = near.foot = -0.3;
  const T = frame(hip, lean);
  const reachN = col === 8 ? V(28, -12) : col === 9 ? V(24, -6) : V(16 + 8 * Math.sin(ph), 0);
  const reachF = col === 8 ? V(25, -6) : V(16 - 8 * Math.sin(ph), 0);
  return { legs: { far, near }, hip, lean, tilt: -1.15, mouth: true, handN: () => add(V(0, 0), reachN), handF: () => add(V(0, 0), reachF), elbowUpN: true, elbowUpF: true };
}

// ---------- lighting pass ----------
// Dusk light from the upper left (world space): warm rim on lit edges, cool shadow on the rest, fabric grain.
function light(cell, seed) {
  const w = cell.width, h = cell.height, c = cell.getContext('2d');
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; const t = tmp.getContext('2d');
  const edge = (dx, dy, col, a) => {
    t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, w, h); t.drawImage(cell, 0, 0);
    t.globalCompositeOperation = 'source-in'; t.fillStyle = col; t.fillRect(0, 0, w, h);
    t.globalCompositeOperation = 'destination-out'; t.drawImage(cell, dx, dy);
    c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = a; c.drawImage(tmp, 0, 0); c.restore();
  };
  // grain
  const r = rng(seed); c.save(); c.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < w * h / 40; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.10)' : 'rgba(255,240,220,.06)'; c.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1); }
  // ground-up ambient: darker at the feet, warmer at the head
  const g = c.createLinearGradient(0, h * 0.1, 0, h);
  g.addColorStop(0, 'rgba(255,200,150,.08)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,12,20,.32)');
  c.fillStyle = g; c.fillRect(0, 0, w, h); c.restore();
  edge(5, 4, '#10131c', 0.38); // core shadow on the far side
  edge(1.6, 1.6, '#f2b276', 0.38); // rim light
}

// ---------- effects ----------
function drawFx(c, col) {
  const r = rng(100 + col);
  c.save(); c.translate(CW / 2, CH / 2);
  if (col <= 2) { // muzzle flash, facing +x, origin at the muzzle
    const len = [16, 22, 12][col];
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 9); g.addColorStop(0, 'rgba(255,240,190,.95)'); g.addColorStop(1, 'rgba(255,150,40,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
    for (const [a, l, w] of [[0, len, 2.6], [-0.55, len * 0.45, 1.6], [0.55, len * 0.45, 1.6], [-0.2, len * 0.7, 1.4], [0.22, len * 0.65, 1.4]]) {
      const tip = V(Math.cos(a) * l, Math.sin(a) * l);
      const gg = c.createLinearGradient(0, 0, tip.x, tip.y); gg.addColorStop(0, 'rgba(255,250,220,1)'); gg.addColorStop(0.5, 'rgba(255,190,80,.9)'); gg.addColorStop(1, 'rgba(255,110,20,0)');
      c.fillStyle = gg; c.beginPath(); c.moveTo(0, -w); c.lineTo(tip.x, tip.y); c.lineTo(0, w); c.closePath(); c.fill();
    }
  } else if (col <= 5) { // blood spray, flying toward +x
    const n = [26, 34, 22][col - 3];
    for (let i = 0; i < n; i++) {
      const a = (r() - 0.5) * 1.6, d = 2 + r() * (12 + (col - 3) * 5), s = 0.5 + r() * 1.6;
      c.fillStyle = `rgba(${90 + r() * 50},${10 + r() * 12},${8 + r() * 8},${0.6 + r() * 0.4})`;
      c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, s * 1.6, s, a, 0, Math.PI * 2); c.fill();
    }
  } else if (col === 6) { // gun smoke puff
    for (let i = 0; i < 9; i++) {
      const p = V((r() - 0.5) * 14, (r() - 0.5) * 9), rr = 4 + r() * 7;
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr); g.addColorStop(0, 'rgba(205,200,190,.35)'); g.addColorStop(1, 'rgba(205,200,190,0)');
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, rr, 0, Math.PI * 2); c.fill();
    }
  } else if (col === 7) { // blood pool on the ground (flat ellipse)
    for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(${55 + r() * 25},10,8,${0.5 + r() * 0.35})`; c.beginPath(); c.ellipse((r() - 0.5) * 22, (r() - 0.5) * 3, 2 + r() * 7, 0.8 + r() * 1.8, 0, 0, Math.PI * 2); c.fill(); }
  } else if (col === 8) { // soft contact shadow
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 20); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.scale(1, 0.22); c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ---------- atlas ----------
function cellCanvas() { const k = document.createElement('canvas'); k.width = CW * SC; k.height = CH * SC; return k; }
function paint(drawFn, { flip = false, lying = 0, fall = 0, seed = 1 } = {}) {
  const raw = cellCanvas(), c = raw.getContext('2d');
  c.scale(SC, SC); c.translate(AX, AY);
  if (lying) { c.translate(42, -5); c.scale(0.95, 0.95); c.rotate(-Math.PI / 2); }
  if (fall) { c.translate(24, 0); c.rotate(-fall); }
  const out = drawFn(c);
  const cell = cellCanvas(), k = cell.getContext('2d');
  if (flip) { k.translate(cell.width, 0); k.scale(-1, 1); }
  k.drawImage(raw, 0, 0);
  k.setTransform(1, 0, 0, 1, 0, 0);
  light(cell, seed);
  return { cell, out };
}
window.buildAtlas = function () {
  const atlas = document.createElement('canvas'); atlas.width = CW * SC * COLS; atlas.height = CH * SC * ROWS;
  const A = atlas.getContext('2d');
  const meta = { cw: CW, ch: CH, ax: AX, ay: AY, cols: COLS, rows: ROWS, scale: SC, muzzle: {} };
  const put = (row, col, cell) => A.drawImage(cell, col * CW * SC, row * CH * SC);
  SOLDIERS.forEach((type, ti) => [false, true].forEach((armor, ai) => {
    const row = ti * 2 + ai;
    const P = Object.assign({}, SOLDIER_LOOK[type], armor ? { vest: VEST } : {});
    for (let col = 0; col < COLS; col++) {
      const pose = col === 12 ? null : type === 'brawler' ? axePose(col === 9 ? 12 : col) : type === 'medic' ? medicPose(col) : gunPose('gun', type === 'sniper' ? 'sniper' : 'rifle', col);
      const { cell, out } = col === 12
        ? paint(c => { const p = medicPose(8); p.handN = sh => add(sh, V(-6, 20)); p.handF = sh => add(sh, V(10, -14)); p.tilt = 0.5; p.legs = standOn([[0.35, 0.5], [-0.1, 0.1]], 0); p.hip = p.legs.hip; if (type !== 'medic') p.weapon = { type: type === 'brawler' ? 'axe' : type === 'sniper' ? 'sniper' : 'rifle', ang: 1.45, at: sh => add(sh, V(4, 16)) }, p.weaponBehind = true; drawFigure(c, P, p); }, { lying: 1, seed: row * 31 + col })
        : paint(c => drawFigure(c, P, pose), { seed: row * 31 + col });
      if (out && (type === 'rifleman' || type === 'sniper') && col === 9) meta.muzzle[row] = { x: +out.muzzle.x.toFixed(1), y: +out.muzzle.y.toFixed(1) };
      put(row, col, cell);
    }
  }));
  ZOMBIES.forEach((z, zi) => {
    const row = ZROW0 + zi, run = zi === 3 || zi === 4, crawl = !!z.stump;
    for (let col = 0; col < COLS; col++) {
      const seed = row * 31 + col;
      let res;
      if (col >= 11) {
        const base = crawl ? crawlPose(0) : zedPose(z, 10, run);
        if (col === 12) { base.tilt = crawl ? -0.2 : 0.6; base.mouth = true; base.handN = sh => add(sh, V(9, 12)); base.handF = sh => add(sh, V(-8, 16)); }
        res = paint(c => drawFigure(c, z, base), { flip: true, lying: col === 12 && !crawl ? 1 : 0, fall: col === 11 && !crawl ? 0.65 : 0, seed });
      } else {
        const pose = crawl ? crawlPose(col) : zedPose(z, col, run);
        res = paint(c => drawFigure(c, z, pose), { flip: true, seed });
      }
      put(row, col, res.cell);
    }
  });
  for (let col = 0; col < 9; col++) { const cell = cellCanvas(), c = cell.getContext('2d'); c.scale(SC, SC); drawFx(c, col); put(FXROW, col, cell); }
  return { atlas, meta };
};
})();
