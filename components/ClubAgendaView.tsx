import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock, Zap, Bell, Percent, Tag, X, Check } from 'lucide-react';
import {
  backendApi,
  BackendApiError,
  type ClubAgendaSlotActionType,
  type ClubManagementAgendaResponse,
  type ClubQuickActionType,
} from '../services/backendApi';

interface ClubAgendaViewProps {
  onClose: () => void;
}

type CourtStatus = 'available' | 'reserved' | 'blocked';

type DateOption = {
  label: string;
  value: string;
};

const formatDateLabel = (date: Date, offset: number) => {
  if (offset === -1) return 'Ayer';
  if (offset === 0) return 'Hoy';
  if (offset === 1) return 'Mañana';

  return new Intl.DateTimeFormat('es-UY', { weekday: 'long' }).format(date)
    .replace(/^\w/, char => char.toUpperCase());
};

const toDateOptions = (): DateOption[] => {
  const today = new Date();
  return [-1, 0, 1, 2, 3, 4].map(offset => {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + offset);
    return {
      label: formatDateLabel(nextDate, offset),
      value: nextDate.toISOString().slice(0, 10),
    };
  });
};

const toCourtStatus = (status: ClubManagementAgendaResponse['courts'][number]['slots'][number]['status']): CourtStatus => {
  if (status === 'RESERVED') {
    return 'reserved';
  }

  if (status === 'BLOCKED') {
    return 'blocked';
  }

  return 'available';
};

export const ClubAgendaView: React.FC<ClubAgendaViewProps> = ({ onClose }) => {
  const dateOptions = useMemo(() => toDateOptions(), []);
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[1]?.value ?? dateOptions[0]?.value);
  const [agenda, setAgenda] = useState<ClubManagementAgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const selectedDateLabel = dateOptions.find(option => option.value === selectedDate)?.label ?? 'Hoy';

  const showNotification = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3000);
  };

  const loadAgenda = async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await backendApi.getMyClubManagementAgenda(date);
      setAgenda(response);
    } catch (loadError) {
      if (loadError instanceof BackendApiError && loadError.status === 403) {
        setError('Este usuario no administra ningun club todavia.');
        return;
      }

      setError('No pudimos cargar la agenda del club por ahora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAgenda(selectedDate);
  }, [selectedDate]);

  const handleSlotAction = async (
    courtId: number,
    time: string,
    action: ClubAgendaSlotActionType,
  ) => {
    try {
      const response = await backendApi.applyMyClubAgendaSlotAction({
        date: selectedDate,
        courtId,
        time: time.length === 5 ? `${time}:00` : time,
        action,
        reservedByName: action === 'RESERVE' ? 'Reserva Manual' : null,
      });

      setAgenda(response);

      const actionText = action === 'RESERVE' ? 'reservada' : action === 'BLOCK' ? 'bloqueada' : 'liberada';
      showNotification(`Cancha ${actionText} exitosamente`);
    } catch (actionError) {
      if (actionError instanceof BackendApiError) {
        showNotification(actionError.message);
        return;
      }

      showNotification('No pudimos actualizar la agenda del club.');
    }
  };

  const handleQuickAction = async (action: ClubQuickActionType) => {
    try {
      const response = await backendApi.executeMyClubQuickAction({ type: action });
      showNotification(response.message);
    } catch (actionError) {
      if (actionError instanceof BackendApiError) {
        showNotification(actionError.message);
        return;
      }

      showNotification('No pudimos ejecutar esta accion.');
    }
  };

  const getStatusColor = (status: CourtStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'reserved':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      case 'blocked':
        return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-dark-900 flex flex-col animate-slide-up">
      <div className="bg-dark-800 border-b border-dark-700 p-4 flex items-center sticky top-0 z-20">
        <button
          onClick={onClose}
          className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white leading-tight">Agenda del Club</h2>
          <p className="text-xs text-gray-400 font-medium">
            {agenda?.clubName ?? 'Gestion de reservas y canchas'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide border-b border-dark-800">
          {dateOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedDate(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                selectedDate === option.value
                  ? 'bg-padel-500 text-white'
                  : 'bg-dark-800 text-gray-400 border border-dark-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="p-4 bg-dark-800/50 border-b border-dark-800">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-yellow-500" />
            <h3 className="text-white font-bold text-sm">Acción Rápida</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => void handleQuickAction('NOTIFY_USERS')}
              className="bg-dark-800 hover:bg-dark-700 p-3 rounded-xl border border-dark-700 flex flex-col items-center gap-2 transition-colors"
            >
              <Bell size={18} className="text-blue-400" />
              <span className="text-[10px] font-bold text-gray-300 text-center leading-tight">Notificar<br />Usuarios</span>
            </button>
            <button
              onClick={() => void handleQuickAction('ACTIVATE_RESERVATION_PROMO')}
              className="bg-dark-800 hover:bg-dark-700 p-3 rounded-xl border border-dark-700 flex flex-col items-center gap-2 transition-colors"
            >
              <Tag size={18} className="text-padel-400" />
              <span className="text-[10px] font-bold text-gray-300 text-center leading-tight">Promo en<br />Reserva</span>
            </button>
            <button
              onClick={() => void handleQuickAction('ACTIVATE_LAST_MINUTE_DISCOUNT')}
              className="bg-dark-800 hover:bg-dark-700 p-3 rounded-xl border border-dark-700 flex flex-col items-center gap-2 transition-colors"
            >
              <Percent size={18} className="text-red-400" />
              <span className="text-[10px] font-bold text-gray-300 text-center leading-tight">50% OFF<br />Prox 30m</span>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {loading && (
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
              <p className="text-white font-bold text-sm mb-1">Cargando agenda del club</p>
              <p className="text-gray-400 text-xs">Buscando reservas reales para {selectedDateLabel.toLowerCase()}.</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
              <p className="text-white font-bold text-sm mb-1">Club View no disponible</p>
              <p className="text-gray-400 text-xs">{error}</p>
            </div>
          )}

          {!loading && !error && agenda && (
            <>
              <div className="flex gap-4 justify-center mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500/50 border border-green-500"></div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Disponible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500/50 border border-blue-500"></div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Reservada</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500/50 border border-orange-500"></div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Bloqueada</span>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                {agenda.courts.map(court => (
                  <div key={court.id} className="min-w-[280px] snap-center bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden flex flex-col">
                    <div className="bg-dark-900/50 p-3 border-b border-dark-700 text-center">
                      <h3 className="text-white font-bold">{court.name}</h3>
                    </div>
                    <div className="p-2 space-y-2 flex-1">
                      {court.slots.map(slot => {
                        const status = toCourtStatus(slot.status);
                        return (
                          <div key={slot.id} className={`p-3 rounded-xl border ${getStatusColor(status)} transition-colors`}>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-1.5 font-bold">
                                <Clock size={14} />
                                <span>{slot.time.slice(0, 5)}</span>
                              </div>
                              <span className="text-[10px] uppercase font-black tracking-wider">
                                {status === 'available' ? 'Libre' : status === 'reserved' ? 'Reservada' : 'Bloqueada'}
                              </span>
                            </div>

                            {slot.reservedByName && (
                              <div className="text-sm font-medium mb-3 text-white">
                                {slot.reservedByName}
                              </div>
                            )}

                            <div className="flex gap-1.5 mt-2">
                              {status === 'available' && (
                                <>
                                  <button
                                    onClick={() => void handleSlotAction(court.id, slot.time, 'RESERVE')}
                                    className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    Reservar
                                  </button>
                                  <button
                                    onClick={() => void handleSlotAction(court.id, slot.time, 'BLOCK')}
                                    className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    Bloquear
                                  </button>
                                </>
                              )}
                              {(status === 'reserved' || status === 'blocked') && (
                                <button
                                  onClick={() => void handleSlotAction(court.id, slot.time, 'FREE')}
                                  className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                                >
                                  <Check size={14} /> Liberar Cancha
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {agenda.courts.length === 0 && (
                <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
                  <p className="text-white font-bold text-sm mb-1">Todavia no hay canchas configuradas</p>
                  <p className="text-gray-400 text-xs">Cuando exista una sede administrada, la agenda va a aparecer aca.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-20 left-4 right-4 bg-padel-500 text-white p-4 rounded-2xl shadow-lg shadow-padel-500/20 flex items-center justify-between animate-slide-up z-50">
          <span className="font-bold text-sm">{notification}</span>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
