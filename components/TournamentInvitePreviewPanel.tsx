import React from 'react';
import { AlertCircle, Calendar, Link, MapPin, ShieldCheck, Trophy, Users } from 'lucide-react';
import type { TournamentInvitePreviewResponse } from '../services/backendApi';
import { Button } from './Button';

interface TournamentInvitePreviewPanelProps {
  preview: TournamentInvitePreviewResponse | null;
  loading?: boolean;
  error?: string | null;
  actionLabel?: string | null;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  actionHint?: string | null;
  onAction?: () => void;
}

const formatInviteStatus = (status: TournamentInvitePreviewResponse['status']) => {
  switch (status) {
    case 'OPEN':
      return 'Abierto';
    case 'IN_PROGRESS':
      return 'En curso';
    case 'COMPLETED':
      return 'Finalizado';
    case 'CANCELLED':
      return 'Cancelado';
    case 'CLOSED':
      return 'Inscripciones cerradas';
    case 'DRAFT':
    default:
      return status;
  }
};

const formatInviteFormat = (preview: TournamentInvitePreviewResponse) => {
  if (preview.format === 'LEAGUE') {
    return 'Liga';
  }
  if (preview.format === 'AMERICANO') {
    return 'Americano';
  }
  return 'Eliminatoria';
};

const formatDateRange = (preview: TournamentInvitePreviewResponse) => {
  const start = new Date(`${preview.startDate}T00:00:00`);
  const end = preview.endDate ? new Date(`${preview.endDate}T00:00:00`) : null;
  const formatter = new Intl.DateTimeFormat('es-UY', {
    day: 'numeric',
    month: 'short',
  });

  if (!end) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} al ${formatter.format(end)}`;
};

export const TournamentInvitePreviewPanel: React.FC<TournamentInvitePreviewPanelProps> = ({
  preview,
  loading = false,
  error = null,
  actionLabel = null,
  actionDisabled = false,
  actionLoading = false,
  actionHint = null,
  onAction,
}) => {
  if (loading) {
    return (
      <div className="rounded-3xl border border-dark-700 bg-dark-800/80 p-5">
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-padel-400 border-t-transparent" />
          Resolviendo invitacion al torneo...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
        <div className="flex items-center gap-2 text-red-200 font-bold">
          <AlertCircle size={16} />
          No se pudo abrir el link
        </div>
        <p className="mt-2 text-sm leading-relaxed text-red-100/90">{error}</p>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const occupancyLabel = preview.maxEntries == null
    ? `${preview.currentEntriesCount} equipos`
    : `${preview.currentEntriesCount}/${preview.maxEntries} equipos`;

  return (
    <div className="rounded-3xl border border-padel-500/20 bg-dark-800/80 p-5 shadow-2xl shadow-padel-900/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-padel-400">Invitacion</p>
          <h3 className="mt-2 text-xl font-bold text-white">Sumate a este torneo</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            {preview.creatorName} te compartio un link oficial para entrar a {preview.name}.
          </p>
        </div>
        <div className="rounded-2xl border border-padel-500/20 bg-padel-500/10 p-3 text-padel-300">
          <ShieldCheck size={18} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-dark-700 bg-dark-900/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Sede</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-white">
            <MapPin size={13} className="text-padel-400" />
            <span>{preview.clubName || preview.city || 'Sede por definir'}</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">{formatInviteFormat(preview)}</p>
        </div>

        <div className="rounded-2xl border border-dark-700 bg-dark-900/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Fechas</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-white">
            <Calendar size={13} className="text-padel-400" />
            <span>{formatDateRange(preview)}</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {preview.competitive ? 'Por los puntos de la tabla' : 'Recreativo'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-dark-700 bg-dark-900/60 px-3 py-1 font-bold text-white">
          {formatInviteStatus(preview.status)}
        </span>
        <span className="rounded-full border border-dark-700 bg-dark-900/60 px-3 py-1 text-gray-300 flex items-center gap-1.5">
          <Users size={12} className="text-padel-400" />
          {occupancyLabel}
        </span>
        <span className="rounded-full border border-dark-700 bg-dark-900/60 px-3 py-1 text-gray-300 flex items-center gap-1.5">
          <Trophy size={12} className="text-padel-400" />
          {preview.openEnrollment ? 'Inscripcion abierta' : 'Inscripcion cerrada'}
        </span>
      </div>

      {preview.categoryLabels.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dark-700 bg-dark-900/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Categorias</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {preview.categoryLabels.map(categoryLabel => (
              <span
                key={categoryLabel}
                className="rounded-full border border-dark-700 bg-dark-800 px-3 py-1 text-[11px] text-gray-200"
              >
                {categoryLabel}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-dark-700 bg-dark-900/60 p-3 text-xs text-gray-400">
        <Link size={13} className="mt-0.5 shrink-0 text-padel-400" />
        <p>
          El link abre la inscripcion oficial. Si el formato es por dupla, podes sumar companero, nombre de equipo y preferencias horarias antes del launch.
        </p>
      </div>

      {(actionLabel || actionHint) && (
        <div className="mt-5 space-y-3">
          {actionLabel && onAction && (
            <Button
              type="button"
              fullWidth
              onClick={onAction}
              disabled={actionDisabled || actionLoading}
              className="font-bold"
            >
              {actionLoading ? 'Procesando...' : actionLabel}
            </Button>
          )}
          {actionHint && (
            <p className="text-xs leading-relaxed text-gray-400">{actionHint}</p>
          )}
        </div>
      )}
    </div>
  );
};
