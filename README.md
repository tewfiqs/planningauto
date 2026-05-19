# PlanningAuto

Application de planning automatique pour la couverture 24h/24, 7j/7 d'un site par une equipe de 8 personnes.

## Stack technique

- **Frontend** : React + Vite + TypeScript + TailwindCSS + FullCalendar
- **Backend/BDD** : Supabase (PostgreSQL + Auth + Realtime)
- **Notifications** : Supabase Edge Functions + Resend
- **Exports** : ExcelJS (xlsx) + jsPDF (PDF)

## Installation

```bash
cd planning-auto
npm install
```

## Configuration

1. Copier `.env.example` en `.env` et renseigner les variables Supabase
2. Appliquer les migrations SQL dans l'ordre sur votre projet Supabase :
   - `supabase/migrations/001_schema.sql` - Tables
   - `supabase/migrations/002_rls.sql` - Politiques RLS
   - `supabase/migrations/003_seed.sql` - Donnees de test

### Application des migrations

Dans le SQL Editor de Supabase (https://supabase.com/dashboard), executez chaque fichier dans l'ordre.

## Lancement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## Structure du projet

```
src/
  components/     # Composants reutilisables (Layout, ProtectedRoute...)
  engine/         # Moteur de generation du planning
  hooks/          # Hooks React (useAuth...)
  lib/            # Configuration (Supabase client)
  pages/
    gestionnaire/ # Pages du gestionnaire
    intervenant/  # Pages de l'intervenant
  types/          # Types TypeScript
supabase/
  migrations/     # Scripts SQL (schema, RLS, seed)
```

## Roles

- **Gestionnaire** : acces complet (generation planning, gestion intervenants, conges, parametres)
- **Intervenant** : acces limite (son planning, ses conges, desistement, notifications)

## Creneaux

| Code     | Horaires        | Jours       | Notes                          |
|----------|-----------------|-------------|--------------------------------|
| AM_MENA  | 11h-14h         | Lun-Ven     | Fixe, affecte a AM             |
| APM      | 14h-19h         | Lun-Ven     | Planifiable                    |
| NUIT     | 19h-11h (J+1)   | Tous jours  | Planifiable, compte sur 2 jours|
| WE       | 11h-19h         | Sam-Dim     | Planifiable                    |
