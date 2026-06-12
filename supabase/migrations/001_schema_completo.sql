-- ============================================================
-- ATELIÊ MALU RIBEIRO — Migration 001 — Schema completo MVP
-- ============================================================

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PERFIS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name               text NOT NULL DEFAULT '',
  phone                   text,
  role                    text NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'former')),
  notes                   text,
  onboarding_completed    boolean NOT NULL DEFAULT false,
  first_open_piece_date   date,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── TIPOS DE QUEIMA ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS firing_types (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  coefficient numeric(8,4) NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Dados iniciais
INSERT INTO firing_types (name, coefficient, description) VALUES
  ('Uma queima (biscoito)', 0.007, 'Apenas queima biscoito'),
  ('Duas queimas (biscoito + esmalte)', 0.015, 'Queima biscoito e esmalte'),
  ('Três queimas (biscoito + esmalte + decalque/ouro)', 0.022, 'Biscoito, esmalte e decalque ou ouro'),
  ('Feito em casa, esmaltado no ateliê', 0.022, 'Peça produzida em casa e esmaltada no ateliê'),
  ('Feito em casa, esmaltado em casa', 0.015, 'Peça produzida e esmaltada em casa')
ON CONFLICT DO NOTHING;

-- ─── PEÇAS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pieces (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  name              text NOT NULL,
  description       text,
  height            numeric(10,2) NOT NULL CHECK (height > 0),
  width             numeric(10,2) NOT NULL CHECK (width > 0),
  length            numeric(10,2) NOT NULL CHECK (length > 0),
  volume            numeric(12,2) GENERATED ALWAYS AS (height * width * length) STORED,
  firing_type_id    uuid NOT NULL REFERENCES firing_types(id),
  coefficient       numeric(8,4) NOT NULL,
  calculated_value  numeric(10,2) NOT NULL,
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid', 'cancelled')),
  piece_date        date NOT NULL DEFAULT CURRENT_DATE,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid NOT NULL REFERENCES profiles(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pieces_student_status ON pieces(student_id, status);
CREATE INDEX IF NOT EXISTS idx_pieces_status ON pieces(status);
CREATE INDEX IF NOT EXISTS idx_pieces_created_at ON pieces(created_at DESC);

-- Atualizar first_open_piece_date no perfil quando primeira peça é cadastrada
CREATE OR REPLACE FUNCTION update_first_open_piece_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' THEN
    UPDATE profiles
    SET first_open_piece_date = COALESCE(first_open_piece_date, CURRENT_DATE)
    WHERE id = NEW.student_id AND first_open_piece_date IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_piece_created ON pieces;
CREATE TRIGGER on_piece_created
  AFTER INSERT ON pieces
  FOR EACH ROW EXECUTE FUNCTION update_first_open_piece_date();

-- ─── FECHAMENTOS MENSAIS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS monthly_closings (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reference_month   text NOT NULL, -- "2026-06"
  total_value       numeric(10,2) NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'awaiting_payment'
                    CHECK (status IN ('open', 'awaiting_payment', 'paid')),
  closed_at         timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz,
  notes             text,
  created_by        uuid NOT NULL REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS closing_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  closing_id      uuid NOT NULL REFERENCES monthly_closings(id) ON DELETE CASCADE,
  piece_id        uuid NOT NULL REFERENCES pieces(id) ON DELETE RESTRICT,
  value_snapshot  numeric(10,2) NOT NULL,
  UNIQUE(piece_id) -- peça só pode estar em um fechamento
);

CREATE INDEX IF NOT EXISTS idx_monthly_closings_student ON monthly_closings(student_id);
CREATE INDEX IF NOT EXISTS idx_closing_items_closing ON closing_items(closing_id);

-- ─── AGENDA — SLOTS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schedule_slots (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_time    timestamptz NOT NULL,
  end_time      timestamptz NOT NULL,
  max_students  int NOT NULL DEFAULT 8 CHECK (max_students > 0 AND max_students <= 30),
  is_blocked    boolean NOT NULL DEFAULT false,
  block_reason  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_slots_start_time ON schedule_slots(start_time);

-- ─── AGENDAMENTOS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id       uuid NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status        text NOT NULL DEFAULT 'confirmed'
                CHECK (status IN ('confirmed', 'cancelled', 'no_show')),
  cancelled_at  timestamptz,
  cancel_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slot_id, student_id) -- uma aluna por slot
);

CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(slot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_id);

-- ─── PRESENÇA ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS attendance (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  status          text NOT NULL CHECK (status IN ('present', 'absent', 'justified')),
  notes           text,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  recorded_by     uuid NOT NULL REFERENCES profiles(id),
  UNIQUE(appointment_id)
);

-- ─── LISTA DE ESPERA ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waitlist (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id     uuid NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  position    int NOT NULL,
  status      text NOT NULL DEFAULT 'waiting'
              CHECK (status IN ('waiting', 'offered', 'confirmed', 'expired')),
  offered_at  timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slot_id, student_id)
);

-- ─── CONFIGURAÇÕES ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO system_settings (key, value) VALUES
  ('closing_notification_days', '30'),
  ('max_days_ahead', '15'),
  ('min_cancel_hours', '24'),
  ('cancel_policy', '"mark_absent"'),
  ('waitlist_offer_hours', '12'),
  ('max_students_per_slot', '8')
ON CONFLICT (key) DO NOTHING;

-- ─── AUDITORIA ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid REFERENCES profiles(id),
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE firing_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pieces             ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_closings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist           ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;

-- Helper: verificar role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Aluna lê próprio perfil"       ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Aluna edita próprio perfil"    ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admin lê todos os perfis"      ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admin edita todos os perfis"   ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Sistema insere perfil"         ON profiles FOR INSERT WITH CHECK (true);

-- FIRING TYPES (todos leem, admin edita)
CREATE POLICY "Qualquer um lê tipos de queima" ON firing_types FOR SELECT USING (true);
CREATE POLICY "Admin gerencia tipos de queima" ON firing_types FOR ALL USING (is_admin());

-- PIECES
CREATE POLICY "Aluna lê próprias peças"       ON pieces FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admin lê todas as peças"       ON pieces FOR SELECT USING (is_admin());
CREATE POLICY "Admin gerencia peças"          ON pieces FOR ALL USING (is_admin());

-- MONTHLY CLOSINGS
CREATE POLICY "Aluna lê próprios fechamentos" ON monthly_closings FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admin gerencia fechamentos"    ON monthly_closings FOR ALL USING (is_admin());

-- CLOSING ITEMS
CREATE POLICY "Aluna lê próprios itens"       ON closing_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM monthly_closings mc
    WHERE mc.id = closing_id AND mc.student_id = auth.uid()
  ));
CREATE POLICY "Admin gerencia itens"          ON closing_items FOR ALL USING (is_admin());

-- SCHEDULE SLOTS (todos leem)
CREATE POLICY "Qualquer um lê slots"          ON schedule_slots FOR SELECT USING (true);
CREATE POLICY "Admin gerencia slots"          ON schedule_slots FOR ALL USING (is_admin());

-- APPOINTMENTS
CREATE POLICY "Aluna lê próprios agendamentos" ON appointments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Aluna cria agendamento"          ON appointments FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Aluna cancela próprio"           ON appointments FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (status = 'cancelled');
CREATE POLICY "Admin gerencia agendamentos"     ON appointments FOR ALL USING (is_admin());

-- ATTENDANCE
CREATE POLICY "Aluna lê própria presença"     ON attendance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_id AND a.student_id = auth.uid()
  ));
CREATE POLICY "Admin gerencia presença"       ON attendance FOR ALL USING (is_admin());

-- WAITLIST
CREATE POLICY "Aluna lê própria fila"         ON waitlist FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Aluna entra na fila"           ON waitlist FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admin gerencia fila"           ON waitlist FOR ALL USING (is_admin());

-- SYSTEM SETTINGS (só admin)
CREATE POLICY "Admin gerencia configurações"  ON system_settings FOR ALL USING (is_admin());

-- AUDIT LOGS (só admin lê, sistema escreve via service_role)
CREATE POLICY "Admin lê auditoria"            ON audit_logs FOR SELECT USING (is_admin());
