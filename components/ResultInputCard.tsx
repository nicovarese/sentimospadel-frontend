import React, { useState, useEffect } from 'react';
import { Match, User } from '../types';
import { Trophy, CheckCircle, AlertTriangle, ShieldCheck, UserCheck, Calendar, Clock } from 'lucide-react';
import { Button } from './Button';

interface ResultInputCardProps {
  match: Match;
  currentUser: User;
  onSubmit: (matchId: string, result: [number, number][]) => void;
  onConfirm: (matchId: string) => void;
}

export const ResultInputCard: React.FC<ResultInputCardProps> = ({ match, currentUser, onSubmit, onConfirm }) => {
  // Sets: Array of 3 items, each item is [scoreA, scoreB]
  const [sets, setSets] = useState<[string, string][]>([['', ''], ['', ''], ['', '']]);
  const [error, setError] = useState<string | null>(null);

  const teamA = [match.players[0], match.players[1]];
  const teamB = [match.players[2], match.players[3]];

  // Determine user's team logic
  const isUserInTeamA = teamA.some(p => p?.id === currentUser.id);
  
  const isValidationMode = match.status === 'awaiting_validation';
  const isWaitingForOthers = isValidationMode && match.resultSubmittedBy === currentUser.id;

  // Populate state if validating
  useEffect(() => {
    if (match.result && match.result.length > 0) {
      const loadedSets: [string, string][] = [['', ''], ['', ''], ['', '']];
      match.result.forEach((set, index) => {
        if (index < 3) {
          loadedSets[index] = [set[0].toString(), set[1].toString()];
        }
      });
      setSets(loadedSets);
    }
  }, [match.result]);

  const handleScoreChange = (setIndex: number, teamIndex: 0 | 1, value: string) => {
    if (isValidationMode) return; 
    if (value !== '' && !/^\d+$/.test(value)) return;
    
    // Allow higher scores for Americano (e.g. games to 9 or 12)
    const maxScore = match.isAmericano ? 30 : 7;
    if (parseInt(value) > maxScore) return; 

    const newSets = [...sets];
    newSets[setIndex] = [...newSets[setIndex]] as [string, string];
    newSets[setIndex][teamIndex] = value;
    setSets(newSets);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, setIndex: number, teamIndex: 0 | 1) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        // Logic: A1 -> B1 -> A2 -> B2...
        let nextSet = setIndex;
        let nextTeam = teamIndex === 0 ? 1 : 0;
        
        if (teamIndex === 1) {
            nextSet = setIndex + 1;
            nextTeam = 0;
        }

        if (nextSet < 3) {
            const nextId = `score-${nextTeam === 0 ? 'A' : 'B'}-${nextSet}`;
            const nextEl = document.getElementById(nextId);
            if (nextEl) nextEl.focus();
        } else {
            (e.target as HTMLElement).blur();
        }
    }
  };

  const validateAndSubmit = () => {
    const finalResult: [number, number][] = [];
    let totalGamesA = 0;
    let totalGamesB = 0;
    let validSetsCount = 0;

    for (let i = 0; i < 3; i++) {
      const scoreA = parseInt(sets[i][0]);
      const scoreB = parseInt(sets[i][1]);

      if (!isNaN(scoreA) && !isNaN(scoreB)) {
        finalResult.push([scoreA, scoreB]);
        totalGamesA += scoreA;
        totalGamesB += scoreB;
        
        // For non-americano, we still check for ties in sets if they are supposed to be sets
        if (!match.isAmericano && scoreA === scoreB) {
            setError(`Set ${i + 1}: Empate no válido`);
            return;
        }
        validSetsCount++;
      } else {
        if (i === 0) {
             setError("Ingresa al menos el Set 1");
             return;
        }
        break;
      }
    }

    // For Americano, we allow ties in total games if that's the result, 
    // but usually someone wins. The user said "gana el que gana más games".
    if (match.isAmericano && totalGamesA === totalGamesB && validSetsCount > 0) {
        // Optional: allow ties in Americano? The user didn't specify.
        // But "gana el que gana más games" implies a winner is expected.
        // However, in some formats a tie is possible. 
        // Let's allow it for now as it's more flexible.
    }

    onSubmit(match.id, finalResult);
  };

  const renderSimplePlayer = (player: User | null) => {
    if (!player) return null;
    return (
        <div className="flex items-center gap-2 mb-1 last:mb-0">
            <img 
                src={player.avatar} 
                alt={player.name} 
                className="w-5 h-5 rounded-full border border-dark-600 object-cover" 
            />
            <span className="text-[10px] text-gray-300 font-medium truncate max-w-[80px]">
                {player.name.split(' ')[0]}
            </span>
        </div>
    );
  };

  const matchDate = new Date(match.date);
  const formattedDate = matchDate.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });

  // Waiting State (Simpler View)
  if (isWaitingForOthers) {
      return (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-lg p-4 flex items-center justify-center gap-4 animate-pulse h-full">
             <div className="bg-amber-500/10 p-2 rounded-full">
                <Clock size={20} className="text-amber-400" />
            </div>
            <div>
                <h3 className="text-white font-bold text-xs">Esperando Validación</h3>
                <p className="text-gray-500 text-[10px]">El rival debe confirmar el resultado.</p>
            </div>
        </div>
      );
  }

  const headerTitle = isValidationMode ? "VALIDAR RESULTADO" : "INGRESAR RESULTADO";
  const headerColor = isValidationMode ? "text-amber-400" : "text-padel-400";

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-lg relative w-full h-full flex flex-col">
        {/* Compact Header (Matches MatchCard style) */}
        <div className="bg-dark-900/40 px-3 py-2 flex justify-between items-center border-b border-dark-700/30">
            <div className={`flex items-center gap-2 text-[9px] font-bold tracking-wider ${headerColor}`}>
                <Trophy size={10} />
                <span>{headerTitle}</span>
            </div>
            <div className="text-gray-500 text-[9px] font-bold uppercase tracking-wide flex items-center gap-1">
                <Calendar size={10} />
                {formattedDate}
            </div>
        </div>

        <div className="px-3 pt-2 pb-3 flex-1 flex flex-col justify-between">
            <div>
                {/* Set Labels (Aligned with inputs) */}
                <div className="flex justify-end gap-1 mb-1 px-1">
                    <span className="w-8 text-center text-[7px] text-gray-500 font-bold uppercase">Set 1</span>
                    <span className="w-8 text-center text-[7px] text-gray-500 font-bold uppercase">Set 2</span>
                    <span className="w-8 text-center text-[7px] text-gray-500 font-bold uppercase">Set 3</span>
                </div>                {/* Team A Row */}
                <div className="flex justify-between items-center mb-2 bg-dark-900/30 p-1.5 rounded-lg border border-dark-700/30">
                    <div className="flex flex-col justify-center pl-1">
                        {match.team1Name ? (
                            <span className="text-xs text-gray-200 font-bold truncate max-w-[100px]">{match.team1Name}</span>
                        ) : (
                            <>
                                {renderSimplePlayer(teamA[0])}
                                {renderSimplePlayer(teamA[1])}
                            </>
                        )}
                    </div>
                    <div className="flex gap-1">
                        {[0, 1, 2].map((setIdx) => (
                            <input
                                key={`score-A-${setIdx}`}
                                id={`score-A-${setIdx}`}
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={sets[setIdx][0]}
                                onChange={(e) => handleScoreChange(setIdx, 0, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, setIdx, 0)}
                                disabled={isValidationMode}
                                placeholder="-"
                                tabIndex={1 + (setIdx * 2)}
                                className={`w-8 h-7 bg-dark-900 border ${isValidationMode ? 'border-dark-700 text-gray-400' : 'border-dark-600 focus:border-padel-500 text-white'} rounded text-center font-bold text-sm outline-none transition-all`}
                            />
                        ))}
                    </div>
                </div>

                {/* Team B Row */}
                <div className="flex justify-between items-center mb-2 bg-dark-900/30 p-1.5 rounded-lg border border-dark-700/30">
                    <div className="flex flex-col justify-center pl-1">
                        {match.team2Name ? (
                            <span className="text-xs text-gray-200 font-bold truncate max-w-[100px]">{match.team2Name}</span>
                        ) : (
                            <>
                                {renderSimplePlayer(teamB[0])}
                                {renderSimplePlayer(teamB[1])}
                            </>
                        )}
                    </div>
                    <div className="flex gap-1">
                        {[0, 1, 2].map((setIdx) => (
                            <input
                                key={`score-B-${setIdx}`}
                                id={`score-B-${setIdx}`}
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={sets[setIdx][1]}
                                onChange={(e) => handleScoreChange(setIdx, 1, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, setIdx, 1)}
                                disabled={isValidationMode}
                                placeholder="-"
                                tabIndex={2 + (setIdx * 2)}
                                className={`w-8 h-7 bg-dark-900 border ${isValidationMode ? 'border-dark-700 text-gray-400' : 'border-dark-600 focus:border-padel-500 text-white'} rounded text-center font-bold text-sm outline-none transition-all`}
                            />
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-1.5 text-red-400 text-[9px] font-bold mb-2 px-1 animate-pulse">
                        <AlertTriangle size={10} />
                        {error}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
                {isValidationMode ? (
                    <>
                        <Button variant="danger" size="sm" className="flex-1 h-8 text-[10px] rounded-lg" onClick={() => alert("Pendiente")}>
                            Rechazar
                        </Button>
                        <Button fullWidth size="sm" className="flex-[2] h-8 text-[10px] rounded-lg" onClick={() => onConfirm(match.id)}>
                            <ShieldCheck size={12} /> Confirmar
                        </Button>
                    </>
                ) : (
                    <Button fullWidth size="sm" onClick={validateAndSubmit} className="h-8 text-[10px] rounded-lg font-bold bg-padel-600 hover:bg-padel-500">
                        Confirmar Resultado
                    </Button>
                )}
            </div>
        </div>
    </div>
  );
};