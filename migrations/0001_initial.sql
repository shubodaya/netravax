PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  singleton INTEGER NOT NULL DEFAULT 1 UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_updated_at ON login_attempts(updated_at);

CREATE TABLE IF NOT EXISTS site_content (
  content_key TEXT PRIMARY KEY,
  content_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

INSERT INTO site_content (content_key, content_json, updated_at)
VALUES ('netravax', '{
  "categories": [
    {
      "id": "network-security",
      "page": "work",
      "title": "Network & security tooling",
      "cards": [
        { "title": "Netravax", "description": "Network operations and security workspace — packet capture, Wi-Fi scanning, IDS lab and incident triage, backed by a desktop app for full protocol-level tooling.", "image": "/images/work/net-kit.jpg", "url": "https://app.netravax.shubodaya.dev/", "linkLabel": "View live" },
        { "title": "NetConfigPro", "description": "Multi-vendor CLI config generator for Cisco, Fortinet and SonicWall, with built-in risk warnings.", "image": "/images/work-netconfigpro.jpg", "url": "https://shubodaya.github.io/NetConfigPro/", "linkLabel": "Open tool" },
        { "title": "NetSentry", "description": "Incident triage that parses firewall, VPN, DNS, DHCP and IDS/IPS logs for rapid root-cause analysis.", "image": "/images/work-netsentry.jpg", "url": "https://shubodaya.github.io/netsentry/", "linkLabel": "Open tool" }
      ]
    },
    {
      "id": "saas-platforms",
      "page": "work",
      "title": "Business & SaaS platforms",
      "cards": [
        { "title": "OrderCircuit", "description": "Online ordering platform for restaurants and cafés — live order boards, menu management, staff dashboards and Stripe billing.", "image": "/images/work/ordercircuit.jpg", "url": "https://ordercircuit.shubodaya.dev/", "linkLabel": "View live" },
        { "title": "DutyOrbit", "description": "Workforce scheduling and attendance platform — shift planning, clock-in/out, timesheets and tablet kiosk login.", "image": "/images/work/dutyorbit.jpg", "url": "https://dutyorbit.shubodaya.dev/", "linkLabel": "View live" },
        { "title": "Ledgeraq", "description": "Shared expense workspace for trips, households and teams — multi-currency splitting, dashboards and CSV import/export.", "image": "/images/work/ledgeraq.jpg", "url": "https://ledgeraq.pages.dev/", "linkLabel": "View live" },
        { "title": "MacroCal", "description": "Training and nutrition tracker — workout logging, macro tracking, progress charts and a social leaderboard.", "image": "/images/work/macrocal.jpg", "url": "https://macrocal.pages.dev/", "linkLabel": "View live" },
        { "title": "Learn Gear", "description": "Study and career workspace — planner, resume builder, job tracker, cover letter generator and focus timer.", "image": "/images/work/learngear.jpg", "url": "https://learngear.pages.dev/", "linkLabel": "View live" },
        { "title": "Folique", "description": "Portfolio-builder platform — pick a template, publish to a live site and track every deployment automatically.", "image": "/images/work/folique.jpg", "url": "https://folique.shubodaya.dev/", "linkLabel": "View live" }
      ]
    },
    {
      "id": "ai-games-interactive",
      "page": "work",
      "title": "AI, games & interactive 3D",
      "cards": [
        { "title": "AI-Friend", "description": "Voice-first AI companion — natural conversation with local speech-to-text, LLM chat and text-to-speech.", "image": "/images/work/ai-friend.jpg", "url": "https://aifriendbot.pages.dev/", "linkLabel": "View live" },
        { "title": "Harbor Ribbon Circuit", "description": "Three.js arcade driving demo — drift a Mustang GT around a coastal circuit, built entirely in the browser.", "image": "/images/work/car-game.jpg", "url": "https://shubodaya.github.io/car-game/", "linkLabel": "View live" },
        { "title": "Character Play Prototype", "description": "Third-person character controller prototype — WASD movement, procedural animation and mouse-look camera.", "image": "/images/work/character-play.jpg", "url": "https://shubodaya.github.io/character-play/", "linkLabel": "View live" }
      ]
    },
    {
      "id": "cloud-automation",
      "page": "cloud-automation",
      "title": "Cloud & automation",
      "cards": []
    }
  ]
}', datetime('now'));
