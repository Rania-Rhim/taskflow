---
name: fonctionnalite-taskflow
description: "Use when adding, modifying, or debugging a TaskFlow feature in this repository, including tickets, backlog, Kanban, filters, imports, persistence, UI, and auto-tests."
---

# Développer une fonctionnalité TaskFlow

## Quand utiliser cette skill

- Ajouter ou modifier une fonctionnalité de l’application TaskFlow.
- Corriger un comportement touchant aux tickets, aux vues Liste/Kanban, aux filtres, aux imports, à l’historique ou à la persistance.
- Mettre à jour les auto-tests associés à une fonctionnalité.

## Structure du projet

- `index.html` contient le balisage, les vues, le panneau d’auto-tests et les gestionnaires d’événements HTML.
- `style.css` contient les styles personnalisés ; l’interface utilise également Tailwind CSS et Font Awesome.
- `app.js` contient la logique applicative. Conserver ses trois zones :
  1. **ZONE 1** — données, colonnes et état global.
  2. **ZONE 2** — règles métier et fonctions pures, notamment les imports et transitions.
  3. **ZONE 3** — rendu, persistance et interactions UI.
- `tests.js` contient la suite d’auto-tests et le rendu de leurs résultats dans l’interface.

## Procédure

1. Lire `AGENTS.md` et examiner les fonctions, éléments HTML et tests concernés avant de modifier le code.
2. Identifier la zone appropriée dans `app.js` et suivre les conventions existantes. Garder les règles métier indépendantes du DOM lorsqu’elles sont déjà conçues comme des fonctions pures.
3. Modifier seulement les fichiers nécessaires. Préserver les identifiants DOM et les fonctions globales appelées par les attributs `onclick`, `onsubmit` ou autres gestionnaires HTML.
4. Ajouter ou adapter un auto-test dans `tests.js` lorsqu’un changement modifie ou introduit un comportement métier. Ne pas supprimer ni affaiblir des tests pour faire passer la suite.
5. Valider le comportement dans l’application et relancer les auto-tests via le panneau **Auto-Tests**. Vérifier que les 12 tests existants restent verts et que tout nouveau test passe également.
6. Vérifier les erreurs de l’éditeur et les changements Git ; signaler clairement les tests exécutés et leur résultat.

## Garanties de comportement

- Ne pas déplacer les auto-tests dans `app.js` : ils restent dans `tests.js`, et leur panneau reste dans `index.html`.
- Conserver les trois zones de `app.js` et leurs responsabilités.
- Préserver le stockage et les schémas de données existants, sauf demande explicite de migration.
- Ne pas introduire de dépendance ou de système de build sans nécessité liée à la fonctionnalité.
- Garder les modifications ciblées et éviter les changements visuels ou fonctionnels non demandés.
