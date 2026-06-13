-- ─── TIPOS DE ARGILA ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clay_types (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  price       numeric(10,2) NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO clay_types (name, price) VALUES
  ('Egito', 75.00),
  ('Sépia', 75.00),
  ('Capuccino', 75.00),
  ('Flocos', 75.00),
  ('Londres', 75.00),
  ('Sibéria', 75.00),
  ('Branca Premium', 90.00),
  ('Preta Vesúvio', 90.00)
ON CONFLICT DO NOTHING;

-- ─── VENDAS DE ARGILA ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clay_sales (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  clay_type_id    uuid NOT NULL REFERENCES clay_types(id),
  quantity        numeric(10,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      numeric(10,2) NOT NULL,
  total_value     numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid', 'cancelled')),
  sale_date       date NOT NULL DEFAULT CURRENT_DATE,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid NOT NULL REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_clay_sales_student ON clay_sales(student_id, status);

-- ─── FECHAMENTOS DE ARGILA ────────────────────────────────────

CREATE TABLE IF NOT EXISTS clay_closings (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reference_month   text NOT NULL,
  total_value       numeric(10,2) NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'awaiting_payment'
                    CHECK (status IN ('awaiting_payment', 'paid')),
  closed_at         timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz,
  notes             text,
  created_by        uuid NOT NULL REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clay_closing_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  closing_id      uuid NOT NULL REFERENCES clay_closings(id) ON DELETE CASCADE,
  clay_sale_id    uuid NOT NULL REFERENCES clay_sales(id) ON DELETE RESTRICT,
  value_snapshot  numeric(10,2) NOT NULL,
  UNIQUE(clay_sale_id)
);

-- ─── RLS ARGILA ───────────────────────────────────────────────

ALTER TABLE clay_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clay_sales          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clay_closings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clay_closing_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um le tipos argila"  ON clay_types;
DROP POLICY IF EXISTS "Admin gerencia tipos argila"  ON clay_types;
CREATE POLICY "Qualquer um le tipos argila" ON clay_types FOR SELECT USING (true);
CREATE POLICY "Admin gerencia tipos argila" ON clay_types FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Aluna le proprias argilas" ON clay_sales;
DROP POLICY IF EXISTS "Admin gerencia argilas"    ON clay_sales;
CREATE POLICY "Aluna le proprias argilas" ON clay_sales FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admin gerencia argilas"    ON clay_sales FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Aluna le proprios fechamentos argila" ON clay_closings;
DROP POLICY IF EXISTS "Admin gerencia fechamentos argila"    ON clay_closings;
CREATE POLICY "Aluna le proprios fechamentos argila" ON clay_closings FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admin gerencia fechamentos argila"    ON clay_closings FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admin gerencia itens argila" ON clay_closing_items;
CREATE POLICY "Admin gerencia itens argila" ON clay_closing_items FOR ALL USING (is_admin());
