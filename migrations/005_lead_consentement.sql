-- Consentement explicite des prospects (Loi 2024/017, art. 41).
--
-- Le visiteur accepte d'etre recontacte avant toute capture de coordonnees.
-- On horodate le moment exact de cette acceptation, meme apres coup, pour
-- les leads deja captures : la colonne reste nullable, aucune perte.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS consentement_at TIMESTAMPTZ;

-- Audit rapide des consentements captures (engagement juridique).
CREATE INDEX IF NOT EXISTS idx_leads_consentement
  ON leads (consentement_at)
  WHERE consentement_at IS NOT NULL;