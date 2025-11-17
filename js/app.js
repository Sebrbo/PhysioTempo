/*!
 * PhysioTempo — robust build with null-safety (countdown + auto-restart)
 * Build: 2025-11-17 v8
 * Code: PolyForm Noncommercial 1.0.0 | Assets: CC BY-NC 4.0
 */
(() => {
  'use strict';

  // ---------- Modes ----------
  const MODES = { ACCEL: 'accel', STEADY: 'steady', RANDOM: 'random' };

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const safeNum = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
  const nowISO = () => new Date().toISOString().slice(11,19);

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

  // ---------- DOM refs (tous null-safe) ----------
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
  const timeLeftLabelEl = document.querySelector('small.i18n[data-key="time_left"]');

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

  const panels = Array.from(document.querySelectorAll('.mode-panel'));

  // ---------- State ----------
  let currentMode = localStorage.getItem('pt_mode') || MODES.ACCEL;
  let audioCtx = null, masterGain = null;
  let isPlaying = false;
  let startTime = 0, nextNoteTime = 0;
  let lookaheadTimer = null, rafId = null;
  let sessionEndTime = null;         // fin AUTO de la session en cours
  let lastRandomBpm = null;

  // Countdown & auto-restart & rest
  let countdownAbort = false;
  let autoRestartTimerId = null;
  let manualStop = false;
  let restEndTime = null;
  let restRafId = null;

  // Scheduler params
  const scheduleAheadTime = 0.15; // s
  const lookahead = 25;           // ms
  const clickHz = 880;
  const clickLen = 0.03;

  // ---------- Boot ----------
  const savedLang = localStorage.getItem('pt_lang') || (navigator.language?.startsWith('fr') ? 'fr' : 'en');
  if (modeSelect) modeSelect.value = currentMode;
  if (langSelect) langSelect.value = savedLang;
  showPanelFor(currentMode);
  applyI18n(savedLang);
  setStatus('au repos');

  console.log(`[PhysioTempo ${nowISO()}] Boot v8; lang=${savedLang}; mode=${currentMode}`);

  // ---------- i18n ----------
  function applyI18n(lang) {
    try {
      document.documentElement.lang = lang;
      document.querySelectorAll('.i18n').forEach(el => {
        const key = el.getAttribute('data-key');
        if (i18nDict[lang] && i18nDict[lang][key]) el.textContent = i18nDict[lang][key];
      });
      updateHintText();
      setTimeLeftLabel(isCountdownActive());
    } catch(e) { console.warn('i18n error', e); }
  }
  function updateHintText() {
    if (!hintEl) return;
    const L = i18nDict[lang()];
    const key = currentMode === MODES.ACCEL ? 'hint_accel'
              : currentMode === MODES.STEADY ? 'hint_steady' : 'hint_random';
    hintEl.textContent = L[key] || '';
  }
  function setTimeLeftLabel(isCountdown) {
    if (!timeLeftLabelEl) return;
    const L = i18nDict[lang()];
    timeLeftLabelEl.textContent = L.time_left + (isCountdown ? (L.countdown_suffix || '') : '');
  }
  function isCountdownActive() {
    const overlayActive = !!overlayEl && !overlayEl.classList.contains('hidden');
    return overlayActive || !!restEndTime;
  }
  function lang(){ return (langSelect && langSelect.value) || savedLang; }

  // ---------- UI events ----------
  langSelect?.addEventListener('change', () => {
    localStorage.setItem('pt_lang', lang());
    applyI18n(lang());
  });

  modeSelect?.addEventListener('change', () => {
    currentMode = modeSelect.value;
    localStorage.setItem('pt_mode', currentMode);
    showPanelFor(currentMode);
    updateHintText();
    updateTimeLeftDisplay();
  });

  function showPanelFor(mode) {
    panels.forEach(p => {
      if (p.classList.contains('common')) {
        p.classList.remove('hidden'); // jamais masqué
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
      masterGain.gain.value = safeNum(volEl?.value, 60) / 100;
      masterGain.connect(audioCtx.destination);
    }
  }
  function scheduleClick(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const g = Math.max(0.0001, masterGain.gain.value);
    osc.frequency.value = clickHz;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(g, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(Math.max(1e-4, g * 0.001), time + clickLen);
    gain.gain.setValueAtTime(0, time + clickLen + 0.01);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(time); osc.stop(time + clickLen + 0.02);
  }

  // ---------- Accel cadence ----------
  function accelBpmAt(elapsed) {
    const b0 = clamp(safeNum(startBpmEl?.value, 40), 20, 300);
    const b1 = clamp(safeNum(endBpmEl?.value, 50), 20, 300);
    const T  = Math.max(0, safeNum(rampEl?.value, 0));
    if (T <= 0) return b1;
    if (elapsed <= 0) return b0;
    if (elapsed >= T) return b1;
    return b0 + (b1 - b0) * (elapsed / T);
  }

  // ---------- Scheduler ----------
  function scheduler() {
    if (!audioCtx) return;

    // Fin auto
    if (sessionEndTime && audioCtx.currentTime >= sessionEndTime) {
      stop(true);
      return;
    }

    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
      scheduleClick(nextNoteTime);

      let interval = 0.5; // fallback
      if (currentMode === MODES.ACCEL) {
        const elapsed = Math.max(0, nextNoteTime - startTime);
        const bpm = Math.max(1, accelBpmAt(elapsed));
        interval = 60 / bpm;
      } else if (currentMode === MODES.STEADY) {
        const bpm = clamp(safeNum(steadyBpmEl?.value, 60), 20, 300);
        interval = 60 / bpm;
      } else {
        let lo = clamp(safeNum(minBpmEl?.value, 40), 20, 300);
        let hi = clamp(safeNum(maxBpmEl?.value, 60), 20, 300);
        if (lo > hi) [lo, hi] = [hi, lo];
        const bpm = lastRandomBpm = lo + Math.random() * (hi - lo);
        interval = 60 / bpm;
      }

      if (sessionEndTime && nextNoteTime + interval > sessionEndTime) {
        nextNoteTime = sessionEndTime + 1;
      } else {
        nextNoteTime += interval;
      }
    }
  }

  function updateReadout() {
    if (!audioCtx) return;

    if (!isPlaying) {
      bpmNowEl && (bpmNowEl.textContent = '—');
      updateTimeLeftDisplay();
      return;
    }

    if (currentMode === MODES.ACCEL) {
      const elapsed = Math.max(0, audioCtx.currentTime - startTime);
      const bpm = Math.max(1, accelBpmAt(elapsed));
      bpmNowEl && (bpmNowEl.textContent = bpm.toFixed(1));
    } else if (currentMode === MODES.STEADY) {
      bpmNowEl && (bpmNowEl.textContent = clamp(safeNum(steadyBpmEl?.value, 60), 20, 300).toFixed(1));
    } else {
      bpmNowEl && (bpmNowEl.textContent = lastRandomBpm ? lastRandomBpm.toFixed(1) : '—');
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
    if (!timeLeftEl) return;
    if (!audioCtx) { timeLeftEl.textContent = '—'; return; }

    if (sessionEndTime) {
      const left = sessionEndTime - audioCtx.currentTime;
      timeLeftEl.textContent = left > 0 ? secondsToMMSS(left) : '0:00';
      setTimeLeftLabel(false);
    } else if (restEndTime) {
      const left = restEndTime - audioCtx.currentTime;
      timeLeftEl.textContent = left > 0 ? secondsToMMSS(left) : '0:00';
      setTimeLeftLabel(true);
    } else {
      timeLeftEl.textContent = '—';
      setTimeLeftLabel(false);
    }
  }

  function startRestUI() {
    if (restRafId) cancelAnimationFrame(restRafId);
    const loop = () => {
      if (!restEndTime || !audioCtx) { restRafId = null; return; }
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

  // ---------- Countdown ----------
  function runCountdown() {
    return new Promise((resolve, reject) => {
      // Si pas d’overlay, on fait un simple délai 4s sans planter
      if (!overlayEl || !countdownEl) {
        console.warn('Countdown overlay missing → fallback delay.');
        setTimeLeftLabel(true);
        const t0 = performance.now();
        const tick = () => {
          const dt = performance.now() - t0;
          if (countdownAbort) { setTimeLeftLabel(!!restEndTime); return reject(new Error('aborted')); }
          if (dt >= 4000) { setTimeLeftLabel(!!restEndTime); return resolve(); }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        return;
      }

      countdownAbort = false;
      overlayEl.classList.remove('hidden');
      setTimeLeftLabel(true);

      const steps = ['4','3','2','1','GO'];
      let idx = 0;
      (function next() {
        if (countdownAbort) {
          overlayEl.classList.add('hidden');
          setTimeLeftLabel(!!restEndTime);
          return reject(new Error('aborted'));
        }
        countdownEl.textContent = steps[idx];
        idx++;
        if (idx < steps.length) setTimeout(next, 1000);
        else setTimeout(() => {
          overlayEl.classList.add('hidden');
          setTimeLeftLabel(!!restEndTime);
          resolve();
        }, 400);
      })();
    });
  }

  // ---------- Start / Stop ----------
  async function start() {
    // Annule un redémarrage planifié
    if (autoRestartTimerId) { clearTimeout(autoRestartTimerId); autoRestartTimerId = null; }
    stopRestUI();

    currentMode = modeSelect?.value || MODES.ACCEL;
    localStorage.setItem('pt_mode', currentMode);
    showPanelFor(currentMode);
    updateHintText();

    ensureAudio();
    await audioCtx.resume();

    // Compte à rebours
    setStatus(lang() === 'fr' ? 'prêt...' : 'ready...');
    startBtn && (startBtn.disabled = true);
    stopBtn && (stopBtn.disabled = false);

    try { await runCountdown(); }
    catch { setStatus(lang() === 'fr' ? 'interrompu' : 'aborted'); startBtn && (startBtn.disabled = false); stopBtn && (stopBtn.disabled = true); return; }

    // Lecture
    isPlaying = true; manualStop = false;
    setStatus(lang() === 'fr' ? 'lecture' : 'playing');
    if (masterGain && volEl) masterGain.gain.value = safeNum(volEl.value, 60) / 100;

    startTime = audioCtx.currentTime + 0.1;
    nextNoteTime = startTime;

    // Fin auto de session (relative à startTime)
    sessionEndTime = null; lastRandomBpm = null;
    if (currentMode === MODES.ACCEL) {
      const T = Math.max(0, safeNum(rampEl?.value, 0));
      if (T > 0) sessionEndTime = startTime + T;
    } else if (currentMode === MODES.STEADY) {
      const secs = Math.max(1, safeNum(steadySecsEl?.value, 30));
      sessionEndTime = startTime + secs;
    } else {
      const secs = Math.max(1, safeNum(randomSecsEl?.value, 90));
      sessionEndTime = startTime + secs;
    }

    if (lookaheadTimer) clearInterval(lookaheadTimer);
    lookaheadTimer = setInterval(scheduler, lookahead);
    updateReadout();
  }

  function stop(finished = false) {
    countdownAbort = true;
    if (!audioCtx && !finished) return;

    isPlaying = false;
    const fr = lang() === 'fr';
    setStatus(finished ? (fr ? 'terminé' : 'finished') : (fr ? 'arrêté' : 'stopped'));

    // Par défaut
    startBtn && (startBtn.disabled = false);
    stopBtn && (stopBtn.disabled = true);

    // Repos (auto-restart) ?
    const wantRestart = !!autoRestartEl?.checked;
    const delaySec = Math.max(1, safeNum(autoRestartDelayEl?.value, 5));
    if (finished && wantRestart && !manualStop) {
      stopBtn && (stopBtn.disabled = false);
      startBtn && (startBtn.disabled = false);

      setStatus(fr ? `compte à rebours avant redémarrage` : `countdown before restart`);
      if (audioCtx) {
        restEndTime = audioCtx.currentTime + delaySec;
        startRestUI();
        setTimeLeftLabel(true);
      }
      autoRestartTimerId = setTimeout(() => {
        autoRestartTimerId = null;
        stopRestUI();
        start();
      }, delaySec * 1000);
    } else {
      manualStop = true;
      if (autoRestartTimerId) { clearTimeout(autoRestartTimerId); autoRestartTimerId = null; }
      stopRestUI();
      setTimeLeftLabel(false);
    }

    if (lookaheadTimer) { clearInterval(lookaheadTimer); lookaheadTimer = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    bpmNowEl && (bpmNowEl.textContent = '—');
    sessionEndTime = null; lastRandomBpm = null;
    updateTimeLeftDisplay();
  }

  // ---------- Wiring ----------
  startBtn?.addEventListener('click', start);
  stopBtn?.addEventListener('click', () => {
    manualStop = true;
    if (autoRestartTimerId) { clearTimeout(autoRestartTimerId); autoRestartTimerId = null; }
    stopRestUI();
    stop(false);
  });
  volEl?.addEventListener('input', () => { if (masterGain) masterGain.gain.value = safeNum(volEl.value, 60) / 100; });
  presetBtn?.addEventListener('click', () => {
    if (modeSelect) modeSelect.value = MODES.ACCEL;
    currentMode = MODES.ACCEL;
    localStorage.setItem('pt_mode', currentMode);
    showPanelFor(currentMode);
    updateHintText();
    if (startBpmEl) startBpmEl.value = 40;
    if (endBpmEl)   endBpmEl.value   = 50;
    if (rampEl)     rampEl.value     = 120;
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); if (startBtn?.disabled) stop(); else start(); }
  });

  // Number guards
  [startBpmEl, endBpmEl, steadyBpmEl, minBpmEl, maxBpmEl].forEach(inp => {
    inp?.addEventListener('change', () => { inp.value = clamp(safeNum(inp.value, 0), 20, 300); });
  });
  [rampEl, steadySecsEl, randomSecsEl, autoRestartDelayEl].forEach(inp => {
    inp?.addEventListener('change', () => { inp.value = Math.max(0, safeNum(inp.value, 0)); });
  });

  // ---------- Utils ----------
  function setStatus(text) { statusEl && (statusEl.textContent = text); }
})();
