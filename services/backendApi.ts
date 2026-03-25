export type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';
export type UruguayCategory = 'PRIMERA' | 'SEGUNDA' | 'TERCERA' | 'CUARTA' | 'QUINTA' | 'SEXTA' | 'SEPTIMA';
export type ClubVerificationStatus = 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type MatchStatus = 'OPEN' | 'FULL' | 'CANCELLED' | 'RESULT_PENDING' | 'COMPLETED';
export type MatchParticipantTeam = 'TEAM_ONE' | 'TEAM_TWO';
export type MatchResultStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';
export type MatchWinnerTeam = 'TEAM_ONE' | 'TEAM_TWO';
export type MyMatchesScope = 'upcoming' | 'completed' | 'cancelled' | 'pending_result';
export type TournamentStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TournamentFormat = 'LEAGUE' | 'ELIMINATION' | 'AMERICANO';
export type TournamentAmericanoType = 'FIXED' | 'DYNAMIC';
export type TournamentStandingsTiebreak = 'SETS_DIFFERENCE' | 'GAMES_DIFFERENCE';
export type TournamentEntryStatus = 'PENDING' | 'CONFIRMED';
export type TournamentMatchStatus = 'SCHEDULED' | 'RESULT_PENDING' | 'COMPLETED';
export type TournamentMatchPhase = 'LEAGUE' | 'GROUP_STAGE' | 'QUARTERFINAL' | 'SEMIFINAL' | 'FINAL';
export type TournamentMatchResultStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  id: number;
  email: string;
  role: string;
  status: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUserResponse {
  id: number;
  email: string;
  role: string;
  status: string;
}

export interface InitialSurveyRequest {
  q1: AnswerOption;
  q2: AnswerOption;
  q3: AnswerOption;
  q4: AnswerOption;
  q5: AnswerOption;
  q6: AnswerOption;
  q7: AnswerOption;
  q8: AnswerOption;
  q9: AnswerOption;
  q10: AnswerOption;
}

export interface InitialSurveyResponse extends InitialSurveyRequest {
  id: number;
  surveyVersion: number;
  weightedScore: number;
  normalizedScore: number;
  initialRating: number;
  estimatedCategory: UruguayCategory;
  requiresClubVerification: boolean;
  clubVerificationStatus: ClubVerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatchScore {
  teamOneScore: number;
  teamTwoScore: number;
}

export interface CreateMatchRequest {
  scheduledAt: string;
  clubId?: number | null;
  locationText?: string | null;
  notes?: string | null;
}

export interface MatchParticipantResponse {
  playerProfileId: number;
  userId: number;
  fullName: string;
  team: MatchParticipantTeam | null;
  joinedAt: string;
}

export interface MatchResultSummaryResponse {
  status: MatchResultStatus;
  winnerTeam: MatchWinnerTeam;
  score: MatchScore;
  submittedAt: string;
  submittedByPlayerProfileId: number;
  confirmedByPlayerProfileId: number | null;
  confirmedAt: string | null;
  rejectedByPlayerProfileId: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface MatchResponse {
  id: number;
  createdByPlayerProfileId: number;
  status: MatchStatus;
  scheduledAt: string;
  clubId: number | null;
  locationText: string | null;
  notes: string | null;
  maxPlayers: number;
  currentPlayerCount: number;
  resultExists: boolean;
  result: MatchResultSummaryResponse | null;
  participants: MatchParticipantResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchResultResponse {
  matchId: number;
  submittedByPlayerProfileId: number;
  status: MatchResultStatus;
  winnerTeam: MatchWinnerTeam;
  score: MatchScore;
  submittedAt: string;
  confirmedByPlayerProfileId: number | null;
  confirmedAt: string | null;
  rejectedByPlayerProfileId: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface MatchTeamAssignmentRequest {
  playerProfileId: number;
  team: MatchParticipantTeam;
}

export interface AssignMatchTeamsRequest {
  assignments: MatchTeamAssignmentRequest[];
}

export interface SubmitMatchResultRequest {
  winnerTeam: MatchWinnerTeam;
  score: MatchScore;
}

export interface RejectMatchResultRequest {
  rejectionReason?: string | null;
}

export interface PlayerProfileResponse {
  id: number;
  userId: number;
  fullName: string;
  photoUrl: string | null;
  preferredSide: string | null;
  declaredLevel: string | null;
  city: string | null;
  bio: string | null;
  currentRating: number;
  currentCategory: UruguayCategory | null;
  provisional: boolean;
  matchesPlayed: number;
  ratedMatchesCount: number;
  surveyCompleted: boolean;
  surveyCompletedAt: string | null;
  initialRating: number | null;
  estimatedCategory: UruguayCategory | null;
  requiresClubVerification: boolean;
  clubVerificationStatus: ClubVerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClubResponse {
  id: number;
  name: string;
  city: string;
  address: string | null;
  description: string | null;
  integrated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RankingEntryResponse {
  position: number;
  playerProfileId: number;
  fullName: string;
  city: string | null;
  currentRating: number;
  currentCategory: UruguayCategory | null;
  ratedMatchesCount: number;
}

export interface RatingHistoryMatchSummaryResponse {
  matchId: number;
  matchStatus: MatchStatus;
  scheduledAt: string;
  winnerTeam: MatchWinnerTeam | null;
  score: MatchScore | null;
}

export interface RatingHistoryEntryResponse {
  id: number;
  matchId: number;
  oldRating: number;
  delta: number;
  newRating: number;
  createdAt: string;
  match: RatingHistoryMatchSummaryResponse | null;
}

export interface PlayerMatchHistoryEntryResponse {
  id: number;
  status: MatchStatus;
  scheduledAt: string;
  clubId: number | null;
  locationText: string | null;
  notes: string | null;
  currentPlayerCount: number;
  participants: MatchParticipantResponse[];
  resultExists: boolean;
  result: MatchResultSummaryResponse | null;
  authenticatedPlayerIsParticipant: boolean;
  authenticatedPlayerTeam: MatchParticipantTeam | null;
  authenticatedPlayerWon: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentEntryMemberResponse {
  playerProfileId: number;
  userId: number;
  fullName: string;
}

export interface TournamentEntryResponse {
  id: number;
  teamName: string;
  status: TournamentEntryStatus;
  timePreferences: string[];
  members: TournamentEntryMemberResponse[];
  createdAt: string;
}

export interface TournamentResponse {
  id: number;
  createdByPlayerProfileId: number;
  name: string;
  description: string | null;
  clubId: number | null;
  city: string | null;
  startDate: string;
  endDate: string | null;
  status: TournamentStatus;
  format: TournamentFormat;
  americanoType: TournamentAmericanoType | null;
  openEnrollment: boolean;
  competitive: boolean;
  maxEntries: number | null;
  currentEntriesCount: number;
  currentPlayersCount: number;
  availableCourts: number | null;
  numberOfGroups: number | null;
  leagueRounds: number | null;
  standingsTiebreak: TournamentStandingsTiebreak;
  courtNames: string[];
  launchedAt: string | null;
  affectsPlayerRating: boolean;
  generatedMatchesCount: number;
  entries: TournamentEntryResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface TournamentEntryMemberRequest {
  playerProfileId: number;
}

export interface TournamentEntryUpsertRequest {
  teamName?: string | null;
  timePreferences?: string[];
  members: TournamentEntryMemberRequest[];
}

export interface CreateTournamentRequest {
  name: string;
  description?: string | null;
  clubId?: number | null;
  city?: string | null;
  startDate: string;
  endDate?: string | null;
  format: TournamentFormat;
  americanoType?: TournamentAmericanoType | null;
  maxEntries?: number | null;
  openEnrollment?: boolean | null;
  competitive?: boolean | null;
  leagueRounds?: number | null;
  standingsTiebreak?: TournamentStandingsTiebreak | null;
  availableCourts?: number | null;
  courtNames?: string[];
  entries?: TournamentEntryUpsertRequest[];
}

export interface SyncTournamentEntriesRequest {
  entries: TournamentEntryUpsertRequest[];
}

export interface LaunchTournamentRequest {
  availableCourts?: number | null;
  numberOfGroups?: number | null;
  leagueRounds?: number | null;
  courtNames?: string[];
}

export interface TournamentMatchTeamResponse {
  tournamentEntryId: number;
  teamName: string;
  members: TournamentEntryMemberResponse[];
}

export interface TournamentMatchScoreSetResponse {
  teamOneGames: number;
  teamTwoGames: number;
}

export interface TournamentMatchScoreSetRequest {
  teamOneGames: number;
  teamTwoGames: number;
}

export interface TournamentMatchResultResponse {
  tournamentMatchId: number;
  submittedByPlayerProfileId: number;
  status: TournamentMatchResultStatus;
  winnerTeam: MatchWinnerTeam;
  sets: TournamentMatchScoreSetResponse[];
  submittedAt: string;
  confirmedByPlayerProfileId: number | null;
  confirmedAt: string | null;
  rejectedByPlayerProfileId: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface TournamentMatchResponse {
  id: number;
  tournamentId: number;
  phase: TournamentMatchPhase;
  status: TournamentMatchStatus;
  roundNumber: number;
  legNumber: number | null;
  roundLabel: string;
  scheduledAt: string | null;
  courtName: string | null;
  teamOne: TournamentMatchTeamResponse;
  teamTwo: TournamentMatchTeamResponse;
  resultExists: boolean;
  result: TournamentMatchResultResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitTournamentMatchResultRequest {
  winnerTeam: MatchWinnerTeam;
  sets: TournamentMatchScoreSetRequest[];
}

export interface RejectTournamentMatchResultRequest {
  rejectionReason?: string | null;
}

export interface TournamentStandingsEntryResponse {
  position: number;
  tournamentEntryId: number;
  teamName: string;
  members: TournamentEntryMemberResponse[];
  points: number;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setDifference: number;
  gamesWon: number;
  gamesLost: number;
  gamesDifference: number;
}

export interface TournamentStandingsResponse {
  tournamentId: number;
  tiebreak: TournamentStandingsTiebreak;
  standings: TournamentStandingsEntryResponse[];
}

export class BackendApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.payload = payload;
  }
}

export const ACCESS_TOKEN_STORAGE_KEY = 'sentimos.accessToken';

const DEFAULT_API_BASE_URL = 'http://localhost:8081';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

type RequestOptions = RequestInit & {
  auth?: boolean;
  token?: string | null;
};

const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const storeAccessToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  }
};

export const clearAccessToken = (): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const shouldSendJson = options.body !== undefined && !headers.has('Content-Type');
  const token = options.token ?? getStoredAccessToken();

  if (shouldSendJson) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message ?? 'Request failed')
        : `Request failed with status ${response.status}`;
    throw new BackendApiError(message, response.status, payload);
  }

  return payload as T;
}

export const backendApi = {
  login: (request: LoginRequest) =>
    apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(request),
    }),

  register: (request: RegisterRequest) =>
    apiRequest<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(request),
    }),

  getCurrentUser: () => apiRequest<CurrentUserResponse>('/api/auth/me'),

  submitInitialSurvey: (request: InitialSurveyRequest) =>
    apiRequest<InitialSurveyResponse>('/api/onboarding/initial-survey', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getInitialSurvey: () =>
    apiRequest<InitialSurveyResponse>('/api/onboarding/initial-survey'),

  getPlayerProfile: (playerProfileId: number) =>
    apiRequest<PlayerProfileResponse>(`/api/players/${playerProfileId}`, {
      auth: false,
    }),

  getPlayerProfiles: () =>
    apiRequest<PlayerProfileResponse[]>('/api/players', {
      auth: false,
    }),

  getClubs: () =>
    apiRequest<ClubResponse[]>('/api/clubs', {
      auth: false,
    }),

  getMyPlayerProfile: () =>
    apiRequest<PlayerProfileResponse>('/api/players/me'),

  getMyRatingHistory: () =>
    apiRequest<RatingHistoryEntryResponse[]>('/api/players/me/rating-history'),

  getPlayerRatingHistory: (playerProfileId: number) =>
    apiRequest<RatingHistoryEntryResponse[]>(`/api/players/${playerProfileId}/rating-history`, {
      auth: false,
    }),

  getMyMatches: (scope?: MyMatchesScope) =>
    apiRequest<PlayerMatchHistoryEntryResponse[]>(
      `/api/players/me/matches${scope ? `?scope=${scope}` : ''}`,
    ),

  getRankings: () =>
    apiRequest<RankingEntryResponse[]>('/api/rankings', {
      auth: false,
    }),

  createMatch: (request: CreateMatchRequest) =>
    apiRequest<MatchResponse>('/api/matches', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  listMatches: () =>
    apiRequest<MatchResponse[]>('/api/matches', {
      auth: false,
    }),

  getMatch: (matchId: number) =>
    apiRequest<MatchResponse>(`/api/matches/${matchId}`, {
      auth: false,
    }),

  joinMatch: (matchId: number) =>
    apiRequest<MatchResponse>(`/api/matches/${matchId}/join`, {
      method: 'POST',
    }),

  leaveMatch: (matchId: number) =>
    apiRequest<MatchResponse>(`/api/matches/${matchId}/leave`, {
      method: 'POST',
    }),

  assignMatchTeams: (matchId: number, request: AssignMatchTeamsRequest) =>
    apiRequest<MatchResponse>(`/api/matches/${matchId}/teams`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  cancelMatch: (matchId: number) =>
    apiRequest<MatchResponse>(`/api/matches/${matchId}/cancel`, {
      method: 'POST',
    }),

  submitMatchResult: (matchId: number, request: SubmitMatchResultRequest) =>
    apiRequest<MatchResultResponse>(`/api/matches/${matchId}/result`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  confirmMatchResult: (matchId: number) =>
    apiRequest<MatchResultResponse>(`/api/matches/${matchId}/result/confirm`, {
      method: 'POST',
    }),

  rejectMatchResult: (matchId: number, request: RejectMatchResultRequest = {}) =>
    apiRequest<MatchResultResponse>(`/api/matches/${matchId}/result/reject`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getMatchResult: (matchId: number) =>
    apiRequest<MatchResultResponse>(`/api/matches/${matchId}/result`, {
      auth: false,
    }),

  createTournament: (request: CreateTournamentRequest) =>
    apiRequest<TournamentResponse>('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getTournaments: () =>
    apiRequest<TournamentResponse[]>('/api/tournaments', {
      auth: false,
    }),

  getTournament: (tournamentId: number) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}`, {
      auth: false,
    }),

  joinTournament: (tournamentId: number) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}/join`, {
      method: 'POST',
    }),

  leaveTournament: (tournamentId: number) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}/leave`, {
      method: 'POST',
    }),

  syncTournamentEntries: (tournamentId: number, request: SyncTournamentEntriesRequest) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}/entries`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  launchTournament: (tournamentId: number, request: LaunchTournamentRequest) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}/launch`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getTournamentMatches: (tournamentId: number) =>
    apiRequest<TournamentMatchResponse[]>(`/api/tournaments/${tournamentId}/matches`, {
      auth: false,
    }),

  submitTournamentMatchResult: (
    tournamentId: number,
    matchId: number,
    request: SubmitTournamentMatchResultRequest,
  ) =>
    apiRequest<TournamentMatchResultResponse>(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  confirmTournamentMatchResult: (tournamentId: number, matchId: number) =>
    apiRequest<TournamentMatchResultResponse>(`/api/tournaments/${tournamentId}/matches/${matchId}/result/confirm`, {
      method: 'POST',
    }),

  rejectTournamentMatchResult: (
    tournamentId: number,
    matchId: number,
    request: RejectTournamentMatchResultRequest = {},
  ) =>
    apiRequest<TournamentMatchResultResponse>(`/api/tournaments/${tournamentId}/matches/${matchId}/result/reject`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getTournamentStandings: (tournamentId: number) =>
    apiRequest<TournamentStandingsResponse>(`/api/tournaments/${tournamentId}/standings`, {
      auth: false,
    }),
};
