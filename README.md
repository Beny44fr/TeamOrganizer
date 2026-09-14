# Gestion d'équipe de basket

Outil de parent référent : convocations, roulements de transport, bar et lavage des
maillots, suivi de l'équité entre familles.

Une seule page, sans serveur ni base de données. Les données restent dans le
navigateur de l'appareil.

Le site est livré vide : aucune donnée d'exemple, aucune coordonnée. Au premier
lancement, un parcours guidé en trois étapes met l'outil en route.

## Fonctionnalités

- **Premier démarrage** — parcours guidé en trois étapes : l'équipe et son effectif,
  le calendrier, puis les salles. Chaque étape peut être passée, et le guide se
  relance depuis **Réglages**.
- **Effectif** — joueurs et coachs, plusieurs numéros et adresses par famille, chacun
  avec son libellé (Papa, Maman, Fixe…).
- **Calendrier** — matchs à domicile ou en déplacement, import et export Excel.
- **Horaires** — rendez-vous calculé automatiquement : 45 minutes avant le coup d'envoi
  à domicile, et en déplacement 45 minutes plus le temps de trajet. Le trajet est estimé
  à partir de l'adresse du match, avec la salle de départ la plus proche recommandée.
- **Roulements** — 2 familles au bar à domicile, 1 à 4 conducteurs en déplacement,
  1 famille au lavage. Le lavage tourne par cycles complets : personne ne repasse tant
  que toutes les familles ne sont pas passées.
- **Équité** — répartition visuelle par famille, familles des coachs exemptées.
- **Convocations** — message généré depuis un modèle modifiable, ou réécrit à la main
  pour un match donné.
- **Absences** — trois états par joueur : non retenu, convoqué, absent.
- **Planification groupée** — attribution de plusieurs matchs d'un coup, avec aperçu
  avant application.
- **Agenda** — export .ics, l'événement démarre à l'heure du rendez-vous.
- **Téléphone et ordinateur** — même page pour les deux : deux colonnes sur grand
  écran, cibles resserrées à la souris, boîtes de dialogue centrées, Échap pour
  fermer et Ctrl+Entrée pour valider.

## Déploiement

### Netlify (recommandé)

1. Poussez ce dépôt sur GitHub.
2. Sur Netlify : **Add new site → Import an existing project → GitHub**, puis
   sélectionnez le dépôt.
3. Les réglages sont lus depuis `netlify.toml` : dossier publié `site`, pas de build.
   Laissez les champs proposés tels quels.
4. Chaque `git push` sur `main` redéploie le site.

### GitHub Pages

Dans **Settings → Pages → Source**, choisissez *GitHub Actions*. Le workflow
`.github/workflows/pages.yml` publie le dossier `site` à chaque push.

## Structure

Aucune étape de build : les fichiers sont servis tels quels, le JavaScript en
modules ES natifs. Le code est rangé par fonctionnalité, chaque écran portant sa
vue et ses actions.

```
site/
  index.html            coquille : en-tête, conteneur, chargement du script
  css/styles.css        styles, thème clair et sombre, téléphone puis ordinateur
  js/
    main.js             point d'entrée : actions (objet BB), écouteurs, démarrage
    core/
      state.js          état de l'application et stockage local
      utils.js          échappement HTML, dates et heures
      icons.js          icônes SVG
    domain/             calculs, sans interface
      model.js          accès aux données, état vierge, migration
      trajets.js        estimation des temps de trajet
      roulements.js     équité, cycle des maillots, planification groupée
      message.js        modèles et texte des convocations
      agenda.js         export .ics
    ui/
      components.js     feuilles de saisie, messages, copie
      forms.js          gabarits de saisie partagés (contacts, salles)
      files.js          Excel/CSV, zones de dépôt, téléchargements
    screens/            un fichier par écran : vue et actions
      layout.js         en-tête, onglets, aiguillage
      onboarding.js     premier démarrage
      matchs.js         calendrier et fiche de match
      match-form.js     création et modification d'un match
      planification.js  planification de plusieurs matchs
      effectif.js       joueurs et coachs
      recap.js          qui fait quoi
      equite.js         répartition des tours
      reglages.js       réglages, import, export, sauvegarde
  manifest.json         installation sur l'écran d'accueil
  sw.js                 cache local, fonctionne hors ligne
  icon*.png/svg         icônes
netlify.toml            configuration de déploiement
```

Les boutons du HTML généré appellent les actions par `onclick="BB.nom()"` ;
`main.js` assemble l'objet `BB` à partir des actions de chaque écran.

## Premier démarrage

À l'ouverture d'une installation neuve, l'outil propose :

1. **L'équipe** — son nom, puis l'effectif : saisie manuelle, import Excel, import
   des joueurs et coachs d'une sauvegarde JSON, ou restauration complète de cette
   sauvegarde (matchs et réglages compris).
2. **Les matchs** — ajout un par un ou import du calendrier. La salle indiquée pour
   un match à domicile est enregistrée au passage, et se retrouve à l'étape suivante.
3. **Les salles** — adresses, salle par défaut, et délai d'arrivée avant le match.

Le guide se relance à tout moment depuis **Réglages → Revoir le guide de démarrage**,
sans rien effacer.

## Stockage des données

Les données sont écrites dans le `localStorage` du navigateur. Conséquences à
connaître :

- rien n'est synchronisé entre votre téléphone et votre ordinateur ;
- vider les données du navigateur efface tout ;
- le site est public, mais les données ne quittent jamais l'appareil.

Exportez régulièrement une sauvegarde JSON depuis **Réglages**, et restaurez-la
depuis le même écran.

## Dépendance

La bibliothèque SheetJS est chargée depuis un CDN, uniquement pour l'import et
l'export Excel. Tout le reste fonctionne sans réseau.

## Mise à jour

Modifiez les fichiers de `site/`, commitez, poussez. Le déploiement suit.

- **Nouveau module JavaScript** : ajoutez-le à la liste `FILES` de `site/sw.js`,
  sinon la première visite hors ligne échouera, et augmentez le numéro de
  `CACHE`.
- **Tester en local** : les modules ES ne se chargent pas en ouvrant
  `index.html` directement depuis le disque. Servez le dossier :
  `npx serve site`, puis ouvrez l'adresse indiquée.
