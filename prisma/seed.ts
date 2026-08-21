import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const user = await db.user.upsert({
    where: { email: "owner@acme.test" },
    update: {},
    create: {
      email: "owner@acme.test",
      passwordHash: "demo-password-hash",
      name: "Acme Owner",
    },
  });

  const org = await db.organization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: {
      id: "demo-org",
      name: "Acme Operations",
    },
  });

  await db.member.upsert({
    where: {
      organizationId_email: {
        organizationId: org.id,
        email: user.email,
      },
    },
    update: { role: "owner", userId: user.id },
    create: {
      organizationId: org.id,
      userId: user.id,
      email: user.email,
      role: "owner",
    },
  });

  const workflows = [
    ["Support triage", "inbox.received", 96],
    ["Lead qualification", "lead.created", 91],
    ["Invoice reminders", "invoice.overdue", 88],
  ] as const;

  for (const [name, trigger, successRate] of workflows) {
    await db.workflow.upsert({
      where: { id: `demo-${trigger}` },
      update: { name, trigger, successRate },
      create: {
        id: `demo-${trigger}`,
        organizationId: org.id,
        name,
        trigger,
        successRate,
      },
    });
  }

  await db.task.create({
    data: {
      organizationId: org.id,
      title: "Refund request from Acme",
      priority: "high",
      status: "pending",
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
