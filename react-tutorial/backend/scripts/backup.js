// Avtomatik zaxira nusxa: MongoDB dump + uploads papkasi.
// Ishlatish: npm run backup  (server to'xtatilishi shart emas)
// Cron misoli (har kun 03:00):
//   0 3 * * * cd /srv/ustachi/backend && NODE_ENV=production npm run backup >> /var/log/ustachi-backup.log 2>&1
require("dotenv").config();

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ustachi";
const ROOT = path.join(__dirname, "..");
const UPLOADS = path.join(ROOT, "uploads");
const BACKUPS = path.join(ROOT, "backups");
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(BACKUPS, ts);

fs.mkdirSync(path.join(outDir, "db"), { recursive: true });
fs.mkdirSync(path.join(outDir, "uploads"), { recursive: true });

let mongodumpOk = false;
try {
  execFileSync("mongodump", [`--uri=${MONGO_URI}`, `--out=${path.join(outDir, "db")}`], {
    stdio: "inherit",
  });
  mongodumpOk = true;
  console.log("MongoDB dump tugadi");
} catch (err) {
  console.error("mongodump muvaffaqiyatsiz (mongodump o'rnatilganligini tekshiring):", err.message);
}

let uploadsOk = false;
if (fs.existsSync(UPLOADS)) {
  try {
    fs.cpSync(UPLOADS, path.join(outDir, "uploads"), { recursive: true });
    uploadsOk = true;
    console.log("uploads papkasi nusxalandi");
  } catch (err) {
    console.error("uploads nusxalashda xatolik:", err.message);
  }
}

if (!mongodumpOk && !uploadsOk) {
  console.error("Hech narsa nusxalanmadi. Zaxira fayllari: " + outDir);
  process.exitCode = 1;
} else {
  console.log(`Zaxira tayyor: ${outDir}`);
}