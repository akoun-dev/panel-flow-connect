# Documentation de Panel Flow Connect

Panel Flow Connect est une application web et mobile développée avec React, Vite et Supabase. Elle permet de créer et de gérer des panels d'étude tout en offrant des interactions en temps réel. Voici un aperçu détaillé des fonctionnalités principales.

## Fonctionnalités clés

### Gestion des panels
- Création de panels via un formulaire complet (titre, description, dates, durée, catégorie, etc.).
- Ajout de panelistes avec possibilité de réordonner la liste.
- Statuts supportés : brouillon, programmé, en direct, terminé ou annulé.
- Génération automatique d'un QR Code et d'un lien unique pour rejoindre les questions du panel.
- Tableau d'administration pour rechercher, filtrer et modifier les panels existants.

### Invitations des participants
- Envoi d'invitations par e‑mail grâce à un service dédié.
- Chaque invitation contient un lien unique de la forme `/panel/join?token=...`.
- Acceptation des invitations avec création automatique d'une entrée dans le planning utilisateur.
- Notifications en temps réel lors de l'envoi ou de la réponse à une invitation.

### Questions en temps réel
- Fil d'actualité des questions posées pendant un panel.
- Tri par questions récentes, répondues ou non répondues.
- Recherche et filtres avancés avec indication du nombre de nouvelles questions.
- Marquage d'une question comme répondue ou suppression directe.
- Synchronisation instantanée grâce à Supabase Realtime.

### Sondages interactifs
- Création de sondages durant une session avec plusieurs options de réponse.
- Affichage des résultats en direct et mise à jour des votes sans rechargement.
- Possibilité pour les utilisateurs de voter en temps réel.

### Tableau de bord utilisateur
- Vue d'ensemble des activités : prochain panel, statistiques personnelles, actions rapides.
- Gestion des panels créés ou auxquels l'utilisateur participe (édition, suppression, changement de statut).
- Invitation de nouveaux panelistes directement depuis le dashboard.

### Gestion des sessions
- Liste des sessions (en direct, programmées ou terminées) auxquelles l'utilisateur est invité.
- Contrôles audio et vidéo lors des sessions en direct.
- Suivi du temps restant et des statistiques de participants/questions.

### Planning et calendrier
- Calendrier interactif avec FullCalendar pour visualiser tous les panels acceptés.
- Filtres par état (confirmé, en attente, annulé, terminé) et par mot‑clé.
- Statistiques globales : nombre total d'événements, taux de complétion, etc.

### Interface administrateur
- Dashboard récapitulatif avec statistiques et dernières activités.
- Gestion des panels (création, modification, suppression, filtres avancés).
- Pages dédiées pour les utilisateurs, modérateurs et paramètres.

### Authentification et sécurité
- Inscription, connexion et réinitialisation du mot de passe via Supabase Auth.
- Gestion de session persistante avec actualisation automatique des tokens.

### Application mobile
- Intégration avec Capacitor pour générer des versions iOS et Android.
- Synchronisation des données et fonctionnalités identiques à la version web.

## Technologies utilisées
- **React** et **TypeScript** pour l'interface utilisateur.
- **Vite** pour le bundling et le développement rapide.
- **Supabase** pour la base de données, l'authentification et le temps réel.
- **Tailwind CSS** et **shadcn-ui** pour le design.
- **Capacitor** pour le déploiement mobile.

Pour plus d'informations sur la configuration et les scripts disponibles, consultez le fichier `README.md` à la racine du projet.
