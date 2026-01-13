import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, MessageCircle, Phone, User, Facebook, Instagram, Music2 } from 'lucide-react';
import { PublicProfileRating } from '@/components/public-profile-rating';
import { PublicProfileReviews } from '@/components/public-profile-reviews';
import { BarberPublicGallery } from '@/components/barber-public-gallery';
import { formatPrice, resolvePublicMediaUrl } from '@/lib/utils';

type Params = {
  params: Promise<{ id: string }>;
};

export default async function BarberProfilePage({ params }: Params) {
  const { id } = await params;

  const getMediaUrl = (cloud_storage_path: string) => {
    return resolvePublicMediaUrl(cloud_storage_path);
  };

  const barber = await prisma.barber.findUnique({
    where: { id },
    include: {
      user: true,
      reviews: {
        include: {
          client: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
    },
  });

  if (!barber) {
    notFound();
  }

  // Services
  // - Always include general services (barberId: null) and services assigned to this barber.
  // - Include UNISEX (and null) so profiles don't look like they only have 2-3 services.
  // - If the barber is BOTH/unknown, don't filter by gender.
  const genderFilter: { gender?: { in: Array<'MALE' | 'FEMALE' | 'UNISEX'> } } =
    barber.gender === 'MALE' || barber.gender === 'FEMALE'
      ? { gender: { in: [barber.gender, 'UNISEX'] } }
      : {};

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      ...genderFilter,
      OR: [
        { barberId: null },
        { barberId: barber.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalRating = barber.reviews.reduce((sum, review) => sum + review.rating, 0);
  const avgRating = barber.reviews.length > 0 ? totalRating / barber.reviews.length : 0;

  const galleryImages = await prisma.galleryImage.findMany({
    where: {
      isActive: true,
      barberId: barber.id,
    },
    select: {
      id: true,
      title: true,
      cloud_storage_path: true,
      likes: true,
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });

  const galleryImagesWithUrls = galleryImages.map((img) => ({
    id: img.id,
    title: img.title,
    imageUrl: getMediaUrl(img.cloud_storage_path),
    likes: img.likes,
    likeable: true,
  }));

  const barberMediaPhotos = await prisma.barberMedia.findMany({
    where: {
      isActive: true,
      isPublic: true,
      barberId: barber.id,
      mediaType: 'PHOTO',
    },
    select: {
      id: true,
      title: true,
      cloud_storage_path: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const barberMediaWithUrls = barberMediaPhotos.map((media) => ({
    id: media.id,
    title: media.title?.trim() || 'Photo',
    imageUrl: getMediaUrl(media.cloud_storage_path),
    likes: 0,
    likeable: false,
  }));

  const allGalleryImages = [...barberMediaWithUrls, ...galleryImagesWithUrls];

  const workPosts = await prisma.post.findMany({
    where: {
      isActive: true,
      status: 'APPROVED',
      isPublic: true,
      postType: 'BARBER_WORK',
      barberId: barber.id,
    },
    select: {
      id: true,
      caption: true,
      cloud_storage_path: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 12,
  });


  const primaryServices = services.slice(0, 4);
  const moreServices = services.slice(4);

  const normalizeUrl = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const phoneRaw = barber.phone?.trim() || null;
  const phoneForLinks = phoneRaw ? phoneRaw.replace(/[^\d+]/g, '') : null;
  const telHref = phoneForLinks ? `tel:${phoneForLinks}` : null;
  const chatHref = normalizeUrl(barber.whatsappUrl) || (phoneForLinks ? `sms:${phoneForLinks.replace(/\D/g, '')}` : null);
  const chatTarget = barber.whatsappUrl ? '_blank' : undefined;
  const chatRel = barber.whatsappUrl ? 'noreferrer noopener' : undefined;

  const fbHref = normalizeUrl(barber.facebookUrl);
  const igHref = normalizeUrl(barber.instagramUrl);
  const ttHref = normalizeUrl(barber.tiktokUrl);

  const formatDuration = (minutes: number) => {
    const total = Number(minutes) || 0;
    const hoursPart = Math.floor(total / 60);
    const minsPart = total % 60;
    if (hoursPart > 0) return minsPart > 0 ? `${hoursPart} hr ${minsPart} min` : `${hoursPart} hr`;
    return `${minsPart} min`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 overflow-x-hidden">
      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-transparent"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-1">
          <div className="flex items-center justify-between gap-4">
            <Link href="/barberos" aria-label="Back">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back"
                className="text-gray-400 hover:text-white hover:bg-gray-800/50"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>

            <div className="flex-1" />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-12">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start text-center md:text-left">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <div className="relative w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-[#00f0ff]/60 bg-transparent">
                    {barber.profileImage || barber.user?.image ? (
                      <Image
                        src={getMediaUrl(barber.profileImage || barber.user?.image || '')}
                        alt={barber.user?.name || 'Barber'}
                        fill
                        sizes="192px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00f0ff]/10 to-[#ffd700]/10">
                        <User className="w-12 h-12 sm:w-20 sm:h-20 text-[#00f0ff]/40" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 w-full">
                  <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 leading-tight">
                    {barber.user?.name || 'Barber'}
                  </h1>
                  {barber.specialties ? (
                    <p className="text-[#00f0ff] text-sm sm:text-lg mb-4">{barber.specialties}</p>
                  ) : null}

                  {/* Rating */}
                  <PublicProfileRating
                    barberId={barber.id}
                    initialAvgRating={avgRating}
                    initialReviewCount={barber.reviews.length}
                  />

                  {/* Bio */}
                  {barber.bio && (
                    <p className="text-gray-400 mb-6 text-sm sm:text-base">{barber.bio}</p>
                  )}

                  {/* CTA Button */}
                  <div className="flex flex-col gap-3 items-center md:items-start">
                    {telHref || chatHref || fbHref || igHref || ttHref ? (
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {telHref ? (
                          <Button
                            asChild
                            variant="outline"
                            size="icon"
                            className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                          >
                            <a href={telHref} aria-label="Call">
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}

                        {chatHref ? (
                          <Button
                            asChild
                            variant="outline"
                            size="icon"
                            className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                          >
                            <a href={chatHref} aria-label="Chat" target={chatTarget} rel={chatRel}>
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}

                        {fbHref ? (
                          <Button
                            asChild
                            variant="outline"
                            size="icon"
                            className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                          >
                            <a href={fbHref} aria-label="Facebook" target="_blank" rel="noreferrer noopener">
                              <Facebook className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}

                        {igHref ? (
                          <Button
                            asChild
                            variant="outline"
                            size="icon"
                            className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                          >
                            <a href={igHref} aria-label="Instagram" target="_blank" rel="noreferrer noopener">
                              <Instagram className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}

                        {ttHref ? (
                          <Button
                            asChild
                            variant="outline"
                            size="icon"
                            className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                          >
                            <a href={ttHref} aria-label="TikTok" target="_blank" rel="noreferrer noopener">
                              <Music2 className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    <Link href={`/reservar?barberId=${barber.id}`} className="block w-full sm:w-auto">
                      <Button className="w-full sm:w-auto bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90 neon-glow text-base sm:text-lg px-6 sm:px-8">
                        <Calendar className="w-5 h-5 mr-2" />
                        Appointment
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Services</h2>
          {services.length === 0 ? (
            <p className="text-gray-400">No services available</p>
          ) : (
            <div className="space-y-3">
              {primaryServices.map((service) => (
                <Card
                  key={service.id}
                  className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff]/60 transition-colors"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-700 bg-black/20">
                        {service.image ? (
                          <Image src={getMediaUrl(service.image)} alt={service.name} fill sizes="48px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Clock className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-base font-bold italic text-white">{service.name}</p>
                          <span className="shrink-0 whitespace-nowrap break-normal tabular-nums text-sm font-bold text-[#ffd700]">{formatPrice(service.price)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatDuration(service.duration)}</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <Link href={`/reservar?barberId=${barber.id}&serviceId=${service.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-700 bg-transparent text-white hover:border-[#00f0ff]/60 hover:bg-[#00f0ff]/10"
                          >
                            Book Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {moreServices.length > 0 ? (
                <details className="mt-2">
                  <summary className="list-none cursor-pointer">
                    <div className="w-full rounded-lg border border-gray-800 bg-[#1a1a1a] px-4 py-3 text-center text-gray-300 hover:text-white hover:border-[#00f0ff] transition-colors">
                      Show more services ({moreServices.length})
                    </div>
                  </summary>
                  <div className="mt-4 space-y-3">
                    {moreServices.map((service) => (
                      <Card
                        key={service.id}
                        className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff]/60 transition-colors"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-700 bg-black/20">
                              {service.image ? (
                                <Image
                                  src={getMediaUrl(service.image)}
                                  alt={service.name}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Clock className="h-6 w-6 text-gray-600" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-base font-bold italic text-white">{service.name}</p>
                                <span className="shrink-0 whitespace-nowrap break-normal tabular-nums text-sm font-bold text-[#ffd700]">{formatPrice(service.price)}</span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{formatDuration(service.duration)}</span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <Link href={`/reservar?barberId=${barber.id}&serviceId=${service.id}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-700 bg-transparent text-white hover:border-[#00f0ff]/60 hover:bg-[#00f0ff]/10"
                                >
                                  Book Now
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </div>

        {/* Gallery */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Gallery</h2>
          <BarberPublicGallery images={allGalleryImages} />
        </div>

        {/* Reviews */}
        <PublicProfileReviews
          initialReviews={barber.reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt.toISOString(),
            client: {
              name: review.client?.name,
              image: review.client?.image,
            },
          }))}
        />
      </main>
    </div>
  );
}
