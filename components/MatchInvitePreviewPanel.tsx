import React from 'react';
import { AlertCircle, Calendar, Clock, MapPin, ShieldCheck, Users } from 'lucide-react';
import type { MatchInvitePreviewResponse } from '../services/backendApi';
import { Button } from './Button';

interface MatchInvitePreviewPanelProps {
  preview: MatchInvitePreviewResponse | null;
  loading?: boolean;
  error?: string | null;
  actionLabel?: string | null;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  actionHint?: string | null;
  onAction?: () => void;
}

const formatInviteStatus = (status: MatchInvitePreviewResponse['status']) => {
  switch (status) {
    case 'OPEN':
      return 'Abierto';
    case 'FULL':
      return 'Completo';
    case 'PENDING_CLUB_CONFIRMATION':
      return 'Pendiente de aprobacion';
    case 'CANCELLED':
      return 'Cancelado';
    case 'RESULT_PENDING':
      return 'Esperando resultado';
    case 'COMPLETED':
      return 'Finalizado';
    default:
      return status;
  }
};

const formatInviteDate = (scheduledAt: string) => {
  const scheduledDate = new Date(scheduledAt);

  return {
    date: scheduledDate.toLocaleDateString('es-UY', {
      day: 'numeric',
      month: 'short',
    }),
    time: scheduledDate.toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
};

export const MatchInvitePreviewPanel: React.FC<MatchInvitePreviewPanelProps> = ({
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
          Resolviendo invitacion al partido...
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

  const { date, time } = formatInviteDate(preview.scheduledAt);
  const occupancyLabel = `${preview.currentPlayerCount}/${preview.maxPlayers} jugadores`;

  return (
    <div className="rounded-3xl border border-padel-500/20 bg-dark-800/80 p-5 shadow-2xl shadow-padel-900/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-padel-400">Invitacion</p>
          <h3 className="mt-2 text-xl font-bold text-white">Sumate a este partido</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            {preview.createdByName} te compartio un link directo para entrar al partido.
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
            <span>{preview.clubName || preview.locationText || 'Partido social'}</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">{preview.courtName}</p>
        </div>

        <div className="rounded-2xl border border-dark-700 bg-dark-900/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Fecha</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-white">
            <Calendar size={13} className="text-padel-400" />
            <span>{date}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <Clock size={12} className="text-gray-500" />
            <span>{time}</span>
          </div>
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
