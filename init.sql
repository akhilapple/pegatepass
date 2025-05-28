CREATE TABLE IF NOT EXISTS outpass_requests (
  id SERIAL PRIMARY KEY,
  domain TEXT,
  name TEXT,
  date TEXT,
  outTime TEXT,
  inTime TEXT,
  reason TEXT,
  vehicleUsed TEXT,
  vehicleNo TEXT,
  readingOut TEXT,
  readingIn TEXT,
  authority TEXT,
  approved INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  keycode TEXT
);
