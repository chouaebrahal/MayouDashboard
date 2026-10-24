# MediDash / MayouDashboard

Application de gestion de clinique (Next.js + Supabase) avec notifications push
Firebase pour les médecins.

## Démarrage

```bash
npm install
npm run dev
```

Copier `.env.example` vers `.env.local` et renseigner les valeurs.

## Notifications push (Firebase Cloud Messaging)

Les appareils des médecins s'abonnent au topic FCM **`doctors`**. L'ajout d'un
patient envoie une notification à tous les appareils abonnés (web, Android,
iPhone/PWA). Aucune table Supabase n'est nécessaire pour cela.

### Variables d'environnement

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Paramètres du projet → Général → Vos applications (Web) |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase Console → Cloud Messaging → Certificats Web Push |
| `FIREBASE_PROJECT_ID` | Fichier JSON du compte de service |
| `FIREBASE_CLIENT_EMAIL` | Fichier JSON du compte de service |
| `FIREBASE_PRIVATE_KEY` | Fichier JSON du compte de service (une seule ligne, avec `\n`) |
| `CRON_SECRET` | Chaîne aléatoire pour protéger l'endpoint du cron (optionnel mais recommandé) |

> Ne jamais committer `.env.local` ni le fichier JSON du compte de service.

### Activer les notifications sur un appareil

1. Se connecter en tant que médecin.
2. **Paramètres → Notifications → Activer cet appareil**.
3. Autoriser les notifications dans le navigateur.
4. Cliquer sur **Envoyer un test** pour vérifier.

- **Android** : Chrome, fonctionne comme un navigateur classique.
- **iPhone** : iOS 16.4+ obligatoire. Safari → Partager → **Sur l'écran
  d'accueil**, puis ouvrir l'application installée et activer les notifications.
- **Autre PC** : se connecter et activer les notifications sur cet appareil aussi.

Chaque appareil doit être activé séparément (le token FCM est propre à chaque
navigateur/appareil).

### Déploiement (Vercel)

1. Ajouter toutes les variables de `.env.example` dans
   **Vercel → Project → Settings → Environment Variables** (y compris
   `FIREBASE_PRIVATE_KEY` avec les `\n`).
2. Redéployer après l'ajout des variables (les `NEXT_PUBLIC_*` sont intégrées
   au build).
3. Utiliser le domaine HTTPS de production : les notifications push ne
   fonctionnent pas en HTTP (sauf `localhost`).

### Dossiers non déposés (10 et 15 jours)

Le calcul part de la **date d'intervention** (`date`). Si elle n'est pas
renseignée, la **date de saisie** (`created_at`) est utilisée. Modifier la date
d'intervention relance donc automatiquement le délai.

- `> 10 jours` : onglet « Dossiers en attente > 10j » + alerte sur le tableau de bord.
- `> 15 jours` : onglet « Dossiers en attente > 15j » + alerte prioritaire.

Un cron quotidien (`vercel.json` → `/api/check-pending-dossiers`, 08:00 UTC)
envoie une notification push au topic `doctors` **le jour exact** où un dossier
atteint 10 jours puis 15 jours. Comme l'envoi se fait uniquement ce jour-là,
aucune table de suivi n'est nécessaire et le patient n'est pas relancé chaque
jour. Protéger l'endpoint avec `CRON_SECRET` (Vercel l'envoie automatiquement).

### Base de données (optionnel)

La migration `supabase/migrations/003_add_fcm_tokens.sql` ajoute les colonnes
`fcm_token` et la table `fcm_tokens` pour garder une trace des appareils.
Elle n'est pas nécessaire au fonctionnement des notifications (topic `doctors`).
