export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Clients should only be able to start a chat with the admin team.
    // We represent the admin team as a single entry labeled "Administrators" that maps
    // to the configured owner admin user. Clients can also start chats with active
    // barbers/stylists.
    if (session.user.role === 'CLIENT') {
      const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();

      const ownerAdmin = ownerEmail
        ? await prisma.user.findUnique({
            where: { email: ownerEmail },
            select: { id: true, image: true },
          })
        : null;

      const fallbackAdmin = ownerAdmin
        ? null
        : await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true, image: true },
            orderBy: { createdAt: 'asc' },
          });

      const admin = ownerAdmin || fallbackAdmin;
      if (!admin) return NextResponse.json([]);

      const activeStaff = await prisma.barber.findMany({
        where: { isActive: true },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });

      const staffRecipients = activeStaff
        .map((b) => b.user)
        .filter((u) => u.id !== userId);

      return NextResponse.json([
        {
          id: admin.id,
          name: 'Administrators',
          email: '',
          image: admin.image,
          role: 'ADMIN',
        },
        ...staffRecipients,
      ]);
    }

    // Inbox compose recipient list: only allow messaging to staff accounts.
    // Staff = ADMINs + active Barber profiles (barbers + stylists).
    // This prevents clients from appearing in the dropdown.
    const recipients = await prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [{ role: "ADMIN" }, { barber: { is: { isActive: true } } }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(recipients);
  } catch (error) {
    console.error("Error fetching recipients:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}
