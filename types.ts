// Enums for rigid structure
export enum MatchType {
  FRIENDLY = 'Recreativo',
  COMPETITIVE = 'Por los Puntos',
  TOURNAMENT = 'Torneo'
}

export enum PlayerLevel {
  BEGINNER = 1.0,
  INTERMEDIATE_LOW = 2.0,
  INTERMEDIATE = 3.0,
  INTERMEDIATE_HIGH = 4.0,
  ADVANCED = 5.0,
  PRO = 6.0
}

// Entities
export interface User {
  id: string;
  backendUserId?: number;
  backendPlayerProfileId?: number;
  email?: string;
  role?: 'PLAYER' | 'ADMIN';
  accountType?: 'player' | 'club';
  managedClubId?: number | null;
  managedClubName?: string | null;
  name: string;
  avatar: string; // URL
  level: number; // 1.0 to 7.0
  hasOfficialRating?: boolean;
  categoryNumber?: number;
  categoryName?: string;
  isCategoryVerified?: boolean;
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  surveyCompleted?: boolean;
  publicCategoryNumber?: number | null;
  matchesPlayed: number;
  reputation: number; // 0 to 100%
  clubAffiliation?: string; // ID of primary club
  isPremium: boolean; // Subscription status
  badges?: string[]; // Array of badge names or descriptions
}

export interface Club {
  id: string;
  name: string;
  location: string;
  rating: number;
  image: string;
  courtsAvailable: number;
  isPremium: boolean;
}

export interface Match {
  id: string;
  clubId: string;
  clubName?: string | null;
  backendClubId?: number | null;
  courtName: string;
  date: string; // ISO string
  time: string; // HH:mm
  duration: number; // minutes
  type: MatchType;
  pricePerPlayer: number;
  currency: 'UYU' | 'USD';
  players: (User | null)[]; // Fixed 4 slots, null allows empty spots
  maxPlayers: number;
  levelRange: [number, number]; // e.g., [3.5, 4.5]
  isPrivate: boolean;
  status: 'open' | 'confirmed' | 'pending_approval' | 'completed' | 'awaiting_result' | 'awaiting_validation' | 'cancelled';
  matchSource?: 'backend' | 'backend-tournament' | 'local';
  backendMatchId?: number;
  backendStatus?: 'OPEN' | 'FULL' | 'CANCELLED' | 'RESULT_PENDING' | 'COMPLETED' | 'SCHEDULED';
  backendResultStatus?: 'PENDING' | 'CONFIRMED' | 'REJECTED' | null;
  createdByPlayerProfileId?: number;
  locationText?: string | null;
  notes?: string;
  authenticatedPlayerTeam?: 'TEAM_ONE' | 'TEAM_TWO' | null;
  authenticatedPlayerWon?: boolean | null;
  teamsAssigned?: boolean;
  pendingNotificationId?: number;
  pendingActionType?:
    | 'SUBMIT_MATCH_RESULT'
    | 'CONFIRM_MATCH_RESULT'
    | 'SUBMIT_TOURNAMENT_RESULT'
    | 'CONFIRM_TOURNAMENT_RESULT';
  pendingPlayerIds?: string[]; // IDs of users requesting to join
  rejectedPlayerIds?: string[]; // IDs of users rejected by the lobby
  approvedGuestIds?: string[]; // IDs of users who requested and were approved, ready to join
  
  // Result specific fields
  result?: [number, number][]; // Array of [teamA_score, teamB_score] tuples for up to 3 sets
  resultSubmittedBy?: string; // User ID who submitted the result
  winnerTeam?: 'A' | 'B';
  isTournamentMatch?: boolean;
  isAmericano?: boolean;
  isAmericanoDinamico?: boolean;
  tournamentId?: string;
  round?: string;
  team1Name?: string;
  team2Name?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: 'match' | 'system' | 'rating';
}
