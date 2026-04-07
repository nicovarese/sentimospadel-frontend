import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, Clock, ShieldCheck, X } from 'lucide-react';
import {
  backendApi,
  BackendApiError,
  type ClubVerificationManagementRequestResponse,
} from '../services/backendApi';
import { resolveProfileAvatar } from '../services/profileInsightsIntegration';

interface ClubVerificationRequestsViewProps {
  onClose: () => void;
}

const sortRequests = (requests: ClubVerificationManagementRequestResponse[]) =>
  [...requests].sort((left, right) => {
    const leftPending = left.status === 'PENDING' ? 0 : 1;
    const rightPending = right.status === 'PENDING' ? 0 : 1;
    if (leftPending !== rightPending) {
      return leftPending - rightPending;
    }
    return new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime();
  });

const statusUi = (status: ClubVerificationManagementRequestResponse['status']) => {
  switch (status) {
    case 'APPROVED':
      return {
        label: 'Aprobada',
        badgeClass: 'bg-green-500/10 text-green-400 border border-green-500/20',
      };
    case 'REJECTED':
      return {
        label: 'Rechazada',
        badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
      };
    default:
      return {
        label: 'Pendiente',
        badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      };
  }
};

export const ClubVerificationRequestsView: React.FC<ClubVerificationRequestsViewProps> = ({ onClose }) => {
  const [requests, setRequests] = useState<ClubVerificationManagementRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingRequestId, setSubmittingRequestId] = useState<number | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>({});
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await backendApi.getMyClubVerificationRequests();

        if (!mounted) {
          return;
        }

        setRequests(sortRequests(response));
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof BackendApiError && loadError.status === 403) {
          setError('Este usuario no administra ningun club todavia.');
          return;
        }

        setError('No pudimos cargar la cola de verificaciones.');
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

  const pendingCount = useMemo(
    () => requests.filter(request => request.status === 'PENDING').length,
    [requests],
  );

  const reviewedCount = requests.length - pendingCount;

  const showNotification = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3500);
  };

  const handleDecision = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      setSubmittingRequestId(requestId);
      const notes = decisionNotes[requestId]?.trim() || null;
      const updated = action === 'approve'
        ? await backendApi.approveMyClubVerificationRequest(requestId, { notes })
        : await backendApi.rejectMyClubVerificationRequest(requestId, { notes });

      setRequests(previous =>
        sortRequests(previous.map(request => (request.id === updated.id ? updated : request))),
      );
      showNotification(action === 'approve' ? 'Solicitud aprobada.' : 'Solicitud rechazada.');
    } catch (decisionError) {
      if (decisionError instanceof BackendApiError) {
        showNotification(decisionError.message);
        return;
      }

      showNotification('No pudimos actualizar esta solicitud.');
    } finally {
      setSubmittingRequestId(null);
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
          <h2 className="text-xl font-black text-white leading-tight">Verificaciones del Club</h2>
          <p className="text-xs text-gray-400 font-medium">Aprobacion y rechazo oficial</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {loading && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">Cargando solicitudes</p>
            <p className="text-gray-400 text-xs">Buscando pedidos reales del club.</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">No disponible</p>
            <p className="text-gray-400 text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                <p className="text-gray-400 text-xs uppercase font-bold">Pendientes</p>
                <p className="text-white text-2xl font-black mt-1">{pendingCount}</p>
              </div>
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                <p className="text-gray-400 text-xs uppercase font-bold">Revisadas</p>
                <p className="text-white text-2xl font-black mt-1">{reviewedCount}</p>
              </div>
            </div>

            <div className="space-y-4">
              {requests.map(request => {
                const ui = statusUi(request.status);
                const isPending = request.status === 'PENDING';
                const isSubmitting = submittingRequestId === request.id;

                return (
                  <div key={request.id} className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={resolveProfileAvatar(request.playerFullName, request.playerPhotoUrl)}
                        alt={request.playerFullName}
                        className="w-12 h-12 rounded-full border border-dark-600 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-white font-bold text-sm">{request.playerFullName}</p>
                            <p className="text-gray-400 text-xs">
                              {request.currentCategory ?? 'Categoria por definir'} • Nivel {request.currentRating.toFixed(2)}
                            </p>
                            {request.playerCity && (
                              <p className="text-gray-500 text-[11px] mt-1">{request.playerCity}</p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${ui.badgeClass}`}>
                            {ui.label}
                          </span>
                        </div>

                        <p className="text-gray-500 text-[11px] mt-3">
                          Solicitado el {new Date(request.requestedAt).toLocaleDateString('es-UY')}
                        </p>

                        {isPending && (
                          <div className="mt-3 space-y-3">
                            <textarea
                              value={decisionNotes[request.id] ?? ''}
                              onChange={event => setDecisionNotes(previous => ({
                                ...previous,
                                [request.id]: event.target.value,
                              }))}
                              placeholder="Nota opcional para la revision"
                              className="w-full min-h-[84px] bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-padel-500"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => void handleDecision(request.id, 'approve')}
                                disabled={isSubmitting}
                                className="bg-green-500/20 hover:bg-green-500/30 disabled:bg-dark-700 disabled:text-gray-500 text-green-400 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                <BadgeCheck size={16} />
                                Aprobar
                              </button>
                              <button
                                onClick={() => void handleDecision(request.id, 'reject')}
                                disabled={isSubmitting}
                                className="bg-red-500/20 hover:bg-red-500/30 disabled:bg-dark-700 disabled:text-gray-500 text-red-400 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                <X size={16} />
                                Rechazar
                              </button>
                            </div>
                          </div>
                        )}

                        {!isPending && (
                          <div className="mt-3 bg-dark-900 border border-dark-700 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                              {request.status === 'APPROVED' ? (
                                <BadgeCheck size={14} className="text-green-400" />
                              ) : (
                                <Clock size={14} className="text-red-400" />
                              )}
                              <p className="text-white font-bold text-xs">
                                Revisado el {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString('es-UY') : 'sin fecha'}
                              </p>
                            </div>
                            <p className="text-gray-300 text-sm">
                              {request.reviewNotes?.trim() || 'Sin observaciones adicionales.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {requests.length === 0 && (
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
                <div className="flex justify-center mb-3">
                  <ShieldCheck size={24} className="text-gray-500" />
                </div>
                <p className="text-white font-bold text-sm mb-1">No hay solicitudes</p>
                <p className="text-gray-400 text-xs">Cuando un jugador pida verificacion, va a aparecer aca.</p>
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
