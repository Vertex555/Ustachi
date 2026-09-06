const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
const DANGEROUS_OPS = ["$gt", "$gte", "$lt", "$lte", "$ne", "$in", "$nin", "$regex", "$where", "$exists", "$or", "$and", "$not", "$nor", "$expr", "$elemMatch", "$all", "$size", "$type", "$mod", "$bitsAllClear", "$bitsAllSet", "$bitsAnyClear", "$bitsAnySet"];
const MAX_SANITIZE_DEPTH = 50;
const MAX_SANITIZE_NODES = 50000;

function isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date) && !(val instanceof RegExp) && !(val instanceof Error) && typeof val !== "function";
}

// Iterativ (rekursiyasiz) sanitizatsiya — chuqur JSON'da stack oshib ketmaydi
function sanitizeObject(obj) {
  if (!isPlainObject(obj)) return obj;
  const root = {};
  const stack = [{ src: obj, dst: root, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const { src, dst, depth } = stack.pop();
    if (nodes++ > MAX_SANITIZE_NODES) return {};
    if (depth > MAX_SANITIZE_DEPTH) continue;
    for (const key of Object.keys(src)) {
      if (DANGEROUS_KEYS.includes(key)) continue;
      if (DANGEROUS_OPS.includes(key)) continue;
      if (key.startsWith("$")) continue;
      if (key.includes(".")) continue;
      const val = src[key];
      if (isPlainObject(val)) {
        const child = {};
        dst[key] = child;
        stack.push({ src: val, dst: child, depth: depth + 1 });
      } else if (Array.isArray(val)) {
        const arr = [];
        dst[key] = arr;
        for (const item of val) {
          if (isPlainObject(item)) {
            const child = {};
            arr.push(child);
            stack.push({ src: item, dst: child, depth: depth + 1 });
          } else {
            arr.push(item);
          }
        }
      } else {
        dst[key] = val;
      }
    }
  }
  return root;
}

function sanitizeMiddleware(req, res, next) {
  if (req.body && isPlainObject(req.body)) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && isPlainObject(req.query)) {
    const clean = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (!DANGEROUS_KEYS.includes(k) && !k.startsWith("$")) {
        clean[k] = typeof v === "string" ? v.replace(/[<>]/g, "") : v;
      }
    }
    req.query = clean;
  }
  if (req.params && isPlainObject(req.params)) {
    for (const key of Object.keys(req.params)) {
      if (typeof req.params[key] === "string") {
        req.params[key] = req.params[key].replace(/[<>"'`;]/g, "");
      }
    }
  }
  next();
}

module.exports = { sanitizeMiddleware, sanitizeObject, isPlainObject, DANGEROUS_KEYS };