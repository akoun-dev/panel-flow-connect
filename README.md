# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/42010448-ca15-4ded-a300-77507e6d3a1d

## Objectif du projet

PanelFlow Connect est une application web et mobile permettant de gérer des
panels d'étude et leurs sessions. L'interface est développée avec React et
Vite, la persistance des données s'appuie sur Supabase et la version mobile est
embarquée grâce à Capacitor. L'objectif est de disposer d'une solution
polyvalente pour créer des panels, inviter des participants et suivre les
interactions en temps réel.

## Prérequis

- **Node.js** 18 ou version supérieure avec npm
- **Supabase CLI** (`npm install -g supabase`) pour lancer une instance locale
- **Capacitor CLI** (`npm install -g @capacitor/cli`) pour générer les builds
  mobiles

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/42010448-ca15-4ded-a300-77507e6d3a1d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript (strict mode enabled)
- React
- shadcn-ui
- Tailwind CSS

## Configuration locale

1. Copiez le fichier `.env.example` en `.env` et renseignez vos clefs Supabase :

   ```bash
   cp .env.example .env
   # Modifier VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
   ```

2. Installez les dépendances puis lancez l'instance Supabase et le serveur Vite :

   ```bash
   npm i
   supabase start
  npm run dev
  ```

## Scripts disponibles

| Commande          | Description                                     |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Démarre le serveur de développement Vite        |
| `npm run build`   | Génère la version de production dans `dist/`    |
| `npm run build:dev` | Build de développement (plus rapide)           |
| `npm run lint`    | Lance ESLint sur l'ensemble du projet           |
| `npm run preview` | Prévisualise le contenu généré après build      |

## Fonctionnalités principales

### Page d'accueil
- Section Hero avec présentation claire
- Affichage de statistiques en temps réel
- Grille de fonctionnalités détaillées
- Témoignages clients
- Section Call-to-Action

### Autres fonctionnalités
- Interface responsive et accessible
- Thème sombre/clair (optionnel)
- Navigation fluide
- Performances optimisées
- Sondages en temps réel pour interroger les participants durant les panels

### Sondages en temps réel
Les modérateurs peuvent créer des sondages pendant une session. Les participants votent instantanément et les résultats se mettent à jour sans rechargement grâce à Supabase Realtime.

## Système d'invitation

L'organisateur peut inviter des participants en saisissant leurs adresses e‑mail depuis la gestion d'un panel. Chaque invitation génère un lien unique de la forme `/panel/join?token=...`. Lorsque ce lien est visité, l'invitation est validée et le participant est redirigé vers la page des panels.

## Recent Updates

### Home Page Refactoring (28/06/2025)
- Suppression complète de Framer Motion pour simplifier la structure
- Correction de toutes les erreurs de syntaxe JSX/TSX
- Rééquilibrage des balises ouvrantes/fermantes
- Optimisation de la hiérarchie des composants
- Conservation de toutes les fonctionnalités principales

### Enregistrements MP3 (07/07/2025)
- Les sessions audio sont désormais converties en MP3 avant l'envoi vers Supabase.
- Les lecteurs intégrés utilisent directement ces fichiers `.mp3`.

### UUID helper (08/07/2025)
- Nouvelle fonction `generateUUID()` dans `src/lib/uuid.ts` qui utilise `crypto.randomUUID` si disponible et bascule sur une implémentation maison sinon.

## Speech to text

Pour générer automatiquement la transcription (Speech to text) des audios, renseignez la variable
`VITE_OPENAI_API_KEY` dans votre fichier `.env`.

```bash
cp .env.example .env
# Ajoutez votre clef OpenAI
```

`TranscriptionService.transcribeAudio` utilise cette clef pour contacter
l'API Whisper d'OpenAI.

## Déploiement

1. Exécutez `npm run build` pour générer l'application dans le dossier `dist/`.
2. Pour un déploiement mobile, synchronisez les plateformes Capacitor :

   ```bash
   npx cap sync
   npx cap open android # ou ios
   ```
3. La base de données peut être poussée avec `supabase db push`, puis appliquez
   les corrections de données avec `supabase db seed -f supabase/seed/data_corrections.sql`.

Vous pouvez aussi publier le projet sur Lovable en ouvrant
[la page du projet](https://lovable.dev/projects/42010448-ca15-4ded-a300-77507e6d3a1d)
et en utilisant **Share → Publish**.

### Domaine personnalisé
