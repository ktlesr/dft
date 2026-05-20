#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "components", "features", "lib"];
const EXTENSIONS = new Set([".ts", ".tsx"]);

const RULES = [
  { pattern: /\bHenuz\b/g, suggest: "Henüz" },
  { pattern: /\bhenuz\b/g, suggest: "henüz" },
  { pattern: /\bIlk\b/g, suggest: "İlk" },
  { pattern: /\bgorunur\b/g, suggest: "görünür" },
  { pattern: /\bgorunur\./g, suggest: "görünür." },
  { pattern: /\bgorunecek\b/g, suggest: "görünecek" },
  { pattern: /\bDanisman\b/g, suggest: "Danışman" },
  { pattern: /\bdanisman\b/g, suggest: "danışman" },
  { pattern: /\bnotlari\b/g, suggest: "notları" },
  { pattern: /\bayri\b/g, suggest: "ayrı" },
  { pattern: /\bgirisi\b/g, suggest: "girişi" },
  { pattern: /\bkaydi\b/g, suggest: "kaydı" },
  { pattern: /\bolusturuldu\b/g, suggest: "oluşturuldu" },
  { pattern: /\bolusturulmus\b/g, suggest: "oluşturulmuş" },
  { pattern: /\bolusturur\b/g, suggest: "oluşturur" },
  { pattern: /\basagidaki\b/g, suggest: "aşağıdaki" },
  { pattern: /\bdon\b/g, suggest: "dön" },
  { pattern: /\bonayli\b/g, suggest: "onaylı" },
  { pattern: /\byayinda\b/g, suggest: "yayında" },
  { pattern: /\bkanit\b/g, suggest: "kanıt" },
  { pattern: /\byukle\b/g, suggest: "yükle" },
  { pattern: /\bcalisma\b/g, suggest: "çalışma" },
  { pattern: /\berisim\b/g, suggest: "erişim" },
  { pattern: /\bdegeri\b/g, suggest: "değeri" },
  { pattern: /\bguncellendi\b/g, suggest: "güncellendi" },
  { pattern: /\bbasarili\b/g, suggest: "başarılı" },
  { pattern: /\bsecilen\b/g, suggest: "seçilen" },
  { pattern: /\bsecebilirsiniz\b/g, suggest: "seçebilirsiniz" },
  { pattern: /\bonce\b/g, suggest: "önce" },
  { pattern: /\byuklenemedi\b/g, suggest: "yüklenemedi" },
  { pattern: /\bbulunamadi\b/g, suggest: "bulunamadı" },
];

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (EXTENSIONS.has(path.extname(ent.name))) out.push(full);
  }
}

function shouldSkipToken(token) {
  if (!token) return true;
  const text = token.trim();
  if (!text) return true;
  if (text.startsWith("/")) return true;
  if (text.includes("http://") || text.includes("https://")) return true;
  if (text.includes("/") || text.includes("\\") || text.includes("=>")) return true;
  if (/^[a-z0-9_-]+$/.test(text)) return true; // slug / id / key
  if (/^[A-Z0-9_ -]+$/.test(text)) return true;
  return false;
}

function collectTokens(line) {
  const out = [];

  const literalRe = /(["'`])((?:\\.|(?!\1).)*)\1/g;
  for (const m of line.matchAll(literalRe)) out.push(m[2]);

  const jsxRe = />([^<>{}]+)</g;
  for (const m of line.matchAll(jsxRe)) out.push(m[1]);

  return out;
}

function findMatches(text) {
  const hits = [];
  for (const rule of RULES) {
    if (rule.pattern.test(text)) hits.push(rule.suggest);
  }
  return hits;
}

const files = [];
for (const d of TARGET_DIRS) walk(path.join(ROOT, d), files);

const issues = [];
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
    if (/^\s*"[^"]+"\s*:\s*"[^"]+",?\s*$/.test(line)) continue; // map key/value satırları

    const tokens = collectTokens(line);
    for (const raw of tokens) {
      if (shouldSkipToken(raw)) continue;
      const text = raw.trim();
      const matches = findMatches(text);
      if (matches.length === 0) continue;
      issues.push({
        file: path.relative(ROOT, file),
        line: i + 1,
        text,
        suggestions: Array.from(new Set(matches)).join(", "),
      });
    }
  }
}

if (issues.length === 0) {
  console.log("TR text lint: sorun bulunmadı.");
  process.exit(0);
}

console.error(`TR text lint: ${issues.length} sorun bulundu.`);
for (const issue of issues) {
  console.error(`- ${issue.file}:${issue.line}`);
  console.error(`  Metin: "${issue.text}"`);
  console.error(`  Öneri: ${issue.suggestions}`);
}
process.exit(1);
