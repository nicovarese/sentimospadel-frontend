import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star, MapPin, Phone, GraduationCap, Trophy } from 'lucide-react';
import { backendApi, type CoachResponse } from '../services/backendApi';
import { formatCategoryBadge, resolveProfileAvatar } from '../services/profileInsightsIntegration';

interface CoachesViewProps {
  onClose: () => void;
}

export const CoachesView: React.FC<CoachesViewProps> = ({ onClose }) => {
  const [coaches, setCoaches] = useState<CoachResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCoaches = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await backendApi.getCoaches();

        if (!mounted) {
          return;
        }

        setCoaches(response);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError('No pudimos cargar los profesores por ahora.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadCoaches();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-dark-900 flex flex-col animate-slide-up">
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

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {loading && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">Cargando profesores</p>
            <p className="text-gray-400 text-xs">Buscando disponibilidad real desde backend.</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-dark-800 border border-red-500/30 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">No pudimos cargar esta vista</p>
            <p className="text-gray-400 text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-4">
            {coaches.map((coach) => (
              <div key={coach.id} className="bg-dark-800 border border-dark-700 rounded-2xl p-4 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveProfileAvatar(coach.fullName, coach.photoUrl)}
                      alt={coach.fullName}
                      className="w-14 h-14 rounded-full border-2 border-dark-600 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{coach.fullName}</h3>
                      <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                        <MapPin size={12} />
                        <span>{coach.clubName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-lg">
                      <Star size={14} className="fill-current" />
                      <span className="font-bold text-sm">{coach.averageRating.toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1">({coach.reviewsCount} reseñas)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-dark-900 rounded-xl p-2 border border-dark-700 flex items-center gap-2">
                    <Trophy size={16} className="text-padel-400" />
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Nivel / Rating</p>
                      <p className="text-sm font-bold text-white">
                        {coach.currentRating.toFixed(2)}{' '}
                        <span className="text-xs text-gray-400 font-normal">({formatCategoryBadge(coach.currentCategory)})</span>
                      </p>
                    </div>
                  </div>
                  <div className="bg-dark-900 rounded-xl p-2 border border-dark-700 flex items-center gap-2">
                    <GraduationCap size={16} className="text-blue-400" />
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Costo / Hora</p>
                      <p className="text-sm font-bold text-white">${coach.hourlyRateUyu} UYU</p>
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

            {coaches.length === 0 && (
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
                <p className="text-white font-bold text-sm mb-1">Todavia no hay profesores publicados</p>
                <p className="text-gray-400 text-xs">Cuando haya coaches activos, apareceran aca.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
