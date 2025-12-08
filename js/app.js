/*!
 * PhysioTempo — + Mode Excentrique + HSR (repos reps & séries)
 * TTS/Beep only + iOS fixes + Wake Lock
 * Build: 2025-12-08 v19
 * Code: PolyForm Noncommercial 1.0.0 | Assets: CC BY-NC 4.0
 */
(() => {
  'use strict';

  // ---------- Volume global (sans slider) ----------
  const MASTER_GAIN   = 1.0; // 0.0–2.0
  const VOL_COUNTDOWN = 1.4; // niveau des signaux (bip/voix) CR & tempo

  // ---------- Modes / helpers ----------
  const MODES = { ACCEL: 'accel', STEADY: 'steady', RANDOM: 'random', ECC: 'ecc', HSR: 'hsr' };
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
      mode_ecc: "Eccentric (sets × reps)",
      mode_hsr: "HSR (sets × reps)",
      start_bpm_label: "Start cadence (bpm)",
      end_bpm_label: "Ramp end (bpm)",
      ramp_label: "Ramp duration (s)",
      steady_bpm_label: "Cadence (bpm)",
      steady_secs_label: "Duration (s)",
      random_min_bpm_label: "Min cadence (bpm)",
      random_max_bpm_label: "Max cadence (bpm)",
      random_secs_label: "Duration (s)",
      start_options: "Start & cycles",
      auto_restart_label: "Auto-restart",
      auto_restart_delay_label: "Restart delay (s)",
      countdown_sound_label: "Countdown sound",
      cd_none: "Mute", cd_beep: "Beep", cd_voice: "Voice (EN/FR)",
      preset: "Preset 40 → 50 in 120s",
      start: "Start", stop: "Stop",
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
      // Eccentric
      ecc_sets_label: "Sets", ecc_reps_label: "Reps per set",
      ecc_work_label: "Eccentric effort (s)",
      ecc_return_label: "Return to start (s)",
      hint_ecc:
        "Eccentric-only reps: 6 s down by default with a stronger beep at 6 s; 3 s return to start.",
      // HSR
      hsr_sets_label: "Sets", hsr_reps_label: "Reps per set",
      hsr_con_label: "Concentric (s)", hsr_ecc_label: "Eccentric (s)",
      hsr_hold_top_label: "Top hold (s)", hsr_hold_bottom_label: "Bottom hold (s)",
      hsr_rep_rest_label: "Rest between reps (s)",
      hsr_rest_label: "Rest between sets (s)",
      hint_hsr:
        "HSR: slow controlled reps (e.g., 3 s up + 3 s down) with optional rest between reps, plus rest between sets.",
      voice_steps: ["four","three","two","one","go"]
    },
    fr: {
      language: "Langue",
      mode_label: "Cadence",
      mode_accel: "Cadence progressive",
      mode_steady: "Cadence fixe (durée)",
      mode_random: "Cadence aléatoire",
      mode_ecc: "Excentrique (séries × reps)",
      mode_hsr: "HSR (séries × reps)",
      start_bpm_label: "Cadence de départ (bpm)",
      end_bpm_label: "Cadence d’arrivée (bpm)",
      ramp_label: "Durée d’accélération (s)",
      steady_bpm_label: "Cadence (bpm)",
      steady_secs_label: "Durée (s)",
      random_min_bpm_label: "Cadence min (bpm)",
      random_max_bpm_label: "Cadence max (bpm)",
      random_secs_label: "Durée (s)",
      start_options: "Démarrage & cycles",
      auto_restart_label: "Redémarrage automatique",
      auto_restart_delay_label: "Délai de redémarrage (s)",
      countdown_sound_label: "Signal du compte à rebours",
      cd_none: "Muet", cd_beep: "Bip", cd_voice: "Voix (FR/EN)",
      preset: "Préréglage 40 → 50 en 120 s",
      start: "Démarrer", stop: "Arrêter",
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
      // Excentrique
      ecc_sets_label: "Séries", ecc_reps_label: "Répétitions par série",
      ecc_work_label: "Temps d’effort excentrique (s)",
      ecc_return_label: "Retour à la position de départ (s)",
      hint_ecc:
        "Excentrique seul : 6 s d’effort (bip plus fort à 6 s), puis 3 s de retour à la position initiale.",
      // HSR
      hsr_sets_label: "Séries", hsr_reps_label: "Répétitions par série",
      hsr_con_label: "Concentrique (s)", hsr_ecc_label: "Excentrique (s)",
      hsr_hold_top_label: "Pause en haut (s)", hsr_hold_bottom_label: "Pause en bas (s)",
      hsr_rep_rest_label: "Repos entre répétitions (s)",
      hsr_rest_label: "Repos entre séries (s)",
      hint_hsr:
        "HSR : répétitions lentes contrôlées (ex. 3 s montée + 3 s descente) avec repos entre répétitions (optionnel) et entre séries.",
      voice_steps: ["quatre","trois","deux","un","partez"]
    }
  };

  // ---------- DOM refs ----------
  const startBpmEl   = $('#startBpm');
  const endBpmEl     = $('#endBpm');
  const rampEl       = $('#rampSeconds');
  const steadyBpmEl  = $('#steadyBpm');
  const steadySecsEl = $('#steadySeconds');
  const minBpmEl     = $('#minBpm');
  const maxBpmEl     = $('#maxBpm');
  const randomSecsEl = $('#randomSeconds');

  // Excentrique
  const eccSetsEl    = $('#eccSets');
  const eccRepsEl    = $('#eccReps');
  const eccWorkEl    = $('#eccWorkSec');
  const eccReturnEl  = $('#eccReturnSec');

  // HSR
  const hsrSetsEl  = $('#hsrSets');
  const hsrRepsEl  = $('#hsrReps');
  const hsrConEl   = $('#hsrConSec');
  const hsrEccEl   = $('#hsrEccSec');
  const hsrTopEl   = $('#hsrHoldTop');
  const hsrBotEl   = $('#hsrHoldBottom');
  const hsrRepRestEl = $('#hsrRepRest');
  const hsrRestEl  = $('#hsrRest');

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
  const countdownSoundEl = $('#countdownSound');

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

  // Structures de déroulé
  let ecc = null; // {set,totalSets,rep,totalReps, phases[], phaseIdx, secIntoPhase}
  let hsr = null; // {set,totalSets,rep,totalReps, phases[], phaseIdx, secIntoPhase, repRest, restSec, repRestUntil, restUntil}

  // Wake Lock
  let wakeLock = null;

  // Planification
  const scheduleAheadTime = 0.15; // s
  const lookahead = 25;           // ms

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
    const key =
      currentMode === MODES.ACCEL  ? 'hint_accel'  :
      currentMode === MODES.STEADY ? 'hint_steady' :
      currentMode === MODES.RANDOM ? 'hint_random' :
      currentMode === MODES.ECC    ? 'hint_ecc'    :
      'hint_hsr';
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

      // master → compressor → destination
      masterGain = audioCtx.createGain();
      masterGain.gain.value = clamp(MASTER_GAIN, 0.0, 2.0);

      compressor = audioCtx.createDynamicsCompressor();
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

  // ---------- Bips (CR & tempo) ----------
  function scheduleTempoBeep(atTime, freq = 940, ms = 0.18, volMul = 1.0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const vol = clamp(VOL_COUNTDOWN * volMul, 0.0001, 2.0);
    osc.frequency.setValueAtTime(freq, atTime);
    g.gain.setValueAtTime(0, atTime);
    g.gain.linearRampToValueAtTime(vol, atTime + 0.01);
    g.gain.exponentialRampToValueAtTime(Math.max(1e-4, vol * 0.001), atTime + ms);
    osc.connect(g); g.connect(masterGain);
    osc.start(atTime);
    osc.stop(atTime + ms + 0.06);
  }

  function beepOnceCountdown(freq = 800, ms = 0.14) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    scheduleTempoBeep(now, freq, ms, 1.0);
  }
  function beepForStep(stepIdx) {
    const map = [700, 780, 860, 940, 1200]; // GO plus aigu
    beepOnceCountdown(map[Math.min(stepIdx, map.length-1)], stepIdx === 4 ? 0.20 : 0.14);
  }

  // ---------- Voix (TTS uniquement) ----------
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
    u.volume = 1;
    const v = voices.find(v => v.lang?.toLowerCase().startsWith(lang.toLowerCase()));
    if (v) u.voice = v;
    try { window.speechSynthesis.speak(u); return true; }
    catch { return false; }
  }
  function cancelSpeech() { try { window.speechSynthesis?.cancel(); } catch {} }

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

    // Fin de session basée sur un timer global (modes non “séquencés”)
    if ((currentMode === MODES.ACCEL || currentMode === MODES.STEADY || currentMode === MODES.RANDOM) &&
        sessionEndTime && audioCtx.currentTime >= sessionEndTime) {
      stop(true); return;
    }

    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {

      if (currentMode === MODES.ECC) {
        if (!ecc || !ecc.phases?.length) { stop(true); return; }

        const phase = ecc.phases[ecc.phaseIdx];
        const isLastSecondOfPhase = (ecc.secIntoPhase + 1 >= phase.dur);
        const isEccentricPhase = (phase.name === 'ecc');
        // Accent "plus fort" à la fin des 6 s excentriques
        const freq = isLastSecondOfPhase && isEccentricPhase ? 1200 : 940;
        const vol  = isLastSecondOfPhase && isEccentricPhase ? 1.5  : 1.0;
        scheduleTempoBeep(nextNoteTime, freq, 0.18, vol);

        nextNoteTime += 1.0;
        ecc.secIntoPhase += 1;

        if (ecc.secIntoPhase >= phase.dur) {
          ecc.phaseIdx += 1;
          ecc.secIntoPhase = 0;

          // Fin de rep ?
          if (ecc.phaseIdx >= ecc.phases.length) {
            ecc.rep += 1;
            ecc.phaseIdx = 0;

            // Fin de série ?
            if (ecc.rep > ecc.totalReps) {
              ecc.set += 1;
              ecc.rep = 1;
              if (ecc.set > ecc.totalSets) {
                stop(true); return;
              }
            }
          }
        }

      } else if (currentMode === MODES.HSR) {
        // Repos entre répétitions ?
        if (hsr?.repRestUntil && nextNoteTime < hsr.repRestUntil) {
          nextNoteTime = hsr.repRestUntil;
          continue;
        }
        // Repos entre séries ?
        if (hsr?.restUntil && nextNoteTime < hsr.restUntil) {
          nextNoteTime = hsr.restUntil;
          continue;
        }
        if (!hsr || !hsr.phases?.length) { stop(true); return; }

        const phase = hsr.phases[hsr.phaseIdx];
        const isLastSecondOfPhase = (hsr.secIntoPhase + 1 >= phase.dur);
        const isLastPhaseOfRep = (hsr.phaseIdx === hsr.phases.length - 1);

        // Bip standard chaque seconde, accent sur changement de phase / fin de rep
        const freq = (isLastSecondOfPhase && isLastPhaseOfRep) ? 1200 :
                     (isLastSecondOfPhase ? 1020 : 940);
        scheduleTempoBeep(nextNoteTime, freq);

        nextNoteTime += 1.0;
        hsr.secIntoPhase += 1;

        if (hsr.secIntoPhase >= phase.dur) {
          hsr.phaseIdx += 1;
          hsr.secIntoPhase = 0;

          if (hsr.phaseIdx >= hsr.phases.length) {
            // Fin de rep
            hsr.rep += 1;
            hsr.phaseIdx = 0;

            if (hsr.rep > hsr.totalReps) {
              // Fin de série
              hsr.set += 1; hsr.rep = 1;

              if (hsr.set > hsr.totalSets) {
                stop(true); return;
              } else {
                // Repos entre séries
                const rest = Math.max(0, hsr.restSec);
                if (rest > 0) {
                  hsr.restUntil = nextNoteTime + rest;
                  if (audioCtx) {
                    restEndTime = hsr.restUntil;
                    startRestUI(); setTimeLeftLabel(true);
                  }
                }
              }
            } else {
              // Repos entre répétitions
              const repRest = Math.max(0, hsr.repRest);
              if (repRest > 0) {
                hsr.repRestUntil = nextNoteTime + repRest;
                if (audioCtx) {
                  restEndTime = hsr.repRestUntil;
                  startRestUI(); setTimeLeftLabel(true);
                }
              }
            }
          }
        }

      } else {
        // Modes histor.: accel / steady / random
        scheduleTempoBeep(nextNoteTime);

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
    } else if (currentMode === MODES.RANDOM) {
      bpmNowEl && (bpmNowEl.textContent = lastRandomBpm ? lastRandomBpm.toFixed(1) : '—');
    } else {
      // Excentrique / HSR : afficher set/rep/phase
      if (bpmNowEl) bpmNowEl.textContent = '—';
      let parts = [];
      const fr = (langSelect?.value || savedLang).startsWith('fr');

      if (currentMode === MODES.ECC && ecc) {
        const phaseName =
          ecc.phases[ecc.phaseIdx]?.name === 'ecc' ? (fr ? 'excentrique' : 'eccentric') :
          (fr ? 'retour' : 'return');
        parts = fr
          ? [`série ${ecc.set}/${ecc.totalSets}`, `rep ${ecc.rep}/${ecc.totalReps}`, `phase ${phaseName}`]
          : [`set ${ecc.set}/${ecc.totalSets}`, `rep ${ecc.rep}/${ecc.totalReps}`, phaseName];
      }
      if (currentMode === MODES.HSR && hsr) {
        const phaseName =
          hsr.phases[hsr.phaseIdx]?.name === 'con' ? (fr ? 'concentrique' : 'concentric') :
          hsr.phases[hsr.phaseIdx]?.name === 'top' ? (fr ? 'pause haut' : 'top hold') :
          hsr.phases[hsr.phaseIdx]?.name === 'ecc' ? (fr ? 'excentrique' : 'eccentric') :
          (fr ? 'pause bas' : 'bottom hold');
        parts = fr
          ? [`série ${hsr.set}/${hsr.totalSets}`, `rep ${hsr.rep}/${hsr.totalReps}`, `phase ${phaseName}`]
          : [`set ${hsr.set}/${hsr.totalSets}`, `rep ${hsr.rep}/${hsr.totalReps}`, phaseName];
      }
      setStatus(parts.join(' — '));
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
      const words = L().voice_steps || ((langSelect?.value || savedLang).startsWith('fr')
        ? ["quatre","trois","deux","un","partez"]
        : ["four","three","two","one","go"]);
      const txt = words[Math.min(stepIdx, words.length - 1)];
      if (!txt) return;
      speak(txt).then(ok => { if (!ok) beepForStep(stepIdx); });
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

  // ---------- Wake Lock ----------
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

    try { await runCountdown(); }
    catch {
      setStatus((langSelect?.value || savedLang).startsWith('fr') ? 'interrompu' : 'aborted');
      startBtn && (startBtn.disabled = false);
      stopBtn && (stopBtn.disabled = true);
      return;
    }

    isPlaying = true; manualStop = false;
    setStatus((langSelect?.value || savedLang).startsWith('fr') ? 'lecture' : 'playing');

    startTime = audioCtx.currentTime + 0.1;
    nextNoteTime = startTime;

    sessionEndTime = null; lastRandomBpm = null;
    ecc = null; hsr = null;

    if (currentMode === MODES.ACCEL) {
      const T = Math.max(0, safeNum(rampEl?.value, 0));
      if (T > 0) sessionEndTime = startTime + T;

    } else if (currentMode === MODES.STEADY) {
      const secs = Math.max(1, safeNum(steadySecsEl?.value, 30));
      sessionEndTime = startTime + secs;

    } else if (currentMode === MODES.RANDOM) {
      const secs = Math.max(1, safeNum(randomSecsEl?.value, 90));
      sessionEndTime = startTime + secs;

    } else if (currentMode === MODES.ECC) {
      const totalSets = clamp(safeNum(eccSetsEl?.value, 3), 1, 20);
      const totalReps = clamp(safeNum(eccRepsEl?.value, 15), 1, 50);
      const eccDur    = clamp(safeNum(eccWorkEl?.value, 6), 1, 15);
      const retDur    = clamp(safeNum(eccReturnEl?.value, 3), 0, 15);

      const phases = [];
      if (eccDur > 0) phases.push({ name: 'ecc', dur: eccDur });
      if (retDur > 0) phases.push({ name: 'ret', dur: retDur });

      ecc = { set: 1, totalSets, rep: 1, totalReps, phases, phaseIdx: 0, secIntoPhase: 0 };

    } else if (currentMode === MODES.HSR) {
      const totalSets = clamp(safeNum(hsrSetsEl?.value, 3), 1, 20);
      const totalReps = clamp(safeNum(hsrRepsEl?.value, 15), 1, 50);
      const con = clamp(safeNum(hsrConEl?.value, 3), 0, 15);
      const eccD = clamp(safeNum(hsrEccEl?.value, 3), 0, 15);
      const top = clamp(safeNum(hsrTopEl?.value, 0), 0, 10);
      const bot = clamp(safeNum(hsrBotEl?.value, 0), 0, 10);
      const repRest = clamp(safeNum(hsrRepRestEl?.value, 0), 0, 20);
      const restSec = clamp(safeNum(hsrRestEl?.value, 120), 0, 600);

      const phases = [];
      if (con > 0) phases.push({ name: 'con', dur: con });
      if (top > 0) phases.push({ name: 'top', dur: top });
      if (eccD > 0) phases.push({ name: 'ecc', dur: eccD });
      if (bot > 0) phases.push({ name: 'bot', dur: bot });

      hsr = {
        set: 1, totalSets,
        rep: 1, totalReps,
        phases, phaseIdx: 0, secIntoPhase: 0,
        repRest, restSec,
        repRestUntil: null, restUntil: null
      };
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
    ecc = null; hsr = null;
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
  [rampEl, steadySecsEl, randomSecsEl, autoRestartDelayEl,
   eccSetsEl, eccRepsEl, eccWorkEl, eccReturnEl,
   hsrSetsEl, hsrRepsEl, hsrConEl, hsrEccEl, hsrTopEl, hsrBotEl, hsrRepRestEl, hsrRestEl]
  .forEach(inp => {
    inp?.addEventListener('change', () => { inp.value = Math.max(0, safeNum(inp.value, 0)); });
  });

  // ---------- Utils ----------
  function setStatus(text) { statusEl && (statusEl.textContent = text); }
})();
