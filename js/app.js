/*!
 * PhysioTempo — rehab metronome with linear tempo ramp
 * (c) 2025 Sebrbo and contributors
 * License (code): PolyForm Noncommercial 1.0.0 — see LICENSE
 * Assets: CC BY-NC 4.0 — see LICENSE-CC-BY-NC-4.0.md
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 */
// PhysioTempo — linear ramp metronome with Web Audio precise scheduling
(() => {
  'use strict';

  // ---------- i18n ----------
  const i18nDict = {
    en: {
      language: "Language",
      start_bpm_label: "Start BPM",
      end_bpm_label: "End BPM",
      ramp_label: "Ramp duration (s)",
      volume_label: "Volume",
      preset: "Preset 40 → 50 in 120s",
      start: "Start",
      stop: "Stop",
      current_bpm: "Current BPM",
      status: "Status",
      hint: "Click Start to begin. The tempo will ramp linearly from Start BPM to End BPM over the chosen duration, then stay at End BPM."
    },
    fr: {
      language: "Langue",
      start_bpm_label: "BPM de départ",
      end_bpm_label: "BPM d’arrivée",
      ramp_label: "Durée d’accélération (s)",
      volume_label: "Volume",
      preset: "Préréglage 40 → 50 en 120 s",
      start: "Démarrer",
      stop: "Arrêter",
      current_bpm: "BPM actuel",
      status: "Statut",
      hint: "Cliquez sur Démarrer. Le tempo accélère linéairement du BPM de départ vers le BPM d’arrivée pendant la durée choisie, puis reste au BPM d’arrivée."
    }
  };

  function applyI18n(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('.i18n').forEach(el => {
      const key = el.getAttribute('data-key');
      if (i18nDict[lang] && i18nDict[lang][key]) el.textContent = i18nDict[lang][key];
    });
  }

  const $ = sel => document.querySelector(sel);
  const startBpmEl = $('#startBpm');
  const endBpmEl = $('#endBpm');
  const rampEl = $('#rampSeconds');
  const volEl = $('#volume');
  const bpmNowEl = $('#bpmNow');
  const statusEl = $('#status');
  const startBtn = $('#startBtn');
  const stopBtn = $('#stopBtn');
  const presetBtn = $('#preset');
  const langSelect = $('#langSelect');

  const savedLang = localStorage.getItem('pt_lang') || (navigator.language?.startsWith('fr') ? 'fr' : 'en');
  langSelect.value = savedLang;
  applyI18n(savedLang);
  langSelect.addEventListener('change', () => {
    localStorage.setItem('pt_lang', langSelect.value);
    applyI18n(langSelect.value);
  });

  // ---------- Audio and scheduler ----------
  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;
  let startTime = 0;
  let nextNoteTime = 0;
  let lookaheadTimer = null;
  let rafId = null;

  const scheduleAheadTime = 0.15;
  const lookahead = 25;
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

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function currentBpmAt(elapsed) {
    const b0 = clamp(Number(startBpmEl.value), 20, 300);
    const b1 = clamp(Number(endBpmEl.value), 20, 300);
    const T = Math.max(0, Number(rampEl.value));
    if (T <= 0) return b1;
    if (elapsed < 0) elapsed = 0;
    if (elapsed >= T) return b1;
    const k = (b1 - b0) / T;
    return b0 + k * elapsed;
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function scheduleClick(time, accented = false) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = accented ? clickHz * 1.25 : clickHz;
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

  function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
      scheduleClick(nextNoteTime);
      const elapsed = nextNoteTime - startTime;
      const bpm = currentBpmAt(elapsed);
      const interval = 60.0 / bpm;
      nextNoteTime += interval;
    }
  }

  function updateReadout() {
    if (!isPlaying) { bpmNowEl.textContent = '—'; return; }
    const now = audioCtx.currentTime;
    const elapsed = now - startTime;
    const bpm = currentBpmAt(elapsed);
    bpmNowEl.textContent = bpm.toFixed(1);
    rafId = requestAnimationFrame(updateReadout);
  }

  async function start() {
    ensureAudio();
    await audioCtx.resume();
    isPlaying = true;
    setStatus(langSelect.value === 'fr' ? 'lecture' : 'playing');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    masterGain.gain.value = Number(volEl.value) / 100;
    startTime = audioCtx.currentTime + 0.1;
    nextNoteTime = startTime;
    if (lookaheadTimer) clearInterval(lookaheadTimer);
    lookaheadTimer = setInterval(scheduler, lookahead);
    updateReadout();
  }

  function stop() {
    if (!audioCtx) return;
    isPlaying = false;
    setStatus(langSelect.value === 'fr' ? 'arrêté' : 'stopped');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    if (lookaheadTimer) { clearInterval(lookaheadTimer); lookaheadTimer = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    bpmNowEl.textContent = '—';
  }

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  volEl.addEventListener('input', () => { if (masterGain) masterGain.gain.value = Number(volEl.value) / 100; });
  presetBtn.addEventListener('click', () => { startBpmEl.value = 40; endBpmEl.value = 50; rampEl.value = 120; });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); if (startBtn.disabled) stop(); else start(); }
  });
  [startBpmEl, endBpmEl].forEach(inp => { inp.addEventListener('change', () => { inp.value = clamp(Number(inp.value || 0), 20, 300); }); });
  setStatus('au repos');
})();
