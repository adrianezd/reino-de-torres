'use strict';
/* =========================================================
   MÚSICA: bucles sintetizados con Web Audio, sin archivos.
   Cada tema es una progresión de 4 compases en un modo: bajo, arpegio,
   una melodía que se inventa una vez con su semilla (así suena siempre
   igual) y, en partida, percusión. Hay uno para el menú, uno por bioma y
   otro para cuando hay un jefe en el tablero. Se cambia con un fundido.
   Va aparte del sonido de efectos (meta.settings.music).
   ========================================================= */
var MUSIC_MODES = {
  jonico: [0, 2, 4, 5, 7, 9, 11], dorico: [0, 2, 3, 5, 7, 9, 10], frigio: [0, 1, 3, 5, 7, 8, 10],
  lidio: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], eolico: [0, 2, 3, 5, 7, 8, 10]
};
// root: nota MIDI de la tónica · prog: grado de cada compás · drums: 0 nada, 1 suave, 2 con caja
var MUSIC_THEMES = {
  menu:     { bpm: 86,  root: 55, mode: 'jonico', prog: [0, 5, 3, 4], seed: 3,  drums: 0, lead: 'triangle', density: 0.42 },
  prado:    { bpm: 112, root: 60, mode: 'mixo',   prog: [0, 6, 3, 0], seed: 7,  drums: 1, lead: 'square',   density: 0.5 },
  bosque:   { bpm: 104, root: 57, mode: 'dorico', prog: [0, 3, 6, 4], seed: 31, drums: 1, lead: 'triangle', density: 0.5 },
  hielo:    { bpm: 96,  root: 62, mode: 'lidio',  prog: [0, 1, 4, 0], seed: 11, drums: 1, lead: 'triangle', density: 0.4 },
  pantano:  { bpm: 100, root: 57, mode: 'dorico', prog: [0, 3, 0, 4], seed: 5,  drums: 1, lead: 'square',   density: 0.45 },
  ruinas:   { bpm: 104, root: 59, mode: 'eolico', prog: [0, 5, 6, 4], seed: 13, drums: 1, lead: 'triangle', density: 0.48 },
  desierto: { bpm: 110, root: 58, mode: 'frigio', prog: [0, 1, 0, 6], seed: 17, drums: 1, lead: 'square',   density: 0.5 },
  volcan:   { bpm: 122, root: 52, mode: 'frigio', prog: [0, 1, 5, 1], seed: 19, drums: 2, lead: 'sawtooth', density: 0.52 },
  cripta:   { bpm: 92,  root: 53, mode: 'eolico', prog: [0, 5, 3, 4], seed: 23, drums: 1, lead: 'sine',     density: 0.4 },
  jefe:     { bpm: 134, root: 50, mode: 'frigio', prog: [0, 1, 0, 6], seed: 29, drums: 2, lead: 'sawtooth', density: 0.6 }
};
var MUSIC_VOL = 0.55;
var music = { gain: null, theme: null, want: null, step: 0, next: 0, timer: null, mel: {}, noise: null, fading: 0 };

function musicCtx() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { return null; }
  if (!music.gain) {
    music.gain = audioCtx.createGain();
    music.gain.gain.value = 0;
    music.gain.connect(audioCtx.destination);
  }
  return audioCtx;
}
// nota (grado del modo, puede pasar de 7) a frecuencia
function musicFreq(th, deg, oct) {
  var m = MUSIC_MODES[th.mode], o = Math.floor(deg / 7), k = ((deg % 7) + 7) % 7;
  return 440 * Math.pow(2, (th.root + 12 * (o + (oct || 0)) + m[k] - 69) / 12);
}
// melodía de 32 corcheas inventada con la semilla del tema
function musicMelody(name) {
  if (music.mel[name]) return music.mel[name];
  var th = MUSIC_THEMES[name], s = th.seed * 9301 + 49297;
  var r = function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  var out = [], deg = 4;
  for (var i = 0; i < 32; i++) {
    var chord = th.prog[Math.floor(i / 8)];
    if (r() > th.density && i % 8) { out.push(null); continue; }
    // en los tiempos fuertes, una nota del acorde; si no, un paso cerca de la anterior
    if (i % 4 === 0) deg = chord + [0, 2, 4][Math.floor(r() * 3)] + 7;
    else deg += [-2, -1, 1, 2][Math.floor(r() * 4)];
    deg = Math.max(5, Math.min(16, deg));
    out.push({ deg: deg, len: r() < 0.3 ? 2 : 1 });
  }
  music.mel[name] = out;
  return out;
}
function musicNote(f, t, dur, type, vol) {
  var o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(music.gain);
  o.start(t); o.stop(t + dur + 0.03);
}
function musicNoise(t, dur, freq, vol) {
  if (!music.noise) {
    var len = Math.floor(audioCtx.sampleRate * 0.2), buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    music.noise = buf;
  }
  var src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  src.buffer = music.noise; f.type = freq > 3000 ? 'highpass' : 'bandpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(music.gain);
  src.start(t); src.stop(t + dur + 0.02);
}
function musicKick(t) {
  var o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(music.gain); o.start(t); o.stop(t + 0.18);
}
// una corchea del tema: bajo, arpegio, melodía y percusión
function musicStep(name, i, t) {
  var th = MUSIC_THEMES[name], e = 60 / th.bpm / 2, chord = th.prog[Math.floor(i / 8)], b = i % 8;
  if (b === 0 || b === 4) musicNote(musicFreq(th, chord, -2), t, e * 3.6, 'triangle', 0.09);
  var arp = [0, 2, 4, 7, 4, 2, 0, 2][b];
  musicNote(musicFreq(th, chord + arp, -1), t, e * 1.4, 'triangle', 0.028);
  var n = musicMelody(name)[i];
  if (n) musicNote(musicFreq(th, n.deg, 0), t, e * n.len * 0.95, th.lead, th.lead === 'triangle' || th.lead === 'sine' ? 0.05 : 0.022);
  if (th.drums) {
    if (b === 0 || (th.drums > 1 && b === 4)) musicKick(t);
    if (b % 2) musicNoise(t, 0.04, 7000, 0.035);
    if (th.drums > 1 && (b === 2 || b === 6)) musicNoise(t, 0.12, 1800, 0.06);
  }
}
function musicTick() {
  if (!music.theme || !audioCtx) return;
  // con la pestaña escondida no se programa nada (y no se amontona al volver)
  if (document.hidden || audioCtx.state !== 'running') { music.next = audioCtx.currentTime + 0.1; return; }
  var e = 60 / MUSIC_THEMES[music.theme].bpm / 2;
  if (music.next < audioCtx.currentTime) music.next = audioCtx.currentTime + 0.05;
  while (music.next < audioCtx.currentTime + 0.25) {
    musicStep(music.theme, music.step, music.next);
    music.next += e;
    music.step = (music.step + 1) % 32;
  }
}
// suena el tema name (con fundido si sonaba otro); se pide muchas veces sin coste
function musicPlay(name) {
  music.want = name;
  if (!meta.settings.music) { musicStop(); return; }
  if (music.theme === name && music.timer && !music.fading) return;
  if (music.fading === name) return;
  var c = musicCtx();
  if (!c) return;
  if (c.state === 'suspended') { c.resume().catch(function () {}); }
  var now = c.currentTime, g = music.gain.gain;
  var start = function () {
    music.fading = 0;
    music.theme = name; music.step = 0; music.next = audioCtx.currentTime + 0.05;
    g.cancelScheduledValues(audioCtx.currentTime);
    g.setValueAtTime(Math.max(0.0001, g.value), audioCtx.currentTime);
    g.linearRampToValueAtTime(MUSIC_VOL, audioCtx.currentTime + 0.9);
    if (!music.timer) music.timer = setInterval(musicTick, 60);
  };
  if (music.theme && music.timer) {
    music.fading = name;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0.0001, now + 0.35);
    setTimeout(function () { if (music.fading === name) start(); }, 380);
  } else start();
}
function musicStop() {
  music.fading = 0;
  if (!music.timer) { music.theme = null; return; }
  if (audioCtx && music.gain) {
    var g = music.gain.gain, now = audioCtx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0.0001, now + 0.3);
  }
  clearInterval(music.timer); music.timer = null; music.theme = null;
}
// música de una partida: la de su bioma, y la del jefe mientras haya uno
function musicFor(b) {
  if (!b) { musicPlay('menu'); return; }
  var boss = !b.ended && b.player.enemies.some(function (e) { return e.boss; });
  musicPlay(boss ? 'jefe' : MUSIC_THEMES[b.player.biome] ? b.player.biome : 'prado');
}
// los navegadores no dejan sonar nada hasta el primer toque
document.addEventListener('pointerdown', function unlockMusic() {
  if (music.want && meta.settings.music) { var w = music.want; music.theme = music.theme === w && music.timer ? w : null; musicPlay(w); }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
}, { passive: true });
