/**
 * Script de creation des utilisateurs de test via Supabase Auth Admin API.
 *
 * Prerequis : avoir une SUPABASE_SERVICE_ROLE_KEY en variable d'environnement.
 *
 * Usage :
 *   SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/seed-users.ts
 */

const SUPABASE_URL = 'https://ptrxuczekuwmssuwffkv.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const users = [
  { email: 'gestionnaire@planningauto.fr', role: 'gestionnaire' },
  { email: 'malika@planningauto.fr', role: 'intervenant' },
  { email: 'yasmina@planningauto.fr', role: 'intervenant' },
  { email: 'titi@planningauto.fr', role: 'intervenant' },
  { email: 'djima@planningauto.fr', role: 'intervenant' },
  { email: 'aide1@planningauto.fr', role: 'intervenant' },
  { email: 'aide2@planningauto.fr', role: 'intervenant' },
  { email: 'aide3@planningauto.fr', role: 'intervenant' },
  { email: 'am@planningauto.fr', role: 'intervenant' },
];

async function createUser(email: string, role: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email,
      password: 'Planning2024!',
      email_confirm: true,
      user_metadata: { app_role: role },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Failed to create ${email}: ${res.status} ${body}`);
    return;
  }

  console.log(`Created: ${email} (${role})`);
}

async function main() {
  for (const u of users) {
    await createUser(u.email, u.role);
  }
  console.log('Done.');
}

main();
