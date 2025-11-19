/*!
 * PhysioTempo — no UI volume, boosted output + compressor + iOS fixes + Wake Lock
 * Build: 2025-11-19 v13
 * Code: PolyForm Noncommercial 1.0.0 | Assets: CC BY-NC 4.0
 */
(() => {
  'use strict';

  // ---------- Config volume ----------
  // Gain global envoyé au système (0.0–2.0 recommandé)
  const MASTER_GAIN = 1.0;
  // Niveau relatif des bips de TEMPO (0.0–2.0)
  const VOL_TEMPO = 1.2;
  // Niveau relatif du COMPTE À REBOURS (bips/voix via WebAudio) (0.0–2.0)
  const VOL_COUNTDOWN = 1.4;

  // ---------- Modes / helpers ----------
  const MODES = { ACCEL: 'accel', STEADY: 'steady', RANDOM: 'random' };
  const $ = (sel) => document.querySelector(sel);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const safeNum = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
  const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);

  // ---------- i18n ----------
  const i18nDict = {
    en: {
      language: "Language",
      mode_label: "Cadence",
      mode_accel: "Progressive cadence",
      mode_steady: "Fixed cadence (timed)",
      mode_random: "Random cadence",
      start_bpm_label: "Start cadence (bpm)",
      end_bpm_label: "Ramp end (bpm)",
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
      countdown_sound_label: "Countdown sound",
      cd_none: "Mute",
      cd_beep: "Beep",
      cd_voice: "Voice (EN/FR)",
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
        "Random: each beat uses a random cadence between Min and Max for the selected duration, then stops automatically.",
      voice_steps: ["four","three","two","one","go"]
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
      countdown_sound_label: "Signal du compte à rebours",
      cd_none: "Muet",
      cd_beep: "Bip",
      cd_voice: "Voix (FR/EN)",
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
        "Cadence aléatoire : chaque battement utilise une cadence tirée entre Min et Max pendant la durée choisie, puis arrêt automatique.",
      voice_steps: ["quatre","trois","deux","un","partez"]
    }
  };

  // ---------- DOM refs (null-safe) ----------
  const startBpmEl   = $('#startBpm');
  const endBpmEl     = $('#endBpm');
  const rampEl       = $('#rampSeconds');
  const steadyBpmEl  = $('#steadyBpm');
  const steadySecsEl = $('#steadySeconds');
  const minBpmEl     = $('#minBpm');
  const maxBpmEl     = $('#maxBpm');
  const randomSecsEl = $('#randomSeconds');
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
  const countdownSoundEl = $('#countdownSound');  // Muet/Bip/Voix
  const overlayEl = $('#overlay');
  const countdownEl = $('#countdown');
  const iosVoiceNoteEl = $('#iosVoiceNote');
  if (iosVoiceNoteEl) iosVoiceNoteEl.style.display = isIOS ? 'block' : 'none';
  const panels = Array.from(document.querySelectorAll('.mode-panel'));

  // ---------- State ----------
  let currentMode = localStorage.getItem('pt_mode') || MODES.ACCEL;
  let audioCtx = null, masterGain = null, compressor = null;
  let isPlaying = false;
  let startTime = 0, nextNoteTime = 0;
  let lookaheadTimer = null, rafId = null;
  let sessionEndTime = null, lastRandomBpm = null;
  let countdownAbort = false;
  let autoRestartTimerId = null;
  let manualStop = false;
  let restEndTime = null, restRafId = null;
  let audioUnlocked = false;
  let lastCdStep = -1;
  let wakeLock = null;

  // Précharge facultative des fichiers audio (si tu en ajoutes)
  const voiceBuffers = { fr: {}, en: {} };

  // Scheduler params
  const scheduleAheadTime = 0.15; // s
  const lookahead = 25;           // ms
  const clickHz = 880;
  const clickLen = 0.03;

  // ---------- Init ----------
  const savedLang = localStorage.getItem('pt_lang') || (navigator.language?.startsWith('fr') ? 'fr' : 'en');
  if (modeSelect) modeSelect.value = currentMode;
  if (langSelect) langSelect.value = savedLang;
  showPanelFor(currentMode);
  applyI18n(savedLang);
  setStatus('au repos');

  const savedCd = localStorage.getItem('pt_cd_sound') || 'beep';
  if (countdownSoundEl) countdownSoundEl.value = savedCd;

  // ---------- i18n helpers ----------
  function L() { return i18nDict[langSelect?.value || savedLang]; }
  function applyI18n(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('.i18n').forEach(el => {
      const key = el.getAttribute('data-key');
      if (i18nDict[lang] && i18nDict[lang][key]) el.textContent = i18nDict[lang][key];
    });
    updateHintText();
    setTimeLeftLabel(isCountdownActive());
  }
  function updateHintText() {
    if (!hintEl) return;
    const key = currentMode === MODES.ACCEL ? 'hint_accel'
              : currentMode === MODES.STEADY ? 'hint_steady' : 'hint_random';
    hintEl.textContent = L()[key] || '';
  }
  function setTimeLeftLabel(isCountdown) {
    if (!timeLeftLabelEl) return;
    timeLeftLabelEl.textContent = L().time_left + (isCountdown ? (L().countdown_suffix || '') : '');
  }
  function isCountdownActive() {
    const overlayActive = !!overlayEl && !overlayEl.classList.contains('hidden');
    return overlayActive || !!restEndTime;
  }

  // ---------- UI events ----------
  langSelect?.addEventListener('change', () => {
    localStorage.setItem('pt_lang', langSelect.value);
    applyI18n(langSelect.value);
    preloadVoiceAudio().catch(()=>{});
  });

  modeSelect?.addEventListener('change', () => {
    currentMode = modeSelect.value;
    localStorage.setItem('pt_mode', currentMode);
    showPanelFor(currentMode);
    updateHintText();
    updateTimeLeftDisplay();
  });

  countdownSoundEl?.addEventListener('change', () => {
    localStorage.setItem('pt_cd_sound', countdownSoundEl.value);
  });

  function showPanelFor(mode) {
    panels.forEach(p => {
      if (p.classList.contains('common')) p.classList.remove('hidden');
      else p.classList.toggle('hidden', p.getAttribute('data-mode') !== mode);
    });
  }

  // ---------- Audio graph ----------
  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // Master gain → compressor → destination
      masterGain = audioCtx.createGain();
      masterGain.gain.value = clamp(MASTER_GAIN, 0.0, 2.0);

      compressor = audioCtx.createDynamicsCompressor();
      // réglage doux : limite les pics si VOL_* élevés
      compressor.threshold.value = -12;
      compressor.knee.value = 4;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      masterGain.connect(compressor);
      compressor.connect(audioCtx.destination);
    }
  }
  function unlockAudioOnce() {
    if (audioUnlocked) return;
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    osc.connect(g); g.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.01);
    audioUnlocked = true;
  }

  function scheduleClick(time) {
    // Bip de TEMPO (pendant la session)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const g = clamp(VOL_TEMPO, 0.0001, 2.0);
    osc.frequency.value = clickHz;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(g, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(Math.max(1e-4, g * 0.001), time + clickLen);
    gain.gain.setValueAtTime(0, time + clickLen + 0.01);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(time); osc.stop(time + clickLen + 0.02);
  }

  // Bips du compte à rebours
  function beepOnceCountdown(freq = 800, ms = 140) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const vol = clamp(VOL_COUNTDOWN, 0.0001, 2.0);
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(Math.max(1e-4, vol * 0.001), audioCtx.currentTime + ms/1000);
    osc.connect(g); g.connect(masterGain);
    osc.start(); osc.stop(audioCtx.currentTime + ms/1000 + 0.05);
  }
  function beepForStep(stepIdx) {
    const map = [700, 780, 860, 940, 1200]; // GO plus aigu
    beepOnceCountdown(map[Math.min(stepIdx, map.length-1)], stepIdx === 4 ? 200 : 140);
  }

  // ---------- Voix (TTS) ----------
  function waitForVoices(timeout = 1500) {
    return new Promise((resolve) => {
      const done = () => resolve(window.speechSynthesis.getVoices());
      const id = setTimeout(done, timeout);
      try { window.speechSynthesis.getVoices(); } catch {}
      try { window.speechSynthesis.onvoiceschanged = () => { clearTimeout(id); done(); }; } catch {}
    });
  }
  async function speak(text) {
    if (!('speechSynthesis' in window)) return false;
    try { window.speechSynthesis.cancel(); } catch {}
    const voices = await waitForVoices(1200);
    const isFr = (langSelect?.value || savedLang).startsWith('fr');
    const lang = isFr ? 'fr-FR' : 'en-US';
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 1.0; u.pitch = 1.0;
    // SpeechSynthesis volume ∈ [0..1] → on borne VOL_COUNTDOWN
    u.volume = Math.min(1, Math.max(0, VOL_COUNTDOWN));
    const v = voices.find(v => v.lang?.toLowerCase().startsWith(lang.toLowerCase()));
    if (v) u.voice = v;
    try { window.speechSynthesis.speak(u); return true; }
    catch { return false; }
  }
  function cancelSpeech() { try { window.speechSynthesis?.cancel(); } catch {} }

  // ---------- Voix via fichiers audio (facultatif) ----------
  async function preloadVoiceAudio() {
    try {
      ensureAudio();
      const iso = (langSelect?.value || savedLang).startsWith('fr') ? 'fr' : 'en';
      const files = ['4.mp3','3.mp3','2.mp3','1.mp3','go.mp3'];
      for (let i = 0; i < files.length; i++) {
        if (voiceBuffers[iso][i]) continue;
        const url = `audio/${iso}/${files[i]}`;
        try {
          const resp = await fetch(url, { cache: 'force-cache' });
          if (!resp.ok) continue;
          const arr = await resp.arrayBuffer();
          voiceBuffers[iso][i] = await audioCtx.decodeAudioData(arr);
        } catch {}
      }
    } catch {}
  }
  async function playVoiceAudio(stepIdx) {
    try {
      ensureAudio();
      const iso = (langSelect?.value || savedLang).startsWith('fr') ? 'fr' : 'en';
      if (!voiceBuffers[iso][stepIdx]) await preloadVoiceAudio();
      const buf = voiceBuffers[iso][stepIdx];
      if (!buf) return false;
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      const g = audioCtx.createGain();
      const vol = clamp(VOL_COUNTDOWN, 0.0001, 2.0);
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      src.connect(g); g.connect(masterGain);
      src.start();
      return true;
    } catch { return false; }
  }

  // ---------- Cadence progressive ----------
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
    if (sessionEndTime && audioCtx.currentTime >= sessionEndTime) { stop(true); return; }

    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
      scheduleClick(nextNoteTime);

      let interval = 0.5;
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
    if (!isPlaying) { bpmNowEl && (bpmNowEl.textContent = '—'); updateTimeLeftDisplay(); return; }

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
    if (!timeLeftEl || !audioCtx) return;
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

  // ---------- Countdown (visuel + son) ----------
  function playCountdownCue(stepIdx) {
    if (stepIdx === lastCdStep) return; // anti-doublon
    lastCdStep = stepIdx;

    const mode = countdownSoundEl?.value || 'beep';
    if (mode === 'none') return;

    if (mode === 'beep') { beepForStep(stepIdx); return; }

    if (mode === 'voice') {
      // 1) essaye audio local (si présent), 2) TTS, 3) bip
      playVoiceAudio(stepIdx).then(ok => {
        if (ok) return;
        const words = L().voice_steps;
        const txt = words[Math.min(stepIdx, words.length - 1)];
        if (!txt) return;
        speak(txt).then(spoke => { if (!spoke) beepForStep(stepIdx); });
      });
    }
  }

  function runCountdown() {
    return new Promise((resolve, reject) => {
      lastCdStep = -1;
      const hasOverlay = overlayEl && countdownEl;
      countdownAbort = false;
      setTimeLeftLabel(true);

      const steps = ['4','3','2','1','GO'];
      if (hasOverlay) overlayEl.classList.remove('hidden');

      let idx = 0;
      (function next() {
        if (countdownAbort) {
          if (hasOverlay) overlayEl.classList.add('hidden');
          cancelSpeech();
          setTimeLeftLabel(!!restEndTime);
          return reject(new Error('aborted'));
        }
        if (hasOverlay) countdownEl.textContent = steps[idx];

        playCountdownCue(idx);

        idx++;
        if (idx < steps.length) setTimeout(next, 1000);
        else setTimeout(() => {
          if (hasOverlay) overlayEl.classList.add('hidden');
          setTimeLeftLabel(!!restEndTime);
          resolve();
        }, 300);
      })();
    });
  }

  // ---------- Wake Lock (anti-veille) ----------
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock?.request) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {});
        document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
      }
    } catch {}
  }
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && !wakeLock && isPlaying) {
      requestWakeLock();
    }
  }
  async function releaseWakeLock() {
    try { await wakeLock?.release(); } catch {}
    wakeLock = null;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  window.addEventListener('pagehide', releaseWakeLock);
  window.addEventListener('beforeunload', releaseWakeLock);

  // ---------- Start / Stop ----------
  async function start() {
    if (autoRestartTimerId) { clearTimeout(autoRestartTimerId); autoRestartTimerId = null; }
    stopRestUI();

    currentMode = modeSelect?.value || MODES.ACCEL;
    localStorage.setItem('pt_mode', currentMode);
    showPanelFor(currentMode);
    updateHintText();

    ensureAudio();
    unlockAudioOnce();
    await audioCtx.resume();
    requestWakeLock();

    setStatus((langSelect?.value || savedLang).startsWith('fr') ? 'prêt...' : 'ready...');
    startBtn && (startBtn.disabled = true);
    stopBtn && (stopBtn.disabled = false);

    preloadVoiceAudio().catch(()=>{});

    try { await runCountdown(); }
    catch { setStatus((langSelect?.value || savedLang).startsWith('fr') ? 'interrompu' : 'aborted'); startBtn && (startBtn.disabled = false); stopBtn && (stopBtn.disabled = true); return; }

    isPlaying = true; manualStop = false;
    setStatus((langSelect?.value || savedLang).startsWith('fr') ? 'lecture' : 'playing');

    startTime = audioCtx.currentTime + 0.1;
    nextNoteTime = startTime;

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
    cancelSpeech();

    if (!audioCtx && !finished) return;

    isPlaying = false;
    const fr = (langSelect?.value || savedLang).startsWith('fr');
    setStatus(finished ? (fr ? 'terminé' : 'finished') : (fr ? 'arrêté' : 'stopped'));

    startBtn && (startBtn.disabled = false);
    stopBtn && (stopBtn.disabled = true);

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
      releaseWakeLock();
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

  [startBpmEl, endBpmEl, steadyBpmEl, minBpmEl, maxBpmEl].forEach(inp => {
    inp?.addEventListener('change', () => { inp.value = clamp(safeNum(inp.value, 0), 20, 300); });
  });
  [rampEl, steadySecsEl, randomSecsEl, autoRestartDelayEl].forEach(inp => {
    inp?.addEventListener('change', () => { inp.value = Math.max(0, safeNum(inp.value, 0)); });
  });

  // ---------- Utils ----------
  function setStatus(text) { statusEl && (statusEl.textContent = text); }
})();
