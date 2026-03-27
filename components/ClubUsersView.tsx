import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, UserPlus, UserMinus, Activity, DollarSign, Trophy } from 'lucide-react';
import { backendApi, BackendApiError, type ClubManagementUsersResponse } from '../services/backendApi';
import { resolveProfileAvatar } from '../services/profileInsightsIntegration';

interface ClubUsersViewProps {
  onClose: () => void;
}

export const ClubUsersView: React.FC<ClubUsersViewProps> = ({ onClose }) => {
  const [overview, setOverview] = useState<ClubManagementUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadOverview = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await backendApi.getMyClubManagementUsers();

        if (!mounted) {
          return;
        }

        setOverview(response);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof BackendApiError && loadError.status === 403) {
          setError('Este usuario no administra ningun club todavia.');
          return;
        }

        setError('No pudimos cargar las metricas del club por ahora.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      mounted = false;
    };
  }, []);

  const moneyFormatter = new Intl.NumberFormat('es-UY');

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
          <h2 className="text-xl font-black text-white leading-tight">Usuarios del Club</h2>
          <p className="text-xs text-gray-400 font-medium">Estadisticas e indicadores</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {loading && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">Cargando usuarios del club</p>
            <p className="text-gray-400 text-xs">Buscando indicadores reales desde backend.</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">Club View no disponible</p>
            <p className="text-gray-400 text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && overview && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-500/20 p-1.5 rounded-lg">
                    <Users size={16} className="text-blue-400" />
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Activos</p>
                </div>
                <h3 className="text-2xl font-black text-white">{overview.activeUsersCount}</h3>
                <p className="text-xs text-gray-500 mt-1">{overview.clubName}</p>
              </div>

              <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-green-500/20 p-1.5 rounded-lg">
                    <UserPlus size={16} className="text-green-400" />
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Nuevos</p>
                </div>
                <h3 className="text-2xl font-black text-white">{overview.newUsersThisMonthCount}</h3>
                <p className="text-xs text-gray-500 mt-1">Este mes</p>
              </div>

              <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-red-500/20 p-1.5 rounded-lg">
                    <UserMinus size={16} className="text-red-400" />
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Inactivos</p>
                </div>
                <h3 className="text-2xl font-black text-white">{overview.inactiveUsersCount}</h3>
                <p className="text-xs text-gray-500 mt-1">&gt; 2 meses sin jugar</p>
              </div>

              <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-amber-500/20 p-1.5 rounded-lg">
                    <DollarSign size={16} className="text-amber-400" />
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Ingreso Prom.</p>
                </div>
                <h3 className="text-2xl font-black text-white">${moneyFormatter.format(Math.round(overview.averageRevenuePerUserUyu))}</h3>
                <p className="text-xs text-gray-500 mt-1">Por usuario/mes</p>
              </div>
            </div>

            <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-padel-500/20 p-2 rounded-lg">
                  <Activity size={20} className="text-padel-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Promedio de Partidos</h3>
                  <p className="text-xs text-gray-400">Jugados por usuario</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-dark-900 p-3 rounded-xl border border-dark-700 text-center">
                  <p className="text-xs text-gray-500 mb-1">Este mes</p>
                  <p className="text-xl font-black text-white">{overview.averageMatchesThisMonth.toFixed(1)}</p>
                </div>
                <div className="bg-dark-900 p-3 rounded-xl border border-dark-700 text-center">
                  <p className="text-xs text-gray-500 mb-1">Mes anterior</p>
                  <p className="text-xl font-black text-gray-300">{overview.averageMatchesPreviousMonth.toFixed(1)}</p>
                </div>
                <div className="bg-dark-900 p-3 rounded-xl border border-dark-700 text-center">
                  <p className="text-xs text-gray-500 mb-1">Prom. anual</p>
                  <p className="text-xl font-black text-gray-300">{overview.averageMatchesYear.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <Trophy size={20} className="text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Top 10 Jugadores</h3>
                  <p className="text-xs text-gray-400">Mas partidos este mes</p>
                </div>
              </div>

              <div className="space-y-3">
                {overview.topUsers.map((user, index) => (
                  <div key={user.playerProfileId} className="flex items-center justify-between p-2 rounded-xl hover:bg-dark-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 text-center font-black ${index < 3 ? 'text-yellow-500' : 'text-gray-500'}`}>
                        {user.position}
                      </div>
                      <img
                        src={resolveProfileAvatar(user.fullName, user.photoUrl)}
                        alt={user.fullName}
                        className="w-10 h-10 rounded-full border border-dark-600 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-sm font-bold text-white">{user.fullName}</span>
                    </div>
                    <div className="bg-dark-900 px-3 py-1 rounded-lg border border-dark-700">
                      <span className="text-padel-400 font-bold text-sm">{user.matchesThisMonth}</span>
                      <span className="text-xs text-gray-500 ml-1">partidos</span>
                    </div>
                  </div>
                ))}

                {overview.topUsers.length === 0 && (
                  <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 text-center">
                    <p className="text-white text-sm font-bold mb-1">Todavia no hay usuarios rankeados este mes</p>
                    <p className="text-gray-400 text-xs">Cuando haya actividad real en el club, aparecera aca.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
