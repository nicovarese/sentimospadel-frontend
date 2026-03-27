import React, { useState } from 'react';
import { Match, User, MatchType } from '../types';
import { Clock, MapPin, Users, Zap, ShieldCheck, Trophy, BadgeCheck, CircleDashed, SlidersHorizontal, AlertTriangle, Calendar, Plus } from 'lucide-react';
import { analyzeMatchFit } from '../services/geminiService';

interface MatchCardProps {
  match: Match;
  currentUser: User;
  clubName: string;
  onJoin?: (id: string, slotIndex: number) => void;
  onRequest?: (id: string) => void;
  onLeave?: (id: string) => void;
  onCancel?: (id: string) => void;
  onUserClick?: (user: User) => void;
  onAddResult?: (match: Match) => void;
  className?: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, currentUser, clubName, onJoin, onRequest, onLeave, onCancel, onUserClick, onAddResult, className = '' }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Teams Logic: Team A (Indices 0, 1), Team B (Indices 2, 3)
  const teamA = [match.players[0], match.players[1]];
  const teamB = [match.players[2], match.players[3]];

  // Calculate missing players (count nulls)
  const filledSpots = match.players.filter(p => p !== null).length;
  const isFilled = filledSpots === match.maxPlayers;

  // Level Logic
  const [minLevel, maxLevel] = match.levelRange;
  const userLevel = currentUser.level;
  const isLevelFit = userLevel >= minLevel && userLevel <= maxLevel;
  
  // Status & Permission Logic
  const isPending = match.pendingPlayerIds?.includes(currentUser.id);
  const isRejected = match.rejectedPlayerIds?.includes(currentUser.id);
  const isApprovedGuest = match.approvedGuestIds?.includes(currentUser.id);
  const isJoined = match.players.some(p => p?.id === currentUser.id);
  const isLockedMatchStatus = ['completed', 'awaiting_result', 'awaiting_validation', 'cancelled'].includes(match.status);
  const isBackendSocialMatch = match.matchSource === 'backend' && !match.isTournamentMatch;
  const isMatchCreator = currentUser.backendPlayerProfileId != null
    && match.createdByPlayerProfileId === currentUser.backendPlayerProfileId;
  const canLeaveBackendMatch = isBackendSocialMatch && isJoined && !isMatchCreator && !isLockedMatchStatus;
  const canCancelBackendMatch = isBackendSocialMatch && isMatchCreator && !isLockedMatchStatus;

  const canPickSlot = !isLockedMatchStatus && !isJoined && !isFilled && (isApprovedGuest || isLevelFit) && !match.isTournamentMatch;

  // Type Logic & Styling
  const isCompetitive = match.type === MatchType.COMPETITIVE;
  const isTournament = match.type === MatchType.TOURNAMENT;
  
  let typeLabel = 'RECREATIVO';
  let typeColor = 'text-blue-300';
  let TypeIcon = Zap;

  if (isCompetitive) {
      typeLabel = 'POR LOS PUNTOS';
      typeColor = 'text-amber-400';
      TypeIcon = Trophy;
  } else if (isTournament) {
      typeLabel = 'TORNEO';
      typeColor = 'text-purple-400';
      TypeIcon = Trophy;
  }

  // Level Badge Styling
  const levelColor = (isLevelFit || isApprovedGuest) ? 'text-gray-300' : 'text-orange-400';

  // ELO Calculation Mock
  const calculateExpectedElo = () => {
      if (match.matchSource && match.matchSource !== 'local') return null;
      if (!isFilled) return null;
      return isCompetitive ? 12 : 0;
  };
  const potentialElo = calculateExpectedElo();

  const handleAnalyze = async () => {
    if (analysis) return;
    setLoadingAnalysis(true);
    const activePlayers = match.players.filter((p): p is User => p !== null);
    const result = await analyzeMatchFit(currentUser, match, activePlayers);
    setAnalysis(result);
    setLoadingAnalysis(false);
  };

  const handleMainAction = () => {
      if (onAddResult && (match.status === 'awaiting_result' || match.status === 'awaiting_validation')) {
          onAddResult(match);
          return;
      }
      if (canCancelBackendMatch && onCancel) {
          onCancel(match.id);
          return;
      }
      if (canLeaveBackendMatch && onLeave) {
          onLeave(match.id);
          return;
      }
      if (isJoined) return;
      if (canPickSlot) return; 
      if (onRequest) onRequest(match.id);
  };

  const renderPlayer = (player: User | null | undefined, index: number, alignRight: boolean = false) => {
      if (!player) {
          if (canPickSlot) {
              return (
                <button 
                    onClick={() => onJoin && onJoin(match.id, index)}
                    className={`flex items-center gap-2 group ${alignRight ? 'flex-row-reverse text-right' : ''}`}
                >
                    <div className="w-7 h-7 rounded-full bg-padel-600/20 border border-padel-500/50 border-dashed flex items-center justify-center group-hover:bg-padel-500 group-hover:text-dark-900 transition-all text-padel-400">
                        <Plus size={14} />
                    </div>
                    <div>
                        <p className="text-padel-400 text-[10px] font-bold leading-tight group-hover:text-padel-300 uppercase tracking-wide">Unirse</p>
                    </div>
                </button>
              );
          }

          return (
              <div className={`flex items-center gap-2 ${alignRight ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-dark-700 border border-dark-600 border-dashed flex items-center justify-center">
                      <CircleDashed size={12} className="text-gray-600" />
                  </div>
                  <div>
                      <p className="text-gray-600 text-[10px] italic">{match.isTournamentMatch ? 'Por definirse' : 'Disponible'}</p>
                  </div>
              </div>
          );
      }
      return (
        <div 
            className={`flex items-center gap-2 ${alignRight ? 'flex-row-reverse text-right' : ''} ${onUserClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={() => onUserClick && onUserClick(player)}
        >
            <div className="relative">
                <img src={player.avatar} alt={player.name} className="w-7 h-7 rounded-full border border-dark-600 object-cover" />
                <div className="absolute -bottom-1 -right-1 bg-dark-900 text-[7px] px-1 rounded border border-dark-700 text-gray-300">
                    {player.level.toFixed(2)}
                </div>
            </div>
            <div className="flex flex-col justify-center">
                <p className="text-gray-200 text-[11px] font-bold leading-none">
                    {player.name.split(' ')[0]}
                </p>
                {player.categoryNumber && player.categoryNumber <= 2 && player.verificationStatus !== 'verified' ? (
                    <p className="text-amber-500 text-[8px] mt-0.5 leading-none font-bold">{player.categoryNumber}ª · Pendiente</p>
                ) : (
                    isCompetitive && player.hasOfficialRating !== false && <p className="text-gray-500 text-[9px] mt-0.5 leading-none">Rating: {player.level.toFixed(2)}</p>
                )}
            </div>
        </div>
      );
  };

  const matchDate = new Date(match.date);
  const formattedDate = matchDate.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });

  // Button State Logic
  let mainButtonText = 'Unirse';
  let mainButtonDisabled = false;
  let mainButtonStyle = 'bg-padel-600 hover:bg-padel-500 text-white shadow-lg shadow-padel-900/50';

  if (match.status === 'cancelled') {
      mainButtonText = 'Cancelado';
      mainButtonDisabled = true;
      mainButtonStyle = 'bg-dark-700 text-gray-500 cursor-not-allowed border border-dark-600';
  } else if (onAddResult && (match.status === 'awaiting_result' || match.status === 'awaiting_validation')) {
      if (match.isTournamentMatch && match.players.every(p => p === null)) {
          mainButtonText = 'Equipos por definirse';
          mainButtonDisabled = true;
          mainButtonStyle = 'bg-dark-700 text-gray-500 cursor-not-allowed border border-dark-600';
      } else {
          mainButtonText = match.status === 'awaiting_validation' ? 'Validar Resultado' : 'Agregar Resultado';
          mainButtonDisabled = false;
          mainButtonStyle = 'bg-padel-600 hover:bg-padel-500 text-white shadow-lg shadow-padel-900/50';
      }
  } else if (canCancelBackendMatch) {
      mainButtonText = 'Cancelar';
      mainButtonDisabled = false;
      mainButtonStyle = 'bg-red-500 hover:bg-red-600 text-white';
  } else if (canLeaveBackendMatch) {
      mainButtonText = 'Salir';
      mainButtonDisabled = false;
      mainButtonStyle = 'bg-dark-700 hover:bg-dark-600 text-white border border-dark-600';
  } else if (isJoined) {
      mainButtonText = 'Confirmado';
      mainButtonDisabled = true;
      mainButtonStyle = 'bg-dark-700 text-green-400 border border-green-900/50';
  } else if (isFilled) {
      mainButtonText = 'Completo';
      mainButtonDisabled = true;
      mainButtonStyle = 'bg-dark-700 text-gray-500 cursor-not-allowed border border-dark-600';
  } else if (isRejected) {
      mainButtonText = 'Denegado';
      mainButtonDisabled = true;
      mainButtonStyle = 'bg-red-900/20 text-red-500 border border-red-900/50 cursor-not-allowed';
  } else if (isPending) {
      mainButtonText = 'Pendiente...';
      mainButtonDisabled = true;
      mainButtonStyle = 'bg-amber-900/20 text-amber-500 border border-amber-900/50 cursor-not-allowed animate-pulse';
  } else if (!isLevelFit && !isApprovedGuest) {
      mainButtonText = 'Solicitar';
      mainButtonStyle = 'bg-dark-700 hover:bg-dark-600 text-orange-400 border border-orange-500/30';
  }

  if (canPickSlot) {
      mainButtonText = 'Elige lugar';
      mainButtonDisabled = true; 
      mainButtonStyle = 'bg-dark-700 text-padel-400 border border-padel-500/30 border-dashed';
  }

  const defaultClasses = "bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-lg relative";
  const finalClasses = className ? `${defaultClasses} ${className}` : `${defaultClasses} mb-3`;

  return (
    <div className={finalClasses}>
        {/* Compact Header: One line for everything */}
        <div className="bg-dark-900/40 px-3 py-2 flex justify-between items-center border-b border-dark-700/30">
            <div className="flex items-center gap-2 text-[9px] font-bold">
                {/* Removed tracking-wider to accommodate "POR LOS PUNTOS" better */}
                <span className={`${typeColor} flex items-center gap-1 whitespace-nowrap`}>
                    <TypeIcon size={10} />
                    {typeLabel}
                </span>
                <span className="text-dark-600">|</span>
                <span className={`${levelColor} flex items-center gap-1 whitespace-nowrap`}>
                     {!isLevelFit && !isApprovedGuest && <AlertTriangle size={10} />}
                     NVL {minLevel}-{maxLevel}
                </span>
            </div>
            <div className="text-gray-500 text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 whitespace-nowrap">
                <Calendar size={10} />
                {formattedDate} • {match.time}
            </div>
        </div>

        {/* The Pitch (Players) - Reduced padding */}
        <div className="px-3 py-3 relative">
             {/* Center VS Line */}
             <div className="absolute left-1/2 top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-dark-700 to-transparent transform -translate-x-1/2"></div>
            
            <div className="flex justify-between items-center relative z-10">
                {/* Team A */}
                <div className="flex-1 space-y-2 pr-1">
                    {match.team1Name && <div className="text-xs font-bold text-gray-300 mb-1">{match.team1Name}</div>}
                    {renderPlayer(teamA[0], 0)}
                    {renderPlayer(teamA[1], 1)}
                </div>

                {/* VS Badge / Points / Result */}
                <div className="shrink-0 mx-1 flex flex-col items-center justify-center">
                    {match.status === 'completed' && match.result ? (
                        <div className="flex flex-col items-center gap-0.5">
                            {match.result.map((set, i) => (
                                <span key={i} className="text-[10px] font-black text-white bg-dark-900/80 px-1.5 py-0.5 rounded border border-dark-600">
                                    {set[0]} - {set[1]}
                                </span>
                            ))}
                        </div>
                    ) : isFilled && potentialElo !== null && potentialElo > 0 ? (
                         <span className="text-[9px] font-black text-padel-500 italic">+{potentialElo}</span>
                    ) : (
                        <span className="text-dark-600 font-black text-[9px] italic">VS</span>
                    )}
                </div>

                {/* Team B */}
                <div className="flex-1 space-y-2 pl-1">
                    {match.team2Name && <div className="text-xs font-bold text-gray-300 mb-1 text-right">{match.team2Name}</div>}
                    {renderPlayer(teamB[0], 2, true)}
                    {renderPlayer(teamB[1], 3, true)}
                </div>
            </div>
        </div>

        {/* Footer: One line location + Actions */}
        <div className="px-3 pb-3 pt-0">
             {/* Combined Location & Price Line */}
             <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5 overflow-hidden text-[10px] text-gray-400">
                    <MapPin size={10} className="shrink-0 text-gray-500"/>
                    <span className="truncate max-w-[160px]">
                        <span className="text-gray-300 font-semibold">{match.clubName || clubName}</span>
                        <span className="mx-1 text-dark-600">•</span>
                        {match.courtName}
                    </span>
                </div>
                <div className="text-[10px] font-bold text-gray-300 whitespace-nowrap pl-2">
                    {match.currency} {match.pricePerPlayer}
                </div>
             </div>

            <div className="flex gap-2 h-8">
                <button 
                    disabled={mainButtonDisabled}
                    onClick={handleMainAction}
                    className={`flex-1 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center justify-center ${mainButtonStyle}`}
                >
                    {mainButtonText}
                </button>
                <button 
                    onClick={handleAnalyze}
                    className="w-8 flex items-center justify-center bg-dark-700 hover:bg-dark-600 rounded-lg text-padel-400 border border-dark-600 transition-colors"
                >
                    {loadingAnalysis ? <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full"/> : <ShieldCheck size={14} />}
                </button>
            </div>
             {analysis && (
                <div className="mt-2 p-2 bg-indigo-900/30 border border-indigo-500/30 rounded-lg animate-fade-in relative z-10">
                    <p className="text-[10px] text-indigo-100 italic leading-snug">"{analysis}"</p>
                </div>
            )}
        </div>
    </div>
  );
};
