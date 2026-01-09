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
    const userRole = session.user.role;

    let recipients: any[];

    // Role-based filtering
    switch (userRole) {
      case "ADMIN":
        // ADMIN sees all users except themselves
        recipients = await prisma.user.findMany({
          where: {
            id: {
              not: userId,
            },
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
        break;

      case "CLIENT":
        // CLIENT only sees BARBER users
        recipients = await prisma.user.findMany({
          where: {
            role: "BARBER",
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
        break;

      case "BARBER":
        // BARBER sees all CLIENTS
        recipients = await prisma.user.findMany({
          where: {
            role: "CLIENT",
            id: {
              not: userId,
            },
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
        break;

      default:
        // Fallback: no recipients
        recipients = [];
        break;
    }

    return NextResponse.json(recipients);
  } catch (error) {
    console.error("Error fetching recipients:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}
