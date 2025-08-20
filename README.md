# Kanban App avec Supabase

Une application Kanban moderne construite avec React et Supabase, basée sur votre code original mais restructurée selon les meilleures pratiques d'architecture web.

## 🚀 Fonctionnalités

- ✅ Gestion des tâches Kanban avec drag & drop
- ✅ Groupement par compartiment, priorité ou statut
- ✅ Système de filtres avancés
- ✅ Tâches rapides pour l'ajout express
- ✅ Sous-tâches avec suivi d'avancement
- ✅ Stockage persistant avec Supabase
- ✅ Interface responsive avec TailwindCSS

## 🏗️ Architecture

L'application a été restructurée pour suivre les bonnes pratiques :

```
src/
├── components/          # Composants UI réutilisables
│   ├── ui/             # Composants d'interface de base
│   ├── TaskCard.jsx    # Carte d'affichage des tâches
│   ├── TaskModal.jsx   # Modale d'édition des tâches
│   └── QuickTasksModal.jsx # Modale des tâches rapides
├── hooks/              # Hooks personnalisés
│   ├── useTasks.js     # Gestion des tâches
│   └── useQuickTasks.js # Gestion des tâches rapides
├── services/           # Services et API
│   ├── supabase.js     # Configuration Supabase
│   └── taskService.js  # Service de gestion des tâches
├── utils/              # Utilitaires et helpers
│   ├── constants.js    # Constantes de l'app
│   └── helpers.js      # Fonctions utilitaires
└── App.jsx            # Composant principal
```

## 🛠️ Installation

1. **Cloner et installer les dépendances :**
   ```bash
   npm install
   ```

2. **Configurer Supabase :**
   - Créez un projet sur [Supabase](https://supabase.com)
   - Exécutez le script SQL `supabase-schema.sql` dans l'éditeur SQL
   - Copiez `.env.example` vers `.env` et remplissez vos credentials :
   ```env
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

3. **Lancer l'application :**
   ```bash
   npm run dev
   ```

## 📊 Base de données

### Tables Supabase

**`tasks`** - Tâches principales :
- `id` (UUID, PK)
- `title` (TEXT) - Titre de la tâche
- `priority` (TEXT) - P1, P2, P3, P4, P5
- `compartment` (TEXT) - PM, CPO, FER, NOVAE, MRH, CDA
- `status` (TEXT) - À faire, À analyser, En cours, Terminé
- `size` (TEXT) - S, M, L, XL, XXL
- `note` (TEXT) - Note interne
- `when` (TEXT) - Planification temporelle
- `due_date` (DATE) - Date d'échéance
- `flagged` (BOOLEAN) - Marqué comme à risque
- `subtasks` (JSONB) - Sous-tâches au format JSON
- `created_at`, `updated_at` (TIMESTAMP)

**`quick_tasks`** - Tâches rapides :
- `id` (UUID, PK)
- `title` (TEXT)
- `created_at` (TIMESTAMP)

## 🔧 Développement

### Hooks personnalisés

- **`useTasks()`** : Gère les tâches principales (CRUD + drag & drop)
- **`useQuickTasks()`** : Gère les tâches rapides

### Services

- **`taskService`** : Interface avec l'API Supabase pour les tâches
- **`supabase`** : Configuration du client Supabase

### Composants

- **`TaskCard`** : Affichage d'une tâche avec drag & drop
- **`TaskModal`** : Création/édition de tâches
- **`QuickTasksModal`** : Gestion des tâches rapides
- **`Select`** : Composant de sélection personnalisé

## 🎨 Personnalisation

Les couleurs et styles sont centralisés dans `src/utils/constants.js` :
- Couleurs des priorités, statuts, compartiments
- Configuration des options temporelles
- Styles d'interface

## 🚦 Migration depuis l'ancien code

L'application conserve toutes les fonctionnalités de votre code original :
- ✅ Même interface utilisateur
- ✅ Même système de groupement et filtres
- ✅ Même gestion des priorités et statuts
- ✅ Drag & drop identique
- ✅ Tâches rapides conservées

**Changements principaux :**
- 🔄 LocalStorage → Supabase pour la persistance
- 🏗️ Code divisé en composants modulaires
- 🎣 Logique métier dans des hooks personnalisés
- 🔧 Services dédiés pour l'API

## 🔒 Sécurité

⚠️ **Important** : Le schéma SQL fourni utilise des politiques RLS permissives pour la démonstration. En production, implémentez une authentification appropriée et des politiques de sécurité strictes.

## 📝 Scripts disponibles

- `npm run dev` - Serveur de développement
- `npm run build` - Build de production
- `npm run preview` - Aperçu du build

## 🤝 Support

Si vous avez des questions sur l'implémentation ou souhaitez des modifications, n'hésitez pas à demander !