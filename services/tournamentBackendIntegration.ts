import { Club, Match, MatchType, User } from '../types';
import type {
  ClubResponse,
  CreateTournamentRequest,
  MatchWinnerTeam,
  PlayerProfileResponse,
  SubmitTournamentMatchResultRequest,
  SyncTournamentEntriesRequest,
  TournamentMatchResponse,
  TournamentResponse,
  TournamentStandingsResponse,
} from './backendApi';

const DEFAULT_BACKEND_PLAYER_RATING = 3.5;
const BACKEND_TOURNAMENT_ID_PREFIX = 'backend-tournament-';
const BACKEND_CLUB_ID_PREFIX = 'backend-club-';
const SEEDED_CLUB_DISPLAY_METADATA: Record<string, Pick<Club, 'rating' | 'image' | 'courtsAvailable' | 'isPremium'>> = {
  'Top Padel': {
    rating: 5.0,
    image: 'https://picsum.photos/400/200?random=1',
    courtsAvailable: 8,
    isPremium: true,
  },
  'World Padel': {
    rating: 4.6,
    image: 'https://picsum.photos/400/200?random=2',
    courtsAvailable: 6,
    isPremium: true,
  },
  'Cordon Padel': {
    rating: 4.4,
    image: 'https://picsum.photos/400/200?random=3',
    courtsAvailable: 4,
    isPremium: false,
  },
  Boss: {
    rating: 4.7,
    image: 'https://picsum.photos/400/200?random=4',
    courtsAvailable: 5,
    isPremium: false,
  },
  Reducto: {
    rating: 4.3,
    image: 'https://picsum.photos/400/200?random=5',
    courtsAvailable: 3,
    isPremium: false,
  },
};

const toAvatarUrl = (playerProfileId: number): string =>
  `https://picsum.photos/seed/backend-player-${playerProfileId}/100/100`;

const truncate = (value: string, maxLength: number): string =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;

const toShortDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  if (!day || !month) {
    return isoDate;
  }
  return `${day}/${month}`;
};

const buildDescription = (response: TournamentResponse): string | undefined => {
  if (!response.description?.trim()) {
    return undefined;
  }
  return response.description.trim();
};

const toFrontendTournamentUser = (
  player: { playerProfileId: number; fullName: string; userId?: number },
  currentUser: User,
): User => {
  if (player.playerProfileId === currentUser.backendPlayerProfileId) {
    return currentUser;
  }

  return {
    id: `player-${player.playerProfileId}`,
    backendUserId: player.userId,
    backendPlayerProfileId: player.playerProfileId,
    name: player.fullName,
    avatar: toAvatarUrl(player.playerProfileId),
    level: DEFAULT_BACKEND_PLAYER_RATING,
    hasOfficialRating: false,
    verificationStatus: 'none',
    matchesPlayed: 0,
    reputation: 100,
    isPremium: false,
  };
};

export const buildTournamentClubOptions = (clubs: ClubResponse[]): Club[] =>
  clubs.map(club => {
    const displayMetadata = SEEDED_CLUB_DISPLAY_METADATA[club.name];

    return {
      id: `${BACKEND_CLUB_ID_PREFIX}${club.id}`,
      name: club.name,
      location: club.address || club.city,
      rating: displayMetadata?.rating ?? 4.5,
      image: displayMetadata?.image ?? `https://picsum.photos/seed/backend-club-${club.id}/400/200`,
      courtsAvailable: displayMetadata?.courtsAvailable ?? 4,
      isPremium: displayMetadata?.isPremium ?? club.integrated,
    };
  });

export const buildTournamentSelectablePlayers = (
  profiles: PlayerProfileResponse[],
  currentUser: User,
): User[] => {
  const byProfileId = new Map<string, User>();

  profiles.forEach(profile => {
    const mappedUser = profile.id === currentUser.backendPlayerProfileId
      ? currentUser
      : {
          id: `player-${profile.id}`,
          backendUserId: profile.userId,
          backendPlayerProfileId: profile.id,
          name: profile.fullName,
          avatar: toAvatarUrl(profile.id),
          level: profile.currentRating,
          hasOfficialRating: true,
          verificationStatus: 'none',
          matchesPlayed: profile.matchesPlayed,
          reputation: 100,
          isPremium: false,
        } satisfies User;

    byProfileId.set(String(profile.id), mappedUser);
  });

  if (currentUser.backendPlayerProfileId != null) {
    byProfileId.set(String(currentUser.backendPlayerProfileId), currentUser);
  }

  return Array.from(byProfileId.values()).sort((left, right) => {
    if (left.id === currentUser.id) return -1;
    if (right.id === currentUser.id) return 1;
    return left.name.localeCompare(right.name, 'es');
  });
};

export const getBackendTournamentId = (frontendTournamentId: string): number | null => {
  if (!frontendTournamentId.startsWith(BACKEND_TOURNAMENT_ID_PREFIX)) {
    return null;
  }
  const parsed = Number(frontendTournamentId.slice(BACKEND_TOURNAMENT_ID_PREFIX.length));
  return Number.isFinite(parsed) ? parsed : null;
};

export const getBackendClubId = (frontendClubId: string | null | undefined): number | null => {
  if (!frontendClubId || !frontendClubId.startsWith(BACKEND_CLUB_ID_PREFIX)) {
    return null;
  }
  const parsed = Number(frontendClubId.slice(BACKEND_CLUB_ID_PREFIX.length));
  return Number.isFinite(parsed) ? parsed : null;
};

const toFrontendTournamentStatus = (
  response: TournamentResponse,
  expectedUsers: number,
): string => {
  switch (response.status) {
    case 'OPEN':
      if (expectedUsers > 0 && response.currentPlayersCount >= expectedUsers) {
        return 'Empezar torneo';
      }
      return response.openEnrollment ? 'Inscripciones Abiertas' : 'Inscripciones Cerradas';
    case 'IN_PROGRESS':
      return 'En curso';
    case 'COMPLETED':
      return 'Finalizado';
    case 'CANCELLED':
      return 'Cancelado';
    case 'CLOSED':
      return 'Inscripciones Cerradas';
    case 'DRAFT':
    default:
      return 'Borrador';
  }
};

const toFrontendTournamentFormat = (response: TournamentResponse): 'league' | 'tournament' | 'americano' => {
  if (response.format === 'LEAGUE') {
    return 'league';
  }
  if (response.format === 'AMERICANO') {
    return 'americano';
  }
  return 'tournament';
};

const toFrontendTournamentResult = (
  response: TournamentMatchResponse,
): [number, number][] | undefined => {
  if (!response.result?.sets?.length) {
    return undefined;
  }
  return response.result.sets.map(set => [set.teamOneGames, set.teamTwoGames]);
};

const toFrontendTournamentMatchStatus = (
  response: TournamentMatchResponse,
): Match['status'] => {
  if (response.status === 'COMPLETED') {
    return 'completed';
  }
  if (response.status === 'RESULT_PENDING') {
    return 'awaiting_validation';
  }
  return 'confirmed';
};

const buildDynamicAmericanoEntries = (
  tournamentData: any,
): NonNullable<CreateTournamentRequest['entries']> => {
  const uniquePlayers = new Map<number, User>();

  (tournamentData.teams ?? []).forEach((team: any) => {
    (team.players ?? []).forEach((player: User) => {
      if (typeof player.backendPlayerProfileId === 'number') {
        uniquePlayers.set(player.backendPlayerProfileId, player);
      }
    });
  });

  if (uniquePlayers.size === 0) {
    throw new Error('El Americano dinámico necesita jugadores reales con player profile.');
  }

  return Array.from(uniquePlayers.values()).map(player => ({
    teamName: player.name,
    timePreferences: [],
    members: [{ playerProfileId: player.backendPlayerProfileId as number }],
  }));
};

const buildTournamentEntries = (
  tournamentData: any,
): NonNullable<CreateTournamentRequest['entries']> => {
  if (tournamentData?.format === 'americano' && tournamentData?.americanoType === 'dinamico') {
    return buildDynamicAmericanoEntries(tournamentData);
  }

  return (tournamentData.teams ?? [])
    .filter((team: any) => Array.isArray(team.players) && team.players.length === 2)
    .map((team: any) => {
      const memberIds = team.players
        .map((player: User) => player.backendPlayerProfileId)
        .filter((playerProfileId: number | undefined): playerProfileId is number => typeof playerProfileId === 'number');

      if (memberIds.length !== 2) {
        throw new Error('Todos los equipos del torneo deben usar jugadores reales con player profile.');
      }

      return {
        teamName: team.teamName || null,
        timePreferences: team.preferences ?? [],
        members: memberIds.map(playerProfileId => ({ playerProfileId })),
      };
    });
};

export const buildCreateBackendTournamentRequest = (
  tournamentData: any,
): CreateTournamentRequest => {
  const backendFormat = tournamentData?.format === 'league'
    ? 'LEAGUE'
    : tournamentData?.format === 'tournament'
      ? 'ELIMINATION'
      : 'AMERICANO';

  return {
    name: (tournamentData.name || 'Torneo Relámpago').trim(),
    description: tournamentData.rules?.trim() || null,
    clubId: getBackendClubId(tournamentData.clubId) ?? undefined,
    startDate: tournamentData.startDate,
    endDate: tournamentData.endDate || null,
    format: backendFormat,
    americanoType: backendFormat === 'AMERICANO'
      ? (tournamentData.americanoType === 'dinamico' ? 'DYNAMIC' : 'FIXED')
      : null,
    maxEntries: tournamentData.numTeams ?? undefined,
    openEnrollment: true,
    competitive: tournamentData.isCompetitive !== false,
    leagueRounds: backendFormat === 'LEAGUE' ? 2 : undefined,
    matchesPerParticipant: backendFormat === 'AMERICANO'
      ? (tournamentData.matchesPerParticipant ?? 5)
      : undefined,
    standingsTiebreak: 'GAMES_DIFFERENCE',
    availableCourts: tournamentData.availableCourts ?? undefined,
    courtNames: (tournamentData.courtNames ?? []).filter((courtName: string) => courtName?.trim()),
    entries: buildTournamentEntries(tournamentData),
  };
};

export const buildSyncTournamentEntriesRequest = (tournament: any): SyncTournamentEntriesRequest => ({
  entries: tournament?.format === 'americano' && tournament?.americanoType === 'dinamico'
    ? buildDynamicAmericanoEntries(tournament)
    : (tournament.teams ?? [])
      .filter((team: any) => Array.isArray(team.players) && team.players.length === 2)
      .map((team: any) => {
        const members = team.players
          .map((player: User) => player.backendPlayerProfileId)
          .filter((playerProfileId: number | undefined): playerProfileId is number => typeof playerProfileId === 'number')
          .map(playerProfileId => ({ playerProfileId }));

        if (members.length !== 2) {
          throw new Error('Cada equipo debe tener dos jugadores reales antes de sincronizar.');
        }

        return {
          teamName: team.teamName || null,
          timePreferences: team.preferences ?? [],
          members,
        };
      }),
});

export const buildSubmitTournamentResultRequest = (
  result: [number, number][],
): SubmitTournamentMatchResultRequest => {
  const sets = result.filter(([teamOneGames, teamTwoGames]) => teamOneGames !== teamTwoGames);
  const teamOneSets = sets.filter(([teamOneGames, teamTwoGames]) => teamOneGames > teamTwoGames).length;
  const teamTwoSets = sets.filter(([teamOneGames, teamTwoGames]) => teamTwoGames > teamOneGames).length;

  if (sets.length === 0 || teamOneSets === teamTwoSets) {
    throw new Error('El resultado necesita un ganador claro por sets.');
  }

  return {
    winnerTeam: (teamOneSets > teamTwoSets ? 'TEAM_ONE' : 'TEAM_TWO') as MatchWinnerTeam,
    sets: sets.map(([teamOneGames, teamTwoGames]) => ({
      teamOneGames,
      teamTwoGames,
    })),
  };
};

export const toFrontendTournamentMatches = (
  response: TournamentResponse,
  matches: TournamentMatchResponse[],
  currentUser: User,
  clubLookup: Map<number, ClubResponse>,
): Match[] => {
  const club = response.clubId == null ? null : clubLookup.get(response.clubId) ?? null;
  const clubName = club?.name ?? null;

  return matches.map(match => {
    const players = [
      match.teamOne.members[0] ? toFrontendTournamentUser(match.teamOne.members[0], currentUser) : null,
      match.teamOne.members[1] ? toFrontendTournamentUser(match.teamOne.members[1], currentUser) : null,
      match.teamTwo.members[0] ? toFrontendTournamentUser(match.teamTwo.members[0], currentUser) : null,
      match.teamTwo.members[1] ? toFrontendTournamentUser(match.teamTwo.members[1], currentUser) : null,
    ];

    const scheduledAt = match.scheduledAt ?? `${response.startDate}T00:00:00Z`;

    return {
      id: `backend-tournament-match-${match.id}`,
      backendMatchId: match.id,
      matchSource: 'backend-tournament',
      backendStatus: match.status,
      backendResultStatus: match.result?.status ?? null,
      clubId: response.clubId == null ? 'backend-club-none' : `${BACKEND_CLUB_ID_PREFIX}${response.clubId}`,
      backendClubId: response.clubId,
      clubName,
      locationText: response.city ?? clubName,
      courtName: match.courtName || clubName || response.name,
      date: scheduledAt,
      time: match.scheduledAt
        ? new Date(match.scheduledAt).toLocaleTimeString('es-UY', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : 'A conf.',
      duration: 90,
      type: MatchType.TOURNAMENT,
      pricePerPlayer: 0,
      currency: 'UYU',
      players,
      maxPlayers: 4,
      levelRange: [1, 7],
      isPrivate: true,
      status: toFrontendTournamentMatchStatus(match),
      pendingPlayerIds: [],
      rejectedPlayerIds: [],
      approvedGuestIds: [],
      result: toFrontendTournamentResult(match),
      resultSubmittedBy: match.result == null
        ? undefined
        : match.result.submittedByPlayerProfileId === currentUser.backendPlayerProfileId
          ? currentUser.id
          : `player-${match.result.submittedByPlayerProfileId}`,
      winnerTeam: match.result == null
        ? undefined
        : (match.result.winnerTeam === 'TEAM_ONE' ? 'A' : 'B'),
      isTournamentMatch: true,
      tournamentId: `${BACKEND_TOURNAMENT_ID_PREFIX}${response.id}`,
      round: match.roundLabel,
      team1Name: match.teamOne.teamName,
      team2Name: match.teamTwo.teamName,
      teamsAssigned: true,
      notes: buildDescription(response),
    };
  });
};

export const toFrontendTournament = (
  response: TournamentResponse,
  matches: Match[],
  standings: TournamentStandingsResponse | null,
  currentUser: User,
  clubLookup: Map<number, ClubResponse>,
) => {
  const club = response.clubId == null ? null : clubLookup.get(response.clubId) ?? null;
  const isBackendAmericanoDinamico = response.format === 'AMERICANO' && response.americanoType === 'DYNAMIC';
  const expectedUsers = isBackendAmericanoDinamico
    ? (response.maxEntries ?? response.currentEntriesCount)
    : (response.maxEntries ?? response.currentEntriesCount) * 2;
  const creatorId = response.createdByPlayerProfileId === currentUser.backendPlayerProfileId
    ? currentUser.id
    : `player-${response.createdByPlayerProfileId}`;
  const currentUserEntry = response.entries.find(entry =>
    entry.members.some(member => member.playerProfileId === currentUser.backendPlayerProfileId),
  );
  const currentUserStanding = standings?.standings.find(entry =>
    entry.members.some(member => member.playerProfileId === currentUser.backendPlayerProfileId),
  ) ?? standings?.groups
    ?.flatMap(group => group.standings)
    .find(entry => entry.members.some(member => member.playerProfileId === currentUser.backendPlayerProfileId));

  return {
    id: `${BACKEND_TOURNAMENT_ID_PREFIX}${response.id}`,
    backendTournamentId: response.id,
    isBackendTournament: true,
    creatorId,
    name: response.name,
    description: buildDescription(response),
    startDate: response.startDate,
    endDate: response.endDate,
    dateString: response.endDate
      ? `${toShortDate(response.startDate)} al ${toShortDate(response.endDate)}`
      : toShortDate(response.startDate),
    clubId: response.clubId == null ? null : `${BACKEND_CLUB_ID_PREFIX}${response.clubId}`,
    backendClubId: response.clubId,
    clubName: club?.name || response.city || 'Sede por definir',
    format: toFrontendTournamentFormat(response),
    americanoType: response.americanoType === 'DYNAMIC' ? 'dinamico' : 'fijo',
    isCompetitive: response.competitive,
    numTeams: response.maxEntries ?? response.currentEntriesCount,
    expectedUsers,
    registeredUsers: response.currentPlayersCount,
    status: toFrontendTournamentStatus(response, expectedUsers),
    ranking: currentUserStanding ? `#${currentUserStanding.position}` : '-',
    upcomingMatches: matches.filter(match => match.status !== 'completed').length,
    userTeamName: isBackendAmericanoDinamico
      ? ''
      : currentUserEntry
        ? ` - Equipo: ${currentUserEntry.teamName}`
        : '',
    availableCourts: response.availableCourts,
    courtNames: response.courtNames,
    openEnrollment: response.openEnrollment,
    launchedAt: response.launchedAt,
    backendStatus: response.status,
    leagueRounds: response.leagueRounds,
    matchesPerParticipant: response.matchesPerParticipant ?? undefined,
    teams: response.entries.map(entry => ({
      id: `backend-tournament-entry-${entry.id}`,
      backendTournamentEntryId: entry.id,
      teamName: entry.teamName,
      groupLabel: entry.groupLabel,
      preferences: entry.timePreferences,
      players: entry.members.map(member => toFrontendTournamentUser(member, currentUser)),
      status: entry.status,
    })),
    backendStandings: standings,
  };
};

export const isBackendTournamentMatch = (match: Match): boolean =>
  match.matchSource === 'backend-tournament' && typeof match.backendMatchId === 'number';

export const isTournamentParticipant = (match: Match, currentUser: User): boolean =>
  match.players.some(player => player?.id === currentUser.id);

export const sortMatchesByScheduledDateAsc = (matches: Match[]): Match[] =>
  [...matches].sort((left, right) => {
    const leftDate = new Date(left.date);
    const rightDate = new Date(right.date);
    const [leftHours, leftMinutes] = left.time.split(':').map(Number);
    const [rightHours, rightMinutes] = right.time.split(':').map(Number);
    leftDate.setHours(leftHours || 0, leftMinutes || 0, 0, 0);
    rightDate.setHours(rightHours || 0, rightMinutes || 0, 0, 0);
    return leftDate.getTime() - rightDate.getTime();
  });

export const buildTournamentSummaryLabel = (tournament: any): string =>
  truncate(
    `${tournament.numTeams || 0} Equipos${tournament.userTeamName || ''}`,
    64,
  );
