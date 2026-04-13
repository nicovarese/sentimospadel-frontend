import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ChevronRight, MapPin, Search, ShieldCheck, Trophy, Zap } from 'lucide-react';
import { Match, MatchType, Club, User } from '../types';
import { backendApi, BackendApiError, type ClubBookingAgendaResponse, type ClubBookingMode } from '../services/backendApi';
import { getBackendClubId } from '../services/tournamentBackendIntegration';
import { Button } from './Button';

interface ClubsBookingViewProps {
  currentUser: User;
  clubs?: Club[];
  onBook?: (match: Match) => void;
  onBack?: () => void;
  preferredClubId?: string | null;
  title?: string;
}

const CLUB_VISUAL_GRADIENTS = [
  'from-[#0f766e] via-[#115e59] to-[#134e4a]',
  'from-[#1d4ed8] via-[#1e40af] to-[#1e3a8a]',
  'from-[#b45309] via-[#92400e] to-[#78350f]',
  'from-[#be123c] via-[#9f1239] to-[#881337]',
];

const getClubVisualGradient = (clubName: string) => {
  const seed = Array.from(clubName).reduce((total, char) => total + char.charCodeAt(0), 0);
  return CLUB_VISUAL_GRADIENTS[seed % CLUB_VISUAL_GRADIENTS.length];
};

const getClubInitials = (clubName: string) =>
  clubName
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('') || 'CL';

const toIsoLocalDate = (date: Date) =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

const buildDateOptions = () => {
  const weekdayFormatter = new Intl.DateTimeFormat('es-UY', { weekday: 'short' });

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    const value = toIsoLocalDate(date);
    const dayLabel = `${date.getDate()}`;

    if (index === 0) {
      return { value, label: 'Hoy', dayLabel };
    }

    if (index === 1) {
      return { value, label: 'Manana', dayLabel };
    }

    const weekday = weekdayFormatter.format(date).replace('.', '');
    return {
      value,
      label: weekday.charAt(0).toUpperCase() + weekday.slice(1),
      dayLabel,
    };
  });
};

const getEffectiveBookingMode = (
  club: Club | null,
  bookingAvailability: ClubBookingAgendaResponse | null,
): ClubBookingMode => bookingAvailability?.bookingMode ?? club?.bookingMode ?? 'UNAVAILABLE';

const getClubCardCopy = (club: Club) => {
  switch (club.bookingMode) {
    case 'CONFIRMATION_REQUIRED':
      return 'Reserva desde la app con confirmacion posterior del club.';
    case 'UNAVAILABLE':
      return 'Este club todavia no toma reservas desde la app, pero ya esta dado de alta.';
    case 'DIRECT':
    default:
      return 'Disponibilidad real de canchas y slots de 90 min.';
  }
};

const getClubActionLabel = (club: Club) => {
  switch (club.bookingMode) {
    case 'CONFIRMATION_REQUIRED':
      return 'Solicitar reserva';
    case 'UNAVAILABLE':
      return 'Ver estado del club';
    case 'DIRECT':
    default:
      return 'Reservar con disponibilidad real';
  }
};

const getSlotStatusLabel = (status: ClubBookingAgendaResponse['courts'][number]['slots'][number]['status']) => {
  switch (status) {
    case 'AVAILABLE':
      return 'Disponible';
    case 'BLOCKED':
      return 'Bloqueado';
    case 'PENDING_CONFIRMATION':
      return 'Pendiente';
    case 'RESERVED':
    default:
      return 'Reservado';
  }
};

export const ClubsBookingView: React.FC<ClubsBookingViewProps> = ({
  currentUser,
  clubs = [],
  onBook,
  onBack,
  preferredClubId,
  title = 'Reservas',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => toIsoLocalDate(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<{
    courtId: number;
    courtName: string;
    time: string;
    hourlyRateUyu: number;
  } | null>(null);
  const [matchType, setMatchType] = useState<MatchType>(MatchType.COMPETITIVE);
  const [bookingAvailability, setBookingAvailability] = useState<ClubBookingAgendaResponse | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const dateOptions = useMemo(() => buildDateOptions(), []);
  const selectedDateOption = dateOptions.find(option => option.value === selectedDate) ?? dateOptions[0];

  const filteredClubs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return clubs;
    }

    return clubs.filter(club =>
      club.name.toLowerCase().includes(normalizedQuery)
      || club.location.toLowerCase().includes(normalizedQuery),
    );
  }, [clubs, searchQuery]);

  useEffect(() => {
    if (!preferredClubId || selectedClub) {
      return;
    }

    const preferredClub = clubs.find(club => club.id === preferredClubId) ?? null;
    if (preferredClub) {
      setSelectedClub(preferredClub);
      setSelectedDate(dateOptions[0]?.value ?? toIsoLocalDate(new Date()));
      setSelectedSlot(null);
      setMatchType(MatchType.COMPETITIVE);
      setBookingAvailability(null);
      setBookingError(null);
    }
  }, [clubs, dateOptions, preferredClubId, selectedClub]);

  useEffect(() => {
    if (!selectedClub) {
      return;
    }

    const backendClubId = getBackendClubId(selectedClub.id);
    const bookingMode = selectedClub.bookingMode ?? 'UNAVAILABLE';
    if (!backendClubId) {
      setBookingAvailability(null);
      setBookingError('Este club todavia no tiene una reserva publica conectada al backend.');
      return;
    }

    if (bookingMode === 'UNAVAILABLE') {
      setBookingAvailability(null);
      setBookingLoading(false);
      setBookingError(null);
      setSelectedSlot(null);
      return;
    }

    let cancelled = false;
    setBookingLoading(true);
    setBookingError(null);
    setSelectedSlot(null);

    backendApi.getClubBookingAvailability(backendClubId, selectedDate)
      .then(response => {
        if (!cancelled) {
          setBookingAvailability(response);
        }
      })
      .catch(error => {
        if (cancelled) {
          return;
        }

        const message = error instanceof BackendApiError && error.message
          ? error.message
          : 'No se pudo cargar la disponibilidad real del club.';
        setBookingAvailability(null);
        setBookingError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setBookingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedClub, selectedDate]);

  const handleBookClick = (club: Club) => {
    setSelectedClub(club);
    setSelectedDate(dateOptions[0]?.value ?? toIsoLocalDate(new Date()));
    setSelectedSlot(null);
    setMatchType(MatchType.COMPETITIVE);
    setBookingAvailability(null);
    setBookingError(null);
  };

  const handleConfirmBooking = () => {
    if (!selectedClub || !selectedSlot || !onBook) {
      return;
    }

    const backendClubId = getBackendClubId(selectedClub.id);
    const bookingMode = getEffectiveBookingMode(selectedClub, bookingAvailability);
    if (!backendClubId) {
      setBookingError('Este club todavia no tiene una reserva publica conectada al backend.');
      return;
    }

    onBook({
      id: `m-${Date.now()}`,
      clubId: selectedClub.id,
      clubName: selectedClub.name,
      backendClubId,
      courtName: selectedSlot.courtName,
      date: `${selectedDate}T00:00:00-03:00`,
      time: selectedSlot.time,
      duration: 90,
      type: matchType,
      pricePerPlayer: Math.round((selectedSlot.hourlyRateUyu * 1.5) / 4),
      currency: 'UYU',
      players: [currentUser, null, null, null],
      maxPlayers: 4,
      levelRange: [1, 7],
      isPrivate: false,
      status: bookingMode === 'CONFIRMATION_REQUIRED' ? 'pending_approval' : 'open',
      pendingPlayerIds: [],
      rejectedPlayerIds: [],
      approvedGuestIds: [],
    });

    setSelectedClub(null);
  };

  if (selectedClub) {
    const bookingMode = getEffectiveBookingMode(selectedClub, bookingAvailability);
    const isUnavailable = bookingMode === 'UNAVAILABLE';
    const requiresConfirmation = bookingMode === 'CONFIRMATION_REQUIRED';

    return (
      <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col animate-fade-in">
        <div className="px-3 py-3 flex items-center gap-3 bg-dark-800 border-b border-dark-700 shrink-0">
          <button
            onClick={() => setSelectedClub(null)}
            className="p-2 rounded-full hover:bg-dark-700 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-200" />
          </button>
          <div>
            <h2 className="text-white font-bold text-base leading-tight">{selectedClub.name}</h2>
            <p className="text-gray-400 text-[10px] flex items-center gap-1">
              <MapPin size={10} /> {selectedClub.location}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 pb-32 space-y-4">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  {isUnavailable ? 'Estado del club' : requiresConfirmation ? 'Reserva con confirmacion' : 'Reserva directa'}
                </p>
                <p className="text-white font-bold text-sm mt-1">
                  {isUnavailable
                    ? 'Este club todavia no habilita reservas en la app.'
                    : requiresConfirmation
                      ? 'La reserva se solicita desde la app y el club la aprueba o rechaza.'
                      : 'Disponibilidad real del club en slots de 90 minutos.'}
                </p>
              </div>
              <ShieldCheck size={18} className="text-padel-400 shrink-0" />
            </div>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">
              {isUnavailable
                ? 'Lo mantenemos visible para medir actividad y seguir conversaciones comerciales con ese club.'
                : requiresConfirmation
                  ? 'La solicitud bloquea el slot dentro de la app hasta que el club responda.'
                  : 'Invitaciones, lobby privado y pagos salen cuando exista backend oficial para esos flujos.'}
            </p>
          </div>

          {!isUnavailable && (
            <>
              <div>
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">Selecciona fecha</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {dateOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedDate(option.value)}
                      className={`min-w-[72px] p-2 rounded-xl flex flex-col items-center gap-0.5 border transition-all ${
                        selectedDate === option.value
                          ? 'bg-padel-600 border-padel-500 text-white shadow-lg'
                          : 'bg-dark-800 border-dark-700 text-gray-400'
                      }`}
                    >
                      <span className="text-[10px] font-medium">{option.label}</span>
                      <span className="text-base font-bold">{option.dayLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Tipo de partido</label>
                <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700">
                  <button
                    onClick={() => setMatchType(MatchType.COMPETITIVE)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      matchType === MatchType.COMPETITIVE ? 'bg-amber-500 text-dark-900 shadow' : 'text-gray-400'
                    }`}
                  >
                    <Trophy size={12} /> Por puntos
                  </button>
                  <button
                    onClick={() => setMatchType(MatchType.FRIENDLY)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      matchType === MatchType.FRIENDLY ? 'bg-blue-500 text-white shadow' : 'text-gray-400'
                    }`}
                  >
                    <Zap size={12} /> Recreativo
                  </button>
                </div>
              </div>
            </>
          )}

          {isUnavailable && (
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-4">
              <h3 className="text-white font-bold text-sm">Reservas no disponibles por ahora</h3>
              <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                El club todavia no publica disponibilidad en la app. Igual lo mantenemos en el catalogo para registrar actividad y seguir el pipeline comercial.
              </p>
            </div>
          )}

          {bookingLoading && (
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-4 text-sm text-gray-300">
              Cargando disponibilidad real...
            </div>
          )}

          {bookingError && (
            <div className="bg-red-500/10 rounded-2xl border border-red-500/30 p-4">
              <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                <AlertCircle size={16} />
                No se pudo cargar la disponibilidad
              </div>
              <p className="text-red-200/80 text-xs mt-2">{bookingError}</p>
            </div>
          )}

          {!isUnavailable && !bookingLoading && !bookingError && bookingAvailability && bookingAvailability.courts.length === 0 && (
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-4">
              <h3 className="text-white font-bold text-sm">Este club no tiene canchas activas</h3>
              <p className="text-gray-400 text-xs mt-1">
                El admin del club necesita configurar al menos una cancha para abrir reservas publicas.
              </p>
            </div>
          )}

          {!isUnavailable && !bookingLoading && !bookingError && bookingAvailability && bookingAvailability.courts.length > 0 && (
            <div className="space-y-3">
              {bookingAvailability.courts.map(court => (
                <div key={court.id} className="bg-dark-800 rounded-2xl border border-dark-700 p-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-white font-bold text-sm">{court.name}</h3>
                      <p className="text-gray-400 text-[11px] mt-1">
                        {`$ ${court.hourlyRateUyu.toLocaleString('es-UY')} / hora`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-[10px] uppercase font-bold">Referencia 90 min</p>
                      <p className="text-white font-bold text-sm">
                        {`$ ${Math.round(court.hourlyRateUyu * 1.5).toLocaleString('es-UY')}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {court.slots.map(slot => {
                      const isAvailable = slot.status === 'AVAILABLE';
                      const isSelected = selectedSlot?.courtId === court.id && selectedSlot?.time === slot.time;

                      return (
                        <button
                          key={`${court.id}-${slot.time}`}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => {
                            if (!isAvailable) {
                              return;
                            }

                            setSelectedSlot({
                              courtId: court.id,
                              courtName: court.name,
                              time: slot.time,
                              hourlyRateUyu: court.hourlyRateUyu,
                            });
                          }}
                          className={`rounded-xl border px-3 py-3 text-left transition-all ${
                            !isAvailable
                              ? 'bg-dark-900 border-dark-800 text-gray-600 cursor-not-allowed opacity-60'
                              : isSelected
                                ? 'bg-padel-600/20 border-padel-500 text-padel-300'
                                : 'bg-dark-900 border-dark-700 text-white hover:border-padel-500/60'
                          }`}
                        >
                          <div className="font-mono text-base font-bold">{slot.time}</div>
                          <div className="text-[10px] uppercase font-bold mt-1">
                            {getSlotStatusLabel(slot.status)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 pb-safe bg-dark-900/95 backdrop-blur-md border-t border-dark-700 z-20">
          <div className="mb-3 bg-dark-800 border border-dark-700 rounded-2xl p-3">
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Resumen</p>
            <p className="text-white font-bold text-sm mt-1">
              {selectedSlot
                ? `${selectedDateOption?.label ?? 'Fecha'} ${selectedDateOption?.dayLabel ?? ''} · ${selectedSlot.courtName} · ${selectedSlot.time}`
                : isUnavailable
                  ? 'Este club esta visible en catalogo pero sin reservas habilitadas'
                  : 'Selecciona una cancha y un horario disponible'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {isUnavailable
                ? 'Todavia no se puede tomar reserva desde la app en este club.'
                : selectedSlot
                  ? `Referencia cancha completa: $ ${Math.round(selectedSlot.hourlyRateUyu * 1.5).toLocaleString('es-UY')} por 90 min`
                  : requiresConfirmation
                    ? 'La solicitud genera un partido real pendiente de aprobacion del club.'
                    : 'La reserva publica hoy crea un partido real de 4 jugadores.'}
            </p>
          </div>
          <Button
            fullWidth
            size="md"
            onClick={handleConfirmBooking}
            disabled={!selectedSlot || isUnavailable}
            className="font-bold shadow-xl shadow-padel-500/20"
          >
            {isUnavailable
              ? 'Reservas no disponibles'
              : requiresConfirmation
                ? 'Solicitar reserva'
                : 'Confirmar reserva'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-dark-700 transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft size={18} className="text-gray-200" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {onBack && (
              <p className="text-gray-400 text-xs mt-1">Elegi club, cancha y horario real desde backend.</p>
            )}
          </div>
        </div>
        <div className="mt-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre o zona..."
            className="w-full bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-colors placeholder:text-dark-700"
          />
        </div>
      </header>

      <div className="space-y-4">
        {clubs.length === 0 && (
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-4">
            <h3 className="text-white font-bold text-base mb-1">No hay clubes disponibles</h3>
            <p className="text-gray-400 text-sm">
              Cuando el backend tenga clubes cargados, apareceran aca para reservar.
            </p>
          </div>
        )}

        {clubs.length > 0 && filteredClubs.length === 0 && (
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-4">
            <h3 className="text-white font-bold text-base mb-1">No encontramos clubes</h3>
            <p className="text-gray-400 text-sm">
              Proba con otro nombre o una zona distinta.
            </p>
          </div>
        )}

        {filteredClubs.map(club => {
          const backendClubId = getBackendClubId(club.id);

          return (
            <div key={club.id} className="bg-dark-800 rounded-2xl overflow-hidden border border-dark-700 group relative">
              <div className="h-28 bg-gray-700 relative">
                {club.image ? (
                  <img src={club.image} alt={club.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getClubVisualGradient(club.name)} flex items-end justify-between px-4 py-3`}>
                    <div>
                      <div className="text-white/80 text-[10px] font-bold uppercase tracking-[0.24em]">Club</div>
                      <div className="text-white font-black text-2xl leading-none">{getClubInitials(club.name)}</div>
                    </div>
                    {club.isIntegrated && (
                      <div className="bg-white/10 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full border border-white/15 uppercase tracking-wide">
                        Integrado
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-white font-bold text-base mb-0.5">{club.name}</h3>
                <p className="text-gray-400 text-xs flex items-center gap-1 mb-1.5">
                  <MapPin size={12} /> {club.location}
                </p>
                <p className="text-gray-500 text-[11px] mb-2.5">
                  {backendClubId
                    ? getClubCardCopy(club)
                    : 'Este club todavia no expone reservas publicas desde backend.'}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    fullWidth
                    onClick={() => handleBookClick(club)}
                    className="text-xs py-2"
                  >
                    {getClubActionLabel(club)}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => backendClubId && handleBookClick(club)}
                    className="px-3 py-2"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
