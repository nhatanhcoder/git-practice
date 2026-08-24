/**
 * Seed data for local development.
 *
 * The cast list is not arbitrary — it is the one `docs/api/modules/01-auth.md`
 * §12 asks for, so the auth invariants are testable the day someone writes them:
 *
 *   - one active user per role
 *   - one `pending` and one `suspended` user (login must reject both)
 *   - one active user with `lastLoginAt = null`  (locks INV-AUTH-24)
 *   - one mixed-case email                       (locks email normalisation)
 *   - at least two admins                        (register's notification fan-out
 *                                                 must be a bulk insert, not a loop)
 *
 * Passwords are hashed at cost 12 — the production cost. Seeding at a lower cost
 * makes every later timing and cost test lie.
 *
 * Every account uses the same password: Password123!
 */
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;
const SEED_PASSWORD = 'Password123!';

type SeedUser = {
  email: string;
  role: UserRole;
  status: UserStatus;
  nickname: string;
  hskLevelGoal?: number;
  bio?: string;
  neverLoggedIn?: boolean;
  note: string;
};

const users: SeedUser[] = [
  {
    email: 'admin@hsk.local',
    role: UserRole.admin,
    status: UserStatus.active,
    nickname: 'Admin One',
    note: 'primary admin',
  },
  {
    email: 'admin2@hsk.local',
    role: UserRole.admin,
    status: UserStatus.active,
    nickname: 'Admin Two',
    note: 'second admin — register fan-out must be a bulk insert',
  },
  {
    email: 'teacher@hsk.local',
    role: UserRole.teacher,
    status: UserStatus.active,
    nickname: 'Teacher Active',
    bio: 'Teaches HSK 4-6. Seeded account.',
    note: 'happy-path teacher',
  },
  {
    email: 'teacher.pending@hsk.local',
    role: UserRole.teacher,
    status: UserStatus.pending,
    nickname: 'Teacher Pending',
    bio: 'Awaiting admin approval.',
    note: 'login must be rejected until an admin approves',
  },
  {
    email: 'student@hsk.local',
    role: UserRole.student,
    status: UserStatus.active,
    nickname: 'Student Active',
    hskLevelGoal: 4,
    note: 'happy-path student',
  },
  {
    email: 'student.suspended@hsk.local',
    role: UserRole.student,
    status: UserStatus.suspended,
    nickname: 'Student Suspended',
    hskLevelGoal: 3,
    note: 'every JWT must be rejected with 401',
  },
  {
    email: 'never.logged.in@hsk.local',
    role: UserRole.student,
    status: UserStatus.active,
    nickname: 'Never Logged In',
    hskLevelGoal: 1,
    neverLoggedIn: true,
    note: 'lastLoginAt stays null — INV-AUTH-24',
  },
  {
    email: 'MiXeD.CaSe@HSK.Local',
    role: UserRole.student,
    status: UserStatus.active,
    nickname: 'Mixed Case Email',
    hskLevelGoal: 9,
    note: 'stored as typed; citext makes lookup case-insensitive',
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);
  const now = new Date();

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        role: u.role,
        status: u.status,
        nickname: u.nickname,
        hskLevelGoal: u.hskLevelGoal ?? null,
        bio: u.bio ?? null,
        lastLoginAt: u.neverLoggedIn ? null : now,
      },
    });
    console.log(`  ${u.status.padEnd(9)} ${u.role.padEnd(7)} ${u.email}  — ${u.note}`);
  }

  const total = await prisma.user.count();
  console.log(`\nSeed complete. ${total} users. Password for all: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
