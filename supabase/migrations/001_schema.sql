-- ============================================
-- PlanningAuto - Schéma de base de données
-- ============================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: creneaux
-- Les 4 types de créneaux du site
-- ============================================
CREATE TABLE creneaux (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE CHECK (code IN ('AM_MENA', 'APM', 'NUIT', 'WE')),
  label TEXT NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  jours_semaine INTEGER[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: intervenants
-- Les 8 personnes de l'équipe
-- ============================================
CREATE TABLE intervenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('principale', 'aide', 'am')),
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: contraintes
-- Règles hard/soft/quota par intervenant
-- ============================================
CREATE TABLE contraintes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intervenant_id UUID NOT NULL REFERENCES intervenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('hard', 'soft', 'quota')),
  creneau_code TEXT NOT NULL REFERENCES creneaux(code),
  valeur TEXT NOT NULL,
  periode TEXT CHECK (periode IN ('jour', 'semaine', 'mois')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: plannings
-- Un planning par mois
-- ============================================
CREATE TABLE plannings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee INTEGER NOT NULL CHECK (annee >= 2024),
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'validé')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  UNIQUE (mois, annee)
);

-- ============================================
-- TABLE: affectations
-- Chaque créneau assigné à un intervenant
-- ============================================
CREATE TABLE affectations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_id UUID NOT NULL REFERENCES plannings(id) ON DELETE CASCADE,
  intervenant_id UUID NOT NULL REFERENCES intervenants(id),
  creneau_code TEXT NOT NULL REFERENCES creneaux(code),
  date DATE NOT NULL,
  statut TEXT NOT NULL DEFAULT 'confirmé' CHECK (statut IN ('confirmé', 'remplacé', 'absent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_affectations_planning ON affectations(planning_id);
CREATE INDEX idx_affectations_intervenant ON affectations(intervenant_id);
CREATE INDEX idx_affectations_date ON affectations(date);

-- ============================================
-- TABLE: conges
-- Demandes de congés des intervenants
-- ============================================
CREATE TABLE conges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intervenant_id UUID NOT NULL REFERENCES intervenants(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  motif TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuvé', 'refusé')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (date_fin >= date_debut)
);

CREATE INDEX idx_conges_intervenant ON conges(intervenant_id);
CREATE INDEX idx_conges_dates ON conges(date_debut, date_fin);

-- ============================================
-- TABLE: desistements
-- Quand un intervenant se désiste d'un créneau
-- ============================================
CREATE TABLE desistements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affectation_id UUID NOT NULL REFERENCES affectations(id) ON DELETE CASCADE,
  intervenant_id UUID NOT NULL REFERENCES intervenants(id),
  date_declaration TIMESTAMPTZ DEFAULT NOW(),
  motif TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: remplacements
-- Cascade de propositions de remplacement
-- ============================================
CREATE TABLE remplacements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  desistement_id UUID NOT NULL REFERENCES desistements(id) ON DELETE CASCADE,
  intervenant_remplacant_id UUID NOT NULL REFERENCES intervenants(id),
  statut TEXT NOT NULL DEFAULT 'proposé' CHECK (statut IN ('proposé', 'accepté', 'refusé')),
  notifie_le TIMESTAMPTZ DEFAULT NOW(),
  repondu_le TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_remplacements_desistement ON remplacements(desistement_id);

-- ============================================
-- TABLE: scores_equite
-- Score composite recalculé après chaque affectation
-- ============================================
CREATE TABLE scores_equite (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planning_id UUID NOT NULL REFERENCES plannings(id) ON DELETE CASCADE,
  intervenant_id UUID NOT NULL REFERENCES intervenants(id),
  jours_travailles INTEGER DEFAULT 0,
  nuits_effectuees INTEGER DEFAULT 0,
  weekends_travailles INTEGER DEFAULT 0,
  score_composite NUMERIC(10, 4) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (planning_id, intervenant_id)
);

-- ============================================
-- TABLE: notifications
-- Notifications in-app et email
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intervenant_id UUID NOT NULL REFERENCES intervenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  lu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_intervenant ON notifications(intervenant_id);
CREATE INDEX idx_notifications_lu ON notifications(lu);

-- ============================================
-- TABLE: parametres
-- Configuration globale de l'application
-- ============================================
CREATE TABLE parametres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cle TEXT NOT NULL UNIQUE,
  valeur TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: profils (lien auth.users <-> rôle app)
-- ============================================
CREATE TABLE profils (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'intervenant' CHECK (role IN ('gestionnaire', 'intervenant')),
  intervenant_id UUID REFERENCES intervenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
