import { prisma } from '../lib/db';

type Args = {
  apply: boolean;
};

const parseArgs = (): Args => {
  const argv = process.argv.slice(2);
  return {
    apply: argv.includes('--apply'),
  };
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const serviceKey = (service: {
  name: string;
  duration: number;
  price: number;
  gender: string | null;
  bufferTimeMinutes: number;
  category: string | null;
  discountPrice: number | null;
  isPackage: boolean;
  minDuration: number | null;
  maxDuration: number | null;
  packageServices: string | null;
  specialRequirements: string | null;
}) => {
  return [
    service.gender ?? '',
    normalizeName(service.name),
    String(service.duration),
    String(service.price),
    String(service.bufferTimeMinutes),
    service.category ?? '',
    service.discountPrice == null ? '' : String(service.discountPrice),
    service.isPackage ? '1' : '0',
    service.minDuration == null ? '' : String(service.minDuration),
    service.maxDuration == null ? '' : String(service.maxDuration),
    service.packageServices ?? '',
    service.specialRequirements ?? '',
  ].join('::');
};

async function main() {
  const { apply } = parseArgs();

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      barberId: { not: null },
    },
    select: {
      id: true,
      name: true,
      description: true,
      duration: true,
      price: true,
      image: true,
      barberId: true,
      gender: true,
      bufferTimeMinutes: true,
      category: true,
      discountPrice: true,
      isPackage: true,
      minDuration: true,
      maxDuration: true,
      packageServices: true,
      specialRequirements: true,
      createdAt: true,
      _count: { select: { appointments: true } },
    },
  });

  const groups = new Map<string, typeof services>();
  for (const service of services) {
    const key = serviceKey(service);
    const existing = groups.get(key);
    if (existing) existing.push(service);
    else groups.set(key, [service]);
  }

  const dupGroups = Array.from(groups.values()).filter((group) => {
    if (group.length < 2) return false;
    const barberIds = new Set(group.map((s) => s.barberId));
    return barberIds.size >= 2;
  });

  console.log(`Found ${dupGroups.length} duplicated service groups (active barber-specific clones).`);
  console.log(apply ? 'Mode: APPLY (will write changes)' : 'Mode: DRY RUN (no DB changes)');

  let totalAppointmentsMoved = 0;
  let totalServicesDeactivated = 0;
  let totalGeneralCreated = 0;

  for (const group of dupGroups) {
    // Pick a stable source row (oldest) as the template
    const template = [...group].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    const groupServiceIds = group.map((s) => s.id);
    const appointmentsInGroup = group.reduce((sum, s) => sum + s._count.appointments, 0);

    console.log(
      `- ${template.gender} | ${template.name} | ${template.duration}m | $${template.price} | clones=${group.length} | appts=${appointmentsInGroup}`
    );

    if (!apply) continue;

    // Ensure there is a general (barberId:null) service for this group
    const existingGeneral = await prisma.service.findFirst({
      where: {
        isActive: true,
        barberId: null,
        gender: template.gender,
        duration: template.duration,
        price: template.price,
        bufferTimeMinutes: template.bufferTimeMinutes,
        category: template.category,
        discountPrice: template.discountPrice,
        isPackage: template.isPackage,
        minDuration: template.minDuration,
        maxDuration: template.maxDuration,
        packageServices: template.packageServices,
        specialRequirements: template.specialRequirements,
        name: { equals: template.name, mode: 'insensitive' },
      },
      select: { id: true },
    });

    const generalService =
      existingGeneral ??
      (await prisma.service.create({
        data: {
          name: template.name,
          description: template.description,
          duration: template.duration,
          price: template.price,
          image: template.image,
          barberId: null,
          gender: template.gender,
          isActive: true,
          bufferTimeMinutes: template.bufferTimeMinutes,
          category: template.category,
          discountPrice: template.discountPrice,
          isPackage: template.isPackage,
          minDuration: template.minDuration,
          maxDuration: template.maxDuration,
          packageServices: template.packageServices,
          specialRequirements: template.specialRequirements,
        },
        select: { id: true },
      }));

    if (!existingGeneral) totalGeneralCreated += 1;

    // Move appointments to the general service
    const updated = await prisma.appointment.updateMany({
      where: { serviceId: { in: groupServiceIds } },
      data: { serviceId: generalService.id },
    });
    totalAppointmentsMoved += updated.count;

    // Deactivate the cloned services so they stop showing up anywhere (isActive filter)
    const deactivated = await prisma.service.updateMany({
      where: { id: { in: groupServiceIds } },
      data: { isActive: false },
    });
    totalServicesDeactivated += deactivated.count;
  }

  if (apply) {
    console.log('Done. Summary:');
    console.log(`- General services created: ${totalGeneralCreated}`);
    console.log(`- Appointments moved: ${totalAppointmentsMoved}`);
    console.log(`- Services deactivated: ${totalServicesDeactivated}`);
  } else {
    console.log('Dry run complete. Re-run with --apply to write changes.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
