import React from 'react';
import { ArrowLeft, Star, MapPin, Phone, GraduationCap, Trophy } from 'lucide-react';

interface Coach {
  id: string;
  name: string;
  club: string;
  rating: number;
  category: string;
  reviews: number;
  averageRating: number;
  hourlyRate: number;
  phone: string;
  avatar: string;
}

const MOCK_COACHES: Coach[] = [
  {
    id: 'c1',
    name: 'Tomi',
    club: 'Club Reducto',
    rating: 5.3,
    category: '3ra Categoría',
    reviews: 70,
    averageRating: 4.8,
    hourlyRate: 1000,
    phone: '098388097',
    avatar: 'https://picsum.photos/100/100?r=tomi'
  },
  {
    id: 'c2',
    name: 'Nico',
    club: 'El Bosque Padel',
    rating: 5.5,
    category: '2da Categoría',
    reviews: 120,
    averageRating: 4.9,
    hourlyRate: 1500,
    phone: '091987654',
    avatar: 'https://picsum.photos/100/100?r=nico'
  },
  {
    id: 'c3',
    name: 'Matias',
    club: 'Padel Pro',
    rating: 5.1,
    category: '3ra Categoría',
    reviews: 45,
    averageRating: 4.6,
    hourlyRate: 1200,
    phone: '099123456',
    avatar: 'https://picsum.photos/100/100?r=matias'
  }
];

interface CoachesViewProps {
  onClose: () => void;
}

export const CoachesView: React.FC<CoachesViewProps> = ({ onClose }) => {
  // Sort coaches by average rating (highest first)
  const sortedCoaches = [...MOCK_COACHES].sort((a, b) => b.averageRating - a.averageRating);

  return (
    <div className="fixed inset-0 z-[100] bg-dark-900 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 p-4 flex items-center sticky top-0 z-10">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white leading-tight">Profesores</h2>
          <p className="text-xs text-gray-400 font-medium">Encuentra tu coach ideal</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="flex flex-col gap-4">
          {sortedCoaches.map((coach) => (
            <div key={coach.id} className="bg-dark-800 border border-dark-700 rounded-2xl p-4 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={coach.avatar} 
                    alt={coach.name} 
                    className="w-14 h-14 rounded-full border-2 border-dark-600 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{coach.name}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                      <MapPin size={12} />
                      <span>{coach.club}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-lg">
                    <Star size={14} className="fill-current" />
                    <span className="font-bold text-sm">{coach.averageRating}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">({coach.reviews} reseñas)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-dark-900 rounded-xl p-2 border border-dark-700 flex items-center gap-2">
                  <Trophy size={16} className="text-padel-400" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Nivel / Rating</p>
                    <p className="text-sm font-bold text-white">{coach.rating.toFixed(2)} <span className="text-xs text-gray-400 font-normal">({coach.category})</span></p>
                  </div>
                </div>
                <div className="bg-dark-900 rounded-xl p-2 border border-dark-700 flex items-center gap-2">
                  <GraduationCap size={16} className="text-blue-400" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Costo / Hora</p>
                    <p className="text-sm font-bold text-white">${coach.hourlyRate} UYU</p>
                  </div>
                </div>
              </div>

              <a 
                href={`https://wa.me/598${coach.phone.replace(/^0/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-padel-600 hover:bg-padel-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Phone size={18} />
                Contactar ({coach.phone})
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
