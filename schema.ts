

/**
 * OBJECTIVE: FRESH FACTORY RESET SCHEMA
 * 
 * INSTRUCTIONS:
 * 1. Copy the SQL content below (everything between the backticks).
 * 2. Paste it into the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql).
 * 3. Click RUN.
 */

export const DATABASE_SCHEMA_SQL = `
-- ==============================================================================
-- 1. SETUP & EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- 2. TABLES DEFINITIONS
-- ==============================================================================

-- 2.1 Profiles (Links to Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  role TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Clients (Patients) - Complete Definition
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  organization TEXT NOT NULL,
  cnic TEXT,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  religion TEXT,
  sect TEXT,
  "maritalStatus" TEXT,
  contact TEXT,
  address TEXT,
  area TEXT,
  "sectorBlock" TEXT,
  street TEXT,
  "referenceSource" TEXT,
  "referenceDetail" TEXT,
  "familyType" TEXT,
  education TEXT,
  "employmentStatus" TEXT,
  "emergencyContact" TEXT,
  "registrationDate" TIMESTAMPTZ,
  "isLegacy" BOOLEAN DEFAULT FALSE,
  "lastVisitDate" TIMESTAMPTZ,
  status TEXT,
  "riskProfile" JSONB DEFAULT '{"suicidalIdeation": false, "homicidalIntent": false}'::jsonb,
  "exitPlanEligible" BOOLEAN DEFAULT FALSE,
  "totalSpend" DECIMAL(10,2) DEFAULT 0,
  "progressNotes" JSONB DEFAULT '[]'::jsonb,
  vitals JSONB,
  "registeredBy" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Clinical Histories
CREATE TABLE IF NOT EXISTS public.clinical_histories (
    id TEXT PRIMARY KEY,
    "clientId" TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    diagnosis TEXT,
    "chiefComplaints" TEXT,
    "durationOfIllness" TEXT,
    "familyHistory" TEXT,
    "pastPsychMedicalHistory" TEXT,
    "substanceAbuseHistory" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 MSE Records
CREATE TABLE IF NOT EXISTS public.mse_records (
    id TEXT PRIMARY KEY,
    "clientId" TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    appearance TEXT,
    behavior TEXT,
    "eyeContact" TEXT,
    "speechRate" TEXT,
    "speechVolume" TEXT,
    mood TEXT,
    affect TEXT,
    "thoughtProcess" TEXT,
    "thoughtContent" TEXT,
    "perceptualDisturbances" TEXT,
    orientation TEXT,
    attention TEXT,
    memory TEXT,
    insight INTEGER,
    judgment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 MHQoL Records
CREATE TABLE IF NOT EXISTS public.mhqol_records (
    id TEXT PRIMARY KEY,
    "clientId" TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    date TIMESTAMPTZ,
    "recordedBy" TEXT,
    scores JSONB,
    "totalScore" INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Drug Inventory
CREATE TABLE IF NOT EXISTS public.drug_inventory (
    id TEXT PRIMARY KEY,
    organization TEXT,
    name TEXT NOT NULL,
    category TEXT,
    molecule TEXT,
    strength TEXT,
    brand TEXT,
    manufacturer TEXT,
    "rackLocation" TEXT,
    formulation TEXT,
    "reorderLevel" INTEGER DEFAULT 50,
    "currentStock" DECIMAL(10,2) DEFAULT 0,
    unit TEXT,
    batches JSONB DEFAULT '[]'::jsonb,
    "packetCost" DECIMAL(10,2),
    "unitsPerPacket" INTEGER,
    "costPerUnit" DECIMAL(10,2),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id TEXT PRIMARY KEY,
    organization TEXT,
    "clientId" TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    "clientName" TEXT,
    "doctorId" TEXT,
    date TIMESTAMPTZ,
    items JSONB,
    status TEXT DEFAULT 'Pending',
    "totalCost" DECIMAL(10,2),
    "specialRisks" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 Dispense Logs
CREATE TABLE IF NOT EXISTS public.dispense_logs (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ,
    "prescriptionId" TEXT REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    "drugName" TEXT,
    quantity DECIMAL(10,2),
    cost DECIMAL(10,2),
    "patientName" TEXT,
    organization TEXT
);

-- 2.9 Pharmacy Feedbacks
CREATE TABLE IF NOT EXISTS public.pharmacy_feedbacks (
    id TEXT PRIMARY KEY,
    organization TEXT,
    date TIMESTAMPTZ,
    "clientId" TEXT,
    "rxId" TEXT,
    questions JSONB,
    rating INTEGER
);

-- 2.10 Patient Queue
CREATE TABLE IF NOT EXISTS public.patient_queue (
    id TEXT PRIMARY KEY,
    "patientId" TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    "patientName" TEXT,
    organization TEXT,
    type TEXT,
    "arrivalTime" TEXT,
    status TEXT
);

-- 2.11 Outreach Sessions
CREATE TABLE IF NOT EXISTS public.outreach_sessions (
    id TEXT PRIMARY KEY,
    organization TEXT,
    location TEXT,
    date TIMESTAMPTZ,
    "nextScheduledDate" TIMESTAMPTZ,
    "conductedBy" TEXT,
    type TEXT,
    "newPatientCount" INTEGER,
    "followUpPatientCount" INTEGER,
    "copDivision" TEXT,
    "fieldActivityType" TEXT,
    "fieldSessionFormat" TEXT,
    "genderBreakdown" JSONB,
    "pamphletsDistributed" INTEGER,
    "domainFocus" TEXT,
    "participantCount" INTEGER,
    "resourcesUtilized" TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Helper to get Organization safely
CREATE OR REPLACE FUNCTION public.current_user_org() RETURNS text AS $$
  SELECT organization FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper to check if user is Admin
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Immutable Log Trigger
CREATE OR REPLACE FUNCTION prevent_log_modification() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit logs are immutable.';
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Allow ON DELETE SET NULL cascade from prescriptions
    IF NEW."prescriptionId" IS NULL AND OLD."prescriptionId" IS NOT NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Audit logs are immutable.';
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_dispense_logs ON dispense_logs;
CREATE TRIGGER trg_immutable_dispense_logs BEFORE UPDATE OR DELETE ON dispense_logs FOR EACH ROW EXECUTE FUNCTION prevent_log_modification();

-- ==============================================================================
-- 4. SECURITY POLICIES (RLS)
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mse_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mhqol_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispense_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_sessions ENABLE ROW LEVEL SECURITY;

-- 4.1 Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (is_admin() OR auth.uid() = id);
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE USING (is_admin());

-- 4.2 Organization Isolation Policies (ADMIN OVERRIDE ADDED)
-- CLIENTS
CREATE POLICY "View clients of own org" ON clients FOR SELECT USING (organization = current_user_org() OR is_admin());
CREATE POLICY "Insert clients of own org" ON clients FOR INSERT WITH CHECK (organization = current_user_org() OR is_admin());
CREATE POLICY "Update clients of own org" ON clients FOR UPDATE USING (organization = current_user_org() OR is_admin());
CREATE POLICY "Delete clients of own org" ON clients FOR DELETE USING (organization = current_user_org() OR is_admin());

-- CLINICAL HISTORIES
CREATE POLICY "View history if access to client" ON clinical_histories FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = clinical_histories."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);
CREATE POLICY "Insert history if access to client" ON clinical_histories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = clinical_histories."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);
CREATE POLICY "Update history if access to client" ON clinical_histories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = clinical_histories."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);
CREATE POLICY "Delete history if access to client" ON clinical_histories FOR DELETE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = clinical_histories."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);

-- MSE RECORDS
CREATE POLICY "View MSE if access to client" ON mse_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = mse_records."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);
CREATE POLICY "Insert MSE if access to client" ON mse_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = mse_records."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);
CREATE POLICY "Update MSE if access to client" ON mse_records FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = mse_records."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);
CREATE POLICY "Delete MSE if access to client" ON mse_records FOR DELETE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = mse_records."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);

-- MHQoL RECORDS
CREATE POLICY "View MHQoL if access to client" ON mhqol_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = mhqol_records."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);
CREATE POLICY "Insert MHQoL if access to client" ON mhqol_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = mhqol_records."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);
CREATE POLICY "Update MHQoL if access to client" ON mhqol_records FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = mhqol_records."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);
CREATE POLICY "Delete MHQoL if access to client" ON mhqol_records FOR DELETE USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = mhqol_records."clientId" AND (clients.organization = current_user_org() OR is_admin()))
);

-- INVENTORY
CREATE POLICY "View inventory of own org" ON drug_inventory FOR SELECT USING (organization = current_user_org() OR is_admin());
CREATE POLICY "Manage inventory of own org" ON drug_inventory FOR ALL USING (organization = current_user_org() OR is_admin());

-- PRESCRIPTIONS
CREATE POLICY "View rx of own org" ON prescriptions FOR SELECT USING (organization = current_user_org() OR is_admin());
CREATE POLICY "Manage rx of own org" ON prescriptions FOR ALL USING (organization = current_user_org() OR is_admin());

-- DISPENSE LOGS
CREATE POLICY "View logs of own org" ON dispense_logs FOR SELECT USING (organization = current_user_org() OR is_admin());
CREATE POLICY "Insert logs for own org" ON dispense_logs FOR INSERT WITH CHECK (organization = current_user_org() OR is_admin());

-- FEEDBACKS
CREATE POLICY "View feedback of own org" ON pharmacy_feedbacks FOR SELECT USING (organization = current_user_org() OR is_admin());
CREATE POLICY "Insert feedback of own org" ON pharmacy_feedbacks FOR INSERT WITH CHECK (organization = current_user_org() OR is_admin());
CREATE POLICY "Delete feedback of own org" ON pharmacy_feedbacks FOR DELETE USING (organization = current_user_org() OR is_admin());

-- QUEUE
CREATE POLICY "View queue of own org" ON patient_queue FOR SELECT USING (organization = current_user_org() OR is_admin());
CREATE POLICY "Manage queue of own org" ON patient_queue FOR ALL USING (organization = current_user_org() OR is_admin());

-- OUTREACH SESSIONS
CREATE POLICY "View sessions of own org" ON outreach_sessions FOR SELECT USING (organization = current_user_org() OR is_admin());
CREATE POLICY "Manage sessions of own org" ON outreach_sessions FOR ALL USING (organization = current_user_org() OR is_admin());

-- ==============================================================================
-- 5. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization);
CREATE INDEX IF NOT EXISTS idx_clients_cnic ON clients(cnic);
CREATE INDEX IF NOT EXISTS idx_inventory_org ON drug_inventory(organization);
CREATE INDEX IF NOT EXISTS idx_prescriptions_org ON prescriptions(organization);
`;