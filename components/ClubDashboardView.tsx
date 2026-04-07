import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle, Grid, LogOut, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { backendApi, BackendApiError, type ClubManagementDashboardResponse } from '../services/backendApi';

interface ClubDashboardViewProps {
  onOpenClubUsers?: () => void;
  onOpenClubAgenda?: () => void;
  onOpenClubCourts?: () => void;
  onOpenClubVerification?: () => void;
  onLogout?: () => void;
}

export const ClubDashboardView: React.FC<ClubDashboardViewProps> = ({
  onOpenClubUsers,
  onOpenClubAgenda,
  onOpenClubCourts,
  onOpenClubVerification,
  onLogout,
}) => {
  const [dashboard, setDashboard] = useState<ClubManagementDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await backendApi.getMyClubManagementDashboard();

        if (!mounted) {
          return;
        }

        setDashboard(response);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof BackendApiError && loadError.status === 403) {
          setError('Este usuario no administra ningun club todavia.');
          return;
        }

        setError('No pudimos cargar el panel del club por ahora.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const moneyFormatter = useMemo(() => new Intl.NumberFormat('es-UY'), []);

  const formatRelativeTime = (isoDate: string) => {
    const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(isoDate).getTime()) / 60000));
    if (diffMinutes < 60) {
      return `Hace ${diffMinutes}m`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    }

    return `Hace ${Math.round(diffHours / 24)}d`;
  };

  return (
    <div className="pb-24 pt-4 px-4 animate-fade-in">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Panel de Club</h1>
            <p className="text-gray-400 text-sm">{dashboard?.clubName ?? 'Gestion integral de tu sede'}</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="shrink-0 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-2 text-sm font-bold"
            >
              <LogOut size={16} />
              Salir
            </button>
          )}
        </div>
      </header>

      {loading && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center mb-6">
          <p className="text-white font-bold text-sm mb-1">Cargando panel del club</p>
          <p className="text-gray-400 text-xs">Buscando indicadores reales desde backend.</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center mb-6">
          <p className="text-white font-bold text-sm mb-1">Club View no disponible</p>
          <p className="text-gray-400 text-xs">{error}</p>
        </div>
      )}

      {!loading && !error && dashboard && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
              <p className="text-gray-400 text-xs uppercase font-bold">Canchas Activas</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {dashboard.activeCourtsCount}/{dashboard.totalCourtsCount}
              </h2>
              <span className="text-green-400 text-xs font-bold flex items-center gap-1 mt-1">
                <TrendingUp size={12} /> Activas / total configuradas
              </span>
            </div>
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
              <p className="text-gray-400 text-xs uppercase font-bold">Ingresos Hoy</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                ${moneyFormatter.format(Math.round(dashboard.todayRevenueUyu))}
              </h2>
              <span className="text-gray-500 text-xs mt-1">{dashboard.todayReservationsCount} Reservas</span>
            </div>
          </div>

          <h3 className="text-white font-bold mb-3">Gestion</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => onOpenClubAgenda && onOpenClubAgenda()}
              className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition-colors"
            >
              <Calendar size={24} className="text-padel-400" />
              <span className="text-gray-200 text-xs font-bold">Agenda</span>
            </button>
            <button
              onClick={() => onOpenClubUsers && onOpenClubUsers()}
              className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition-colors"
            >
              <Users size={24} className="text-blue-400" />
              <span className="text-gray-200 text-xs font-bold">Usuarios</span>
            </button>
            <button
              onClick={() => onOpenClubCourts && onOpenClubCourts()}
              className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition-colors"
            >
              <Grid size={24} className="text-amber-400" />
              <span className="text-gray-200 text-xs font-bold">Canchas</span>
            </button>
            <button
              onClick={() => onOpenClubVerification && onOpenClubVerification()}
              className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition-colors"
            >
              <ShieldCheck size={24} className="text-green-400" />
              <span className="text-gray-200 text-xs font-bold">Verificaciones</span>
            </button>
          </div>

          <h3 className="text-white font-bold mb-3">Actividad Reciente</h3>
          <div className="space-y-3">
            {dashboard.recentActivities.map(activity => (
              <div key={activity.id} className="bg-dark-800 p-3 rounded-xl border border-dark-700 flex items-center gap-3">
                <div className="bg-green-500/10 p-2 rounded-full text-green-500">
                  <CheckCircle size={16} />
                </div>
                <div>
                  <p className="text-white text-xs font-bold">{activity.title}</p>
                  <p className="text-gray-400 text-[10px]">{activity.description}</p>
                </div>
                <span className="ml-auto text-gray-500 text-[10px]">{formatRelativeTime(activity.occurredAt)}</span>
              </div>
            ))}

            {dashboard.recentActivities.length === 0 && (
              <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 text-center">
                <p className="text-white text-sm font-bold mb-1">Todavia no hay actividad registrada</p>
                <p className="text-gray-400 text-xs">Las acciones del club van a aparecer aca.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
