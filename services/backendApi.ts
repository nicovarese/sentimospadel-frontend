import { Capacitor } from '@capacitor/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';

export type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';
export type UruguayCategory = 'PRIMERA' | 'SEGUNDA' | 'TERCERA' | 'CUARTA' | 'QUINTA' | 'SEXTA' | 'SEPTIMA';
export type ClubVerificationStatus = 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ClubVerificationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserRole = 'PLAYER' | 'ADMIN';
export type RegisterAccountType = 'PLAYER' | 'CLUB';
export type LegalDocumentType = 'TERMS_AND_CONDITIONS' | 'PRIVACY_POLICY' | 'CONSENT_PREFERENCES_NOTICE';
export type ClubBookingMode = 'DIRECT' | 'CONFIRMATION_REQUIRED' | 'UNAVAILABLE';
export type PreferredSide = 'LEFT' | 'RIGHT' | 'BOTH';
export type MatchStatus = 'OPEN' | 'FULL' | 'PENDING_CLUB_CONFIRMATION' | 'CANCELLED' | 'RESULT_PENDING' | 'COMPLETED';
export type MatchParticipantTeam = 'TEAM_ONE' | 'TEAM_TWO';
export type MatchResultStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';
export type MatchWinnerTeam = 'TEAM_ONE' | 'TEAM_TWO';
export type MyMatchesScope = 'upcoming' | 'completed' | 'cancelled' | 'pending_result';
export type PendingActionType =
  | 'SUBMIT_MATCH_RESULT'
  | 'CONFIRM_MATCH_RESULT'
  | 'SUBMIT_TOURNAMENT_RESULT'
  | 'CONFIRM_TOURNAMENT_RESULT'
  | 'MATCH_FULL'
  | 'MATCH_CANCELLED'
  | 'MATCH_RESULT_CONFIRMED'
  | 'MATCH_RESULT_REJECTED'
  | 'TOURNAMENT_LAUNCHED'
  | 'TOURNAMENT_RESULT_CONFIRMED'
  | 'TOURNAMENT_RESULT_REJECTED'
  | 'CLUB_BOOKING_APPROVED'
  | 'CLUB_BOOKING_REJECTED'
  | 'CLUB_VERIFICATION_APPROVED'
  | 'CLUB_VERIFICATION_REJECTED';
export type NotificationStatus = 'UNREAD' | 'READ';
export type PushDevicePlatform = 'ANDROID' | 'IOS' | 'WEB';
export type TournamentStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TournamentFormat = 'LEAGUE' | 'ELIMINATION' | 'AMERICANO';
export type TournamentAmericanoType = 'FIXED' | 'DYNAMIC';
export type TournamentStandingsTiebreak = 'SETS_DIFFERENCE' | 'GAMES_DIFFERENCE';
export type TournamentEntryStatus = 'PENDING' | 'CONFIRMED';
export type TournamentMatchStatus = 'SCHEDULED' | 'RESULT_PENDING' | 'COMPLETED';
export type TournamentMatchPhase = 'LEAGUE_STAGE' | 'GROUP_STAGE' | 'AMERICANO_STAGE' | 'QUARTERFINAL' | 'SEMIFINAL' | 'FINAL';
export type TournamentMatchResultStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName?: string | null;
  email: string;
  phone: string;
  password: string;
  accountType: RegisterAccountType;
  clubName?: string | null;
  clubCity?: string | null;
  clubAddress?: string | null;
  photoUrl?: string | null;
  preferredSide?: PreferredSide | null;
  city?: string | null;
  representedClubId?: number | null;
  acceptTerms: boolean;
  acceptedTermsVersion: string;
  acceptPrivacyPolicy: boolean;
  acceptedPrivacyVersion: string;
  allowActivityTracking?: boolean | null;
  allowOperationalNotifications?: boolean | null;
  consentPreferencesVersion: string;
}

export interface LegalDocumentResponse {
  type: LegalDocumentType;
  title: string;
  version: string;
  required: boolean;
  content: string;
}

export interface ResendEmailVerificationRequest {
  email: string;
}

export interface EmailVerificationDispatchResponse {
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
  tokenType: string;
  id: number;
  email: string;
  role: UserRole;
  status: string;
  managedClubId: number | null;
  managedClubName: string | null;
}

export interface RegisterResponse {
  id: number;
  email: string;
  role: UserRole;
  status: string;
  managedClubId: number | null;
  managedClubName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUserResponse {
  id: number;
  email: string;
  role: UserRole;
  status: string;
  managedClubId: number | null;
  managedClubName: string | null;
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
  currentRating: number | null;
  currentCategory: UruguayCategory | null;
  matchesPlayed: number | null;
  requiresClubVerification: boolean;
  clubVerificationStatus: ClubVerificationStatus;
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

export interface MatchInviteLinkResponse {
  matchId: number;
  inviteToken: string;
  inviteUrl: string;
  expiresAt: string;
}

export interface MatchInvitePreviewResponse {
  matchId: number;
  status: MatchStatus;
  scheduledAt: string;
  clubId: number | null;
  clubName: string | null;
  courtName: string;
  locationText: string | null;
  createdByName: string;
  currentPlayerCount: number;
  maxPlayers: number;
  expiresAt: string;
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
  preferredSide: PreferredSide | null;
  city: string | null;
  representedClubId: number | null;
  representedClubName: string | null;
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

export interface UpdatePlayerProfileRequest {
  fullName: string;
  photoUrl?: string | null;
  preferredSide: PreferredSide;
  city: string;
  representedClubId?: number | null;
  bio?: string | null;
}

export interface PlayerClubVerificationRequestResponse {
  id: number;
  clubId: number;
  clubName: string;
  clubCity: string;
  status: ClubVerificationRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export interface PlayerClubVerificationSummaryResponse {
  requiresClubVerification: boolean;
  clubVerificationStatus: ClubVerificationStatus;
  canCreateRequest: boolean;
  requests: PlayerClubVerificationRequestResponse[];
}

export interface CreateClubVerificationRequest {
  clubId: number;
}

export interface ClubVerificationDecisionRequest {
  notes?: string | null;
}

export interface ClubVerificationManagementRequestResponse {
  id: number;
  playerProfileId: number;
  playerFullName: string;
  playerPhotoUrl: string | null;
  playerCity: string | null;
  currentRating: number;
  currentCategory: UruguayCategory | null;
  requestedAt: string;
  status: ClubVerificationRequestStatus;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export interface ClubResponse {
  id: number;
  name: string;
  city: string;
  address: string | null;
  description: string | null;
  integrated: boolean;
  bookingMode: ClubBookingMode;
  createdAt: string;
  updatedAt: string;
}

export type ClubAgendaSlotStatus = 'AVAILABLE' | 'RESERVED' | 'BLOCKED' | 'PENDING_CONFIRMATION';
export type ClubAgendaSlotActionType = 'RESERVE' | 'BLOCK' | 'FREE';
export type ClubQuickActionType =
  | 'NOTIFY_USERS'
  | 'ACTIVATE_RESERVATION_PROMO'
  | 'ACTIVATE_LAST_MINUTE_DISCOUNT';

export interface ClubManagementActivityResponse {
  id: number;
  title: string;
  description: string;
  occurredAt: string;
}

export interface ClubManagementDashboardResponse {
  clubId: number;
  clubName: string;
  activeCourtsCount: number;
  totalCourtsCount: number;
  todayRevenueUyu: number;
  todayReservationsCount: number;
  recentActivities: ClubManagementActivityResponse[];
}

export interface ClubManagementTopUserResponse {
  position: number;
  playerProfileId: number;
  fullName: string;
  photoUrl: string | null;
  matchesThisMonth: number;
}

export interface ClubManagementUsersResponse {
  clubId: number;
  clubName: string;
  activeUsersCount: number;
  newUsersThisMonthCount: number;
  inactiveUsersCount: number;
  averageRevenuePerUserUyu: number;
  averageMatchesThisMonth: number;
  averageMatchesPreviousMonth: number;
  averageMatchesYear: number;
  topUsers: ClubManagementTopUserResponse[];
}

export interface ClubManagementCourtResponse {
  id: number;
  name: string;
  displayOrder: number;
  hourlyRateUyu: number;
  active: boolean;
}

export interface ClubManagementCourtsResponse {
  clubId: number;
  clubName: string;
  activeCourtsCount: number;
  totalCourtsCount: number;
  courts: ClubManagementCourtResponse[];
}

export interface CreateClubCourtRequest {
  name: string;
  hourlyRateUyu: number;
}

export interface UpdateClubCourtRequest {
  name: string;
  hourlyRateUyu: number;
  active: boolean;
}

export interface ReorderClubCourtsRequest {
  orderedCourtIds: number[];
}

export interface ClubManagementAgendaSlotResponse {
  id: string;
  time: string;
  status: ClubAgendaSlotStatus;
  reservedByName: string | null;
  matchId: number | null;
}

export interface ClubBookingSlotResponse {
  time: string;
  status: ClubAgendaSlotStatus;
}

export interface ClubBookingCourtResponse {
  id: number;
  name: string;
  hourlyRateUyu: number;
  slots: ClubBookingSlotResponse[];
}

export interface ClubBookingAgendaResponse {
  clubId: number;
  clubName: string;
  bookingMode: ClubBookingMode;
  date: string;
  courts: ClubBookingCourtResponse[];
}

export interface ClubManagementAgendaCourtResponse {
  id: number;
  name: string;
  slots: ClubManagementAgendaSlotResponse[];
}

export interface ClubManagementAgendaResponse {
  clubId: number;
  clubName: string;
  date: string;
  courts: ClubManagementAgendaCourtResponse[];
}

export interface ClubAgendaSlotActionRequest {
  date: string;
  courtId: number;
  time: string;
  action: ClubAgendaSlotActionType;
  reservedByName?: string | null;
}

export interface ClubQuickActionRequest {
  type: ClubQuickActionType;
}

export interface ClubQuickActionResponse {
  message: string;
}

export interface CoachResponse {
  id: number;
  fullName: string;
  clubName: string;
  currentRating: number;
  currentCategory: UruguayCategory | null;
  reviewsCount: number;
  averageRating: number;
  hourlyRateUyu: number;
  phone: string;
  photoUrl: string | null;
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

export type RatingHistorySourceType = 'SOCIAL_MATCH' | 'TOURNAMENT_MATCH';

export interface RatingHistoryTournamentMatchSummaryResponse {
  tournamentMatchId: number;
  tournamentId: number;
  tournamentName: string;
  phase: TournamentMatchPhase;
  matchStatus: TournamentMatchStatus;
  roundLabel: string;
  scheduledAt: string;
  winnerTeam: MatchWinnerTeam | null;
  score: MatchScore | null;
  teamOne: TournamentMatchTeamResponse;
  teamTwo: TournamentMatchTeamResponse;
}

export interface RatingHistoryEntryResponse {
  id: number;
  matchId: number | null;
  tournamentMatchId: number | null;
  sourceType: RatingHistorySourceType;
  oldRating: number;
  delta: number;
  newRating: number;
  createdAt: string;
  match: RatingHistoryMatchSummaryResponse | null;
  tournamentMatch: RatingHistoryTournamentMatchSummaryResponse | null;
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

export interface PlayerPartnerInsightResponse {
  playerProfileId: number;
  fullName: string;
  photoUrl: string | null;
  matchesWonTogether: number;
  ratingGainedTogether: number;
}

export interface PlayerRivalInsightResponse {
  playerProfileId: number;
  fullName: string;
  photoUrl: string | null;
  matchesLostAgainst: number;
  ratingLostAgainst: number;
}

export interface ClubRankingEntryResponse {
  playerProfileId: number;
  fullName: string;
  photoUrl: string | null;
  currentRating: number;
  currentCategory: UruguayCategory | null;
  matchesPlayedAtClub: number;
}

export interface ClubRankingBucketResponse {
  userRank: number | null;
  userEntry: ClubRankingEntryResponse | null;
  topEntries: ClubRankingEntryResponse[];
}

export interface PlayerClubRankingSummaryResponse {
  clubId: number;
  clubName: string;
  matchesPlayedByUser: number;
  competitive: ClubRankingBucketResponse;
  social: ClubRankingBucketResponse;
}

export interface PendingActionResponse {
  notificationId: number | null;
  type: PendingActionType;
  notificationStatus: NotificationStatus | null;
  matchId: number | null;
  tournamentId: number | null;
  tournamentMatchId: number | null;
  title: string;
  message: string;
  scheduledAt: string | null;
  dueAt: string | null;
}

export interface NotificationResponse {
  id: number;
  type: PendingActionType;
  status: NotificationStatus;
  title: string;
  message: string;
  matchId: number | null;
  tournamentId: number | null;
  tournamentMatchId: number | null;
  active: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferencesResponse {
  activityTrackingEnabled: boolean;
  activityTrackingUpdatedAt: string | null;
  operationalNotificationsEnabled: boolean;
  operationalNotificationsUpdatedAt: string | null;
  consentPreferencesVersion: string | null;
}

export interface UpdateNotificationPreferencesRequest {
  allowActivityTracking: boolean;
  allowOperationalNotifications: boolean;
  consentPreferencesVersion: string;
}

export interface AccountDeletionRequest {
  reason?: string | null;
}

export interface AccountDeletionResponse {
  requested: boolean;
  requestedAt: string | null;
  message: string;
}

export interface PushDeviceRegistrationRequest {
  installationId: string;
  platform: PushDevicePlatform;
  pushToken: string;
}

export interface PushDeviceUnregisterRequest {
  installationId: string;
}

export interface PushDeviceResponse {
  installationId: string;
  platform: PushDevicePlatform;
  active: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentEntryMemberResponse {
  playerProfileId: number;
  userId: number;
  fullName: string;
  currentRating: number | null;
  currentCategory: UruguayCategory | null;
  matchesPlayed: number | null;
  requiresClubVerification: boolean;
  clubVerificationStatus: ClubVerificationStatus;
}

export interface TournamentEntryResponse {
  id: number;
  teamName: string;
  groupLabel: string | null;
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
  categoryLabels: string[];
  startDate: string;
  endDate: string | null;
  status: TournamentStatus;
  format: TournamentFormat;
  americanoType: TournamentAmericanoType | null;
  openEnrollment: boolean;
  competitive: boolean;
  archived: boolean;
  maxEntries: number | null;
  currentEntriesCount: number;
  currentPlayersCount: number;
  availableCourts: number | null;
  numberOfGroups: number | null;
  leagueRounds: number | null;
  matchesPerParticipant: number | null;
  standingsTiebreak: TournamentStandingsTiebreak;
  courtNames: string[];
  launchedAt: string | null;
  archivedAt: string | null;
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
  categoryLabels?: string[];
  startDate: string;
  endDate?: string | null;
  format: TournamentFormat;
  americanoType?: TournamentAmericanoType | null;
  maxEntries?: number | null;
  openEnrollment?: boolean | null;
  competitive?: boolean | null;
  leagueRounds?: number | null;
  matchesPerParticipant?: number | null;
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

export interface TournamentLaunchPreviewTeamResponse {
  teamName: string;
  memberNames: string[];
}

export interface TournamentLaunchPreviewGroupResponse {
  name: string;
  teams: TournamentLaunchPreviewTeamResponse[];
}

export interface TournamentLaunchPreviewMatchResponse {
  phase: TournamentMatchPhase;
  roundLabel: string;
  teamOneLabel: string;
  teamTwoLabel: string;
  scheduledAt: string;
  courtName: string;
  placeholder: boolean;
}

export interface TournamentLaunchPreviewResponse {
  availableCourts: number;
  numberOfGroups: number;
  leagueRounds: number;
  courtNames: string[];
  groups: TournamentLaunchPreviewGroupResponse[];
  stageMatches: TournamentLaunchPreviewMatchResponse[];
  playoffMatches: TournamentLaunchPreviewMatchResponse[];
}

export interface TournamentInviteLinkResponse {
  tournamentId: number;
  inviteToken: string;
  inviteUrl: string;
  expiresAt: string;
}

export interface TournamentInvitePreviewResponse {
  tournamentId: number;
  name: string;
  status: TournamentStatus;
  format: TournamentFormat;
  openEnrollment: boolean;
  competitive: boolean;
  creatorName: string;
  clubId: number | null;
  clubName: string | null;
  city: string | null;
  categoryLabels: string[];
  startDate: string;
  endDate: string | null;
  currentEntriesCount: number;
  currentPlayersCount: number;
  maxEntries: number | null;
  expiresAt: string;
}

export interface UpsertMyTournamentEntryRequest {
  teamName?: string | null;
  secondaryPlayerProfileId?: number | null;
  timePreferences?: string[];
}

export interface UpdateTournamentEntryTeamNameRequest {
  teamName: string;
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

export interface TournamentStandingsGroupResponse {
  groupName: string;
  standings: TournamentStandingsEntryResponse[];
}

export interface TournamentStandingsResponse {
  tournamentId: number;
  tiebreak: TournamentStandingsTiebreak;
  standings: TournamentStandingsEntryResponse[];
  groups: TournamentStandingsGroupResponse[];
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
export const REFRESH_TOKEN_STORAGE_KEY = 'sentimos.refreshToken';

const DEFAULT_API_BASE_URL = 'http://localhost:8081';

const resolveApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  if (import.meta.env.MODE === 'development') {
    return DEFAULT_API_BASE_URL;
  }

  throw new Error(`VITE_API_BASE_URL no esta configurada para el modo ${import.meta.env.MODE}.`);
};

const API_BASE_URL = resolveApiBaseUrl();
const useNativeTokenStorage = () => Capacitor.isNativePlatform();
const SECURE_STORAGE_PREFIX = 'sentimospadel.auth.';

let accessTokenCache: string | null = null;
let refreshTokenCache: string | null = null;
let tokenStorageInitialized = false;

type RequestOptions = RequestInit & {
  auth?: boolean;
  token?: string | null;
  skipRefresh?: boolean;
};

export const initAuthTokenStorage = async (): Promise<void> => {
  if (tokenStorageInitialized) {
    return;
  }

  if (useNativeTokenStorage()) {
    await SecureStorage.setKeyPrefix(SECURE_STORAGE_PREFIX);
    const [accessToken, refreshToken] = await Promise.all([
      SecureStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),
      SecureStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
    ]);
    accessTokenCache = accessToken;
    refreshTokenCache = refreshToken;
  } else if (typeof window !== 'undefined') {
    accessTokenCache = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    refreshTokenCache = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  tokenStorageInitialized = true;
};

export const getStoredAccessToken = (): string | null => {
  if (tokenStorageInitialized) {
    return accessTokenCache;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const storeAccessToken = (token: string): void => {
  accessTokenCache = token;
  tokenStorageInitialized = true;

  if (useNativeTokenStorage()) {
    void SecureStorage.set(ACCESS_TOKEN_STORAGE_KEY, token, true, false, KeychainAccess.whenUnlockedThisDeviceOnly);
  } else if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  }
};

export const storeAuthTokens = (accessToken: string, refreshToken?: string | null): void => {
  accessTokenCache = accessToken;
  if (refreshToken) {
    refreshTokenCache = refreshToken;
  }
  tokenStorageInitialized = true;

  if (useNativeTokenStorage()) {
    void SecureStorage.set(ACCESS_TOKEN_STORAGE_KEY, accessToken, true, false, KeychainAccess.whenUnlockedThisDeviceOnly);
    if (refreshToken) {
      void SecureStorage.set(REFRESH_TOKEN_STORAGE_KEY, refreshToken, true, false, KeychainAccess.whenUnlockedThisDeviceOnly);
    }
  } else if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }
  }
};

export const getStoredRefreshToken = (): string | null => {
  if (tokenStorageInitialized) {
    return refreshTokenCache;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
};

export const clearAccessToken = (): void => {
  accessTokenCache = null;
  refreshTokenCache = null;
  tokenStorageInitialized = true;

  if (useNativeTokenStorage()) {
    void SecureStorage.remove(ACCESS_TOKEN_STORAGE_KEY);
    void SecureStorage.remove(REFRESH_TOKEN_STORAGE_KEY);
  } else if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
};

let refreshTokenRequest: Promise<string | null> | null = null;

const refreshStoredAccessToken = async (): Promise<string | null> => {
  if (refreshTokenRequest) {
    return refreshTokenRequest;
  }

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshTokenRequest = apiRequest<LoginResponse>('/api/auth/refresh', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ refreshToken }),
    skipRefresh: true,
  })
    .then(response => {
      storeAuthTokens(response.accessToken, response.refreshToken);
      return response.accessToken;
    })
    .catch(error => {
      clearAccessToken();
      throw error;
    })
    .finally(() => {
      refreshTokenRequest = null;
    });

  return refreshTokenRequest;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const shouldSendJson = options.body !== undefined && !headers.has('Content-Type') && !isFormDataBody;
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
    if (response.status === 401 && options.auth !== false && !options.skipRefresh) {
      const refreshedToken = await refreshStoredAccessToken();
      if (refreshedToken) {
        return apiRequest<T>(path, {
          ...options,
          token: refreshedToken,
          skipRefresh: true,
        });
      }
    }

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

  logout: (refreshToken: string) =>
    apiRequest<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ refreshToken }),
    }),

  register: (request: RegisterRequest) =>
    apiRequest<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(request),
    }),

  getLegalDocuments: () =>
    apiRequest<LegalDocumentResponse[]>('/api/legal/documents', {
      auth: false,
    }),

  resendEmailVerification: (request: ResendEmailVerificationRequest) =>
    apiRequest<EmailVerificationDispatchResponse>('/api/auth/verify-email/resend', {
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

  getClubBookingAvailability: (clubId: number, date: string) =>
    apiRequest<ClubBookingAgendaResponse>(`/api/clubs/${clubId}/booking-availability?date=${encodeURIComponent(date)}`, {
      auth: false,
    }),

  getMyClubManagementDashboard: () =>
    apiRequest<ClubManagementDashboardResponse>('/api/clubs/me/management/dashboard'),

  getMyClubManagementUsers: () =>
    apiRequest<ClubManagementUsersResponse>('/api/clubs/me/management/users'),

  getMyClubManagementCourts: () =>
    apiRequest<ClubManagementCourtsResponse>('/api/clubs/me/management/courts'),

  createMyClubManagementCourt: (request: CreateClubCourtRequest) =>
    apiRequest<ClubManagementCourtsResponse>('/api/clubs/me/management/courts', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  updateMyClubManagementCourt: (courtId: number, request: UpdateClubCourtRequest) =>
    apiRequest<ClubManagementCourtsResponse>(`/api/clubs/me/management/courts/${courtId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  reorderMyClubManagementCourts: (request: ReorderClubCourtsRequest) =>
    apiRequest<ClubManagementCourtsResponse>('/api/clubs/me/management/courts/reorder', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getMyClubVerificationRequests: () =>
    apiRequest<ClubVerificationManagementRequestResponse[]>('/api/clubs/me/management/verification-requests'),

  approveMyClubVerificationRequest: (
    requestId: number,
    request: ClubVerificationDecisionRequest = {},
  ) =>
    apiRequest<ClubVerificationManagementRequestResponse>(`/api/clubs/me/management/verification-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  rejectMyClubVerificationRequest: (
    requestId: number,
    request: ClubVerificationDecisionRequest = {},
  ) =>
    apiRequest<ClubVerificationManagementRequestResponse>(`/api/clubs/me/management/verification-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getMyClubManagementAgenda: (date: string) =>
    apiRequest<ClubManagementAgendaResponse>(`/api/clubs/me/management/agenda?date=${encodeURIComponent(date)}`),

  applyMyClubAgendaSlotAction: (request: ClubAgendaSlotActionRequest) =>
    apiRequest<ClubManagementAgendaResponse>('/api/clubs/me/management/agenda/slot-action', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  approveMyClubBookingRequest: (matchId: number) =>
    apiRequest<ClubManagementAgendaResponse>(`/api/clubs/me/management/booking-requests/${matchId}/approve`, {
      method: 'POST',
    }),

  rejectMyClubBookingRequest: (matchId: number) =>
    apiRequest<ClubManagementAgendaResponse>(`/api/clubs/me/management/booking-requests/${matchId}/reject`, {
      method: 'POST',
    }),

  executeMyClubQuickAction: (request: ClubQuickActionRequest) =>
    apiRequest<ClubQuickActionResponse>('/api/clubs/me/management/quick-actions', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getCoaches: () =>
    apiRequest<CoachResponse[]>('/api/coaches', {
      auth: false,
    }),

  getMyPlayerProfile: () =>
    apiRequest<PlayerProfileResponse>('/api/players/me'),

  updateMyPlayerProfile: (request: UpdatePlayerProfileRequest) =>
    apiRequest<PlayerProfileResponse>('/api/players/me', {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  uploadMyPlayerProfilePhoto: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest<PlayerProfileResponse>('/api/players/me/photo', {
      method: 'POST',
      body: formData,
    });
  },

  getMyClubVerification: () =>
    apiRequest<PlayerClubVerificationSummaryResponse>('/api/players/me/club-verification'),

  requestMyClubVerification: (request: CreateClubVerificationRequest) =>
    apiRequest<PlayerClubVerificationSummaryResponse>('/api/players/me/club-verification/request', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

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

  getMyTopPartners: () =>
    apiRequest<PlayerPartnerInsightResponse[]>('/api/players/me/top-partners'),

  getMyTopRivals: () =>
    apiRequest<PlayerRivalInsightResponse[]>('/api/players/me/top-rivals'),

  getMyClubRankings: () =>
    apiRequest<PlayerClubRankingSummaryResponse[]>('/api/players/me/club-rankings'),

  getMyPendingActions: () =>
    apiRequest<PendingActionResponse[]>('/api/players/me/pending-actions'),

  getMyNotifications: () =>
    apiRequest<NotificationResponse[]>('/api/notifications'),

  markNotificationRead: (notificationId: number) =>
    apiRequest<NotificationResponse>(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    }),

  getMyNotificationPreferences: () =>
    apiRequest<NotificationPreferencesResponse>('/api/notifications/preferences'),

  updateMyNotificationPreferences: (request: UpdateNotificationPreferencesRequest) =>
    apiRequest<NotificationPreferencesResponse>('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  getMyAccountDeletionRequest: () =>
    apiRequest<AccountDeletionResponse>('/api/account/deletion-request'),

  requestMyAccountDeletion: (request: AccountDeletionRequest) =>
    apiRequest<AccountDeletionResponse>('/api/account/deletion-request', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  registerPushDevice: (request: PushDeviceRegistrationRequest) =>
    apiRequest<PushDeviceResponse>('/api/notifications/devices/register', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  unregisterPushDevice: (request: PushDeviceUnregisterRequest) =>
    apiRequest<PushDeviceResponse>('/api/notifications/devices/unregister', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

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

  createMatchInviteLink: (matchId: number) =>
    apiRequest<MatchInviteLinkResponse>(`/api/matches/${matchId}/invite-link`, {
      method: 'POST',
    }),

  resolveMatchInvite: (token: string) =>
    apiRequest<MatchInvitePreviewResponse>(`/api/matches/invite?token=${encodeURIComponent(token)}`, {
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

  createTournamentInviteLink: (tournamentId: number) =>
    apiRequest<TournamentInviteLinkResponse>(`/api/tournaments/${tournamentId}/invite-link`, {
      method: 'POST',
    }),

  resolveTournamentInvite: (token: string) =>
    apiRequest<TournamentInvitePreviewResponse>(`/api/tournaments/invite?token=${encodeURIComponent(token)}`, {
      auth: false,
    }),

  joinTournament: (tournamentId: number, request?: UpsertMyTournamentEntryRequest) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}/join`, {
      method: 'POST',
      body: request == null ? undefined : JSON.stringify(request),
    }),

  updateMyTournamentEntry: (tournamentId: number, request: UpsertMyTournamentEntryRequest) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}/entries/me`, {
      method: 'PUT',
      body: JSON.stringify(request),
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

  updateMyTournamentEntryTeamName: (tournamentId: number, request: UpdateTournamentEntryTeamNameRequest) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}/entries/me/team-name`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  previewTournamentLaunch: (tournamentId: number, request: LaunchTournamentRequest) =>
    apiRequest<TournamentLaunchPreviewResponse>(`/api/tournaments/${tournamentId}/launch-preview`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  launchTournament: (tournamentId: number, request: LaunchTournamentRequest) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}/launch`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  archiveTournament: (tournamentId: number) =>
    apiRequest<TournamentResponse>(`/api/tournaments/${tournamentId}/archive`, {
      method: 'POST',
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
