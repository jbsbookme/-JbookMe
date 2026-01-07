import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    let recipients;

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
        // CLIENT only sees BARBER and STYLIST users
        recipients = await prisma.user.findMany({
          where: {
            role: {
              in: ["BARBER", "STYLIST"],
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

      case "BARBER":
      case "STYLIST":
        // BARBER/STYLIST only sees their clients (users who have appointments with them)
        recipients = await prisma.user.findMany({
          where: {
            appointments: {
              some: {
                barberId: userId,
              },
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
