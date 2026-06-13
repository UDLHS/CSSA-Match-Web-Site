/**
 * Bootstrap an admin account (Supabase Auth user + AdminProfile row).
 *
 *   pnpm admin:create <email> <password> "<Full Name>" [SUPER_ADMIN|ADMIN|SCORE_UPDATER]
 *
 * Requires SUPABASE_SECRET_KEY in .env (server-only sb_secret_... key).
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, type AdminRole } from "@prisma/client";

try {
  process.loadEnvFile(".env");
} catch {
  // .env may already be in the environment (CI) — carry on.
}

const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "SCORE_UPDATER"] as const;

async function main() {
  const [email, password, name, roleArg = "SUPER_ADMIN"] =
    process.argv.slice(2);
  if (!email || !password || !name) {
    console.error(
      'Usage: pnpm admin:create <email> <password> "<Full Name>" [SUPER_ADMIN|ADMIN|SCORE_UPDATER]',
    );
    process.exit(1);
  }
  if (!VALID_ROLES.includes(roleArg as (typeof VALID_ROLES)[number])) {
    console.error(`Role must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }
  const role = roleArg as AdminRole;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret || secret.startsWith("YOUR_")) {
    console.error(
      "SUPABASE_SECRET_KEY is missing — paste the sb_secret_... key into .env first",
    );
    process.exit(1);
  }

  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`→ creating Supabase auth user ${email}…`);
  let userId: string;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (/already.*registered|exists/i.test(error.message)) {
      console.log("   user already exists — looking them up…");
      const { data: list, error: listError } =
        await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listError) throw listError;
      const existing = list.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );
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
      create: { userId, role, status: "ACTIVE" },
      update: { role, status: "ACTIVE" },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "admin.bootstrap",
        entityType: "AdminProfile",
        entityId: userId,
        after: { email, role },
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log(`✓ ${email} is now ${role} (user id ${userId})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
