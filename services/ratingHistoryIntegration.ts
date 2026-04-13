import { Match, User } from '../types';
import type { RankingEntryResponse, RatingHistoryEntryResponse } from './backendApi';
import { categoryToDisplay } from './authOnboardingSession';

const toAvatarUrl = (playerProfileId: number): string =>
  `https://picsum.photos/seed/ranking-player-${playerProfileId}/100/100`;

const toShortCategory = (categoryNumber?: number): string =>
  categoryNumber ? `${categoryNumber}ª` : '-';

const toCityBadge = (city?: string | null): string =>
  city?.trim() ? city.trim().slice(0, 3).toUpperCase() : '-';

export interface FrontendRankingRow {
  rank: number;
  playerProfileId: number;
  name: string;
  avatar: string;
  rating: string;
  ratedMatchesCount: number;
  categoryLabel: string;
  cityBadge: string;
  cityName: string | null;
}

export interface FrontendRatingHistoryPoint {
  id: number;
  matchId: number | null;
  tournamentMatchId?: number | null;
  date: string;
  result: 'W' | 'L' | 'N';
  diff: number;
  total: number;
  opponent: string;
  matchCard: Match;
}

const buildFallbackSocialMatch = (entry: RatingHistoryEntryResponse): Match => {
  const score = entry.match?.score;
  const winnerTeam = entry.match?.winnerTeam;
  const result = score ? [[score.teamOneScore, score.teamTwoScore] as [number, number]] : undefined;

  return {
    id: `history-match-${entry.matchId ?? entry.id}`,
    backendMatchId: entry.matchId ?? undefined,
    matchSource: 'backend',
    backendStatus: entry.match?.matchStatus ?? 'COMPLETED',
    backendResultStatus: entry.match?.winnerTeam ? 'CONFIRMED' : null,
    clubId: 'backend-club-none',
    courtName: 'Partido puntuado',
    date: entry.match?.scheduledAt ?? entry.createdAt,
    time: new Date(entry.match?.scheduledAt ?? entry.createdAt).toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    duration: 90,
    type: 'Por los Puntos' as Match['type'],
    pricePerPlayer: 0,
    currency: 'UYU',
    players: [null, null, null, null],
    maxPlayers: 4,
    levelRange: [1, 7],
    isPrivate: false,
    status: entry.match?.matchStatus === 'COMPLETED' ? 'completed' : 'awaiting_result',
    pendingPlayerIds: [],
    rejectedPlayerIds: [],
    approvedGuestIds: [],
    result,
    winnerTeam: winnerTeam == null ? undefined : winnerTeam === 'TEAM_ONE' ? 'A' : 'B',
    notes: 'Partido puntuado',
  };
};

const toTournamentHistoryUser = (
  player: { playerProfileId: number; fullName: string; userId: number },
): User => ({
  id: `player-${player.playerProfileId}`,
  backendUserId: player.userId,
  backendPlayerProfileId: player.playerProfileId,
  name: player.fullName,
  avatar: toAvatarUrl(player.playerProfileId),
  level: 0,
  hasOfficialRating: false,
  verificationStatus: 'none',
  matchesPlayed: 0,
  reputation: 100,
  isPremium: false,
});

const buildFallbackTournamentMatch = (entry: RatingHistoryEntryResponse): Match => {
  const summary = entry.tournamentMatch;
  const score = summary?.score;
  const result = score ? [[score.teamOneScore, score.teamTwoScore] as [number, number]] : undefined;
  const players = summary
    ? [
        summary.teamOne.members[0] ? toTournamentHistoryUser(summary.teamOne.members[0]) : null,
        summary.teamOne.members[1] ? toTournamentHistoryUser(summary.teamOne.members[1]) : null,
        summary.teamTwo.members[0] ? toTournamentHistoryUser(summary.teamTwo.members[0]) : null,
        summary.teamTwo.members[1] ? toTournamentHistoryUser(summary.teamTwo.members[1]) : null,
      ]
    : [null, null, null, null];

  return {
    id: `history-tournament-match-${entry.tournamentMatchId ?? entry.id}`,
    backendMatchId: entry.tournamentMatchId ?? undefined,
    matchSource: 'backend-tournament',
    backendStatus: summary?.matchStatus ?? 'COMPLETED',
    backendResultStatus: summary?.winnerTeam ? 'CONFIRMED' : null,
    clubId: 'backend-club-none',
    courtName: summary?.roundLabel || 'Cruce de torneo',
    date: summary?.scheduledAt ?? entry.createdAt,
    time: new Date(summary?.scheduledAt ?? entry.createdAt).toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    duration: 90,
    type: 'Torneo' as Match['type'],
    pricePerPlayer: 0,
    currency: 'UYU',
    players,
    maxPlayers: 4,
    levelRange: [1, 7],
    isPrivate: true,
    status: summary?.matchStatus === 'COMPLETED' ? 'completed' : 'awaiting_result',
    pendingPlayerIds: [],
    rejectedPlayerIds: [],
    approvedGuestIds: [],
    result,
    winnerTeam: summary?.winnerTeam == null ? undefined : summary.winnerTeam === 'TEAM_ONE' ? 'A' : 'B',
    isTournamentMatch: true,
    round: summary?.roundLabel,
    team1Name: summary?.teamOne.teamName,
    team2Name: summary?.teamTwo.teamName,
    teamsAssigned: true,
    notes: summary ? `${summary.tournamentName} · Rating oficial` : 'Cruce de torneo',
  };
};

const buildFallbackMatch = (entry: RatingHistoryEntryResponse): Match =>
  entry.sourceType === 'TOURNAMENT_MATCH'
    ? buildFallbackTournamentMatch(entry)
    : buildFallbackSocialMatch(entry);

const buildOpponentLabel = (match: Match, currentUser: User): string => {
  const currentPlayerIndex = match.players.findIndex(player => player?.id === currentUser.id);

  if (currentPlayerIndex === -1) {
    return `Partido #${match.backendMatchId ?? match.id}`;
  }

  const opponentIndexes = currentPlayerIndex < 2 ? [2, 3] : [0, 1];
  const opponentNames = opponentIndexes
    .map(index => match.players[index]?.name?.split(' ')[0])
    .filter((name): name is string => Boolean(name));

  if (opponentNames.length === 0) {
    return `Partido #${match.backendMatchId ?? match.id}`;
  }

  return opponentNames.join(' / ');
};

const buildTournamentOpponentLabel = (
  entry: RatingHistoryEntryResponse,
  currentUser: User,
): string => {
  const summary = entry.tournamentMatch;
  if (!summary) {
    return `Cruce #${entry.tournamentMatchId ?? entry.id}`;
  }

  const currentProfileId = currentUser.backendPlayerProfileId;
  const isTeamOne = currentProfileId != null && summary.teamOne.members.some(member => member.playerProfileId === currentProfileId);
  const isTeamTwo = currentProfileId != null && summary.teamTwo.members.some(member => member.playerProfileId === currentProfileId);

  if (isTeamOne) {
    return summary.teamTwo.teamName;
  }
  if (isTeamTwo) {
    return summary.teamOne.teamName;
  }

  return `${summary.teamOne.teamName} vs ${summary.teamTwo.teamName}`;
};

export const mapRankingRows = (entries: RankingEntryResponse[]): FrontendRankingRow[] =>
  entries.map(entry => {
    const { categoryNumber } = categoryToDisplay(entry.currentCategory);

    return {
      rank: entry.position,
      playerProfileId: entry.playerProfileId,
      name: entry.fullName,
      avatar: toAvatarUrl(entry.playerProfileId),
      rating: Number(entry.currentRating).toFixed(2),
      ratedMatchesCount: entry.ratedMatchesCount,
      categoryLabel: toShortCategory(categoryNumber),
      cityBadge: toCityBadge(entry.city),
      cityName: entry.city,
    };
  });

export const findRankingPosition = (
  entries: RankingEntryResponse[],
  currentUser: User,
): number | null => {
  if (!currentUser.backendPlayerProfileId) {
    return null;
  }

  const entry = entries.find(item => item.playerProfileId === currentUser.backendPlayerProfileId);
  return entry?.position ?? null;
};

export const mapRatingHistory = (
  entries: RatingHistoryEntryResponse[],
  matches: Match[],
  currentUser: User,
): FrontendRatingHistoryPoint[] => {
  const socialMatchById = new Map(
    matches
      .filter(match => match.matchSource === 'backend' && typeof match.backendMatchId === 'number')
      .map(match => [match.backendMatchId as number, match]),
  );
  const tournamentMatchById = new Map(
    matches
      .filter(match => match.matchSource === 'backend-tournament' && typeof match.backendMatchId === 'number')
      .map(match => [match.backendMatchId as number, match]),
  );

  return entries.map(entry => {
    const matchedCard = entry.sourceType === 'TOURNAMENT_MATCH'
      ? tournamentMatchById.get(entry.tournamentMatchId ?? -1) ?? buildFallbackMatch(entry)
      : socialMatchById.get(entry.matchId ?? -1) ?? buildFallbackMatch(entry);
    const diff = Number(entry.delta);
    const opponent = entry.sourceType === 'TOURNAMENT_MATCH'
      ? buildTournamentOpponentLabel(entry, currentUser)
      : buildOpponentLabel(matchedCard, currentUser);

    return {
      id: entry.id,
      matchId: entry.matchId,
      tournamentMatchId: entry.tournamentMatchId,
      date: entry.tournamentMatch?.scheduledAt ?? entry.match?.scheduledAt ?? entry.createdAt,
      result: diff > 0 ? 'W' : diff < 0 ? 'L' : 'N',
      diff,
      total: Number(entry.newRating),
      opponent,
      matchCard: matchedCard,
    };
  });
};
