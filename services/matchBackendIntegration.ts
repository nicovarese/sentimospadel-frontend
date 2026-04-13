import { Match, MatchType, User } from '../types';
import type {
  AssignMatchTeamsRequest,
  ClubResponse,
  MatchParticipantResponse,
  MatchParticipantTeam,
  MatchResponse,
  MatchResultSummaryResponse,
  MatchWinnerTeam,
  PlayerMatchHistoryEntryResponse,
  SubmitMatchResultRequest,
} from './backendApi';
import { categoryToDisplay, toFrontendVerificationStatus } from './authOnboardingSession';

const DEFAULT_BACKEND_PLAYER_RATING = 3.5;

type BackendMatchLike = MatchResponse | PlayerMatchHistoryEntryResponse;
type BackendMatchSnapshot = BackendMatchLike | (PlayerMatchHistoryEntryResponse & { createdByPlayerProfileId: number });

const toAvatarUrl = (playerProfileId: number): string =>
  `https://picsum.photos/seed/backend-player-${playerProfileId}/100/100`;

const parseLocation = (
  locationText: string | null,
  clubNameFromBackend: string | null,
): { clubName: string | null; courtName: string } => {
  if (locationText?.trim()) {
    const [firstPart, secondPart] = locationText.split(/\s*(?:-|·|•)\s*/, 2);

    if (secondPart?.trim()) {
      return {
        clubName: clubNameFromBackend ?? firstPart.trim(),
        courtName: secondPart.trim(),
      };
    }

    return {
      clubName: clubNameFromBackend,
      courtName: locationText.trim(),
    };
  }

  if (clubNameFromBackend?.trim()) {
    return {
      clubName: clubNameFromBackend.trim(),
      courtName: 'Cancha por definir',
    };
  }

  return {
    clubName: 'Partido social',
    courtName: 'Ubicacion por definir',
  };
};

const toFrontendStatus = (match: BackendMatchLike): Match['status'] => {
  if (match.status === 'CANCELLED') {
    return 'cancelled';
  }

  if (match.status === 'PENDING_CLUB_CONFIRMATION') {
    return 'pending_approval';
  }

  if (match.status === 'COMPLETED') {
    return 'completed';
  }

  if (match.status === 'RESULT_PENDING') {
    return 'awaiting_validation';
  }

  if (match.status === 'FULL') {
    return 'confirmed';
  }

  return 'open';
};

const toResultSubmittedBy = (
  result: MatchResultSummaryResponse | null,
  currentUser: User,
): string | undefined => {
  if (!result) {
    return undefined;
  }

  if (result.submittedByPlayerProfileId === currentUser.backendPlayerProfileId) {
    return currentUser.id;
  }

  return `player-${result.submittedByPlayerProfileId}`;
};

const toFrontendPlayer = (
  participant: MatchParticipantResponse,
  currentUser: User,
): User => {
  if (participant.playerProfileId === currentUser.backendPlayerProfileId) {
    return currentUser;
  }

  const { categoryNumber, categoryName } = categoryToDisplay(participant.currentCategory);
  const hasOfficialRating = participant.currentRating != null;
  const verificationStatus = toFrontendVerificationStatus(
    participant.requiresClubVerification,
    participant.clubVerificationStatus,
  );

  return {
    id: `player-${participant.playerProfileId}`,
    backendUserId: participant.userId,
    backendPlayerProfileId: participant.playerProfileId,
    name: participant.fullName,
    avatar: toAvatarUrl(participant.playerProfileId),
    level: participant.currentRating ?? DEFAULT_BACKEND_PLAYER_RATING,
    hasOfficialRating,
    categoryNumber,
    categoryName,
    publicCategoryNumber: categoryNumber ?? null,
    verificationStatus,
    isCategoryVerified: verificationStatus === 'verified',
    matchesPlayed: participant.matchesPlayed ?? 0,
    reputation: 100,
    isPremium: false,
  };
};

const fillSlot = (
  slots: (User | null)[],
  indexes: number[],
  user: User,
): boolean => {
  for (const index of indexes) {
    if (!slots[index]) {
      slots[index] = user;
      return true;
    }
  }

  return false;
};

const buildPlayers = (
  participants: MatchParticipantResponse[],
  currentUser: User,
): (User | null)[] => {
  const slots: (User | null)[] = [null, null, null, null];

  participants
    .filter(participant => participant.team === 'TEAM_ONE')
    .forEach(participant => {
      fillSlot(slots, [0, 1], toFrontendPlayer(participant, currentUser));
    });

  participants
    .filter(participant => participant.team === 'TEAM_TWO')
    .forEach(participant => {
      fillSlot(slots, [2, 3], toFrontendPlayer(participant, currentUser));
    });

  participants
    .filter(participant => participant.team == null)
    .forEach(participant => {
      fillSlot(slots, [0, 1, 2, 3], toFrontendPlayer(participant, currentUser));
    });

  return slots;
};

const deriveAuthenticatedPlayerTeam = (
  match: BackendMatchLike,
  currentUser: User,
): MatchParticipantTeam | null => {
  if ('authenticatedPlayerTeam' in match) {
    return match.authenticatedPlayerTeam;
  }

  const myParticipant = match.participants.find(
    participant => participant.playerProfileId === currentUser.backendPlayerProfileId,
  );

  return myParticipant?.team ?? null;
};

const deriveAuthenticatedPlayerWon = (
  match: BackendMatchLike,
  authenticatedPlayerTeam: MatchParticipantTeam | null,
): boolean | null => {
  if ('authenticatedPlayerWon' in match) {
    return match.authenticatedPlayerWon;
  }

  if (!authenticatedPlayerTeam || match.result?.status !== 'CONFIRMED') {
    return null;
  }

  return (
    (authenticatedPlayerTeam === 'TEAM_ONE' && match.result.winnerTeam === 'TEAM_ONE')
    || (authenticatedPlayerTeam === 'TEAM_TWO' && match.result.winnerTeam === 'TEAM_TWO')
  );
};

export const buildClubLookup = (clubs: ClubResponse[]): Map<number, ClubResponse> =>
  new Map(clubs.map(club => [club.id, club]));

export const toFrontendMatch = (
  match: BackendMatchSnapshot,
  currentUser: User,
  clubLookup: Map<number, ClubResponse>,
): Match => {
  const club = match.clubId == null ? null : clubLookup.get(match.clubId) ?? null;
  const { clubName, courtName } = parseLocation(match.locationText, club?.name ?? null);
  const players = buildPlayers(match.participants, currentUser);
  const authenticatedPlayerTeam = deriveAuthenticatedPlayerTeam(match, currentUser);
  const authenticatedPlayerWon = deriveAuthenticatedPlayerWon(match, authenticatedPlayerTeam);
  const [teamOnePlayer, teamOnePartner, teamTwoPlayer, teamTwoPartner] = players;

  const teamsAssigned = match.participants.every(participant => participant.team != null);
  const normalizedNotes = match.notes?.toLowerCase() ?? '';
  const matchType = normalizedNotes.includes('recreativo')
    ? MatchType.FRIENDLY
    : MatchType.COMPETITIVE;

  return {
    id: `backend-match-${match.id}`,
    backendMatchId: match.id,
    matchSource: 'backend',
    backendStatus: match.status,
    backendResultStatus: match.result?.status ?? null,
    createdByPlayerProfileId: 'createdByPlayerProfileId' in match ? match.createdByPlayerProfileId : undefined,
    authenticatedPlayerTeam,
    authenticatedPlayerWon,
    teamsAssigned,
    clubId: match.clubId == null ? 'backend-club-none' : `backend-club-${match.clubId}`,
    backendClubId: match.clubId,
    clubName,
    locationText: match.locationText,
    courtName,
    date: match.scheduledAt,
    time: new Date(match.scheduledAt).toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    duration: 90,
    type: matchType,
    pricePerPlayer: 0,
    currency: 'UYU',
    players,
    maxPlayers: 4,
    levelRange: [1, 7],
    isPrivate: false,
    status: toFrontendStatus(match),
    pendingPlayerIds: [],
    rejectedPlayerIds: [],
    approvedGuestIds: [],
    result: match.result == null
      ? undefined
      : [[match.result.score.teamOneScore, match.result.score.teamTwoScore]],
    resultSubmittedBy: toResultSubmittedBy(match.result, currentUser),
    winnerTeam: match.result == null
      ? undefined
      : (match.result.winnerTeam === 'TEAM_ONE' ? 'A' : 'B'),
    notes: match.notes ?? undefined,
    team1Name: teamOnePlayer && teamOnePartner
      ? `${teamOnePlayer.name.split(' ')[0]} & ${teamOnePartner.name.split(' ')[0]}`
      : undefined,
    team2Name: teamTwoPlayer && teamTwoPartner
      ? `${teamTwoPlayer.name.split(' ')[0]} & ${teamTwoPartner.name.split(' ')[0]}`
      : undefined,
  };
};

export const mergeBackendMatches = (
  myMatches: PlayerMatchHistoryEntryResponse[],
  publicMatches: MatchResponse[],
  currentUser: User,
  clubLookup: Map<number, ClubResponse>,
): Match[] => {
  const mergedMatches = new Map<number, BackendMatchSnapshot>();

  publicMatches.forEach(match => {
    mergedMatches.set(match.id, match);
  });

  myMatches.forEach(match => {
    const existingMatch = mergedMatches.get(match.id);

    if (existingMatch && 'createdByPlayerProfileId' in existingMatch) {
      mergedMatches.set(match.id, {
        ...match,
        createdByPlayerProfileId: existingMatch.createdByPlayerProfileId,
      });
      return;
    }

    mergedMatches.set(match.id, match);
  });

  return Array.from(mergedMatches.values()).map(match => toFrontendMatch(match, currentUser, clubLookup));
};

export const mapScopedPlayerMatches = (
  myMatches: PlayerMatchHistoryEntryResponse[],
  publicMatches: MatchResponse[],
  currentUser: User,
  clubLookup: Map<number, ClubResponse>,
): Match[] => {
  const publicMatchesById = new Map(publicMatches.map(match => [match.id, match]));

  return myMatches.map(match => {
    const publicSnapshot = publicMatchesById.get(match.id);
    const enrichedMatch = publicSnapshot == null
      ? match
      : {
          ...match,
          createdByPlayerProfileId: publicSnapshot.createdByPlayerProfileId,
        };

    return toFrontendMatch(enrichedMatch, currentUser, clubLookup);
  });
};

export const isBackendManagedMatch = (match: Match): boolean =>
  match.matchSource === 'backend' && typeof match.backendMatchId === 'number';

export const combineFrontendMatchDateTime = (match: Match): string => {
  const scheduledAt = new Date(match.date);
  const [hours, minutes] = match.time.split(':').map(Number);

  scheduledAt.setHours(hours || 0, minutes || 0, 0, 0);
  return scheduledAt.toISOString();
};

export const buildAutoTeamAssignments = (match: Match): AssignMatchTeamsRequest | null => {
  const assignments = match.players
    .map((player, index) => {
      const playerProfileId = player?.backendPlayerProfileId;

      if (!playerProfileId) {
        return null;
      }

      return {
        playerProfileId,
        team: (index < 2 ? 'TEAM_ONE' : 'TEAM_TWO') as MatchParticipantTeam,
      };
    })
    .filter((assignment): assignment is NonNullable<typeof assignment> => assignment != null);

  if (assignments.length !== 4) {
    return null;
  }

  return { assignments };
};

export const buildSubmitResultRequest = (result: [number, number][]): SubmitMatchResultRequest => {
  const sets = result.filter(([teamOneScore, teamTwoScore]) => teamOneScore !== teamTwoScore);
  const teamOneSets = sets.filter(([teamOneScore, teamTwoScore]) => teamOneScore > teamTwoScore).length;
  const teamTwoSets = sets.filter(([teamOneScore, teamTwoScore]) => teamTwoScore > teamOneScore).length;

  if (sets.length === 0 || teamOneSets === teamTwoSets) {
    throw new Error('El resultado necesita un ganador claro por sets.');
  }

  return {
    winnerTeam: teamOneSets > teamTwoSets ? 'TEAM_ONE' : 'TEAM_TWO',
    score: {
      teamOneScore: teamOneSets,
      teamTwoScore: teamTwoSets,
    },
  };
};

export const isBackendMatchCreator = (match: Match, currentUser: User): boolean =>
  Boolean(
    match.createdByPlayerProfileId
      && currentUser.backendPlayerProfileId
      && match.createdByPlayerProfileId === currentUser.backendPlayerProfileId,
  );
