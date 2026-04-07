import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Plus, Power, RotateCcw, Save, X } from 'lucide-react';
import {
  backendApi,
  BackendApiError,
  type ClubManagementCourtResponse,
  type ClubManagementCourtsResponse,
} from '../services/backendApi';

interface ClubCourtsViewProps {
  onClose: () => void;
}

const parseRateInput = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const ClubCourtsView: React.FC<ClubCourtsViewProps> = ({ onClose }) => {
  const [summary, setSummary] = useState<ClubManagementCourtsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtRate, setNewCourtRate] = useState('');
  const [editingCourtId, setEditingCourtId] = useState<number | null>(null);
  const [editingCourtName, setEditingCourtName] = useState('');
  const [editingCourtRate, setEditingCourtRate] = useState('');
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const moneyFormatter = useMemo(() => new Intl.NumberFormat('es-UY'), []);

  const showNotification = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await backendApi.getMyClubManagementCourts();

        if (!mounted) {
          return;
        }

        setSummary(response);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof BackendApiError && loadError.status === 403) {
          setError('Este usuario no administra ningun club todavia.');
          return;
        }

        setError('No pudimos cargar la configuracion de canchas.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const startEditing = (court: ClubManagementCourtResponse) => {
    setEditingCourtId(court.id);
    setEditingCourtName(court.name);
    setEditingCourtRate(String(court.hourlyRateUyu));
  };

  const resetEditing = () => {
    setEditingCourtId(null);
    setEditingCourtName('');
    setEditingCourtRate('');
  };

  const handleCreate = async () => {
    const hourlyRateUyu = parseRateInput(newCourtRate);
    const name = newCourtName.trim();

    if (!name) {
      showNotification('Ingresa un nombre para la cancha.');
      return;
    }

    if (hourlyRateUyu === null) {
      showNotification('Ingresa una tarifa valida en UYU.');
      return;
    }

    try {
      setCreating(true);
      const response = await backendApi.createMyClubManagementCourt({ name, hourlyRateUyu });
      setSummary(response);
      setNewCourtName('');
      setNewCourtRate('');
      showNotification('Cancha creada.');
    } catch (createError) {
      if (createError instanceof BackendApiError) {
        showNotification(createError.message);
        return;
      }

      showNotification('No pudimos crear la cancha.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (court: ClubManagementCourtResponse, nextActive = court.active) => {
    const name = editingCourtId === court.id ? editingCourtName.trim() : court.name;
    const hourlyRateUyu = editingCourtId === court.id
      ? parseRateInput(editingCourtRate)
      : court.hourlyRateUyu;

    if (!name) {
      showNotification('Ingresa un nombre para la cancha.');
      return;
    }

    if (hourlyRateUyu === null) {
      showNotification('Ingresa una tarifa valida en UYU.');
      return;
    }

    try {
      setPendingActionKey(`court:${court.id}`);
      const response = await backendApi.updateMyClubManagementCourt(court.id, {
        name,
        hourlyRateUyu,
        active: nextActive,
      });

      setSummary(response);
      resetEditing();

      if (nextActive !== court.active) {
        showNotification(nextActive ? 'Cancha reactivada.' : 'Cancha desactivada.');
      } else {
        showNotification('Cancha actualizada.');
      }
    } catch (updateError) {
      if (updateError instanceof BackendApiError) {
        showNotification(updateError.message);
        return;
      }

      showNotification('No pudimos actualizar la cancha.');
    } finally {
      setPendingActionKey(null);
    }
  };

  const handleMove = async (courtId: number, direction: 'up' | 'down') => {
    if (!summary) {
      return;
    }

    const currentIndex = summary.courts.findIndex(court => court.id === courtId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= summary.courts.length) {
      return;
    }

    const reordered = [...summary.courts];
    const [movedCourt] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedCourt);

    try {
      setPendingActionKey('reorder');
      const response = await backendApi.reorderMyClubManagementCourts({
        orderedCourtIds: reordered.map(court => court.id),
      });
      setSummary(response);
      showNotification('Orden actualizado.');
    } catch (reorderError) {
      if (reorderError instanceof BackendApiError) {
        showNotification(reorderError.message);
        return;
      }

      showNotification('No pudimos reordenar las canchas.');
    } finally {
      setPendingActionKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-dark-900 flex flex-col animate-slide-up">
      <div className="bg-dark-800 border-b border-dark-700 p-4 flex items-center sticky top-0 z-20">
        <button
          onClick={onClose}
          className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white leading-tight">Canchas del Club</h2>
          <p className="text-xs text-gray-400 font-medium">Configuracion oficial desde backend</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {loading && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">Cargando canchas</p>
            <p className="text-gray-400 text-xs">Buscando la configuracion real del club.</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">No disponible</p>
            <p className="text-gray-400 text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && summary && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                <p className="text-gray-400 text-xs uppercase font-bold">Activas</p>
                <p className="text-white text-2xl font-black mt-1">{summary.activeCourtsCount}</p>
              </div>
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                <p className="text-gray-400 text-xs uppercase font-bold">Totales</p>
                <p className="text-white text-2xl font-black mt-1">{summary.totalCourtsCount}</p>
              </div>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Plus size={16} className="text-padel-400" />
                <h3 className="text-white font-bold text-sm">Nueva Cancha</h3>
              </div>
              <div className="space-y-3">
                <input
                  value={newCourtName}
                  onChange={event => setNewCourtName(event.target.value)}
                  placeholder="Nombre visible de la cancha"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-padel-500"
                />
                <input
                  value={newCourtRate}
                  onChange={event => setNewCourtRate(event.target.value)}
                  inputMode="decimal"
                  placeholder="Tarifa por hora en UYU"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-padel-500"
                />
                <button
                  onClick={() => void handleCreate()}
                  disabled={creating}
                  className="w-full bg-padel-500 hover:bg-padel-400 disabled:bg-dark-700 disabled:text-gray-500 text-white py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  {creating ? 'Creando...' : 'Crear Cancha'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {summary.courts.map((court, index) => {
                const isEditing = editingCourtId === court.id;
                const isPending = pendingActionKey === `court:${court.id}` || pendingActionKey === 'reorder';
                const canMoveUp = index > 0;
                const canMoveDown = index < summary.courts.length - 1;

                return (
                  <div key={court.id} className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-dark-900 border border-dark-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-full">
                            #{court.displayOrder}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                            court.active
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-gray-500/10 text-gray-300 border border-gray-500/20'
                          }`}>
                            {court.active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        {!isEditing && (
                          <>
                            <p className="text-white font-bold text-sm">{court.name}</p>
                            <p className="text-gray-400 text-xs mt-1">
                              ${moneyFormatter.format(court.hourlyRateUyu)} / hora
                            </p>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void handleMove(court.id, 'up')}
                            disabled={!canMoveUp || isPending}
                            className="bg-dark-900 hover:bg-dark-700 disabled:bg-dark-900 disabled:text-gray-600 text-gray-300 p-2 rounded-xl transition-colors"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => void handleMove(court.id, 'down')}
                            disabled={!canMoveDown || isPending}
                            className="bg-dark-900 hover:bg-dark-700 disabled:bg-dark-900 disabled:text-gray-600 text-gray-300 p-2 rounded-xl transition-colors"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            onClick={() => startEditing(court)}
                            disabled={isPending}
                            className="bg-dark-900 hover:bg-dark-700 disabled:bg-dark-900 disabled:text-gray-600 text-blue-400 p-2 rounded-xl transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          value={editingCourtName}
                          onChange={event => setEditingCourtName(event.target.value)}
                          className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-padel-500"
                        />
                        <input
                          value={editingCourtRate}
                          onChange={event => setEditingCourtRate(event.target.value)}
                          inputMode="decimal"
                          className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-padel-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => void handleUpdate(court)}
                            disabled={isPending}
                            className="bg-padel-500 hover:bg-padel-400 disabled:bg-dark-700 disabled:text-gray-500 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            <Save size={16} />
                            Guardar
                          </button>
                          <button
                            onClick={resetEditing}
                            disabled={isPending}
                            className="bg-dark-900 hover:bg-dark-700 disabled:bg-dark-900 disabled:text-gray-600 text-gray-300 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            <RotateCcw size={16} />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => void handleUpdate(court, !court.active)}
                          disabled={isPending}
                          className={`py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                            court.active
                              ? 'bg-red-500/15 hover:bg-red-500/25 disabled:bg-dark-900 disabled:text-gray-600 text-red-400'
                              : 'bg-green-500/15 hover:bg-green-500/25 disabled:bg-dark-900 disabled:text-gray-600 text-green-400'
                          }`}
                        >
                          <Power size={16} />
                          {court.active ? 'Desactivar' : 'Reactivar'}
                        </button>
                        <div className="bg-dark-900 border border-dark-700 rounded-xl py-2.5 px-3 flex items-center justify-center">
                          <p className="text-gray-400 text-[11px] text-center">
                            La agenda solo muestra canchas activas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {summary.courts.length === 0 && (
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
                <p className="text-white font-bold text-sm mb-1">Todavia no hay canchas configuradas</p>
                <p className="text-gray-400 text-xs">Crea la primera cancha para habilitar una agenda real para el club.</p>
              </div>
            )}
          </>
        )}
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
