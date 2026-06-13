// Plain-Node admin bootstrap (no tsx/esbuild) — dodges antivirus that kills
// esbuild. Usage:
//   node scripts/create-admin.mjs <email> <password> "<Full Name>" [ROLE]
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile(".env");
} catch {
  /* env may already be present */
}

const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "SCORE_UPDATER"];

async function main() {
  const [email, password, name, roleArg = "SUPER_ADMIN"] = process.argv.slice(2);
  if (!email || !password || !name) {
    console.error('Usage: node scripts/create-admin.mjs <email> <password> "<Full Name>" [ROLE]');
    process.exit(1);
  }
  if (!VALID_ROLES.includes(roleArg)) {
    console.error(`Role must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing from .env");
    process.exit(1);
  }

  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`→ creating Supabase auth user ${email}…`);
  let userId;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (/already.*registered|exists/i.test(error.message)) {
      console.log("   user already exists — looking them up…");
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;
      const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!existing) throw new Error("User exists but could not be found");
      userId = existing.id;
    } else {
      throw error;
    }
  } else {
    userId = data.user.id;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email, name },
      update: { email, name },
    });
    await prisma.adminProfile.upsert({
      where: { userId },
      create: { userId, role: roleArg, status: "ACTIVE" },
      update: { role: roleArg, status: "ACTIVE" },
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log(`✓ ${email} is now ${roleArg} (user id ${userId})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
