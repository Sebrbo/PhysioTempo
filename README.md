# PhysioTempo

**FR** — Métronome de rééducation : tempo réglable avec **rampe linéaire** (ex. 40 → 50 BPM en 120 s), volume ajustable, interface simple et **bilingue (FR/EN)**.  
**EN** — Rehab metronome: adjustable tempo with **linear ramp** (e.g., 40 → 50 BPM over 120 s), volume control, simple **bilingual UI**.

## Fonctionnalités / Features
- Rampe **linéaire** du BPM de départ au BPM d’arrivée, puis maintien
- Web Audio avec planification précise (lookahead)
- Volume en temps réel
- FR/EN (préférence mémorisée)
- PWA hors-ligne (manifest + service worker)
- Zéro dépendance externe

## Utilisation
Ouvrir `index.html` (HTTPS conseillé).  
Raccourci : **Espace** pour démarrer/arrêter.

## Déploiement GitHub Pages
Settings → **Pages** → *Deploy from a branch* → `main` / **`/ (root)`**.

## Icônes
Utilise `tools/make-icons.html` pour générer rapidement `icons/icon-192.png` et `icons/icon-512.png`.

## Licence / License
- **Code** : PolyForm Noncommercial 1.0.0 — usage commercial interdit. Voir `LICENSE`.  
  SPDX: `PolyForm-Noncommercial-1.0.0`
- **Assets** : CC BY-NC 4.0. Voir `LICENSE-CC-BY-NC-4.0.md`.

© 2025 Sebrbo and contributors
