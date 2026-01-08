'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  Calendar,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  Award,
  TrendingUp,
  Heart,
  Share2
} from 'lucide-react';
import Link from 'next/link';

interface Barber {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  experience: string;
  location: string;
  avatar?: string;
  price: string;
  availability: string;
  featured?: boolean;
  badges?: string[];
}

export default function BarberosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Mock data - replace with API call
  useEffect(() => {
    const mockBarbers: Barber[] = [
      {
        id: '1',
        name: 'Carlos Rodríguez',
        specialty: 'Cortes Modernos',
        rating: 4.9,
        reviewCount: 127,
        experience: '8 años',
        location: 'Centro, Madrid',
        price: '€25-45',
        availability: 'Disponible hoy',
        featured: true,
        badges: ['Top Rated', 'Premium']
      },
      {
        id: '2',
        name: 'Miguel Ángel Torres',
        specialty: 'Barbería Clásica',
        rating: 4.8,
        reviewCount: 98,
        experience: '12 años',
        location: 'Salamanca, Madrid',
        price: '€30-50',
        availability: 'Mañana',
        featured: true,
        badges: ['Experto', 'Certificado']
      },
      {
        id: '3',
        name: 'David Martínez',
        specialty: 'Estilos Urbanos',
        rating: 4.7,
        reviewCount: 85,
        experience: '6 años',
        location: 'Malasaña, Madrid',
        price: '€20-40',
        availability: 'Disponible hoy',
        badges: ['Trending']
      },
    ];

    setTimeout(() => {
      setBarbers(mockBarbers);
      setLoading(false);
    }, 800);
  }, []);

  const specialties = ['all', 'Cortes Modernos', 'Barbería Clásica', 'Estilos Urbanos', 'Barba', 'Color'];
  const locations = ['all', 'Centro', 'Salamanca', 'Malasaña', 'Chamberí', 'Retiro'];

  const filteredBarbers = barbers.filter(barber => {
    const matchesSearch = barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         barber.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'all' || barber.specialty === selectedSpecialty;
    const matchesLocation = selectedLocation === 'all' || barber.location.includes(selectedLocation);
    return matchesSearch && matchesSpecialty && matchesLocation;
  });

  const sortedBarbers = [...filteredBarbers].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
    if (sortBy === 'price') return parseInt(a.price.split('-')[0].slice(1)) - parseInt(b.price.split('-')[0].slice(1));
    return 0;
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.05, 0.03]
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.03, 0.05, 0.03]
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-amber-500 to-transparent rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-amber-500/20 border border-cyan-500/30 mb-6"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                  Profesionales Premium
                </span>
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-cyan-200 to-amber-200 bg-clip-text text-transparent">
                Barberos y Estilistas
              </h1>
              
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Descubre los mejores profesionales de tu ciudad. Calidad, experiencia y estilo excepcional.
              </p>
            </motion.div>

            {/* Search and Filter Bar */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-5xl mx-auto"
            >
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
                {/* Search Input */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o especialidad..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300"
                  />
                </div>

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-3 items-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500/20 to-amber-500/20 border border-cyan-500/30 rounded-xl hover:border-cyan-500/50 transition-all duration-300"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="font-medium">Filtros</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                  </motion.button>

                  <div className="flex-1 flex flex-wrap gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer hover:bg-white/10 transition-all duration-300"
                    >
                      <option value="rating" className="bg-gray-900">Mejor valorados</option>
                      <option value="reviews" className="bg-gray-900">Más reseñas</option>
                      <option value="price" className="bg-gray-900">Precio</option>
                    </select>
                  </div>

                  <div className="text-sm text-gray-400">
                    <span className="font-semibold text-cyan-400">{sortedBarbers.length}</span> profesionales
                  </div>
                </div>

                {/* Expanded Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-6 mt-6 border-t border-white/10 grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Especialidad
                          </label>
                          <select
                            value={selectedSpecialty}
                            onChange={(e) => setSelectedSpecialty(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                          >
                            {specialties.map(specialty => (
                              <option key={specialty} value={specialty} className="bg-gray-900">
                                {specialty === 'all' ? 'Todas las especialidades' : specialty}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Ubicación
                          </label>
                          <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                          >
                            {locations.map(location => (
                              <option key={location} value={location} className="bg-gray-900">
                                {location === 'all' ? 'Todas las ubicaciones' : location}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Barbers Grid */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 h-96 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <motion.div 
                layout
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {sortedBarbers.map((barber, index) => (
                    <motion.div
                      key={barber.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ y: -8, transition: { duration: 0.2 } }}
                      className="group relative"
                    >
                      {/* Featured Badge */}
                      {barber.featured && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute -top-2 -right-2 z-10 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-lg"
                        >
                          <div className="flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            <span className="text-xs font-bold">DESTACADO</span>
                          </div>
                        </motion.div>
                      )}

                      <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden hover:border-cyan-500/50 transition-all duration-500 h-full shadow-2xl group-hover:shadow-cyan-500/20">
                        {/* Gradient Overlay on Hover */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        />

                        <div className="relative">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <motion.div 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="relative"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-amber-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                                <div className="relative w-16 h-16 bg-gradient-to-br from-cyan-500 to-amber-500 rounded-2xl flex items-center justify-center">
                                  {barber.avatar ? (
                                    <img src={barber.avatar} alt={barber.name} className="w-full h-full rounded-2xl object-cover" />
                                  ) : (
                                    <User className="w-8 h-8 text-white" />
                                  )}
                                </div>
                              </motion.div>

                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors duration-300">
                                  {barber.name}
                                </h3>
                                <p className="text-sm text-gray-400">{barber.specialty}</p>
                              </div>
                            </div>

                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleFavorite(barber.id)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-300"
                            >
                              <Heart 
                                className={`w-5 h-5 transition-colors duration-300 ${
                                  favorites.has(barber.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
                                }`} 
                              />
                            </motion.button>
                          </div>

                          {/* Badges */}
                          {barber.badges && barber.badges.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {barber.badges.map((badge, i) => (
                                <motion.span
                                  key={badge}
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.1 * i }}
                                  className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-amber-500/20 border border-cyan-500/30 rounded-lg"
                                >
                                  {badge}
                                </motion.span>
                              ))}
                            </div>
                          )}

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              <div>
                                <div className="text-sm font-bold text-white">{barber.rating}</div>
                                <div className="text-xs text-gray-400">{barber.reviewCount} reseñas</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                              <Clock className="w-4 h-4 text-cyan-400" />
                              <div>
                                <div className="text-sm font-bold text-white">{barber.experience}</div>
                                <div className="text-xs text-gray-400">experiencia</div>
                              </div>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <MapPin className="w-4 h-4 text-cyan-400" />
                              <span>{barber.location}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">Precio:</span>
                              <span className="font-bold text-amber-400">{barber.price}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-green-400" />
                              <span className="text-sm text-green-400 font-medium">{barber.availability}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link href={`/barberos/${barber.id}`} className="flex-1">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-xl font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all duration-300"
                              >
                                Ver Perfil
                              </motion.button>
                            </Link>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors duration-300"
                            >
                              <Share2 className="w-5 h-5 text-gray-400" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* No Results */}
            {!loading && sortedBarbers.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">No se encontraron resultados</h3>
                  <p className="text-gray-400 mb-6">
                    Intenta ajustar los filtros o la búsqueda
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSpecialty('all');
                      setSelectedLocation('all');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl font-semibold hover:from-cyan-600 hover:to-cyan-700 transition-all duration-300"
                  >
                    Limpiar filtros
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="px-4 sm:px-6 lg:px-8 pb-20"
        >
          <div className="max-w-4xl mx-auto">
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-amber-500/10 border border-cyan-500/30 rounded-3xl p-12 overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500 to-transparent rounded-full blur-3xl"
              />
              
              <div className="relative text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-amber-500/20 border border-cyan-500/30 mb-6"
                >
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                    ¿Eres profesional?
                  </span>
                </motion.div>

                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Únete a nuestra plataforma
                </h2>
                <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                  Aumenta tu clientela y gestiona tus citas de forma profesional
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl font-bold text-white shadow-2xl shadow-amber-500/30 transition-all duration-300"
                >
                  Registrarme como profesional
                </motion.button>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
