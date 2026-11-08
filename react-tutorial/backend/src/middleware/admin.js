// Production'da ADMIN_PHONES env orqali o'rnatilishi shart.
// Aks holda admin hisobi kod ichidagi yashirin raqamga bog'liq bo'lib qoladi.
if (process.env.NODE_ENV === "production" && !(process.env.ADMIN_PHONES || "").trim()) {
  throw new Error("NODE_ENV=production bo'lsa, .env dagi ADMIN_PHONES ni o'rnatish shart");
}

function adminPhones() {
  const env = (process.env.ADMIN_PHONES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Dev qulayligi uchun standart raqam faqat production EMPAS holatda qo'shiladi.
  const devDefault =
    process.env.NODE_ENV === "production" ? [] : ["+998934735955", "934735955"];
  return [...new Set([...devDefault, ...env])];
}

function digits(v) {
  return String(v || "").replace(/\D/g, "");
}

function isAdminPhone(phone) {
  const value = String(phone || "").trim();
  if (adminPhones().includes(value)) return true;
  // Raqam formatidan qat'i nazar (934735955 yoki +998934735955) mos kelishini ta'minlash
  const d = digits(value);
  if (!d) return false;
  return adminPhones().some((p) => {
    const pd = digits(p);
    return pd && (pd === d || pd.slice(-9) === d.slice(-9));
  });
}

// Token tekshirilganda admin rolini .env dan avtomatik yuklash
async function ensureAdminRole(user) {
  if (isAdminPhone(user.phone)) {
    if (user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Avtorizatsiya talab qilinadi" });
  }
  if (req.user.role !== "admin" && !isAdminPhone(req.user.phone)) {
    return res.status(403).json({ success: false, message: "Bu bo'limga faqat administrator ruxsatiga ega" });
  }
  return next();
}

module.exports = { requireAdmin, isAdminPhone, ensureAdminRole, adminPhones };