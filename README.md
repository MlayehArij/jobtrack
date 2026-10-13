# JobTrack

Application web pour suivre ses candidatures de stage, PFE et emploi.

## Fonctionnalités
- Dashboard moderne (thème sombre, effet verre) : statistiques, graphique des statuts, candidatures récentes
- Ajouter, modifier, supprimer une candidature (entreprise, lien, ville, poste, date, statut, notes)
- Vue tableau (tri par colonne) et vue Kanban en glisser-déposer
- Recherche par entreprise et filtre par statut
- Thème clair / sombre, design responsive (menu en bas sur mobile)

## Technologies
HTML5, CSS3 (variables, grid, backdrop-filter), JavaScript vanilla (DOM, LocalStorage)

## Lancer
Ouvrir `index.html` dans un navigateur. Aucune installation.

## Backend (Supabase)
- Connexion / inscription par email, base de données cloud, une table `applications` protégée par RLS (chaque utilisateur ne voit que ses données)
- Sans configuration (`config.js` vide), l'application fonctionne en mode local (LocalStorage)
- Guide pas à pas : `SETUP_SUPABASE.md` — schéma SQL : `schema.sql`

## Prochaines étapes
Mise en ligne (GitHub Pages), puis fonctions d'aide par IA.
