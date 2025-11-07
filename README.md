# PhysioTempo

**Lien direct / Live app** → https://sebrbo.github.io/PhysioTempo/

---

## 🇫🇷 FR — À propos

**PhysioTempo** est un métronome de rééducation, simple et bilingue (FR/EN), permettant de faire **accélérer le tempo de manière contrôlée** sur une durée donnée (ex. **40 → 50 BPM en 120 s**), puis de **maintenir** le tempo atteint. Le volume est réglable. L’application est une **PWA hors-ligne** : elle s’installe et fonctionne sans connexion après le premier chargement sécurisé (HTTPS).

### Comment ça marche (en bref)
- L’app utilise **Web Audio** pour générer un bip court et net.
- Un **planificateur précis** programme les prochains bips avec un léger « look-ahead » pour éviter les dérives.
- Le tempo **augmente linéairement** du **BPM de départ** au **BPM d’arrivée** sur la **durée d’accélération** choisie, puis **reste** au BPM d’arrivée.
- L’afficheur montre le **BPM instantané**.

### Utilisation rapide
1. Ouvrez l’app : https://sebrbo.github.io/PhysioTempo/  
2. Réglez **BPM de départ**, **BPM d’arrivée**, **Durée d’accélération (s)** et **Volume**.  
3. Cliquez **Démarrer** (ou appuyez sur **Espace**).  
4. Cliquez **Arrêter** pour stopper à tout moment.  
→ Bouton **Préréglage** pour 40 → 50 BPM en 120 s.  
→ **Langue** : FR/EN (préférence mémorisée).

### Paramètres détaillés
- **BPM de départ** : tempo initial (20–300).  
- **BPM d’arrivée** : tempo cible (20–300).  
- **Durée d’accélération (s)** : temps pour passer du départ à l’arrivée. Si 0, le tempo passe **immédiatement** au BPM d’arrivée.  
- **Volume** : niveau de sortie en temps réel.  
- **Raccourci clavier** : **Espace** = Démarrer/Arrêter.

### PWA (hors-ligne & installation)
- Après le **premier chargement en HTTPS**, l’app est disponible **hors-ligne**.  
- **Installer** :  
  - **Desktop** : Chrome/Edge → icône « Installer ».  
  - **Android** : « Ajouter à l’écran d’accueil ».  
  - **iOS/iPadOS (Safari)** : Partager → « Sur l’écran d’accueil ».

### Conseils & limites connues
- **Autoplay** : le son peut nécessiter une **interaction utilisateur** (clic/tap) au premier lancement.  
- **iOS** : vérifiez le **mode silencieux** matériel.  
- **Précision** : le scheduler est robuste, mais la sortie audio dépend du matériel/OS. Utiliser un navigateur à jour.

### Licence
- **Code** : PolyForm Noncommercial 1.0.0 — **usage commercial interdit** (voir `LICENSE`).  
  SPDX: `PolyForm-Noncommercial-1.0.0`  
- **Assets** (icônes, images, textes) : **CC BY-NC 4.0** (voir `LICENSE-CC-BY-NC-4.0.md`).

---

## 🇬🇧 EN — About

**PhysioTempo** is a simple, bilingual (FR/EN) rehab metronome that can **ramp tempo linearly** over a fixed duration (e.g., **40 → 50 BPM in 120 s**) and then **hold** at the target tempo. Volume is adjustable. It’s an **offline-capable PWA**: install it and use it without network after the first secure (HTTPS) load.

### How it works (at a glance)
- Uses **Web Audio** to produce a short, crisp click.
- A precise **look-ahead scheduler** places upcoming clicks to prevent drift.
- Tempo **increases linearly** from **Start BPM** to **End BPM** over the **Ramp duration**, then **holds** the End BPM.
- The readout shows the **instantaneous BPM**.

### Quick start
1. Open the app: https://sebrbo.github.io/PhysioTempo/  
2. Set **Start BPM**, **End BPM**, **Ramp duration (s)**, and **Volume**.  
3. Click **Start** (or press **Space**).  
4. Click **Stop** anytime.  
→ **Preset**: 40 → 50 BPM in 120 s.  
→ **Language**: FR/EN (preference is saved).

### Controls
- **Start BPM**: initial tempo (20–300).  
- **End BPM**: target tempo (20–300).  
- **Ramp duration (s)**: time to go from start to end. If 0, it switches **instantly** to End BPM.  
- **Volume**: real-time output level.  
- **Keyboard**: **Space** = Start/Stop.

### PWA (offline & install)
- After the **first HTTPS load**, the app works **offline**.  
- **Install**:  
  - **Desktop**: Chrome/Edge → “Install”.  
  - **Android**: “Add to Home screen”.  
  - **iOS/iPadOS (Safari)**: Share → “Add to Home Screen”.

### Tips & known limitations
- **Autoplay**: browsers may require a **user gesture** (click/tap) to unlock audio on first use.  
- **iOS**: check the hardware **silent switch**.  
- **Timing**: the scheduler is accurate, but output still depends on device/OS audio. Keep your browser up to date.

### License
- **Code**: PolyForm Noncommercial 1.0.0 — **no commercial use** (see `LICENSE`).  
  SPDX: `PolyForm-Noncommercial-1.0.0`  
- **Assets** (icons, images, text): **CC BY-NC 4.0** (see `LICENSE-CC-BY-NC-4.0.md`).

---

**Crédits / Credits** : © 2025 Sebrbo and contributors.  
Contributions welcome via *Issues* and *Pull Requests*.
