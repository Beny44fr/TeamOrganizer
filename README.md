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

```
site/
  index.html      l'application entière, autonome
  manifest.json   installation sur l'écran d'accueil
  sw.js           cache local, fonctionne hors ligne
  icon*.png/svg   icônes
netlify.toml      configuration de déploiement
```

## Premier démarrage

À l'ouverture d'une installation neuve, l'outil propose :

1. **L'équipe** — son nom, puis l'effectif : saisie manuelle, import Excel, ou
   restauration d'une sauvegarde JSON existante.
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

Modifiez `site/index.html`, commitez, poussez. Le déploiement suit.
