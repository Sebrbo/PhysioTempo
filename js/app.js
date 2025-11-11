/*!
 * PhysioTempo — rehab cadence trainer with multiple modes
 * (c) 2025 Sebrbo and contributors
 * License (code): PolyForm Noncommercial 1.0.0 — see LICENSE
 * Assets: CC BY-NC 4.0 — see LICENSE-CC-BY-NC-4.0.md
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
*/
(() => {
  'use strict';

  // ---------- Modes ----------
  const MODES = { ACCEL: 'accel', STEADY: 'steady', RANDOM: 'random' };

  // ---------- i18n ----------
  const i18nDict = {
    en: {
      language: "Language",
      mode_label: "Cadence",
      mode_accel: "Progressive cadence",
      mode_steady: "Fixed cadence (timed)",
      mode_random: "Random cadence",

      start_bpm_label: "Start cadence (bpm)",
      end_bpm_label: "End cadence (bpm)",
      ramp_label: "Ramp duration (s)",

      steady_bpm_label: "Cadence (bpm)",
      steady_secs_label: "Duration (s)",

      random_min_bpm_label: "Min cadence (bpm)",
      random_max_bpm_label: "Max cadence (bpm)",
      random_secs_label: "Duration (s)",

      volume_label: "Volume",
      preset: "Preset 40 → 50 in 120s",
      start: "Start",
      stop: "Stop",
      current_bpm: "Current cadence (bpm)",
      status: "Status",
      time_left: "Time left",
      hint: "Progressive cadence: linear ramp to the end cadence. Fixed (timed): constant cadence for the duration. Random: each beat uses a random cadence within range.",
    },
    fr: {
      language: "Langue",
      mode_label: "Cadence",
      mode_accel: "Cadence progressive",
      mode_steady: "Cadence fixe (durée)",
      mode_random: "Cadence aléatoire",

      start_bpm_label: "Cadence de départ (bpm)",
      end_bpm_label: "Cadence d’arrivée (bpm)",
      ramp_label: "Durée d’accélération (s)",

      steady_bpm_label: "Cadence (bpm)",
      steady_secs_label: "Durée (s)",

      random_min_bpm_label: "Cadence min (bpm)",
      random_max_bpm_label: "Cadence max (bpm)",
      random_secs_label: "Durée (s)",

      volume_label: "Volume",
      preset: "Préréglage 40 → 50 en 120 s",
      start: "Démarrer",
      stop: "Arrêter",
      current_bpm: "Cadence actuelle (bpm)",
      status: "Statut",
      time_left: "Temps restant",
      hint: "Cadence progressive : rampe vers la cadence d’arrivée. Cadence fixe (durée) : cadence constante pendant la durée. Cadence aléatoire : chaque battement utilise une cadence tirée dans l’intervalle.",
    }
  };

  function applyI18n(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('.i18n').forEach(el => {
      const key = el.getAttribute('data-key');
      if (i18nDict[lang] && i18nDict[lang][key]) el.textContent = i18nDict[lang][key];
    });
  }

  // ---------- DOM ----------
  const $ = sel => document.querySelector(sel);
  const startBpmEl = $('#startBpm');
  const endBpmEl = $('#endBpm');
  const rampEl = $('#rampSeconds');

  const steadyBpmEl = $('#steadyBpm');
  const steadySecsEl = $('#steadySeconds');

  const minBpmEl = $('#minBpm');
  const maxBpmEl = $('#maxBpm');
  const randomSecsEl = $('#randomSeconds');

  const volEl = $('#volume');
  const bpmNowEl = $('#bpmNow');
  const statusEl = $('#status');
  const timeLeftEl = $('#timeLeft');
  const startBtn = $('#startBtn');
  const stopBtn = $('#stopBtn');
  const presetBtn = $('#preset');
  const langSelect = $('#langSelect');
  const modeSelect = $('#mode');

  const panels = Array.from(document.querySelectorAll('.mode-panel'));

  // ---------- Local storage ----------
  const savedLang = localStorage.getItem('pt_lang') || (navigator.language?.startsWith('fr') ? 'fr' : 'en');
  const savedMode = localStorage.getItem('pt_mode') || MODES.ACCEL;

  modeSelect.value = savedMode;
  langSelect.value = savedLang;
  applyI18n(savedLang);

  langSelect.addEventListener('change', () => {
    localStorage.setItem('pt_lang', langSelect.value);
    applyI18n(langSelect.value);
  });

  function showPanelFor(mode) {
    panels.forEach(p => {
      p.classList.toggle('hidden', p.getAttribute('data-mode') !== mode);
    });
  }
  showPanelFor(modeSelect.value);

  modeSelect.addEventListener('change', () => {
    localStorage.setItem('pt_mode', modeSelect.value);
    showPanelFor(modeSelect.value);
    updateTimeLeftDisplay(); // refresh readout hint
  });

  // ---------- Audio and scheduler ----------
  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;
  let startTime = 0;
  let nextNoteTime = 0;
  let lookaheadTimer = null;
  let rafId = null;
  let sessionEndTime = null; // only for timed modes
  let lastRandomBpm = null;

  const scheduleAheadTime = 0.15; // seconds
  const lookahead = 25;           // ms
  const clickHz = 880;
  const clickLen = 0.03;

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = Number(volEl.value) / 100;
      masterGain.connect(audioCtx.destination);
    }
  }

  function setStatus(text) { statusEl.textContent = text; }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function secondsToMMSS(s) {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  }

  function scheduleClick(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = clickHz;
    const g = masterGain.gain.value;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(g, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(Math.max(1e-4, g * 0.001), time + clickLen);
    gain.gain.setValueAtTime(0, time + clickLen + 0.01);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + clickLen + 0.02);
  }

  // --- Cadence progressive (linéaire) ---
  function accelBpmAt(elapsed) {
    const b0 = clamp(Number(startBpmEl.value), 20, 300);
    const b1 = clamp(Number(endBpmEl.value), 20, 300);
    const T = Math.max(0, Number(rampEl.value));
    if (T <= 0) return b1;
    if (elapsed < 0) elapsed = 0;
    if (elapsed >= T) return b1;
    const k = (b1 - b0) / T;
    return b0 + k * elapsed;
  }

  function scheduler() {
    const mode = modeSelect.value;

    // Auto-stop pour modes temporisés
    if (sessionEndTime && audioCtx.currentTime >= sessionEndTime) {
      stop(true); // finished
      return;
    }

    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
      scheduleClick(nextNoteTime);

      let interval;
      if (mode === MODES.ACCEL) {
        const elapsed = nextNoteTime - startTime;
        const bpm = accelBpmAt(elapsed);
        interval = 60.0 / bpm;
        bpmNowEl.textContent = bpm.toFixed(1);
      } else if (mode === MODES.STEADY) {
        const bpm = clamp(Number(steadyBpmEl.value), 20, 300);
        interval = 60.0 / bpm;
        bpmNowEl.textContent = bpm.toFixed(1);
      } else { // MODES.RANDOM
        // Cadence aléatoire à chaque battement, uniforme entre min et max
        let lo = clamp(Number(minBpmEl.value), 20, 300);
        let hi = clamp(Number(maxBpmEl.value), 20, 300);
        if (lo > hi) [lo, hi] = [hi, lo];
        const bpm = lastRandomBpm = lo + Math.random() * (hi - lo);
        interval = 60.0 / bpm;
        bpmNowEl.textContent = bpm.toFixed(1);
      }

      // Si une fin de session est définie, ne pas dépasser fortement
      if (sessionEndTime && nextNoteTime + interval > sessionEndTime) {
        // on planifie quand même ce dernier click, puis on sort
        nextNoteTime = sessionEndTime + 1; // force sortie de la boucle
      } else {
        nextNoteTime += interval;
      }
    }
  }

  function updateReadout() {
    if (!isPlaying) {
      bpmNowEl.textContent = '—';
      timeLeftEl.textContent = '—';
      return;
    }
    // Temps restant
    updateTimeLeftDisplay();
    rafId = requestAnimationFrame(updateReadout);
  }

  function updateTimeLeftDisplay() {
    if (!sessionEndTime) { timeLeftEl.textContent = '—'; return; }
    const now = audioCtx ? audioCtx.currentTime : 0;
    const left = sessionEndTime - now;
    timeLeftEl.textContent = left > 0 ? secondsToMMSS(left) : '0:00';
  }

  async function start() {
    ensureAudio();
    await audioCtx.resume();
    isPlaying = true;
    setStatus(langSelect.value === 'fr' ? 'lecture' : 'playing');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    masterGain.gain.value = Number(volEl.value) / 100;

    // Durées par mode
    sessionEndTime = null;
    lastRandomBpm = null;

    const mode = modeSelect.value;
    if (mode === MODES.STEADY) {
      const secs = Math.max(1, Number(steadySecsEl.value));
      sessionEndTime = audioCtx.currentTime + secs;
    } else if (mode === MODES.RANDOM) {
      const secs = Math.max(1, Number(randomSecsEl.value));
      sessionEndTime = audioCtx.currentTime + secs;
    } // ACCEL : pas de fin auto (illimité)

    startTime = audioCtx.currentTime + 0.1;
    nextNoteTime = startTime;

    if (lookaheadTimer) clearInterval(lookaheadTimer);
    lookaheadTimer = setInterval(scheduler, lookahead);
    updateReadout();
  }

  function stop(finished = false) {
    if (!audioCtx) return;
    isPlaying = false;
    const fr = langSelect.value === 'fr';
    setStatus(finished ? (fr ? 'terminé' : 'finished') : (fr ? 'arrêté' : 'stopped'));
    startBtn.disabled = false;
    stopBtn.disabled = true;

    if (lookaheadTimer) { clearInterval(lookaheadTimer); lookaheadTimer = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    bpmNowEl.textContent = '—';
    sessionEndTime = null;
    lastRandomBpm = null;
    updateTimeLeftDisplay();
  }

  // UI bindings
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', () => stop(false));

  volEl.addEventListener('input', () => { if (masterGain) masterGain.gain.value = Number(volEl.value) / 100; });

  presetBtn.addEventListener('click', () => {
    // Préréglage pour la Cadence progressive
    modeSelect.value = MODES.ACCEL;
    localStorage.setItem('pt_mode', modeSelect.value);
    showPanelFor(modeSelect.value);
    startBpmEl.value = 40;
    endBpmEl.value = 50;
    rampEl.value = 120;
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (startBtn.disabled) stop(); else start();
    }
  });

  // Validation simple des champs numériques
  [startBpmEl, endBpmEl, steadyBpmEl, minBpmEl, maxBpmEl].forEach(inp => {
    inp?.addEventListener('change', () => { inp.value = clamp(Number(inp.value || 0), 20, 300); });
  });
  [rampEl, steadySecsEl, randomSecsEl].forEach(inp => {
    inp?.addEventListener('change', () => { inp.value = Math.max(0, Number(inp.value || 0)); });
  });

  setStatus('au repos');
})();
