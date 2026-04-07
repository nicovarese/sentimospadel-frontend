import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, BadgeCheck, Clock, MapPin, ShieldCheck, X } from 'lucide-react';
import {
  backendApi,
  BackendApiError,
  type ClubResponse,
  type PlayerClubVerificationSummaryResponse,
} from '../services/backendApi';

interface PlayerClubVerificationViewProps {
  onClose: () => void;
  onSummaryChange?: (summary: PlayerClubVerificationSummaryResponse) => void;
}

const statusUi = (status: PlayerClubVerificationSummaryResponse['clubVerificationStatus']) => {
  switch (status) {
    case 'VERIFIED':
      return {
        label: 'Verificado',
        badgeClass: 'bg-green-500/10 text-green-400 border border-green-500/20',
      };
    case 'REJECTED':
      return {
        label: 'Rechazado',
        badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
      };
    case 'PENDING':
      return {
        label: 'Pendiente',
        badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      };
    default:
      return {
        label: 'No requerido',
        badgeClass: 'bg-dark-700 text-gray-300 border border-dark-600',
      };
  }
};

const sortClubs = (clubs: ClubResponse[]) =>
  [...clubs].sort((left, right) => left.name.localeCompare(right.name, 'es'));

export const PlayerClubVerificationView: React.FC<PlayerClubVerificationViewProps> = ({
  onClose,
  onSummaryChange,
}) => {
  const [summary, setSummary] = useState<PlayerClubVerificationSummaryResponse | null>(null);
  const [clubs, setClubs] = useState<ClubResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingClubId, setSubmittingClubId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [nextSummary, nextClubs] = await Promise.all([
          backendApi.getMyClubVerification(),
          backendApi.getClubs(),
        ]);

        if (!mounted) {
          return;
        }

        setSummary(nextSummary);
        setClubs(sortClubs(nextClubs));
        onSummaryChange?.(nextSummary);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError('No pudimos cargar el estado de verificacion por ahora.');
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

  const activeRequest = useMemo(
    () => summary?.requests.find(request => request.status === 'PENDING') ?? null,
    [summary],
  );

  const approvedRequest = useMemo(
    () => summary?.requests.find(request => request.status === 'APPROVED') ?? null,
    [summary],
  );

  const lastReviewedRequest = useMemo(
    () => summary?.requests.find(request => request.status !== 'PENDING') ?? null,
    [summary],
  );

  const showNotification = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3500);
  };

  const handleRequest = async (clubId: number) => {
    try {
      setSubmittingClubId(clubId);
      const nextSummary = await backendApi.requestMyClubVerification({ clubId });
      setSummary(nextSummary);
      onSummaryChange?.(nextSummary);
      showNotification('Solicitud enviada al club.');
    } catch (requestError) {
      if (requestError instanceof BackendApiError) {
        showNotification(requestError.message);
        return;
      }

      showNotification('No pudimos enviar la solicitud de verificacion.');
    } finally {
      setSubmittingClubId(null);
    }
  };

  const currentStatusUi = statusUi(summary?.clubVerificationStatus ?? 'NOT_REQUIRED');

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
          <h2 className="text-xl font-black text-white leading-tight">Verificacion de Categoria</h2>
          <p className="text-xs text-gray-400 font-medium">Workflow oficial desde backend</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {loading && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">Cargando verificacion</p>
            <p className="text-gray-400 text-xs">Buscando estado real y clubes disponibles.</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-sm mb-1">No disponible por ahora</p>
            <p className="text-gray-400 text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && summary && (
          <>
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="bg-padel-500/10 p-3 rounded-2xl border border-padel-500/20">
                  <ShieldCheck size={22} className="text-padel-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-white font-bold">Estado Oficial</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${currentStatusUi.badgeClass}`}>
                      {currentStatusUi.label}
                    </span>
                  </div>

                  {!summary.requiresClubVerification && (
                    <p className="text-gray-300 text-sm">
                      Tu categoria actual no necesita validacion de club.
                    </p>
                  )}

                  {summary.requiresClubVerification && summary.clubVerificationStatus === 'PENDING' && !activeRequest && (
                    <p className="text-gray-300 text-sm">
                      Tu categoria necesita validacion oficial. Elegi un club real para iniciar la solicitud.
                    </p>
                  )}

                  {activeRequest && (
                    <p className="text-gray-300 text-sm">
                      Solicitud enviada a <span className="text-white font-bold">{activeRequest.clubName}</span>.
                    </p>
                  )}

                  {approvedRequest && (
                    <p className="text-gray-300 text-sm">
                      Categoria validada por <span className="text-white font-bold">{approvedRequest.clubName}</span>.
                    </p>
                  )}

                  {summary.clubVerificationStatus === 'REJECTED' && lastReviewedRequest && (
                    <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                      <p className="text-red-300 text-xs font-bold uppercase mb-1">Ultima revision</p>
                      <p className="text-gray-300 text-sm">
                        {lastReviewedRequest.reviewNotes?.trim()
                          ? lastReviewedRequest.reviewNotes
                          : 'El club rechazo la solicitud anterior. Podes volver a solicitar en otra sede o reintentar mas adelante.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {summary.requiresClubVerification && summary.canCreateRequest && (
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-blue-400" />
                  <h3 className="text-white font-bold text-sm">Elegi un Club</h3>
                </div>
                <div className="space-y-3">
                  {clubs.map(club => (
                    <div key={club.id} className="bg-dark-900 border border-dark-700 rounded-xl p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{club.name}</p>
                        <p className="text-gray-400 text-xs">{club.city}</p>
                        {club.address && (
                          <p className="text-gray-500 text-[11px] truncate mt-1">{club.address}</p>
                        )}
                      </div>
                      <button
                        onClick={() => void handleRequest(club.id)}
                        disabled={submittingClubId === club.id}
                        className="shrink-0 bg-padel-500 hover:bg-padel-400 disabled:bg-dark-700 disabled:text-gray-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                      >
                        {submittingClubId === club.id ? 'Enviando...' : 'Solicitar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.requiresClubVerification && !summary.canCreateRequest && activeRequest && (
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-amber-400" />
                  <h3 className="text-white font-bold text-sm">Solicitud Activa</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  El club <span className="text-white font-bold">{activeRequest.clubName}</span> todavia no resolvio la validacion.
                </p>
              </div>
            )}

            {summary.requests.length > 0 && (
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                <h3 className="text-white font-bold text-sm mb-3">Historial Reciente</h3>
                <div className="space-y-3">
                  {summary.requests.map(request => {
                    const requestStatusUi = statusUi(
                      request.status === 'APPROVED'
                        ? 'VERIFIED'
                        : request.status === 'REJECTED'
                          ? 'REJECTED'
                          : 'PENDING',
                    );

                    return (
                      <div key={request.id} className="bg-dark-900 border border-dark-700 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-white font-bold text-sm">{request.clubName}</p>
                            <p className="text-gray-500 text-[11px]">{request.clubCity}</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${requestStatusUi.badgeClass}`}>
                            {requestStatusUi.label}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs">
                          Solicitado el {new Date(request.requestedAt).toLocaleDateString('es-UY')}
                        </p>
                        {request.reviewNotes && (
                          <p className="text-gray-300 text-sm mt-2">{request.reviewNotes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {summary.requiresClubVerification && clubs.length === 0 && (
              <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4 flex items-start gap-3">
                <div className="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20">
                  <AlertTriangle size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">No hay clubes disponibles</p>
                  <p className="text-gray-400 text-xs">Cuando el catalogo real cargue, vas a poder enviar la solicitud desde aca.</p>
                </div>
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
