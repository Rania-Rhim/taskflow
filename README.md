# TaskFlow

TaskFlow est une application web légère de gestion de tickets avec vues Liste, Kanban et calendrier. Elle fonctionne sans serveur applicatif et conserve les données dans le stockage local du navigateur.

## Fonctionnalités

- Création, modification, suppression et déplacement de tickets.
- Vues Liste et Kanban, filtres, priorités, estimation et assignation.
- Échéances avec indicateurs « En retard » et « J-2 », filtre d’urgence et calendrier mensuel.
- Historique des déplacements avec annulation.
- Import et export de tickets aux formats CSV et JSON.
- Panneau intégré de 20 auto-tests.

## Démarrer

Ouvrez `index.html` dans un navigateur moderne. Une connexion Internet est nécessaire pour charger Tailwind CSS, Font Awesome et la police Inter depuis leurs CDN.

Les tickets sont enregistrés dans le stockage local du navigateur. Ils ne sont pas automatiquement synchronisés entre appareils ou navigateurs.

## Tests

Les auto-tests s’exécutent au chargement de l’application. Consultez le panneau **Auto-Tests** dans l’interface ou cliquez sur **Relancer** pour les exécuter à nouveau.

## Structure

- `index.html` — structure des vues, formulaires et panneau de tests.
- `style.css` — styles complémentaires.
- `app.js` — données, règles métier, rendu et interactions.
- `tests.js` — auto-tests et affichage de leurs résultats.
- `docs/spec.md` — spécification de la gestion des échéances et du calendrier.

## GitHub Pages

Le projet est un site statique. Pour le publier, configurez GitHub Pages sur la branche `main` avec la racine du dépôt comme source.
