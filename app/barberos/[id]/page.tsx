import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, MessageCircle, Phone, User } from 'lucide-react';
import { PublicProfileRating } from '@/components/public-profile-rating';
import { PublicProfileReviews } from '@/components/public-profile-reviews';
import { BarberPublicGallery } from '@/components/barber-public-gallery';

type Params = {
  params: Promise<{ id: string }>;
};

export default async function BarberProfilePage({ params }: Params) {
  const { id } = await params;

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
    imageUrl: img.cloud_storage_path,
    likes: img.likes,
  }));

  const primaryServices = services.slice(0, 3);
  const moreServices = services.slice(3);
  const primaryGalleryImages = galleryImagesWithUrls.slice(0, 3);
  const moreGalleryImages = galleryImagesWithUrls.slice(3);

  const phoneRaw = barber.phone?.trim() || null;
  const phoneForLinks = phoneRaw ? phoneRaw.replace(/[^\d+]/g, '') : null;
  const telHref = phoneForLinks ? `tel:${phoneForLinks}` : null;
  const chatHref = barber.whatsappUrl?.trim() || (phoneForLinks ? `sms:${phoneForLinks.replace(/\D/g, '')}` : null);
  const chatTarget = barber.whatsappUrl ? '_blank' : undefined;
  const chatRel = barber.whatsappUrl ? 'noreferrer noopener' : undefined;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 overflow-x-hidden">
      {/* Header */}
      <header
        className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 max-w-7xl gap-2">
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="JBookMe Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-base sm:text-xl font-bold leading-none">
              <span className="text-[#00f0ff]">JBook</span>
              <span className="text-[#ffd700]">Me</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 justify-end">
            <Link href="/barberos">
              <Button variant="ghost" className="text-gray-300 hover:text-[#00f0ff] px-2">
                <ArrowLeft className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">View Barbers</span>
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="outline" className="border-gray-700 text-white hover:bg-[#0a0a0a] hover:text-[#00f0ff] px-3">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Profile Header */}
        <div className="mb-12">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start text-center md:text-left">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <div className="relative w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-[#00f0ff]/60 bg-gradient-to-br from-[#00f0ff]/10 to-[#0099cc]/10">
                    {barber.profileImage || barber.user?.image ? (
                      <Image
                        src={barber.profileImage || barber.user?.image || ''}
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
                  {barber.specialties && (
                    <p className="text-[#00f0ff] text-sm sm:text-lg mb-4">{barber.specialties}</p>
                  )}

                  {/* Rating */}
                  <PublicProfileRating
                    barberId={barber.id}
                    initialAvgRating={avgRating}
                    initialReviewCount={barber.reviews.length}
                    hourlyRate={barber.hourlyRate}
                  />

                  {/* Bio */}
                  {barber.bio && (
                    <p className="text-gray-400 mb-6 text-sm sm:text-base">{barber.bio}</p>
                  )}

                  {/* CTA Button */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                    <Link href={`/reservar?barberId=${barber.id}`} className="block">
                      <Button className="w-full sm:w-auto bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90 neon-glow text-base sm:text-lg px-6 sm:px-8">
                        <Calendar className="w-5 h-5 mr-2" />
                        Appointment
                      </Button>
                    </Link>

                    <div className="flex gap-2 justify-center md:justify-start">
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
                    </div>
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
            <div className="grid grid-cols-1 gap-4">
              {primaryServices.map((service) => (
                <Card key={service.id} className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff] transition-colors overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-row">
                      {/* Service Image */}
                      <div className="relative w-24 h-24 sm:w-48 sm:h-48 flex-shrink-0 bg-gradient-to-br from-[#00f0ff]/10 to-[#0099cc]/10">
                        {service.image ? (
                          <Image
                            src={service.image}
                            alt={service.name}
                            fill
                            sizes="(max-width: 640px) 96px, 192px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Clock className="w-8 h-8 sm:w-16 sm:h-16 text-[#00f0ff]/30" />
                          </div>
                        )}
                      </div>

                      {/* Service Info */}
                      <div className="flex-1 p-3 sm:p-6">
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-3 mb-1 sm:mb-2">
                              <h3 className="text-base sm:text-2xl font-bold text-white uppercase tracking-wide" style={{ color: '#00ff00' }}>
                                {service.name}
                              </h3>
                              <span className="text-[#ffd700] font-bold text-sm sm:text-xl whitespace-nowrap">${service.price}</span>
                            </div>
                            {service.description && (
                              <p className="text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{service.description}</p>
                            )}
                            <div className="flex items-center text-white text-sm sm:text-lg font-semibold mb-2 sm:mb-4">
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                              {Math.floor(service.duration / 60) > 0 && `${Math.floor(service.duration / 60)} hr `}
                              {service.duration % 60 > 0 && `${service.duration % 60} min`}
                            </div>
                          </div>
                          
                          <div className="flex justify-end">
                            <Link href={`/reservar?barberId=${barber.id}&serviceId=${service.id}`}>
                              <Button 
                                className="bg-gradient-to-r from-[#00ff00] to-[#00cc00] text-black hover:opacity-90 font-bold text-sm sm:text-base px-4 sm:px-8 py-2 sm:py-6 rounded-lg"
                              >
                                Book Now
                              </Button>
                            </Link>
                          </div>
                        </div>
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
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    {moreServices.map((service) => (
                      <Card
                        key={service.id}
                        className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff] transition-colors overflow-hidden"
                      >
                        <CardContent className="p-0">
                          <div className="flex flex-row">
                            {/* Service Image */}
                            <div className="relative w-24 h-24 sm:w-48 sm:h-48 flex-shrink-0 bg-gradient-to-br from-[#00f0ff]/10 to-[#0099cc]/10">
                              {service.image ? (
                                <Image
                                  src={service.image}
                                  alt={service.name}
                                  fill
                                  sizes="(max-width: 640px) 96px, 192px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Clock className="w-8 h-8 sm:w-16 sm:h-16 text-[#00f0ff]/30" />
                                </div>
                              )}
                            </div>

                            {/* Service Info */}
                            <div className="flex-1 p-3 sm:p-6">
                              <div className="flex flex-col h-full justify-between">
                                <div>
                                  <div className="flex justify-between items-start gap-3 mb-1 sm:mb-2">
                                    <h3
                                      className="text-base sm:text-2xl font-bold text-white uppercase tracking-wide"
                                      style={{ color: '#00ff00' }}
                                    >
                                      {service.name}
                                    </h3>
                                    <span className="text-[#ffd700] font-bold text-sm sm:text-xl whitespace-nowrap">
                                      ${service.price}
                                    </span>
                                  </div>
                                  {service.description && (
                                    <p className="text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
                                      {service.description}
                                    </p>
                                  )}
                                  <div className="flex items-center text-white text-sm sm:text-lg font-semibold mb-2 sm:mb-4">
                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                    {Math.floor(service.duration / 60) > 0 && `${Math.floor(service.duration / 60)} hr `}
                                    {service.duration % 60 > 0 && `${service.duration % 60} min`}
                                  </div>
                                </div>

                                <div className="flex justify-end">
                                  <Link href={`/reservar?barberId=${barber.id}&serviceId=${service.id}`}>
                                    <Button className="bg-gradient-to-r from-[#00ff00] to-[#00cc00] text-black hover:opacity-90 font-bold text-sm sm:text-base px-4 sm:px-8 py-2 sm:py-6 rounded-lg">
                                      Book Now
                                    </Button>
                                  </Link>
                                </div>
                              </div>
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
          <BarberPublicGallery images={primaryGalleryImages} />

          {moreGalleryImages.length > 0 ? (
            <details className="mt-4">
              <summary className="list-none cursor-pointer">
                <div className="w-full rounded-lg border border-gray-800 bg-[#1a1a1a] px-4 py-3 text-center text-gray-300 hover:text-white hover:border-[#00f0ff] transition-colors">
                  Show more photos ({moreGalleryImages.length})
                </div>
              </summary>
              <div className="mt-4">
                <BarberPublicGallery images={moreGalleryImages} />
              </div>
            </details>
          ) : null}
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
