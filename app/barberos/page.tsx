'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Clock, DollarSign, Heart, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/layout/bottom-nav';

interface Barbero {
  id: number;
  name: string;
  rating: number;
  reviews: number;
  specialties: string[];
  price: string;
  distance: string;
  image: string;
  available: boolean;
  nextAvailable: string;
}

const barberos: Barbero[] = [
  {
    id: 1,
    name: "Carlos Martínez",
    rating: 4.9,
    reviews: 234,
    specialties: ["Fade", "Beard", "Classic"],
    price: "$$",
    distance: "0.5 km",
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400",
    available: true,
    nextAvailable: "Hoy 3:00 PM"
  },
  {
    id: 2,
    name: "Luis García",
    rating: 4.8,
    reviews: 189,
    specialties: ["Modern", "Design", "Color"],
    price: "$$$",
    distance: "1.2 km",
    image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400",
    available: true,
    nextAvailable: "Hoy 4:30 PM"
  },
  {
    id: 3,
    name: "Miguel Rodríguez",
    rating: 4.7,
    reviews: 156,
    specialties: ["Traditional", "Hot Towel", "Massage"],
    price: "$$",
    distance: "2.0 km",
    image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400",
    available: false,
    nextAvailable: "Mañana 10:00 AM"
  },
  {
    id: 4,
    name: "Antonio López",
    rating: 4.9,
    reviews: 298,
    specialties: ["Fade", "Line Up", "Kids"],
    price: "$$",
    distance: "1.8 km",
    image: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=400",
    available: true,
    nextAvailable: "Hoy 2:00 PM"
  },
  {
    id: 5,
    name: "David Sánchez",
    rating: 4.6,
    reviews: 145,
    specialties: ["Buzz Cut", "Military", "Quick Service"],
    price: "$",
    distance: "3.5 km",
    image: "https://images.unsplash.com/photo-1621605815998-e966d2f9db63?w=400",
    available: true,
    nextAvailable: "Hoy 1:30 PM"
  },
  {
    id: 6,
    name: "José Fernández",
    rating: 4.8,
    reviews: 267,
    specialties: ["Pompadour", "Slick Back", "Vintage"],
    price: "$$$",
    distance: "0.8 km",
    image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400",
    available: true,
    nextAvailable: "Hoy 5:00 PM"
  }
];

export default function BarberosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);

  const allSpecialties = Array.from(
    new Set(barberos.flatMap(b => b.specialties))
  );

  const filteredBarberos = barberos.filter(barbero => {
    const matchesSearch = barbero.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         barbero.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = !selectedSpecialty || barbero.specialties.includes(selectedSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  const toggleFavorite = (id: number) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold mb-2">Encuentra tu Barbero</h1>
            <p className="text-blue-100">Los mejores profesionales cerca de ti</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search and Filter Section */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por nombre o especialidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-6 text-lg"
              />
            </div>
            <Button variant="outline" size="lg" className="px-6">
              <Filter className="w-5 h-5 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Specialty Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSpecialty === null ? "default" : "outline"}
              onClick={() => setSelectedSpecialty(null)}
              className="rounded-full"
            >
              Todos
            </Button>
            {allSpecialties.map(specialty => (
              <Button
                key={specialty}
                variant={selectedSpecialty === specialty ? "default" : "outline"}
                onClick={() => setSelectedSpecialty(specialty)}
                className="rounded-full"
              >
                {specialty}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 text-gray-600">
          <p className="text-lg">
            Mostrando <span className="font-semibold text-gray-900">{filteredBarberos.length}</span> barberos disponibles
          </p>
        </div>

        {/* Barberos Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBarberos.map((barbero, index) => (
            <motion.div
              key={barbero.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
                <div className="relative">
                  <img
                    src={barbero.image}
                    alt={barbero.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute top-2 right-2 bg-white/90 hover:bg-white ${
                      favorites.includes(barbero.id) ? 'text-red-500' : 'text-gray-400'
                    }`}
                    onClick={() => toggleFavorite(barbero.id)}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(barbero.id) ? 'fill-current' : ''}`} />
                  </Button>
                  {barbero.available && (
                    <Badge className="absolute top-2 left-2 bg-green-500">
                      Disponible
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="mb-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{barbero.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{barbero.distance}</span>
                      <span className="mx-1">•</span>
                      <span>{barbero.price}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{barbero.rating}</span>
                    </div>
                    <span className="text-gray-600 text-sm">({barbero.reviews} reseñas)</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {barbero.specialties.map(specialty => (
                      <Badge key={specialty} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>Próximo: {barbero.nextAvailable}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline">
                      Ver Perfil
                    </Button>
                    <Button 
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      disabled={!barbero.available}
                    >
                      {barbero.available ? 'Reservar' : 'No Disponible'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredBarberos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No se encontraron barberos</h3>
            <p className="text-gray-600 mb-6">
              Intenta ajustar tu búsqueda o filtros
            </p>
            <Button onClick={() => { setSearchTerm(''); setSelectedSpecialty(null); }}>
              Limpiar Filtros
            </Button>
          </motion.div>
        )}

        {/* Info Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Barberos Verificados</h3>
            <p className="text-gray-600">
              Todos nuestros profesionales están certificados y verificados
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Reserva Instantánea</h3>
            <p className="text-gray-600">
              Confirma tu cita en segundos y recibe notificaciones
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Mejores Precios</h3>
            <p className="text-gray-600">
              Encuentra servicios de calidad a precios competitivos
            </p>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">¿Eres Barbero?</h2>
          <p className="text-xl mb-6 text-blue-100">
            Únete a nuestra plataforma y llega a más clientes
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8">
            Registrarme como Barbero
          </Button>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}