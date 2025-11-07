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

