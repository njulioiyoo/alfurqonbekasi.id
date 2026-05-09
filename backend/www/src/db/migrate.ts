import { pool } from "./pool.js";

/**
 * Urutan: `users` lama (kolom `role` varchar) → tabel RBAC → backfill `role_id` → drop `role`.
 * Seed permission mengikuti matriks CASL lama (setara konsep Spatie: roles + permissions + pivot).
 */
const INIT_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- --- RBAC (Spatie-style) ---
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  guard_name VARCHAR(50) NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL UNIQUE,
  guard_name VARCHAR(50) NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_has_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_has_permissions_permission_id ON role_has_permissions (permission_id);

INSERT INTO roles (name, display_name, description, guard_name)
VALUES
  ('superadmin', 'Super Admin', 'Akses penuh (manage all).', 'web'),
  ('admin', 'Admin', 'Pengurus konten dan pengguna.', 'web'),
  ('user', 'Pengunjung', 'Akses baca konten publik.', 'web')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO permissions (name, guard_name) VALUES
  ('manage:all', 'web'),
  ('read:Dashboard', 'web'),
  ('read:OpsBroadcast', 'web'),
  ('read:JamaahData', 'web'),
  ('create:JamaahData', 'web'),
  ('update:JamaahData', 'web'),
  ('delete:JamaahData', 'web'),
  ('read:JamaahEventAttendance', 'web'),
  ('read:JamaahFuneralService', 'web'),
  ('read:JamaahAdministration', 'web'),
  ('read:FinanceCash', 'web'),
  ('create:FinanceCash', 'web'),
  ('update:FinanceCash', 'web'),
  ('delete:FinanceCash', 'web'),
  ('read:FinanceZiswaf', 'web'),
  ('read:FinanceCampaign', 'web'),
  ('read:FinanceReport', 'web'),
  ('read:ProgramSocial', 'web'),
  ('create:ProgramSocial', 'web'),
  ('update:ProgramSocial', 'web'),
  ('delete:ProgramSocial', 'web'),
  ('read:ProgramTpq', 'web'),
  ('create:ProgramTpq', 'web'),
  ('update:ProgramTpq', 'web'),
  ('delete:ProgramTpq', 'web'),
  ('read:ProgramQurbanZakat', 'web'),
  ('read:AssetData', 'web'),
  ('read:AssetBorrows', 'web'),
  ('read:AssetMaintenance', 'web'),
  ('create:Role', 'web'),
  ('read:Role', 'web'),
  ('update:Role', 'web'),
  ('delete:Role', 'web'),
  ('create:Permission', 'web'),
  ('read:Permission', 'web'),
  ('update:Permission', 'web'),
  ('delete:Permission', 'web'),
  ('create:User', 'web'),
  ('create:Article', 'web'),
  ('read:Article', 'web'),
  ('update:Article', 'web'),
  ('delete:Article', 'web'),
  ('create:Announcement', 'web'),
  ('read:Announcement', 'web'),
  ('update:Announcement', 'web'),
  ('delete:Announcement', 'web'),
  ('create:Donation', 'web'),
  ('read:Donation', 'web'),
  ('update:Donation', 'web'),
  ('delete:Donation', 'web'),
  ('create:PrayerSchedule', 'web'),
  ('read:PrayerSchedule', 'web'),
  ('update:PrayerSchedule', 'web'),
  ('delete:PrayerSchedule', 'web'),
  ('create:Gallery', 'web'),
  ('read:Gallery', 'web'),
  ('update:Gallery', 'web'),
  ('delete:Gallery', 'web'),
  ('read:User', 'web'),
  ('update:User', 'web'),
  ('delete:User', 'web'),
  ('read:Menu', 'web'),
  ('read:Setting', 'web'),
  ('update:Setting', 'web')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_has_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'superadmin' AND p.name = 'manage:all'
ON CONFLICT DO NOTHING;

INSERT INTO role_has_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name IN (
  'read:Dashboard',
  'read:OpsBroadcast',
  'create:JamaahData', 'read:JamaahData', 'update:JamaahData', 'delete:JamaahData',
  'read:JamaahEventAttendance', 'read:JamaahFuneralService', 'read:JamaahAdministration',
  'create:FinanceCash', 'read:FinanceCash', 'update:FinanceCash', 'delete:FinanceCash',
  'read:FinanceZiswaf', 'read:FinanceCampaign', 'read:FinanceReport',
  'read:ProgramSocial', 'create:ProgramSocial', 'update:ProgramSocial', 'delete:ProgramSocial',
  'read:ProgramTpq', 'create:ProgramTpq', 'update:ProgramTpq', 'delete:ProgramTpq',
  'read:ProgramQurbanZakat',
  'read:AssetData', 'read:AssetBorrows', 'read:AssetMaintenance',
  'read:Role', 'update:Role',
  'read:Permission',
  'create:User', 'read:User', 'update:User', 'delete:User',
  'create:Article', 'read:Article', 'update:Article', 'delete:Article',
  'create:Announcement', 'read:Announcement', 'update:Announcement', 'delete:Announcement',
  'create:Donation', 'read:Donation', 'update:Donation', 'delete:Donation',
  'create:PrayerSchedule', 'read:PrayerSchedule', 'update:PrayerSchedule', 'delete:PrayerSchedule',
  'create:Gallery', 'read:Gallery', 'update:Gallery', 'delete:Gallery',
  'read:Menu', 'read:Setting', 'update:Setting'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_has_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN (
  'read:Article', 'read:Announcement', 'read:PrayerSchedule'
)
ON CONFLICT DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);

DO $rbac_backfill$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    UPDATE users u
    SET role_id = r.id
    FROM roles r
    WHERE u.role_id IS NULL AND r.name = u.role;
  END IF;
END
$rbac_backfill$;

UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'user' LIMIT 1)
WHERE role_id IS NULL;

ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Kolom role CMS + menu admin dari DB (tanpa hardcode di kode).
ALTER TABLE roles ADD COLUMN IF NOT EXISTS assignable_in_cms BOOLEAN NOT NULL DEFAULT false;
UPDATE roles SET assignable_in_cms = true WHERE name IN ('admin', 'user');

ALTER TABLE roles ADD COLUMN IF NOT EXISTS system_locked BOOLEAN NOT NULL DEFAULT false;
UPDATE roles SET system_locked = true WHERE name IN ('superadmin', 'admin', 'user');

CREATE TABLE IF NOT EXISTS admin_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(64) NOT NULL UNIQUE,
  menu_group VARCHAR(32) NOT NULL DEFAULT 'primary',
  label VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  icon VARCHAR(64),
  permission_name VARCHAR(150) NOT NULL,
  router_name VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_config (
  key VARCHAR(150) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

ALTER TABLE IF EXISTS cms_content_items RENAME TO content_items;
ALTER TABLE IF EXISTS cms_announcements RENAME TO announcements;

CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  excerpt TEXT,
  body TEXT,
  cover_image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_items_type_slug ON content_items (type, slug);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items (type);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items (status);
CREATE INDEX IF NOT EXISTS idx_content_items_published_at ON content_items (published_at);

ALTER TABLE content_items ADD COLUMN IF NOT EXISTS attr_1 TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS attr_2 TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS attr_3 TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS attr_4 TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS attr_5 TEXT;

CREATE TABLE IF NOT EXISTS jamaah_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(255),
  gender VARCHAR(20),
  birth_date DATE,
  address TEXT,
  member_status VARCHAR(20) NOT NULL DEFAULT 'active',
  category VARCHAR(40) NOT NULL DEFAULT 'general',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_jamaah_members_phone ON jamaah_members (phone);
CREATE UNIQUE INDEX IF NOT EXISTS uq_jamaah_members_email ON jamaah_members (email) WHERE email IS NOT NULL AND email <> '';
CREATE INDEX IF NOT EXISTS idx_jamaah_members_full_name ON jamaah_members (full_name);
CREATE INDEX IF NOT EXISTS idx_jamaah_members_member_status ON jamaah_members (member_status);

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'cash',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_date DATE NOT NULL,
  direction VARCHAR(10) NOT NULL,
  amount NUMERIC(16,2) NOT NULL,
  account_id UUID NOT NULL REFERENCES finance_accounts(id),
  wallet_id UUID NOT NULL REFERENCES finance_wallets(id),
  description TEXT,
  reference_no VARCHAR(100),
  attachment_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'posted',
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_tx_date ON finance_transactions (tx_date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_direction ON finance_transactions (direction);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_account_id ON finance_transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_wallet_id ON finance_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_status ON finance_transactions (status);

CREATE TABLE IF NOT EXISTS tpq_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  birth_date DATE,
  gender VARCHAR(20),
  class_level VARCHAR(80) NOT NULL DEFAULT '',
  parent_name VARCHAR(255),
  parent_phone VARCHAR(40),
  address TEXT,
  enrollment_year INT,
  student_status VARCHAR(20) NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tpq_students_full_name ON tpq_students (full_name);
CREATE INDEX IF NOT EXISTS idx_tpq_students_class_level ON tpq_students (class_level);
CREATE INDEX IF NOT EXISTS idx_tpq_students_student_status ON tpq_students (student_status);

INSERT INTO finance_accounts (code, name, type, is_active) VALUES
  ('INC-INFAQ', 'Infaq Harian', 'income', true),
  ('INC-DONASI', 'Donasi Umum', 'income', true),
  ('EXP-LISTRIK', 'Biaya Listrik', 'expense', true),
  ('EXP-KEBERSIHAN', 'Biaya Kebersihan', 'expense', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO finance_wallets (code, name, kind, is_active) VALUES
  ('CASH-UTAMA', 'Kas Utama', 'cash', true),
  ('BANK-BSI', 'Rekening BSI', 'bank', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  valid_from DATE NOT NULL,
  valid_until DATE,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  wa_blast_on_publish BOOLEAN NOT NULL DEFAULT false,
  wa_message TEXT,
  wa_recipient_phones JSONB NOT NULL DEFAULT '[]'::jsonb,
  wa_blast_status VARCHAR(20) NOT NULL DEFAULT 'none',
  wa_blast_requested_at TIMESTAMPTZ,
  wa_blast_sent_at TIMESTAMPTZ,
  wa_blast_last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements (status);
CREATE INDEX IF NOT EXISTS idx_announcements_valid_from ON announcements (valid_from);

INSERT INTO admin_menu_items (slug, menu_group, label, path, icon, permission_name, router_name, sort_order)
VALUES
  ('dashboard', 'primary', 'Dashboard', '/admin/dashboard', 'layout-dashboard', 'read:Dashboard', 'dashboard', 10),
  ('ops-announcements', 'operasional', 'Pengumuman', '/admin/operasional/pengumuman', 'notification', 'read:Announcement', 'ops-pengumuman', 10),
  ('ops-schedules', 'operasional', 'Jadwal Kegiatan/Kajian', '/admin/operasional/jadwal-kajian', 'calendar', 'read:PrayerSchedule', 'ops-schedules', 20),
  ('ops-prayer-staff', 'operasional', 'Jadwal Petugas Ibadah', '/admin/operasional/petugas-ibadah', 'users', 'read:PrayerSchedule', 'ops-prayer-staff', 30),
  ('content', 'operasional', 'Konten', '/admin/content', 'copy', 'read:Article', 'admin-content', 40),
  ('ops-broadcast', 'operasional', 'Broadcast Notifikasi', '/admin/operasional/broadcast', 'paper-plane', 'read:OpsBroadcast', 'ops-broadcast', 50),
  ('jamaah-data', 'jamaah', 'Data Jamaah', '/admin/jamaah/data', 'users', 'read:JamaahData', 'jamaah-data', 10),
  ('jamaah-event-attendance', 'jamaah', 'Pendaftaran Event & Absensi', '/admin/jamaah/event-absensi', 'clipboard', 'read:JamaahEventAttendance', 'jamaah-event-attendance', 20),
  ('jamaah-funeral-service', 'jamaah', 'Layanan Jenazah', '/admin/jamaah/layanan-jenazah', 'heart', 'read:JamaahFuneralService', 'jamaah-funeral-service', 30),
  ('jamaah-administration', 'jamaah', 'Surat & Administrasi', '/admin/jamaah/surat-administrasi', 'file', 'read:JamaahAdministration', 'jamaah-administration', 40),
  ('finance-cash', 'keuangan', 'Kas Masjid', '/admin/keuangan/kas', 'credit-card', 'read:FinanceCash', 'finance-cash', 10),
  ('finance-ziswaf', 'keuangan', 'Donasi & ZISWAF', '/admin/keuangan/donasi-ziswaf', 'wallet', 'read:FinanceZiswaf', 'finance-ziswaf', 20),
  ('finance-campaigns', 'keuangan', 'Campaign Donasi', '/admin/keuangan/campaign', 'target', 'read:FinanceCampaign', 'finance-campaigns', 30),
  ('finance-reports', 'keuangan', 'Laporan Keuangan', '/admin/keuangan/laporan', 'graph', 'read:FinanceReport', 'finance-reports', 40),
  ('program-social', 'program', 'Program Sosial', '/admin/program/sosial', 'gift', 'read:ProgramSocial', 'program-social', 10),
  ('program-tpq', 'program', 'TPQ/Madrasah', '/admin/program/tpq', 'book', 'read:ProgramTpq', 'program-tpq', 20),
  ('program-qurban-zakat', 'program', 'Qurban & Zakat Musiman', '/admin/program/qurban-zakat', 'box', 'read:ProgramQurbanZakat', 'program-qurban-zakat', 30),
  ('asset-data', 'aset', 'Data Aset', '/admin/aset/data', 'layers', 'read:AssetData', 'asset-data', 10),
  ('asset-borrows', 'aset', 'Peminjaman Barang', '/admin/aset/peminjaman', 'share', 'read:AssetBorrows', 'asset-borrows', 20),
  ('asset-maintenance', 'aset', 'Maintenance', '/admin/aset/maintenance', 'settings', 'read:AssetMaintenance', 'asset-maintenance', 30),
  ('users', 'master', 'Pengguna', '/admin/master/users', 'users', 'read:User', 'master-users', 10),
  ('roles', 'master', 'Role', '/admin/master/roles', 'shield', 'read:Role', 'master-roles', 20),
  ('permissions', 'master', 'Permission', '/admin/master/permissions', 'lock', 'read:Permission', 'master-permissions', 30),
  ('settings', 'master', 'Pengaturan', '/admin/master/config', 'settings', 'read:Setting', 'master-config', 40)
ON CONFLICT (slug) DO UPDATE SET
  menu_group = EXCLUDED.menu_group,
  label = EXCLUDED.label,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  permission_name = EXCLUDED.permission_name,
  router_name = EXCLUDED.router_name,
  sort_order = EXCLUDED.sort_order;
`;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(INIT_SQL);
  } finally {
    client.release();
  }
}
