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
- TypeScript
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

## Recent Updates

### Home Page Refactoring (28/06/2025)
- Suppression complète de Framer Motion pour simplifier la structure
- Correction de toutes les erreurs de syntaxe JSX/TSX
- Rééquilibrage des balises ouvrantes/fermantes
- Optimisation de la hiérarchie des composants
- Conservation de toutes les fonctionnalités principales

## Déploiement

1. Exécutez `npm run build` pour générer l'application dans le dossier `dist/`.
2. Pour un déploiement mobile, synchronisez les plateformes Capacitor :

   ```bash
   npx cap sync
   npx cap open android # ou ios
   ```
3. La base de données peut être poussée avec `supabase db push`.

Vous pouvez aussi publier le projet sur Lovable en ouvrant
[la page du projet](https://lovable.dev/projects/42010448-ca15-4ded-a300-77507e6d3a1d)
et en utilisant **Share → Publish**.

### Domaine personnalisé

