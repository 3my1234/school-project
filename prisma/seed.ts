import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = "password123";
  const passwordHash = hashPassword(defaultPassword);
  const names = ["Library", "Bursary", "Sports", "HOD"];

  for (const name of names) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const departments = await prisma.department.findMany();
  const byName = Object.fromEntries(departments.map((d) => [d.name, d.id]));

  const admins = [
    { name: "Library Admin", email: "library.admin@uni.edu", role: Role.FACULTY_ADMIN, departmentId: byName["Library"] },
    { name: "Bursary Admin", email: "bursary.admin@uni.edu", role: Role.FACULTY_ADMIN, departmentId: byName["Bursary"] },
    { name: "Sports Admin", email: "sports.admin@uni.edu", role: Role.FACULTY_ADMIN, departmentId: byName["Sports"] },
    { name: "HOD Admin", email: "hod.admin@uni.edu", role: Role.FACULTY_ADMIN, departmentId: byName["HOD"] },
    { name: "Platform Super Admin", email: "super.admin@uni.edu", role: Role.SUPER_ADMIN, departmentId: null },
  ];

  for (const admin of admins) {
    await prisma.user.upsert({
      where: { email: admin.email },
      update: { name: admin.name, role: admin.role, departmentId: admin.departmentId, passwordHash },
      create: { ...admin, passwordHash },
    });
  }

  await prisma.user.upsert({
    where: { email: "student1@uni.edu" },
    update: { name: "Student One", role: Role.STUDENT, departmentId: null, passwordHash },
    create: { name: "Student One", email: "student1@uni.edu", role: Role.STUDENT, passwordHash },
  });

  console.log(`Seed complete. Demo password for login: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
