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
  matchId: number;
  date: string;
  result: 'W' | 'L' | 'N';
  diff: number;
  total: number;
  opponent: string;
  matchCard: Match;
}

const buildFallbackMatch = (entry: RatingHistoryEntryResponse): Match => {
  const score = entry.match?.score;
  const winnerTeam = entry.match?.winnerTeam;
  const result = score ? [[score.teamOneScore, score.teamTwoScore] as [number, number]] : undefined;

  return {
    id: `history-match-${entry.matchId}`,
    backendMatchId: entry.matchId,
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
  const matchById = new Map(
    matches
      .filter(match => typeof match.backendMatchId === 'number')
      .map(match => [match.backendMatchId as number, match]),
  );

  return entries.map(entry => {
    const matchedCard = matchById.get(entry.matchId) ?? buildFallbackMatch(entry);
    const diff = Number(entry.delta);

    return {
      id: entry.id,
      matchId: entry.matchId,
      date: entry.match?.scheduledAt ?? entry.createdAt,
      result: diff > 0 ? 'W' : diff < 0 ? 'L' : 'N',
      diff,
      total: Number(entry.newRating),
      opponent: buildOpponentLabel(matchedCard, currentUser),
      matchCard: matchedCard,
    };
  });
};
