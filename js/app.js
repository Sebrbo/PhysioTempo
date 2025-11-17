/*!
 * PhysioTempo — cadence trainer with countdown, auto-restart & proper countdown label
 * (c) 2025 Sebrbo and contributors
 * License (code): PolyForm Noncommercial 1.0.0
 * Assets: CC BY-NC 4.0
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

      start_options: "Start & cycles",
      auto_restart_label: "Auto-restart",
      auto_restart_delay_label: "Restart delay (s)",

      preset: "Preset 40 → 50 in 120s",
      start: "Start",
      stop: "Stop",
      current_bpm: "Current cadence (bpm)",
      status: "Status",
      time_left: "Time left",
      countdown_suffix: " (countdown)",

      hint_accel:
        "Progressive: cadence ramps linearly from start to end, then stops automatically.",
      hint_steady:
        "Fixed (timed): constant cadence for the selected duration, then stops automatically.",
      hint_random:
        "Random: each beat uses a random cadence between Min and Max for the selected duration, then stops automatically."
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

      start_options: "Démarrage & cycles",
      auto_restart_label: "Redémarrage automatique",
      auto_restart_delay_label: "Délai de redémarrage (s)",

      preset: "Préréglage 40 → 50 en 120 s",
      start: "Démarrer",
      stop: "Arrêter",
      current_bpm: "Cadence actuelle (bpm)",
      status: "Statut",
      time_left: "Temps restant",
      countdown_suffix: " (compte à rebours)",

      hint_accel:
        "Cadence progressive : la cadence augmente linéairement de la valeur de départ à la valeur d’arrivée, puis s’arrête automatiquement.",
      hint_steady:
        "Cadence fixe (durée) : cadence constante pendant la durée choisie, puis arrêt automatique.",
      hint_random:
        "Cadence aléatoire : chaque battement utilise une cadence tirée entre Min et Max pendant la durée choisie, puis arrêt automatique."
    }
  };

  const $ = sel => document.querySelector(sel);

  // ---------- DOM refs ----------
  const startBpmEl   = $('#startBpm');
  const endBpmEl     = $('#endBpm');
  const rampEl       = $('#rampSeconds');

  const steadyBpmEl  = $('#steadyBpm');
  const steadySecsEl = $('#steadySeconds');

  const minBpmEl     = $('#minBpm');
  const maxBpmEl     = $('#maxBpm');
  const randomSecsEl = $('#randomSeconds');

  const volEl    = $('#volume');
  const bpmNowEl = $('#bpmNow');
  const statusEl = $('#status');
  const timeLeftEl = $('#timeLeft');
  const startBtn = $('#startBtn');
  const stopBtn  = $('#stopBtn');
  const presetBtn = $('#preset');
  const langSelect = $('#langSelect');
  const modeSelect = $('#mode');
  const hintEl   = $('#hintText');

  const autoRestartEl = $('#autoRestart');
  const autoRestartDelayEl = $('#autoRestartDelay');

  const overlayEl = $('#overlay');
  const countdownEl = $('#countdown');

  // petit accès direct au label "Temps restant"
  const timeLeftLabelEl = document.querySelector('small.i18n[data-key="time_left"]');

  const panels = Array.from(document.querySelectorAll('.mode-panel'));

  // ---------- State ----------
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  let currentMode = localStorage.getItem('pt_mode') || MODES.ACCEL;
  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;
  let startTime = 0;          // moment de départ des clics
  let nextNoteTime = 0;       // prochaine planification
  let lookaheadTimer = null;
  let rafId = null;
  let sessionEndTime = null;  // fin auto session
  let lastRandomBpm = null;

  // Countdown, auto-restart & repos
  let countdownAbort = false;
  let autoRestartTimerId = null;
  let manualStop = false;
  let restEndTime = null;     // fin de la phase de repos
  let restRafId = null;       // animation frame pendant repos

  // Scheduler params
  const scheduleAheadTime = 0.15; // s
  const lookahead = 25;           // ms
  const clickHz = 880;
  const clickLen = 0.03;

  // ---------- Init ----------
  const savedLang = localStorage.getItem('pt_lang') || (navigator.language?.startsWith('fr') ? 'fr' : 'en');
  modeSelect.value = currentMode;
  langSelect.value = savedLang;
  showPanelFor(currentMode);
  applyI18n(savedLang);

  // ---------- i18n helpers ----------
  function applyI18n(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('.i18n').forEach(el => {
      const key = el.getAttribute('data-key');
      if (i18nDict[lang] && i18nDict[lang][key]) el.textContent = i18nDict[lang][key];
    });
    updateHintText();
    // ajuste l'étiquette selon l'état (compte à rebours actif ?)
    setTimeLeftLabel(isCountdownActive());
  }
  function updateHintText() {
    const L = i18nDict[langSelect.value];
    const key =
      currentMode === MODES.ACCEL ? 'hint_accel' :
      currentMode === MODES.STEADY ? 'hint_steady' : 'hint_random';
    hintEl.textContent = L[key] || '';
  }
  function setTimeLeftLabel(isCountdown) {
    const L = i18nDict[langSelect.value];
    if (timeLeftLabelEl) {
      timeLeftLabelEl.textContent = L.time_left + (isCountdown ? (L.countdown_suffix || "") : "");
    }
  }
  function isCountdownActive() {
    // actif si overlay affiché (avant départ) OU pendant repos (auto-restart en attente)
    const overlayActive = !overlayEl.classList.contains('hidden');
    return overlayActive || !!restEndTime;
  }

  // ---------- UI bindings ----------
  langSelect.addEventListener('change', () => {
    localStorage.setItem('pt_lang', langSelect.value);
    applyI18n(langSelect.value);
  });

  modeSelect.addEventListener('change', () => {
    currentMode = modeSelect.value;
    localStorage.setItem('pt_mode', currentMode);
    showPanelFor(currentMode);
    updateHintText();
    updateTimeLeftDisplay();
  });

  // Ne jamais masquer le panneau « commun »
  function showPanelFor(mode) {
    panels.forEach(p => {
      if (p.classList.contains('common')) {
        p.classList.remove('hidden');
      } else {
        p.classList.toggle('hidden', p.getAttribute('data-mode') !== mode);
      }
    });
  }

  // ---------- Audio ----------
  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = Number(volEl.value) / 100;
      masterGain.connect(audioCtx.destination);
    }
  }
  function scheduleClick(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = clickHz;
    const g = Math.max(0.0001, masterGain.gain.value);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(g, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(Math.max(1e-4, g * 0.001), time + clickLen);
    gain.gain.setValueAtTime(0, time + clickLen + 0.01);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + clickLen + 0.02);
  }

  // ---------- Cadence progressive ----------
  function accelBpmAt(elapsed) {
    // elapsed en secondes depuis startTime
    let b0 = clamp(Number(startBpmEl.value || 0), 20, 300);
    let b1 = clamp(Number(endBpmEl.value   || 0), 20, 300);
    const T = Math.max(0, Number(rampEl.value || 0));
    if (T <= 0) return b1;              // saut instantané
    if (elapsed <= 0) return b0;
    if (elapsed >= T) return b1;
    const k = (b1 - b0) / T;
    return b0 + k * elapsed;
  }

  // ---------- Scheduler ----------
  function scheduler() {
    // Arrêt auto
    if (sessionEndTime && audioCtx.currentTime >= sessionEndTime) {
      stop(true);
      return;
    }

    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
      scheduleClick(nextNoteTime);

      let interval;
      if (currentMode === MODES.ACCEL) {
        const elapsed = Math.max(0, nextNoteTime - startTime);
        const bpm = Math.max(1, accelBpmAt(elapsed));
        interval = 60.0 / bpm;
      } else if (currentMode === MODES.STEADY) {
        const bpm = clamp(Number(steadyBpmEl.value), 20, 300);
        interval = 60.0 / bpm;
      } else { // RANDOM
        let lo = clamp(Number(minBpmEl.value), 20, 300);
        let hi = clamp(Number(maxBpmEl.value), 20, 300);
        if (lo > hi) [lo, hi] = [hi, lo];
        const bpm = lastRandomBpm = lo + Math.random() * (hi - lo);
        interval = 60.0 / bpm;
      }

      // Évite de dépasser la fin de session
      if (sessionEndTime && nextNoteTime + interval > sessionEndTime) {
        nextNoteTime = sessionEndTime + 1; // force sortie
      } else {
        nextNoteTime += interval;
      }
    }
  }

  function updateReadout() {
    if (!isPlaying) {
      bpmNowEl.textContent = '—';
      updateTimeLeftDisplay(); // peut afficher le compte à rebours de repos
      return;
    }
    // Affichage cadence actuelle basé sur le temps réel
    const now = audioCtx.currentTime;
    if (currentMode === MODES.ACCEL) {
      const elapsed = Math.max(0, now - startTime);
      const bpm = Math.max(1, accelBpmAt(elapsed));
      bpmNowEl.textContent = bpm.toFixed(1);
    } else if (currentMode === MODES.STEADY) {
      bpmNowEl.textContent = clamp(Number(steadyBpmEl.value), 20, 300).toFixed(1);
    } else {
      bpmNowEl.textContent = lastRandomBpm ? lastRandomBpm.toFixed(1) : '—';
    }

    updateTimeLeftDisplay();
    rafId = requestAnimationFrame(updateReadout);
  }

  function secondsToMMSS(s) {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  }
  function updateTimeLeftDisplay() {
    if (sessionEndTime) {
      const left = sessionEndTime - (audioCtx ? audioCtx.currentTime : 0);
      timeLeftEl.textContent = left > 0 ? secondsToMMSS(left) : '0:00';
      setTimeLeftLabel(false);
    } else if (restEndTime) {
      const left = restEndTime - (audioCtx ? audioCtx.currentTime : 0);
      timeLeftEl.textContent = left > 0 ? secondsToMMSS(left) : '0:00';
      setTimeLeftLabel(true); // afficher "(compte à rebours)"
    } else {
      timeLeftEl.textContent = '—';
      setTimeLeftLabel(false);
    }
  }

  // Raf de repos (pour mettre à jour "Temps restant")
  function startRestUI() {
    if (restRafId) cancelAnimationFrame(restRafId);
    const loop = () => {
      if (!restEndTime) { restRafId = null; return; }
      updateTimeLeftDisplay();
      restRafId = requestAnimationFrame(loop);
    };
    loop();
  }
  function stopRestUI() {
    if (restRafId) { cancelAnimationFrame(restRafId); restRafId = null; }
    restEndTime = null;
    updateTimeLeftDisplay();
  }

  // ---------- Compte à rebours ----------
  function runCountdown() {
    return new Promise((resolve, reject) => {
      countdownAbort = false;
      overlayEl.classList.remove('hidden');
      setTimeLeftLabel(true); // montrer "(compte à rebours)" pendant le CR

      const steps = ['4','3','2','1','GO'];
      let idx = 0;
      (function next() {
        if (countdownAbort) { overlayEl.classList.add('hidden'); setTimeLeftLabel(!!restEndTime); return reject(new Error('aborted')); }
        countdownEl.textContent = steps[idx];
        idx++;
        if (idx < steps.length) setTimeout(next, 1000);
        else setTimeout(() => { overlayEl.classList.add('hidden'); setTimeLeftLabel(!!restEndTime); resolve(); }, 400);
      })();
    });
  }

  // ---------- Start / Stop ----------
  async function start() {
    // Si un redémarrage était planifié, on l'annule (l'utilisateur force le départ)
    if (autoRestartTimerId) { clearTimeout(autoRestartTimerId); autoRestartTimerId = null; }
    stopRestUI();

    currentMode = modeSelect.value;
    localStorage.setItem('pt_mode', currentMode);
    showPanelFor(currentMode);
    updateHintText();

    ensureAudio();
    await audioCtx.resume();

    // Compte à rebours
    startBtn.disabled = true;
    stopBtn.disabled = false;
    setStatus(langSelect.value === 'fr' ? 'prêt...' : 'ready...');
    try { await runCountdown(); }
    catch { startBtn.disabled = false; stopBtn.disabled = true; setStatus(langSelect.value === 'fr' ? 'interrompu' : 'aborted'); return; }

    isPlaying = true; manualStop = false;
    setStatus(langSelect.value === 'fr' ? 'lecture' : 'playing');
    masterGain.gain.value = Number(volEl.value) / 100;

    // Point de départ exact
    startTime = audioCtx.currentTime + 0.1;
    nextNoteTime = startTime;

    // Fin automatique par mode (relative à startTime)
    sessionEndTime = null; lastRandomBpm = null;
    if (currentMode === MODES.ACCEL) {
      const T = Math.max(0, Number(rampEl.value));
      if (T > 0) sessionEndTime = startTime + T;
    } else if (currentMode === MODES.STEADY) {
      const secs = Math.max(1, Number(steadySecsEl.value));
      sessionEndTime = startTime + secs;
    } else {
      const secs = Math.max(1, Number(randomSecsEl.value));
      sessionEndTime = startTime + secs;
    }

    if (lookaheadTimer) clearInterval(lookaheadTimer);
    lookaheadTimer = setInterval(scheduler, lookahead);
    updateReadout();
  }

  function stop(finished = false) {
    // Arrêt CR si en cours
    countdownAbort = true;

    if (!audioCtx && !finished) return;

    isPlaying = false;

    const fr = langSelect.value === 'fr';
    setStatus(finished ? (fr ? 'terminé' : 'finished') : (fr ? 'arrêté' : 'stopped'));

    // Par défaut : Start activé, Stop désactivé...
    startBtn.disabled = false;
    stopBtn.disabled = true;

    // ...sauf si on passe en "repos" (auto-restart activé) : laisser STOP actif pour annuler
    const wantRestart = autoRestartEl.checked;
    const delaySec = Math.max(1, Number(autoRestartDelayEl.value || 0));
    if (finished && wantRestart && !manualStop) {
      // UI de repos : STOP actif pour annuler, START actif pour repartir tout de suite
      stopBtn.disabled = false;
      startBtn.disabled = false;

      // Statut + minuterie de repos
      setStatus(fr ? `compte à rebours avant redémarrage` : `countdown before restart`);
      if (audioCtx) {
        restEndTime = audioCtx.currentTime + delaySec;
        startRestUI();
        setTimeLeftLabel(true); // indiquer "(compte à rebours)"
      }

      // Timer réel de redémarrage
      autoRestartTimerId = setTimeout(() => {
        autoRestartTimerId = null;
        stopRestUI();
        start(); // relance (avec compte à rebours)
      }, delaySec * 1000);
    } else {
      // Pas de repos planifié
      manualStop = true;
      if (autoRestartTimerId) { clearTimeout(autoRestartTimerId); autoRestartTimerId = null; }
      stopRestUI();
      setTimeLeftLabel(false);
    }

    if (lookaheadTimer) { clearInterval(lookaheadTimer); lookaheadTimer = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    bpmNowEl.textContent = '—';
    sessionEndTime = null;
    lastRandomBpm = null;
    updateTimeLeftDisplay();
  }

  // ---------- Events ----------
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', () => {
    // Si on est en repos (auto-restart en attente), ce stop annule la relance et revient à l'état "au repos"
    manualStop = true;
    if (autoRestartTimerId) { clearTimeout(autoRestartTimerId); autoRestartTimerId = null; }
    stopRestUI();
    stop(false);
  });

  volEl.addEventListener('input', () => { if (masterGain) masterGain.gain.value = Number(volEl.value) / 100; });

  presetBtn.addEventListener('click', () => {
    modeSelect.value = MODES.ACCEL;
    currentMode = MODES.ACCEL;
    localStorage.setItem('pt_mode', currentMode);
    showPanelFor(currentMode);
    updateHintText();
    startBpmEl.value = 40; endBpmEl.value = 50; rampEl.value = 120;
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); if (startBtn.disabled) stop(); else start(); }
  });

  // Validation simple
  [startBpmEl, endBpmEl, steadyBpmEl, minBpmEl, maxBpmEl].forEach(inp => {
    inp?.addEventListener('change', () => { inp.value = clamp(Number(inp.value || 0), 20, 300); });
  });
  [rampEl, steadySecsEl, randomSecsEl, autoRestartDelayEl].forEach(inp => {
    inp?.addEventListener('change', () => { inp.value = Math.max(0, Number(inp.value || 0)); });
  });

  // Aide initiale + label
  updateHintText();
  setStatus('au repos');
  setTimeLeftLabel(false);
})();
