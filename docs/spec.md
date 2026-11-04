# Spécification — Échéances et calendrier

## Objectif

Ajouter à TaskFlow une gestion des échéances avec indicateurs d’urgence, filtres, calendrier mensuel et résumé des retards par colonne Kanban.

## Comportement actuel

Les tickets ont une date de création (`creeLe`), mais pas d’échéance. L’application ne propose ni filtre d’urgence ni vue calendrier. Les imports et exports existants ne gèrent pas ce champ.

## Données

- Ajouter au ticket le champ `echeance`, au format date `YYYY-MM-DD`.
- Le champ est facultatif : une échéance absente ou invalide vaut `null`.
- Les anciens tickets dépourvus de ce champ restent valides et sont traités comme sans échéance.

## Règles d’urgence

- **J-2** : l’échéance tombe exactement deux jours calendaires après la date du jour.
- **En retard** : l’échéance est antérieure à la date du jour.
- Un ticket au statut `termine` ne peut pas être en retard.
- Une échéance absente ne produit aucun badge d’urgence.
- Les comparaisons portent sur des dates calendaires, sans décalage lié à l’heure ou au fuseau horaire.
- Les tests doivent pouvoir fixer la date du jour afin d’obtenir des résultats déterministes.

## Parcours et interface

### Création et modification

- Le formulaire permet de définir une échéance ou de l’effacer.
- L’échéance est conservée à la sauvegarde et au rechargement.

### Liste et filtres

- Afficher les badges « En retard » et « J-2 » lorsque les règles ci-dessus s’appliquent.
- Ajouter un filtre d’urgence proposant :
  - Tous ;
  - En retard ;
  - J-2 ;
  - Sans échéance.
- Le filtre se combine avec les filtres existants.

### Calendrier

- Ajouter une vue mensuelle affichant les tickets à leur date d’échéance.
- Permettre de naviguer vers le mois précédent et suivant.
- La navigation doit fonctionner aux fins de mois et aux changements d’année.

### Kanban

- Afficher, dans chaque colonne, le nombre de tickets en retard parmi ceux retenus par les filtres actifs.
- Exclure les tickets terminés du décompte.
- Mettre le résumé à jour lorsque les filtres ou les statuts changent.

## Imports et exports

- Inclure l’échéance dans les imports et exports CSV et JSON.
- Le CSV utilise une colonne `echeance` au format `YYYY-MM-DD`.
- Si l’échéance CSV est absente ou invalide, importer le ticket avec `echeance: null`, sans rejeter la ligne.
- Les imports et exports JSON conservent le champ lorsqu’il est présent ; les données existantes sans ce champ restent compatibles.

## Critères d’acceptation

1. Un ticket peut être créé ou modifié avec une échéance ; celle-ci peut aussi être effacée et devient alors `null`.
2. « J-2 » s’affiche exactement deux jours calendaires avant l’échéance.
3. « En retard » s’affiche après l’échéance, sauf pour un ticket terminé.
4. Le filtre propose les trois catégories convenues et se combine avec les filtres existants.
5. Le calendrier affiche les tickets au bon jour et sa navigation couvre les fins de mois et changements d’année.
6. Le résumé Kanban compte, après filtrage, les tickets en retard de chaque colonne et exclut les tickets terminés.
7. Le champ est préservé dans la persistance et les imports/exports CSV et JSON.
8. Une date CSV invalide ou absente donne lieu à l’import du ticket avec `echeance: null`.
9. Les tests fixent la date du jour et vérifient les indicateurs, le filtre combiné, les tickets terminés, la navigation et les imports/exports.
