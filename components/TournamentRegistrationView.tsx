import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, Search, UserPlus } from 'lucide-react';
import { Button } from './Button';
import { User } from '../types';

type TournamentRegistrationSubmit = {
  teamName: string | null;
  secondaryPlayerProfileId: number | null;
  timePreferences: string[];
};

type TournamentRegistrationViewProps = {
  currentUser: User;
  tournament: any;
  availablePlayers: User[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: TournamentRegistrationSubmit) => void;
};

type TimePreferenceOption = {
  value: string;
  label: string;
};

const BAND_CONFIG = [
  { key: 'MORNING', label: 'Manana', hours: '10:00' },
  { key: 'AFTERNOON', label: 'Tarde', hours: '15:00' },
  { key: 'EVENING', label: 'Noche', hours: '20:00' },
] as const;

const buildTimePreferenceOptions = (startDate?: string | null, endDate?: string | null): TimePreferenceOption[] => {
  if (!startDate) {
    return [];
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${(endDate || startDate)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const formatter = new Intl.DateTimeFormat('es-UY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const options: TimePreferenceOption[] = [];
  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const isoDate = current.toISOString().slice(0, 10);
    const dayLabel = formatter.format(current);
    BAND_CONFIG.forEach(band => {
      options.push({
        value: `${isoDate}|${band.key}`,
        label: `${dayLabel} - ${band.label} (${band.hours})`,
      });
    });
  }
  return options;
};

export const TournamentRegistrationView: React.FC<TournamentRegistrationViewProps> = ({
  currentUser,
  tournament,
  availablePlayers,
  submitting = false,
  onClose,
  onSubmit,
}) => {
  const currentUserTeam = Array.isArray(tournament?.teams)
    ? tournament.teams.find((team: any) =>
        Array.isArray(team.players) && team.players.some((player: User | null) => player?.id === currentUser.id))
    : null;
  const currentPartner = currentUserTeam?.players?.find((player: User | null) => player?.id && player.id !== currentUser.id) ?? null;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<User | null>(currentPartner);
  const [teamName, setTeamName] = useState<string>(currentUserTeam?.teamName || '');
  const [timePreferences, setTimePreferences] = useState<string[]>(currentUserTeam?.preferences ?? []);

  const timeOptions = useMemo(
    () => buildTimePreferenceOptions(tournament?.startDate, tournament?.endDate),
    [tournament?.startDate, tournament?.endDate],
  );

  const occupiedProfileIds = useMemo(() => {
    const ids = new Set<number>();
    (tournament?.teams ?? []).forEach((team: any) => {
      (team?.players ?? []).forEach((player: User | null) => {
        if (typeof player?.backendPlayerProfileId === 'number' && player.id !== currentUser.id && player.id !== currentPartner?.id) {
          ids.add(player.backendPlayerProfileId);
        }
      });
    });
    return ids;
  }, [currentPartner?.id, currentUser.id, tournament?.teams]);

  const selectablePlayers = useMemo(() => {
    const uniquePlayers = Array.from(new Map<string, User>(
      availablePlayers.map(player => [player.id, player] as const),
    ).values());
    return uniquePlayers.filter(player =>
      player.id !== currentUser.id
      && typeof player.backendPlayerProfileId === 'number'
      && !occupiedProfileIds.has(player.backendPlayerProfileId),
    );
  }, [availablePlayers, currentUser.id, occupiedProfileIds]);

  const filteredPlayers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return selectablePlayers.filter(player =>
      (!query || player.name.toLowerCase().includes(query))
      && player.id !== selectedPartner?.id,
    );
  }, [searchQuery, selectablePlayers, selectedPartner?.id]);

  const selectedPreferenceLabels = timeOptions
    .filter(option => timePreferences.includes(option.value))
    .map(option => option.label);

  const togglePreference = (value: string) => {
    setTimePreferences(current =>
      current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value],
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-dark-900 animate-fade-in">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-dark-800 bg-dark-900/90 px-4 py-4 backdrop-blur-md">
        <button onClick={onClose} className="rounded-full p-2 text-gray-300 hover:bg-dark-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">Inscribirme al torneo</h2>
          <p className="text-xs text-gray-500">{tournament?.name}</p>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-28">
        <div className="rounded-2xl border border-dark-700 bg-dark-800/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Tu equipo</p>
          <div className="mt-3 rounded-2xl border border-dark-700 bg-dark-900/70 p-3">
            <div className="flex items-center gap-3">
              <img src={currentUser.avatar} className="h-10 w-10 rounded-full object-cover" />
              <div>
                <p className="text-sm font-bold text-white">{currentUser.name}</p>
                <p className="text-[11px] text-gray-500">Jugador principal</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <UserPlus size={13} /> Companero opcional
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Buscar jugador para sumar a tu equipo..."
                className="w-full rounded-xl border border-dark-700 bg-dark-900 py-3 pl-9 pr-3 text-sm text-white focus:border-padel-500 focus:outline-none"
              />
            </div>

            {selectedPartner && (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-padel-500/30 bg-padel-500/10 p-3">
                <div className="flex items-center gap-3">
                  <img src={selectedPartner.avatar} className="h-9 w-9 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-bold text-white">{selectedPartner.name}</p>
                    <p className="text-[11px] text-gray-400">Companero seleccionado</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPartner(null)}
                  className="text-xs font-bold text-red-300 hover:text-red-200"
                >
                  Quitar
                </button>
              </div>
            )}

            {filteredPlayers.length > 0 && (
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {filteredPlayers.map(player => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartner(player);
                      setSearchQuery('');
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-dark-700 bg-dark-900 px-3 py-2 text-left hover:border-padel-500/40 hover:bg-dark-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={player.avatar} className="h-9 w-9 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-medium text-white">{player.name}</p>
                        <p className="text-[11px] text-gray-500">Disponible para esta inscripcion</p>
                      </div>
                    </div>
                    <CheckCircle size={16} className="text-padel-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-dark-700 bg-dark-800/50 p-4">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Nombre del equipo
          </label>
          <input
            type="text"
            value={teamName}
            onChange={event => setTeamName(event.target.value)}
            placeholder="Opcional. Ej: Dupla Norte"
            className="w-full rounded-xl border border-dark-700 bg-dark-900 px-3 py-3 text-sm text-white focus:border-padel-500 focus:outline-none"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            Si todavia no tenes nombre cerrado, podes entrar igual y completarlo despues mientras el torneo siga abierto.
          </p>
        </div>

        <div className="rounded-2xl border border-dark-700 bg-dark-800/50 p-4">
          <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            <Clock size={13} /> Preferencias horarias
          </label>
          <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
            El backend usa estas preferencias para priorizar grupos y horarios al lanzar el torneo.
          </p>

          {selectedPreferenceLabels.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedPreferenceLabels.map(label => (
                <span key={label} className="rounded-full border border-padel-500/20 bg-padel-500/10 px-3 py-1 text-[11px] text-padel-200">
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-dark-700 bg-dark-900/60 p-2">
            {timeOptions.map(option => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-200 hover:bg-dark-800"
              >
                <input
                  type="checkbox"
                  checked={timePreferences.includes(option.value)}
                  onChange={() => togglePreference(option.value)}
                  className="accent-padel-500"
                />
                <span>{option.label}</span>
              </label>
            ))}
            {timeOptions.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">Defini las fechas del torneo para cargar preferencias.</p>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-dark-800 bg-dark-900/95 p-4 backdrop-blur-md">
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            fullWidth
            onClick={() => onSubmit({
              teamName: teamName.trim() || null,
              secondaryPlayerProfileId: selectedPartner?.backendPlayerProfileId ?? null,
              timePreferences,
            })}
            disabled={submitting}
          >
            {submitting ? 'Guardando...' : 'Confirmar inscripcion'}
          </Button>
        </div>
      </div>
    </div>
  );
};
