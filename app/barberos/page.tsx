'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Star, Calendar, User, SlidersHorizontal, Award, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { HistoryBackButton } from '@/components/layout/history-back-button';

interface Barber {
  id: string;
  profileImage?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'BOTH' | null;
  user?: {
    name?: string | null;
    image?: string | null;
  };
  specialties?: string | null;
  bio?: string | null;
  hourlyRate?: number | null;
  avgRating: number;
  services?: unknown[];
  _count?: {
    reviews: number;
  };
}

type BarberReview = { rating: number };
type BarberApiItem = Barber & { reviews?: BarberReview[] };
type BarbersApiResponse = { barbers?: BarberApiItem[] };

export default function BarberosPage() {
  const { t } = useI18n();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredBarbers, setFilteredBarbers] = useState<Barber[]>([]);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [sortBy, setSortBy] = useState<string>('rating');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');

  // Separate barbers and stylists
  const maleBarbers = filteredBarbers.filter(b => b.gender === 'MALE');
  const femaleStylists = filteredBarbers.filter(b => b.gender === 'FEMALE');

  // Helper function to get professional title based on gender
  const getProfessionalTitle = (gender?: 'MALE' | 'FEMALE' | 'BOTH' | null): string => {
    if (gender === 'MALE') return 'Barber';
    if (gender === 'FEMALE') return 'Stylist';
    if (gender === 'BOTH') return 'Barber & Stylist';
    return 'Professional';
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...barbers];

    // Filter by rating
    if (minRating > 0) {
      filtered = filtered.filter(b => b.avgRating >= minRating);
    }

    // Filter by price
    if (maxPrice < 1000) {
      filtered = filtered.filter(b => !b.hourlyRate || b.hourlyRate <= maxPrice);
    }

    // Filter by specialty
    if (specialtyFilter !== 'all') {
      filtered = filtered.filter(b => 
        b.specialties?.toLowerCase().includes(specialtyFilter.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.avgRating - a.avgRating;
        case 'price-low':
          return (a.hourlyRate || 0) - (b.hourlyRate || 0);
        case 'price-high':
          return (b.hourlyRate || 0) - (a.hourlyRate || 0);
        case 'popular':
          return (b._count?.reviews || 0) - (a._count?.reviews || 0);
        default:
          return 0;
      }
    });

    setFilteredBarbers(filtered);
  }, [barbers, minRating, maxPrice, sortBy, specialtyFilter]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setMinRating(0);
    setMaxPrice(1000);
    setSortBy('rating');
    setSpecialtyFilter('all');
  };

  const hasActiveFilters = minRating > 0 || maxPrice < 1000 || specialtyFilter !== 'all';

  const fetchBarbers = async () => {
    try {
      const res = await fetch('/api/barbers');
      const data: unknown = await res.json();
      
      const payload = data as BarbersApiResponse;
      if (res.ok && Array.isArray(payload.barbers)) {
        const barbersWithRatings = payload.barbers.map((barber) => {
          const reviews = barber.reviews || [];
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;
          return {
            ...barber,
            avgRating: Number(avgRating.toFixed(1)),
          };
        });
        setBarbers(barbersWithRatings);
      }
    } catch (error) {
      console.error('Error fetching barbers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-16">
        {/* Skeleton Loading */}
        <main className="container mx-auto px-4 py-12 max-w-7xl">
          <HistoryBackButton
            fallbackHref="/menu"
            variant="ghost"
            size="icon"
            aria-label="Back"
            className="mb-6 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="w-5 h-5" />
          </HistoryBackButton>

          <div className="mb-16">
            <div className="text-center mb-12">
              <div className="h-12 bg-gray-800 rounded-lg w-64 mx-auto mb-4 animate-pulse"></div>
              <div className="h-6 bg-gray-800 rounded-lg w-96 mx-auto animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-[#1a1a1a] border-gray-800">
                  <CardHeader>
                    <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden bg-gray-800 animate-pulse"></div>
                    <div className="h-8 bg-gray-800 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-800 rounded w-1/2 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-800 rounded w-full animate-pulse"></div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-6 bg-gray-800 rounded w-1/2 animate-pulse"></div>
                    <div className="h-4 bg-gray-800 rounded w-full animate-pulse"></div>
                    <div className="h-10 bg-gray-800 rounded w-full animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-16">
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <HistoryBackButton
          fallbackHref="/menu"
          variant="ghost"
          size="icon"
          aria-label="Back"
          className="mb-6 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
        >
          <ArrowLeft className="w-5 h-5" />
        </HistoryBackButton>

        {/* Filters Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="border-gray-700 text-white hover:bg-[#1a1a1a]"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge className="ml-2 bg-[#00f0ff] text-black">
                    {[minRating > 0, maxPrice < 1000, specialtyFilter !== 'all'].filter(Boolean).length}
                  </Badge>
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] bg-[#1a1a1a] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Rating Filter */}
                  <div>
                    <label className="text-white text-sm font-semibold mb-2 block">
                      Minimum Rating
                    </label>
                    <Select value={minRating.toString()} onValueChange={(v) => setMinRating(Number(v))}>
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-700">
                        <SelectItem value="0">All Ratings</SelectItem>
                        <SelectItem value="3">3+ Stars</SelectItem>
                        <SelectItem value="4">4+ Stars</SelectItem>
                        <SelectItem value="4.5">4.5+ Stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Filter */}
                  <div>
                    <label className="text-white text-sm font-semibold mb-2 block">
                      Max Price per Hour
                    </label>
                    <Select value={maxPrice.toString()} onValueChange={(v) => setMaxPrice(Number(v))}>
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-700">
                        <SelectItem value="1000">Any Price</SelectItem>
                        <SelectItem value="30">Under $30</SelectItem>
                        <SelectItem value="50">Under $50</SelectItem>
                        <SelectItem value="75">Under $75</SelectItem>
                        <SelectItem value="100">Under $100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Specialty Filter */}
                  <div>
                    <label className="text-white text-sm font-semibold mb-2 block">
                      Specialty
                    </label>
                    <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                      <SelectTrigger className="bg-[#0a0a0a] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-700">
                        <SelectItem value="all">All Specialties</SelectItem>
                        <SelectItem value="fade">Fade Specialist</SelectItem>
                        <SelectItem value="beard">Beard Specialist</SelectItem>
                        <SelectItem value="color">Color Specialist</SelectItem>
                        <SelectItem value="style">Style Specialist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Barbers Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#00f0ff] via-[#00d4ff] to-[#0099cc] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,240,255,0.5)]">
                Barbers Team
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Expert barbers specialized in men&apos;s grooming
            </p>
          </div>

          {maleBarbers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No barbers available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {maleBarbers.map((barber, index) => (
                <Card
                  key={barber.id}
                  className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff] transition-all duration-300 group animate-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-[#00f0ff]/10 to-[#0099cc]/10">
                      {barber.profileImage || barber.user?.image ? (
                        <Image
                          src={barber.profileImage || barber.user?.image || ''}
                          alt={barber.user?.name || t('barbers.barber')}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00f0ff]/10 to-[#ffd700]/10">
                          <User className="w-20 h-20 text-[#00f0ff]/40" />
                        </div>
                      )}
                      
                      {/* Top Rated Badge */}
                      {barber.avgRating >= 4.5 && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                          <Award className="w-3 h-3" />
                          Top Rated
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-white text-2xl">{barber.user?.name || t('barbers.barber')}</CardTitle>
                    <div className="text-[#00f0ff] text-sm font-semibold mb-2">
                      {getProfessionalTitle(barber.gender)}
                    </div>
                    <CardDescription className="text-gray-400">
                      {barber.specialties || t('barbers.specialist')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Rating */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="w-5 h-5 text-[#ffd700] fill-current" />
                        <span className="text-[#ffd700] font-semibold">
                          {barber.avgRating > 0 ? barber.avgRating.toFixed(1) : t('common.new')}
                        </span>
                        <span className="text-gray-500 text-sm">
                          ({barber._count?.reviews || 0} {t('reviews.reviewsCount')})
                        </span>
                      </div>
                      {barber.hourlyRate && (
                        <span className="text-[#00f0ff] font-semibold">${barber.hourlyRate}/hr</span>
                      )}
                    </div>

                    {/* Bio */}
                    {barber.bio && (
                      <p className="text-gray-400 text-sm line-clamp-2">{barber.bio}</p>
                    )}

                    {/* Services Count */}
                    <div className="text-gray-500 text-sm">
                      {barber.services?.length || 0} {t('services.available')}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                      <Link href={`/reservar?barberId=${barber.id}`} className="w-full">
                        <Button className="w-full bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90 font-bold">
                          <Calendar className="w-4 h-4 mr-2" />
                          {t('booking.bookAppointment')}
                        </Button>
                      </Link>
                      <Link href={`/barberos/${barber.id}`} className="w-full">
                        <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-[#00f0ff] hover:bg-transparent">
                          {t('barbers.viewProfile')}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Stylists Section */}
        <div>
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ff69b4] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]">
                Stylists Team
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Professional stylists specialized in women&apos;s hair styling
            </p>
          </div>

          {femaleStylists.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No stylists available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {femaleStylists.map((barber, index) => (
                <Card
                  key={barber.id}
                  className="bg-[#1a1a1a] border-gray-800 hover:border-[#ffd700] transition-all duration-300 group animate-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-[#ffd700]/10 to-[#ff69b4]/10">
                      {barber.profileImage || barber.user?.image ? (
                        <Image
                          src={barber.profileImage || barber.user?.image || ''}
                          alt={barber.user?.name || 'Stylist'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ffd700]/10 to-[#ff69b4]/10">
                          <User className="w-20 h-20 text-[#ffd700]/40" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-white text-2xl">{barber.user?.name || 'Stylist'}</CardTitle>
                    <div className="text-[#ffd700] text-sm font-semibold mb-2">
                      {getProfessionalTitle(barber.gender)}
                    </div>
                    <CardDescription className="text-gray-400">
                      {barber.specialties || 'Hair Styling Specialist'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Rating */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="w-5 h-5 text-[#ffd700] fill-current" />
                        <span className="text-[#ffd700] font-semibold">
                          {barber.avgRating > 0 ? barber.avgRating.toFixed(1) : t('common.new')}
                        </span>
                        <span className="text-gray-500 text-sm">
                          ({barber._count?.reviews || 0} {t('reviews.reviewsCount')})
                        </span>
                      </div>
                      {barber.hourlyRate && (
                        <span className="text-[#ffd700] font-semibold">${barber.hourlyRate}/hr</span>
                      )}
                    </div>

                    {/* Bio */}
                    {barber.bio && (
                      <p className="text-gray-400 text-sm line-clamp-2">{barber.bio}</p>
                    )}

                    {/* Services Count */}
                    <div className="text-gray-500 text-sm">
                      {barber.services?.length || 0} {t('services.available')}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                      <Link href={`/reservar?barberId=${barber.id}`} className="w-full">
                        <Button className="w-full bg-gradient-to-r from-[#ffd700] to-[#ff69b4] text-black hover:opacity-90 font-bold">
                          <Calendar className="w-4 h-4 mr-2" />
                          {t('booking.bookAppointment')}
                        </Button>
                      </Link>
                      <Link href={`/barberos/${barber.id}`} className="w-full">
                        <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-[#ffd700] hover:bg-transparent">
                          {t('barbers.viewProfile')}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
