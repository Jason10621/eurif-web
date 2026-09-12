/**
 * EURIF 팀원 계정 생성/갱신 스크립트  (로컬에서만 실행)
 *
 * 비밀번호는 코드에 넣지 않고 .env.local 에서 읽습니다 (git 에 안 올라감):
 *   SEED_PW_LEEJEONGUK=...
 *   SEED_PW_HONGSEOJUN=...
 *   SEED_PW_YUGABIN=...
 *   SEED_PW_JEONYUNSEO=...
 *   SEED_PW_YUNJIHU=...
 *
 * 실행:  eurif-web 폴더에서  node scripts/seed-users.mjs
 * (SUPABASE_SERVICE_ROLE_KEY 사용 · 여러 번 실행해도 안전 — 있으면 비번/프로필만 갱신)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// 이름·이메일·역할·파트만 코드에 둡니다. 비밀번호는 .env.local.
const MEMBERS = [
  { name: "이정욱", email: "leejeonguk@eurif.local", role: "leader", part: "정보학",          student_no: "10621" },
  { name: "홍서준", email: "hongseojun@eurif.local", role: "member", part: "약학",            student_no: "10633" },
  { name: "유가빈", email: "yugabin@eurif.local",    role: "member", part: "뇌과학·수면위상",  student_no: "10615" },
  { name: "전윤서", email: "jeonyunseo@eurif.local", role: "member", part: "생명공학",        student_no: "10626" },
  { name: "윤지후", email: "yunjihu@eurif.local",    role: "member", part: "정책",            student_no: "10617" },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
try {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  console.error("⚠  .env.local 을 읽지 못했습니다:", envPath);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없습니다.");
  process.exit(1);
}

const pwKey = (email) => `SEED_PW_${email.split("@")[0].toUpperCase()}`;
const withPw = MEMBERS.map((m) => ({ ...m, password: process.env[pwKey(m.email)] }));
const missing = withPw.filter((m) => !m.password || m.password.length < 6);
if (missing.length) {
  console.error("❌ .env.local 에 아래 비밀번호 변수를 추가하세요 (각 최소 6자):");
  missing.forEach((m) => console.error(`   ${pwKey(m.email)}=...   (${m.name})`));
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  console.error("❌ 사용자 목록 조회 실패:", listErr.message);
  process.exit(1);
}
const byEmail = new Map(list.users.map((u) => [u.email, u]));

for (const m of withPw) {
  const meta = { name: m.name, role: m.role, part: m.part, student_no: m.student_no };
  const existing = byEmail.get(m.email);
  let userId;

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: m.password,
      user_metadata: meta,
    });
    if (error) { console.error(`❌ ${m.name} 갱신 실패: ${error.message}`); continue; }
    userId = existing.id;
    console.log(`↻ ${m.name.padEnd(4)} (${m.part}) 갱신`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: m.email,
      password: m.password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) { console.error(`❌ ${m.name} 생성 실패: ${error.message}`); continue; }
    userId = data.user.id;
    console.log(`✔ ${m.name.padEnd(4)} (${m.part}) 생성`);
  }

  const { error: pErr } = await admin.from("profiles").upsert({
    id: userId,
    name: m.name,
    email: m.email,
    role: m.role,
    part: m.part,
    student_no: m.student_no || null,
  });
  if (pErr) console.error(`   ⚠ ${m.name} 프로필 upsert: ${pErr.message}`);
}

console.log("\n완료. 이름 + 비밀번호로 로그인하세요.");
