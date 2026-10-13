# Brancher JobTrack à Supabase (sans localhost)

Les noms des menus Supabase peuvent légèrement changer : cherche le mot le plus proche.

1. **Compte** : supabase.com, crée un compte gratuit, puis **New project** (nom : `jobtrack`, choisis une région proche, note le mot de passe de la base).
2. **Table** : menu **SQL Editor**, nouvelle requête, colle le contenu de `schema.sql`, clique **Run**. Vérifie dans **Table Editor** que la table `applications` existe.
3. **Tests** : menu **Authentication**, fournisseur **Email** : désactive « Confirm email » pendant tes tests (sinon un email de confirmation est envoyé).
4. **Clés** : **Project Settings**, rubrique **API** : copie **Project URL** et la clé **publishable (anon)**.
5. **Config** : ouvre `config.js` et colle les deux valeurs entre les guillemets.
6. **Test** : ouvre `index.html`, crée un compte, ajoute une candidature, puis regarde-la dans **Table Editor**.
7. **Mise en ligne** : GitHub Pages. Ensuite dans Supabase, **Authentication > URL Configuration**, mets le lien GitHub Pages dans **Site URL**.

## Règles de sécurité
- La clé **publishable / anon** peut être dans le code : la sécurité vient des règles RLS de `schema.sql`.
- La clé **secret / service_role** ne doit **jamais** apparaître dans ce projet ni sur GitHub.
- Ne supprime pas les lignes `enable row level security` et `create policy`.
