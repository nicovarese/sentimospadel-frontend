import React, { useState, useEffect, useMemo } from 'react';
import { User, Match, Club, MatchType, PlayerLevel } from './types';
import { NavBar } from './components/NavBar';
import { MatchCard } from './components/MatchCard';
import { ResultInputCard } from './components/ResultInputCard';
import { Button } from './components/Button';
import { RegisterView } from './components/RegisterView';
import { OnboardingSurvey } from './components/OnboardingSurvey';
import { PostMatchView } from './components/PostMatchView';
import { CoachesView } from './components/CoachesView';
import { ClubDashboardView as ClubDashboardBackendView } from './components/ClubDashboardView';
import { ClubUsersView } from './components/ClubUsersView';
import { ClubAgendaView } from './components/ClubAgendaView';
import { ClubCourtsView } from './components/ClubCourtsView';
import { ClubsBookingView } from './components/ClubsBookingView';
import { ClubVerificationRequestsView } from './components/ClubVerificationRequestsView';
import { PlayerClubVerificationView } from './components/PlayerClubVerificationView';
import { PublicProfileView } from './components/PublicProfileView';
import { PlayerProfileEditView } from './components/PlayerProfileEditView';
import { MatchInvitePreviewPanel } from './components/MatchInvitePreviewPanel';
import { TournamentInvitePreviewPanel } from './components/TournamentInvitePreviewPanel';
import { TournamentRegistrationView } from './components/TournamentRegistrationView';
import { computeMatchRatingUpdatesElo, EloMatchInput } from './utils/eloCalculator';
import {
    ACCESS_TOKEN_STORAGE_KEY,
    backendApi,
    BackendApiError,
    clearAccessToken,
    getStoredRefreshToken,
    storeAuthTokens,
    type AccountDeletionResponse,
    type MatchInviteLinkResponse,
    type MatchInvitePreviewResponse,
    type MyMatchesScope,
    type NotificationPreferencesResponse,
    type NotificationResponse,
    type PendingActionResponse,
    type TournamentStandingsTiebreak,
    type TournamentInviteLinkResponse,
    type TournamentInvitePreviewResponse,
    type UpsertMyTournamentEntryRequest,
    type UpdatePlayerProfileRequest,
} from './services/backendApi';
import { buildFrontendUser, clearStoredDisplayName, isNotFoundError, readStoredDisplayName, storeDisplayName, toFrontendVerificationStatus } from './services/authOnboardingSession';
import { buildAutoTeamAssignments, buildClubLookup, buildSubmitResultRequest, combineFrontendMatchDateTime, isBackendManagedMatch, isBackendMatchCreator, mapScopedPlayerMatches, mergeBackendMatches } from './services/matchBackendIntegration';
import { buildActionableResultMatches, buildActionableResultMatchesById, getUnreadNotificationsCount } from './services/pendingActionIntegration';
import { formatCategoryBadge, formatClubRankingPrimaryValue, formatPreferredSide, getFavoriteClubRanking, getTopPartner, getTopRival, resolveProfileAvatar } from './services/profileInsightsIntegration';
import { findRankingPosition, mapRankingRows, mapRatingHistory } from './services/ratingHistoryIntegration';
import { MOBILE_URL_EVENT_NAME } from './services/mobileRuntime';
import { PUSH_OPENED_EVENT_NAME, registerNativePushDevice, unregisterNativePushDevice } from './services/mobilePushNotifications';
import {
    buildCreateBackendTournamentRequest,
    buildSubmitTournamentResultRequest,
    buildSyncTournamentEntriesRequest,
    buildTournamentClubOptions,
    buildTournamentSelectablePlayers,
    getBackendClubId,
    getBackendTournamentId,
    isBackendTournamentMatch,
    isTournamentParticipant,
    sortMatchesByScheduledDateAsc,
    toFrontendTournament,
    toFrontendTournamentMatches,
} from './services/tournamentBackendIntegration';
import { Plus, Search, Filter, Trophy, Star, TrendingUp, Calendar, MapPin, ChevronRight, ChevronDown, ChevronLeft, BarChart3, Settings, Users, Zap, GraduationCap, Swords, Clock, CheckCircle, AlertCircle, AlertTriangle, CalendarRange, Sparkles, Bell, BadgeCheck, Lock, TrendingDown, ArrowLeft, Info, Check, Share2, Wallet, UserPlus, Grid, X, Crown, BrainCircuit, Medal, Handshake, Skull, List, Gift, Network, Link, Copy, Trash2, Store, DollarSign, Archive, ShieldCheck, Pencil } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid, LabelList } from 'recharts';

// --- MOCK DATA ---
const MOCK_USER: User = {
  id: 'u1',
  role: 'PLAYER',
  accountType: 'player',
  managedClubId: null,
  managedClubName: null,
  name: 'Santiago López',
  avatar: 'https://picsum.photos/100/100',
  level: 4.5,
  categoryNumber: 4,
  categoryName: 'Cuarta',
  isCategoryVerified: true,
  verificationStatus: 'verified',
  publicCategoryNumber: 4,
  matchesPlayed: 42,
  reputation: 98,
  clubAffiliation: 'c1',
  isPremium: false
};




// --- AGENDA MOCK DATA ---
type AgendaStatus = 'confirmed' | 'pending_players' | 'pending_approval' | 'scheduled';
type AgendaType = 'match' | 'class' | 'tournament';

interface AgendaItem {
    id: string;
    type: AgendaType;
    title: string;
    location: string;
    date: string; // "Mañana", "Jueves 16", etc.
    time: string;
    status: AgendaStatus;
    meta?: string; // "3/4 Jugadores", "Instructor: Pablo", etc.
}

// Helper to generate history with proper dates
const generateHistory = () => {
    const today = new Date();
    const history = [];
    let currentRating = 4.50; // Start from current rating
    
    // Generate 40 matches over the last year, working backwards
    for (let i = 0; i <= 40; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 9)); // Roughly every 9 days
        
        const isWin = Math.random() > 0.4;
        const diff = isWin ? (Math.floor(Math.random() * 5) + 1) / 100 : -((Math.floor(Math.random() * 5) + 1) / 100);
        
        history.unshift({ // Add to beginning
            id: i,
            date: date.toISOString(),
            result: isWin ? 'W' : 'L',
            diff: diff,
            total: currentRating,
            opponent: isWin ? 'Rival Vencido' : 'Rival Fuerte'
        });
        
        currentRating -= diff; // Subtract to go backwards
    }
    return history;
};

const MATCH_ELO_HISTORY = generateHistory();

const ENABLE_LEGACY_LOCAL_RATING = import.meta.env.MODE === 'development';
const ENABLE_LEGACY_LOCAL_FLOWS = import.meta.env.MODE === 'development';
const IS_PRODUCTION_LIKE_ENV = import.meta.env.MODE === 'staging' || import.meta.env.MODE === 'production';

const criticalRefreshFallback = <T,>(fallback: T) => (error: unknown): T => {
  if (IS_PRODUCTION_LIKE_ENV) {
    throw error;
  }

  console.warn('Critical refresh fallback used in development.', error);
  return fallback;
};


// Helper to determine category based on level (1 is Best/Pro)
const getCategory = (level: number) => {
    if (level >= 6.40) return "1ª";
    if (level >= 5.50) return "2ª";
    if (level >= 4.80) return "3ª";
    if (level >= 4.10) return "4ª";
    if (level >= 3.40) return "5ª";
    if (level >= 2.60) return "6ª";
    return "7ª";
}

const CLUB_VISUAL_GRADIENTS = [
    'from-padel-700/80 via-padel-900/70 to-dark-900',
    'from-blue-700/80 via-blue-900/70 to-dark-900',
    'from-emerald-700/80 via-emerald-900/70 to-dark-900',
    'from-amber-700/80 via-amber-900/60 to-dark-900',
    'from-rose-700/80 via-rose-900/60 to-dark-900',
];

const getClubVisualGradient = (clubName: string) => {
    const seed = Array.from(clubName).reduce((total, char) => total + char.charCodeAt(0), 0);
    return CLUB_VISUAL_GRADIENTS[seed % CLUB_VISUAL_GRADIENTS.length];
};

const getClubInitials = (clubName: string) =>
    clubName
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join('') || 'CL';

const MATCH_INVITE_QUERY_PARAM = 'matchInvite';
const TOURNAMENT_INVITE_QUERY_PARAM = 'tournamentInvite';

const readMatchInviteTokenFromUrl = (): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    const url = new URL(window.location.href);
    return url.searchParams.get(MATCH_INVITE_QUERY_PARAM);
};

const clearMatchInviteTokenFromUrl = (): void => {
    if (typeof window === 'undefined') {
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete(MATCH_INVITE_QUERY_PARAM);
    const nextSearch = url.searchParams.toString();
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
    window.history.replaceState({}, '', nextUrl);
};

const readTournamentInviteTokenFromUrl = (): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    const url = new URL(window.location.href);
    return url.searchParams.get(TOURNAMENT_INVITE_QUERY_PARAM);
};

const clearTournamentInviteTokenFromUrl = (): void => {
    if (typeof window === 'undefined') {
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete(TOURNAMENT_INVITE_QUERY_PARAM);
    const nextSearch = url.searchParams.toString();
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
    window.history.replaceState({}, '', nextUrl);
};

type TournamentTimePreferenceOption = {
    value: string;
    label: string;
};

const TOURNAMENT_TIME_PREFERENCE_BANDS = [
    { key: 'MORNING', label: 'Manana', hours: '10:00' },
    { key: 'AFTERNOON', label: 'Tarde', hours: '15:00' },
    { key: 'EVENING', label: 'Noche', hours: '20:00' },
] as const;

const buildTournamentTimePreferenceOptions = (
    startDate?: string | null,
    endDate?: string | null,
): TournamentTimePreferenceOption[] => {
    if (!startDate) {
        return [];
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${(endDate || startDate)}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        return [];
    }

    const formatter = new Intl.DateTimeFormat('es-UY', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });

    const options: TournamentTimePreferenceOption[] = [];
    for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
        const isoDate = current.toISOString().slice(0, 10);
        const dateLabel = formatter.format(current);
        TOURNAMENT_TIME_PREFERENCE_BANDS.forEach(band => {
            options.push({
                value: `${isoDate}|${band.key}`,
                label: `${dateLabel} - ${band.label} (${band.hours})`,
            });
        });
    }
    return options;
};

// --- VIEWS ---

interface ViewProps {
    currentUser: User;
    rankingPosition?: number | null;
    rankingRows?: ReturnType<typeof mapRankingRows>;
    ratingHistory?: ReturnType<typeof mapRatingHistory>;
    topPartners?: Awaited<ReturnType<typeof backendApi.getMyTopPartners>>;
    topRivals?: Awaited<ReturnType<typeof backendApi.getMyTopRivals>>;
    clubRankings?: Awaited<ReturnType<typeof backendApi.getMyClubRankings>>;
    myMatchesByScope?: ScopedMyMatches;
    pendingResultMatches?: Match[];
    pendingResultMatchesById?: Map<string, Match>;
    notifications?: NotificationResponse[];
    unreadNotificationsCount?: number;
    navigateTo?: (tab: string) => void;
    onOpenCoaches?: () => void;
    onOpenNotifications?: () => void;
    agenda?: AgendaItem[];
    clubs?: Club[];
    matches?: Match[];
    tournaments?: any[];
    onJoin?: (id: string, slotIndex: number) => void;
    onRequest?: (id: string) => void;
    onLeaveMatch?: (matchId: string) => void;
    onCancelMatch?: (matchId: string) => void;
    onInviteMatch?: (match: Match) => void;
    inviteLoadingMatchId?: string | null;
    onSubmitResult?: (matchId: string, result: [number, number][]) => void;
    onConfirmResult?: (matchId: string) => void;
    onRejectResult?: (matchId: string) => void;
    onBook?: (match: Match) => void;
    onOpenClubRankings?: () => void;
    onOpenTopPartners?: () => void;
    onOpenTopRivals?: () => void;
    onCreateTournament?: () => void;
    onOpenClubUsers?: () => void;
    onOpenClubAgenda?: () => void;
    onOpenClubCourts?: () => void;
    onOpenClubVerification?: () => void;
    onUserClick?: (user: User) => void;
    onOpenNationalRanking?: () => void;
    onOpenMatchHistory?: () => void;
    onOpenPlayerClubVerification?: () => void;
    onOpenEditProfile?: () => void;
    notificationPreferences?: NotificationPreferencesResponse | null;
    notificationPreferencesLoading?: boolean;
    notificationPreferencesSaving?: boolean;
    onUpdateNotificationPreferences?: (next: {
        allowActivityTracking: boolean;
        allowOperationalNotifications: boolean;
    }) => Promise<void>;
    accountDeletionRequest?: AccountDeletionResponse | null;
    accountDeletionLoading?: boolean;
    accountDeletionSaving?: boolean;
    onRequestAccountDeletion?: (reason: string) => Promise<void>;
    onLaunchTournament?: (tournament: any) => void;
    onOpenTournamentStatus?: (tournament: any) => void;
    onAddTeamsToTournament?: (tournament: any) => void;
    onAddResult?: (match: Match) => void;
    onArchiveTournament?: (tournamentId: string) => void;
    onJoinTournament?: (tournament: any) => void;
    onLeaveTournament?: (tournament: any) => void;
}

type ScopedMyMatches = {
    upcoming: Match[];
    completed: Match[];
    cancelled: Match[];
    pendingResult: Match[];
};

const EMPTY_SCOPED_MY_MATCHES: ScopedMyMatches = {
    upcoming: [],
    completed: [],
    cancelled: [],
    pendingResult: [],
};

const TournamentStatusView: React.FC<{ 
    tournament: any, 
    currentUser: User, 
    matches: Match[], 
    onClose: () => void,
    onAddResult?: (match: Match) => void,
    onUserClick?: (user: User) => void,
    pendingResultMatchesById?: Map<string, Match>,
    onCreateInviteLink?: (tournament: any) => void,
    tournamentInviteLoading?: boolean,
    onUpdateMyTeamName?: (tournament: any, nextTeamName: string) => void,
    onCompleteMyRegistration?: (tournament: any) => void,
    savingTeamName?: boolean,
}> = ({
    tournament,
    currentUser,
    matches,
    onClose,
    onAddResult,
    onUserClick,
    pendingResultMatchesById,
    onCreateInviteLink,
    tournamentInviteLoading = false,
    onUpdateMyTeamName,
    onCompleteMyRegistration,
    savingTeamName = false,
}) => {
    const [activeTab, setActiveTab] = useState<'matches' | 'standings'>('matches');
    const [editableTeamName, setEditableTeamName] = useState('');
    const isCreator = tournament.creatorId === currentUser.id;
    const isBackendTournament = Boolean(tournament?.isBackendTournament);
    const isBackendLeagueTournament = Boolean(tournament?.isBackendTournament && tournament?.format === 'league');
    const isBackendEliminationTournament = Boolean(tournament?.isBackendTournament && tournament?.format === 'tournament');
    const isBackendAmericanoDynamicTournament = Boolean(
        tournament?.isBackendTournament
        && tournament?.format === 'americano'
        && tournament?.americanoType === 'dinamico',
    );
    const isBackendAmericanoFixedTournament = Boolean(
        tournament?.isBackendTournament
        && tournament?.format === 'americano'
        && tournament?.americanoType === 'fijo',
    );
    const backendLeagueStandings = tournament?.backendStandings?.standings ?? [];
    const backendAmericanoStandings = tournament?.backendStandings?.standings ?? [];
    const backendAmericanoDynamicStandings = tournament?.backendStandings?.standings ?? [];
    const backendEliminationGroups = tournament?.backendStandings?.groups ?? [];

    const config = tournament.launchConfig?.generatedData || {};
    const groups = config.groups || [];
    const groupMatches = config.groupMatches || [];
    const playoffs = config.playoffs || [];

    const isAmericano = tournament.format === 'americano';
    const isAmericanoDinamico = tournament.format === 'americano' && tournament.americanoType === 'dinamico';
    const currentUserTeam = Array.isArray(tournament?.teams)
        ? tournament.teams.find((team: any) =>
            Array.isArray(team.players) && team.players.some((player: User | null) => player?.id === currentUser.id),
        )
        : null;
    const canEditOwnTeamName = Boolean(
        isBackendTournament
        && currentUserTeam
        && tournament?.currentUserEntryStatus === 'CONFIRMED'
        && tournament?.backendStatus === 'OPEN',
    );
    const canCompleteOwnRegistration = Boolean(
        isBackendTournament
        && currentUserTeam
        && tournament?.currentUserEntryStatus === 'PENDING'
        && tournament?.backendStatus === 'OPEN',
    );
    const leagueTiebreakLabel = tournament?.standingsTiebreak === 'SETS_DIFFERENCE'
        ? 'Desempate oficial: diferencia de sets.'
        : 'Desempate oficial: diferencia de games.';

    useEffect(() => {
        setEditableTeamName(currentUserTeam?.teamName || '');
    }, [currentUserTeam?.teamName, tournament?.id]);

    // Find matches for this tournament
    const tournamentMatches = matches.filter(m => m.tournamentId === tournament.id);
    const completedTournamentMatches = tournamentMatches.filter(m => m.status === 'completed');
    
    const isTournamentFinished = tournamentMatches.length > 0 && completedTournamentMatches.length === tournamentMatches.length;

    // Calculate standings dynamically
    const calculateStandings = (groupTeams: any[]) => {
        // Only include group stage matches for standings
        const groupMatches = completedTournamentMatches.filter(m => {
            const r = m.round?.toLowerCase() || '';
            return !r.includes('semifinal') && !r.includes('final') && !r.includes('cuartos');
        });

        if (isAmericanoDinamico) {
            // Individual rankings for dynamic americano
            const players = tournament.teams?.flatMap((t: any) => t.players) || [];
            const playerStandings = players.map((p: any) => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                pts: 0,
                pj: 0,
                pg: 0,
                pp: 0,
                setsWon: 0,
                setsLost: 0,
                netSets: 0,
                gamesWon: 0,
                gamesLost: 0,
                netGames: 0
            }));

            const matchesPerParticipant = tournament.matchesPerParticipant || 3;
            const playerMatchCountTracker = new Map<string, number>();

            groupMatches.forEach(match => {
                if (!match.result) return;

                let gamesA = 0;
                let gamesB = 0;
                match.result.forEach(set => {
                    gamesA += set[0];
                    gamesB += set[1];
                });

                const teamAPlayers = [match.players[0], match.players[1]];
                const teamBPlayers = [match.players[2], match.players[3]];

                teamAPlayers.forEach(p => {
                    if (!p) return;
                    const count = playerMatchCountTracker.get(p.id) || 0;
                    if (count >= matchesPerParticipant) return;
                    
                    const standing = playerStandings.find((s: any) => s.id === p.id);
                    if (standing) {
                        playerMatchCountTracker.set(p.id, count + 1);
                        standing.pj++;
                        standing.gamesWon += gamesA;
                        standing.gamesLost += gamesB;
                        standing.netGames = standing.gamesWon - standing.gamesLost;
                        if (gamesA > gamesB) {
                            standing.pg++;
                            standing.pts += 2;
                        } else if (gamesB > gamesA) {
                            standing.pp++;
                        } else {
                            // Tie in games
                            standing.pts += 1;
                        }
                    }
                });

                teamBPlayers.forEach(p => {
                    if (!p) return;
                    const count = playerMatchCountTracker.get(p.id) || 0;
                    if (count >= matchesPerParticipant) return;

                    const standing = playerStandings.find((s: any) => s.id === p.id);
                    if (standing) {
                        playerMatchCountTracker.set(p.id, count + 1);
                        standing.pj++;
                        standing.gamesWon += gamesB;
                        standing.gamesLost += gamesA;
                        standing.netGames = standing.gamesWon - standing.gamesLost;
                        if (gamesB > gamesA) {
                            standing.pg++;
                            standing.pts += 2;
                        } else if (gamesA > gamesB) {
                            standing.pp++;
                        } else {
                            // Tie in games
                            standing.pts += 1;
                        }
                    }
                });
            });

            return playerStandings.sort((a: any, b: any) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.netGames !== a.netGames) return b.netGames - a.netGames;
                return b.gamesWon - a.gamesWon;
            });
        }

        const standings = groupTeams.map(team => ({
            name: team.name,
            pts: 0,
            pj: 0,
            pg: 0,
            pp: 0,
            setsWon: 0,
            setsLost: 0,
            netSets: 0,
            gamesWon: 0,
            gamesLost: 0,
            netGames: 0
        }));

        groupMatches.forEach(match => {
            const teamAName = match.team1Name || `${match.players[0]?.name} / ${match.players[1]?.name}`;
            const teamBName = match.team2Name || `${match.players[2]?.name} / ${match.players[3]?.name}`;

            const teamA = standings.find(t => t.name === teamAName || t.name === match.userTeamName); // Fallback for user team name
            const teamB = standings.find(t => t.name === teamBName);

            if (match.result) {
                let gamesA = 0;
                let gamesB = 0;
                match.result.forEach(set => {
                    gamesA += set[0];
                    gamesB += set[1];
                });

                let setsA = 0;
                let setsB = 0;
                match.result.forEach(set => {
                    if (set[0] > set[1]) setsA++;
                    else if (set[1] > set[0]) setsB++;
                });

                if (teamA) {
                    teamA.pj++;
                    if (isAmericano) {
                        teamA.gamesWon += gamesA;
                        teamA.gamesLost += gamesB;
                        teamA.netGames = teamA.gamesWon - teamA.gamesLost;
                        if (gamesA > gamesB) {
                            teamA.pg++;
                            teamA.pts += 2;
                        } else if (gamesB > gamesA) {
                            teamA.pp++;
                        } else {
                            teamA.pts += 1;
                        }
                    } else {
                        teamA.setsWon += setsA;
                        teamA.setsLost += setsB;
                        teamA.netSets = teamA.setsWon - teamA.setsLost;
                        if (setsA > setsB) {
                            teamA.pg++;
                            teamA.pts += 3;
                            if (teamB && setsB > 0) {
                                teamB.pts += 1;
                            }
                        } else {
                            teamA.pp++;
                        }
                    }
                }

                if (teamB) {
                    teamB.pj++;
                    if (isAmericano) {
                        teamB.gamesWon += gamesB;
                        teamB.gamesLost += gamesA;
                        teamB.netGames = teamB.gamesWon - teamB.gamesLost;
                        if (gamesB > gamesA) {
                            teamB.pg++;
                            teamB.pts += 2;
                        } else if (gamesA > gamesB) {
                            teamB.pp++;
                        } else {
                            teamB.pts += 1;
                        }
                    } else {
                        teamB.setsWon += setsB;
                        teamB.setsLost += setsA;
                        teamB.netSets = teamB.setsWon - teamB.setsLost;
                        if (setsB > setsA) {
                            teamB.pg++;
                            teamB.pts += 3;
                            if (teamA && setsA > 0) {
                                teamA.pts += 1;
                            }
                        } else {
                            teamB.pp++;
                        }
                    }
                }
            }
        });

        standings.forEach(t => {
            t.netSets = t.setsWon - t.setsLost;
        });

        // Sort: Points (desc), then Net Sets/Games (desc)
        return standings.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (isAmericano) {
                if (b.netGames !== a.netGames) return b.netGames - a.netGames;
                return b.gamesWon - a.gamesWon;
            }
            if (tournament?.standingsTiebreak === 'SETS_DIFFERENCE') {
                if (b.netSets !== a.netSets) return b.netSets - a.netSets;
                if (b.netGames !== a.netGames) return b.netGames - a.netGames;
                return b.gamesWon - a.gamesWon;
            }
            if (b.netGames !== a.netGames) return b.netGames - a.netGames;
            if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
            return b.netSets - a.netSets;
        });
    };

    const currentStandings = isAmericanoDinamico ? calculateStandings([]) : [];
    const winner = isTournamentFinished
        ? isBackendAmericanoDynamicTournament && backendAmericanoDynamicStandings.length > 0
            ? {
                name: backendAmericanoDynamicStandings[0].teamName,
                avatar: undefined,
                pts: backendAmericanoDynamicStandings[0].points,
            }
            : isAmericanoDinamico && currentStandings.length > 0
                ? currentStandings[0]
                : null
        : null;

    return (
        <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-900/80 backdrop-blur-md sticky top-0 z-10">
                <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-white font-bold text-lg">Estatus del Torneo</h2>
                <div className="w-10"></div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-dark-700 bg-dark-800">
                <button 
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'matches' ? 'text-padel-500 border-b-2 border-padel-500' : 'text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('matches')}
                >
                    Partidos
                </button>
                <button 
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'standings' ? 'text-padel-500 border-b-2 border-padel-500' : 'text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('standings')}
                >
                    Clasificación
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                {winner && (
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-center shadow-xl shadow-amber-500/20 animate-bounce-subtle">
                        <Trophy size={48} className="text-white mx-auto mb-3 drop-shadow-lg" />
                        <h3 className="text-white font-black text-2xl uppercase tracking-tighter">¡Torneo Finalizado!</h3>
                        <p className="text-amber-100 text-sm font-medium mb-4">El ganador absoluto es:</p>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 inline-flex items-center gap-4">
                            <img 
                                src={winner.avatar || 'https://picsum.photos/100/100'} 
                                alt="Winner" 
                                className="w-16 h-16 rounded-full border-2 border-white shadow-lg"
                            />
                            <div className="text-left">
                                <p className="text-white font-black text-xl leading-tight">
                                    {winner.name}
                                </p>
                                <p className="text-amber-200 text-xs font-bold uppercase tracking-widest">
                                    {winner.pts} Puntos
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {isBackendTournament && (
                    <div className="rounded-2xl border border-dark-700 bg-dark-800/70 p-4 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-dark-700 bg-dark-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-200">
                                {tournament.format === 'league' ? 'Liga' : tournament.format === 'tournament' ? 'Eliminatoria' : 'Americano'}
                            </span>
                            <span className="rounded-full border border-dark-700 bg-dark-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-300">
                                {tournament.isCompetitive ? 'Por los puntos' : 'Recreativo'}
                            </span>
                            <span className="rounded-full border border-dark-700 bg-dark-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-300">
                                {tournament.openEnrollment ? 'Inscripcion abierta' : 'Inscripcion cerrada'}
                            </span>
                        </div>

                        {Array.isArray(tournament.categoryLabels) && tournament.categoryLabels.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tournament.categoryLabels.map((categoryLabel: string) => (
                                    <span
                                        key={categoryLabel}
                                        className="rounded-full border border-dark-700 bg-dark-900 px-3 py-1 text-[11px] text-gray-200"
                                    >
                                        {categoryLabel}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="rounded-2xl border border-dark-700 bg-dark-900/60 p-3 text-xs text-gray-400">
                            {tournament.affectsPlayerRating ? (
                                <p>
                                    Este torneo actualiza el rating oficial cuando los resultados de cada cruce quedan confirmados.
                                </p>
                            ) : (
                                <p>
                                    Este formato no modifica el rating oficial. Solo actualiza la tabla y el avance interno del torneo.
                                </p>
                            )}
                        </div>

                        {isBackendLeagueTournament && (
                            <div className="rounded-2xl border border-dark-700 bg-dark-900/60 p-3 text-xs text-gray-400">
                                <p className="text-white font-bold mb-1">Liga MVP</p>
                                <p>Fixture oficial: todos contra todos durante dos rondas. Tabla 3-1-0.</p>
                                <p className="mt-1">{leagueTiebreakLabel}</p>
                            </div>
                        )}

                        {isCreator && tournament.backendStatus === 'OPEN' && tournament.openEnrollment && (
                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => onCreateInviteLink?.(tournament)}
                                    disabled={tournamentInviteLoading}
                                    className="w-full font-bold"
                                >
                                    {tournamentInviteLoading ? 'Generando link...' : 'Generar link de inscripcion'}
                                </Button>
                                <p className="text-[11px] text-gray-500">
                                    El link oficial inscribe jugadores en el torneo y queda validado por backend.
                                </p>
                            </div>
                        )}

                        {canEditOwnTeamName && (
                            <div className="space-y-2 rounded-2xl border border-dark-700 bg-dark-900/60 p-3">
                                <p className="text-white text-sm font-bold">Nombre del equipo</p>
                                <p className="text-[11px] text-gray-400">
                                    Cuando la dupla ya esta confirmada podes guardar el nombre oficial del equipo.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editableTeamName}
                                        onChange={(event) => setEditableTeamName(event.target.value)}
                                        placeholder="Nombre del equipo"
                                        className="flex-1 rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-padel-500 focus:outline-none"
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => onUpdateMyTeamName?.(tournament, editableTeamName)}
                                        disabled={savingTeamName || !editableTeamName.trim() || editableTeamName.trim() === (currentUserTeam?.teamName || '')}
                                        className="font-bold"
                                    >
                                        {savingTeamName ? 'Guardando...' : 'Guardar'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {canCompleteOwnRegistration && (
                            <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                                <p className="text-white text-sm font-bold">Completar inscripcion</p>
                                <p className="text-[11px] text-gray-300">
                                    Tu equipo sigue pendiente. Sumale companero y horarios antes del launch.
                                </p>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => onCompleteMyRegistration?.(tournament)}
                                    className="w-full font-bold"
                                >
                                    Completar equipo
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'matches' && (
                    <div className="space-y-6">
                        {tournamentMatches.length > 0 ? (
                            <div className="space-y-4">
                                <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Swords size={16} className="text-padel-500" />
                                    Partidos del Torneo
                                </h4>
                                <div className="space-y-3">
                                    {tournamentMatches.map((match: Match) => (
                                        (() => {
                                            const actionableMatch = pendingResultMatchesById?.get(match.id);
                                            const canHandleResult = Boolean(actionableMatch);
                                            const resultActionLabel = actionableMatch?.status === 'awaiting_validation'
                                                ? 'Validar Resultado'
                                                : 'Cargar Resultado';
                                            return (
                                        <div key={match.id} className="bg-dark-800 border border-dark-700 rounded-xl p-3 flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-padel-500 text-[10px] font-bold uppercase">{match.round}</span>
                                                <span className="text-gray-400 text-[10px] flex items-center gap-1">
                                                    <Calendar size={10}/> {new Date(match.date).toLocaleDateString()} {match.time}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between bg-dark-900/50 rounded-lg p-2 border border-dark-700/50">
                                                <div className="flex-1 text-center">
                                                    <span className="text-white text-xs font-medium block truncate">
                                                        {match.team1Name || (match.players[0] ? `${match.players[0].name}${match.players[1] ? ` / ${match.players[1].name}` : ''}` : 'TBD')}
                                                    </span>
                                                </div>
                                                <div className="px-3 flex flex-col items-center">
                                                    <span className="text-gray-500 text-[10px] font-bold">VS</span>
                                                    {match.status === 'completed' && match.result && (
                                                        <div className="text-padel-400 font-bold text-xs mt-1">
                                                            {match.result.map(s => `${s[0]}-${s[1]}`).join(' ')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-center">
                                                    <span className="text-white text-xs font-medium block truncate">
                                                        {match.team2Name || (match.players[2] ? `${match.players[2].name}${match.players[3] ? ` / ${match.players[3].name}` : ''}` : 'TBD')}
                                                    </span>
                                                </div>
                                            </div>
                                            {((isBackendTournament && canHandleResult)
                                                || (!isBackendTournament && isCreator)) && match.status !== 'completed' && (
                                                <div className="mt-2 pt-2 border-t border-dark-700 flex justify-end">
                                                    <button 
                                                        onClick={() => onAddResult && onAddResult(actionableMatch ?? match)}
                                                        className="text-xs text-amber-500 font-bold hover:text-amber-400 transition-colors"
                                                    >
                                                        {isBackendTournament ? resultActionLabel : match.status === 'awaiting_validation' ? 'Validar Resultado' : 'Cargar Resultado'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                            );
                                        })()
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Swords size={48} className="text-dark-600 mx-auto mb-4" />
                                <p className="text-gray-400 text-sm">No hay partidos generados para este torneo.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'standings' && (
                    <div className="space-y-6">
                        {isBackendLeagueTournament ? (
                            <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                                <div className="bg-dark-700/50 px-4 py-2 border-b border-dark-700">
                                    <h5 className="text-white font-bold text-sm">Tabla General</h5>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-dark-900/50 text-gray-400">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Equipo</th>
                                                <th className="px-2 py-2 font-medium text-center">PTS</th>
                                                <th className="px-2 py-2 font-medium text-center">PJ</th>
                                                <th className="px-2 py-2 font-medium text-center">PG</th>
                                                <th className="px-2 py-2 font-medium text-center">Dif. Games</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-700">
                                            {backendLeagueStandings.map((team: any) => (
                                                <tr key={team.tournamentEntryId} className="text-gray-200">
                                                    <td className="px-3 py-2 font-medium truncate max-w-[160px]">{team.teamName}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-white">{team.points}</td>
                                                    <td className="px-2 py-2 text-center">{team.played}</td>
                                                    <td className="px-2 py-2 text-center text-emerald-400">{team.wins}</td>
                                                    <td className="px-2 py-2 text-center text-blue-400">
                                                        {team.gamesDifference > 0 ? `+${team.gamesDifference}` : team.gamesDifference}
                                                    </td>
                                                </tr>
                                            ))}
                                            {backendLeagueStandings.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                                                        La tabla se actualizará cuando haya resultados confirmados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : isBackendEliminationTournament ? (
                            backendEliminationGroups.map((group: any, idx: number) => (
                            <div key={idx} className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                                <div className="bg-dark-700/50 px-4 py-2 border-b border-dark-700">
                                    <h5 className="text-white font-bold text-sm">{group.groupName}</h5>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-dark-900/50 text-gray-400">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Equipo</th>
                                                <th className="px-2 py-2 font-medium text-center">PTS</th>
                                                <th className="px-2 py-2 font-medium text-center">PJ</th>
                                                <th className="px-2 py-2 font-medium text-center">PG</th>
                                                <th className="px-2 py-2 font-medium text-center">Dif. Games</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-700">
                                            {group.standings.map((team: any) => (
                                                <tr key={team.tournamentEntryId} className="text-gray-200">
                                                    <td className="px-3 py-2 font-medium truncate max-w-[120px]">{team.teamName}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-white">{team.points}</td>
                                                    <td className="px-2 py-2 text-center">{team.played}</td>
                                                    <td className="px-2 py-2 text-center text-emerald-400">{team.wins}</td>
                                                    <td className="px-2 py-2 text-center text-blue-400">
                                                        {team.gamesDifference > 0 ? `+${team.gamesDifference}` : team.gamesDifference}
                                                    </td>
                                                </tr>
                                            ))}
                                            {group.standings.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                                                        La tabla se actualizará cuando haya resultados confirmados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ))
                        ) : isBackendAmericanoDynamicTournament ? (
                            <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                                <div className="bg-dark-700/50 px-4 py-2 border-b border-dark-700">
                                    <h5 className="text-white font-bold text-sm">Clasificación Individual</h5>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-dark-900/50 text-gray-400">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Jugador</th>
                                                <th className="px-2 py-2 font-medium text-center">PTS</th>
                                                <th className="px-2 py-2 font-medium text-center">PJ</th>
                                                <th className="px-2 py-2 font-medium text-center">PG</th>
                                                <th className="px-2 py-2 font-medium text-center">Dif. Games</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-700">
                                            {backendAmericanoDynamicStandings.map((player: any) => (
                                                <tr key={player.tournamentEntryId} className="text-gray-200">
                                                    <td className="px-3 py-2 font-medium truncate max-w-[160px]">{player.teamName}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-white">{player.points}</td>
                                                    <td className="px-2 py-2 text-center">{player.played}</td>
                                                    <td className="px-2 py-2 text-center text-emerald-400">{player.wins}</td>
                                                    <td className="px-2 py-2 text-center text-blue-400">
                                                        {player.gamesDifference > 0 ? `+${player.gamesDifference}` : player.gamesDifference}
                                                    </td>
                                                </tr>
                                            ))}
                                            {backendAmericanoDynamicStandings.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                                                        La tabla se actualizará cuando haya resultados confirmados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : isBackendAmericanoFixedTournament ? (
                            <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                                <div className="bg-dark-700/50 px-4 py-2 border-b border-dark-700">
                                    <h5 className="text-white font-bold text-sm">Tabla General</h5>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-dark-900/50 text-gray-400">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Equipo</th>
                                                <th className="px-2 py-2 font-medium text-center">PTS</th>
                                                <th className="px-2 py-2 font-medium text-center">PJ</th>
                                                <th className="px-2 py-2 font-medium text-center">PG</th>
                                                <th className="px-2 py-2 font-medium text-center">Dif. Games</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-700">
                                            {backendAmericanoStandings.map((team: any) => (
                                                <tr key={team.tournamentEntryId} className="text-gray-200">
                                                    <td className="px-3 py-2 font-medium truncate max-w-[160px]">{team.teamName}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-white">{team.points}</td>
                                                    <td className="px-2 py-2 text-center">{team.played}</td>
                                                    <td className="px-2 py-2 text-center text-emerald-400">{team.wins}</td>
                                                    <td className="px-2 py-2 text-center text-blue-400">
                                                        {team.gamesDifference > 0 ? `+${team.gamesDifference}` : team.gamesDifference}
                                                    </td>
                                                </tr>
                                            ))}
                                            {backendAmericanoStandings.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                                                        La tabla se actualizará cuando haya resultados confirmados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : isAmericanoDinamico ? (
                            <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                                <div className="bg-dark-700/50 px-4 py-2 border-b border-dark-700">
                                    <h5 className="text-white font-bold text-sm">Clasificación Individual</h5>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-dark-900/50 text-gray-400">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Jugador</th>
                                                <th className="px-2 py-2 font-medium text-center">PTS</th>
                                                <th className="px-2 py-2 font-medium text-center">PJ</th>
                                                <th className="px-2 py-2 font-medium text-center">PG</th>
                                                <th className="px-2 py-2 font-medium text-center">{isAmericano ? 'Dif. Games' : 'Net Sets'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-700">
                                            {currentStandings.map((player: any, pIdx: number) => (
                                                <tr key={pIdx} className="text-gray-200">
                                                    <td className="px-3 py-2 font-medium truncate max-w-[120px]">{player.name}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-white">{player.pts}</td>
                                                    <td className="px-2 py-2 text-center">{player.pj}</td>
                                                    <td className="px-2 py-2 text-center text-emerald-400">{player.pg}</td>
                                                    <td className="px-2 py-2 text-center text-blue-400">
                                                        {isAmericano ? (player.netGames > 0 ? `+${player.netGames}` : player.netGames) : (player.netSets > 0 ? `+${player.netSets}` : player.netSets)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            groups.map((group: any, idx: number) => (
                            <div key={idx} className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                                <div className="bg-dark-700/50 px-4 py-2 border-b border-dark-700">
                                    <h5 className="text-white font-bold text-sm">{group.name}</h5>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-dark-900/50 text-gray-400">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Equipo</th>
                                                <th className="px-2 py-2 font-medium text-center">PTS</th>
                                                <th className="px-2 py-2 font-medium text-center">PJ</th>
                                                <th className="px-2 py-2 font-medium text-center">PG</th>
                                                <th className="px-2 py-2 font-medium text-center">{isAmericano ? 'Dif. Games' : 'Net Sets'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-700">
                                            {calculateStandings(group.teams).map((team: any, tIdx: number) => (
                                                <tr key={tIdx} className="text-gray-200">
                                                    <td className="px-3 py-2 font-medium truncate max-w-[120px]">{team.name}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-white">{team.pts}</td>
                                                    <td className="px-2 py-2 text-center">{team.pj}</td>
                                                    <td className="px-2 py-2 text-center text-emerald-400">{team.pg}</td>
                                                    <td className="px-2 py-2 text-center text-blue-400">
                                                        {isAmericano ? (team.netGames > 0 ? `+${team.netGames}` : team.netGames) : (team.netSets > 0 ? `+${team.netSets}` : team.netSets)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ))
                        )}

                        {/* Playoff Matches Section */}
                        {(() => {
                            const playoffMatches = tournamentMatches.filter(m => {
                                const r = m.round?.toLowerCase() || '';
                                return r.includes('semifinal') || r.includes('final') || r.includes('cuartos') || r.includes('octavos');
                            });

                            if (playoffMatches.length === 0) return null;

                            return (
                                <div className="mt-8 space-y-4">
                                    <h4 className="text-white font-bold text-lg">Fase Final (Playoffs)</h4>
                                    <div className="space-y-3">
                                        {playoffMatches.map(match => (
                                            <MatchCard 
                                                key={match.id} 
                                                match={match} 
                                                currentUser={currentUser} 
                                                onJoin={() => {}} 
                                                onRequest={() => {}} 
                                                onUserClick={onUserClick} 
                                            />
                                        ))}
                                    </div>
                                    <p className="text-gray-500 text-[10px]">
                                        Backend oficial: solo soporta 1, 2, 4 u 8 grupos con al menos dos equipos por grupo.
                                    </p>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};

const LaunchTournamentView: React.FC<{ tournament: any, onClose: () => void, onLaunch: (config: any) => void }> = ({ tournament, onClose, onLaunch }) => {
    const [format, setFormat] = useState<'eliminatoria' | 'liga' | 'americano'>(
        tournament?.format === 'americano'
            ? 'americano'
            : tournament?.format === 'league'
                ? 'liga'
                : 'eliminatoria',
    );
    const [americanoType, setAmericanoType] = useState<'fijo' | 'dinamico'>(tournament?.americanoType || 'fijo');
    const [numGroups, setNumGroups] = useState<number>(Math.max(1, tournament?.numberOfGroups || 1));
    const [availableCourts, setAvailableCourts] = useState<number>(Math.max(1, tournament?.availableCourts || 1));
    const [generatedData, setGeneratedData] = useState<{
        groups: { name: string, teams: { name: string, players: string[] }[] }[],
        groupMatches: { round: string, date: string, courtName?: string, team1: string, team2: string }[],
        playoffs: { round: string, date: string, courtName?: string, team1: string, team2: string }[],
    } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const lockToBackendTournamentFormat = Boolean(
        tournament?.isBackendTournament
        && (
            tournament?.format === 'league'
            || tournament?.format === 'tournament'
            || tournament?.format === 'americano'
        ),
    );
    const lockedBackendFormatLabel = tournament?.format === 'league'
        ? 'liga'
        : tournament?.format === 'tournament'
            ? 'eliminatoria'
            : tournament?.americanoType === 'dinamico'
                ? 'americano dinamico'
                : 'americano fijo';
    const confirmedTeamsCount = Array.isArray(tournament?.teams)
        ? tournament.teams.filter((team: any) => Array.isArray(team.players) && team.players.length > 0).length
        : 0;
    const supportedEliminationGroupOptions = [1, 2, 4, 8].filter(option =>
        option <= Math.max(1, Math.floor(confirmedTeamsCount / 2)),
    );
    const effectiveEliminationGroupOptions = supportedEliminationGroupOptions.length > 0
        ? supportedEliminationGroupOptions
        : [1];
    const eliminationPreviewRule = numGroups === 1
        ? 'Backend oficial: top 4 del grupo a semifinales.'
        : numGroups === 2
            ? 'Backend oficial: top 2 de cada grupo a semifinales.'
            : numGroups === 4
                ? 'Backend oficial: avanzan los ganadores de grupo y se siembran por standings.'
                : 'Backend oficial: avanzan los ganadores de grupo y se siembran para cuartos, semis y final.';

    useEffect(() => {
        if (format !== 'eliminatoria') {
            return;
        }

        if (!effectiveEliminationGroupOptions.includes(numGroups)) {
            setNumGroups(effectiveEliminationGroupOptions[0]);
        }
    }, [effectiveEliminationGroupOptions, format, numGroups]);

    useEffect(() => {
        setGeneratedData(null);
        setPreviewError(null);
    }, [format, americanoType, numGroups, availableCourts, tournament?.id]);

    const formatPreviewDate = (scheduledAt: string) => {
        const date = new Date(scheduledAt);
        const weekday = new Intl.DateTimeFormat('es-UY', { weekday: 'short' }).format(date).replace('.', '');
        const time = new Intl.DateTimeFormat('es-UY', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(date);
        return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${date.getDate()} ${time}`;
    };

    const mapLaunchPreviewToGeneratedData = (preview: Awaited<ReturnType<typeof backendApi.previewTournamentLaunch>>) => ({
        groups: preview.groups.map(group => ({
            name: group.name,
            teams: group.teams.map(team => ({
                name: team.teamName,
                players: team.memberNames,
            })),
        })),
        groupMatches: preview.stageMatches.map(match => ({
            round: match.roundLabel,
            date: formatPreviewDate(match.scheduledAt),
            courtName: match.courtName,
            team1: match.teamOneLabel,
            team2: match.teamTwoLabel,
        })),
        playoffs: preview.playoffMatches.map(match => ({
            round: match.roundLabel,
            date: formatPreviewDate(match.scheduledAt),
            courtName: match.courtName,
            team1: match.teamOneLabel,
            team2: match.teamTwoLabel,
        })),
    });

    const handleGenerate = async () => {
        if (!tournament?.isBackendTournament || typeof tournament?.backendTournamentId !== 'number') {
            setPreviewError('Este launch MVP solo esta disponible para torneos conectados al backend.');
            return;
        }

        try {
            setPreviewLoading(true);
            setPreviewError(null);

            const preview = await backendApi.previewTournamentLaunch(tournament.backendTournamentId, {
                availableCourts,
                numberOfGroups: format === 'eliminatoria' ? numGroups : 1,
                leagueRounds: format === 'liga' ? 2 : undefined,
                courtNames: Array.isArray(tournament?.courtNames)
                    ? tournament.courtNames.filter((courtName: string) => courtName?.trim())
                    : undefined,
            });

            setGeneratedData(mapLaunchPreviewToGeneratedData(preview));
        } catch (error) {
            const message = error instanceof BackendApiError && error.message
                ? error.message
                : 'No pudimos generar la preview oficial del torneo.';
            setPreviewError(message);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleLaunch = () => {
        onLaunch({
            format,
            americanoType: format === 'americano' ? americanoType : undefined,
            availableCourts,
            courtNames: tournament.courtNames,
            leagueRounds: format === 'liga' ? 2 : undefined,
            numGroups: format === 'eliminatoria' ? numGroups : 1,
            generatedData,
            matchesPerParticipant: tournament.matchesPerParticipant,
        });
    };

    const previewSections = [
        {
            title: 'Grupos Generados',
            icon: <Users size={16} className="text-padel-500" />,
            empty: generatedData?.groups?.length ? null : 'El backend no devolvio grupos para esta configuracion.',
            items: generatedData?.groups ?? [],
            render: (group: { name: string, teams: { name: string, players: string[] }[] }, idx: number) => (
                <div key={`${group.name}-${idx}`} className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                    <div className="bg-dark-700/50 px-4 py-2 border-b border-dark-700">
                        <h5 className="text-white font-bold text-sm">{group.name}</h5>
                    </div>
                    <div className="divide-y divide-dark-700">
                        {group.teams.map((team, teamIdx) => (
                            <div key={`${team.name}-${teamIdx}`} className="p-3 px-4 flex justify-between items-center">
                                <div>
                                    <p className="text-white font-medium text-sm">{team.name}</p>
                                    <p className="text-gray-400 text-[10px]">{team.players.join(' & ')}</p>
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    Equipo {teamIdx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
        {
            title: format === 'liga' ? 'Partidos de la Liga' : 'Partidos de Fase de Grupos',
            icon: <Calendar size={16} className="text-padel-500" />,
            empty: 'El backend no devolvio partidos de fase para esta configuracion.',
            items: generatedData?.groupMatches ?? [],
            render: (match: { round: string, date: string, courtName?: string, team1: string, team2: string }, idx: number) => (
                <div key={`${match.round}-${idx}`} className="bg-dark-800 border border-dark-700 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-padel-500 text-[10px] font-bold uppercase">{match.round}</span>
                        <span className="text-gray-400 text-[10px] flex items-center gap-1"><Calendar size={10} /> {match.date}</span>
                    </div>
                    {match.courtName && <p className="text-gray-500 text-[10px]">{match.courtName}</p>}
                    <div className="flex items-center justify-between bg-dark-900/50 rounded-lg p-2 border border-dark-700/50">
                        <span className="text-white text-xs font-medium truncate flex-1 text-center">{match.team1}</span>
                        <span className="text-gray-500 text-[10px] font-bold px-2">VS</span>
                        <span className="text-white text-xs font-medium truncate flex-1 text-center">{match.team2}</span>
                    </div>
                </div>
            ),
        },
        {
            title: 'Proximos Partidos (Playoffs)',
            icon: <Trophy size={16} className="text-amber-500" />,
            empty: null,
            items: generatedData?.playoffs ?? [],
            render: (match: { round: string, date: string, courtName?: string, team1: string, team2: string }, idx: number) => (
                <div key={`${match.round}-${idx}`} className="bg-dark-800 border border-dark-700 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-amber-500 text-[10px] font-bold uppercase">{match.round}</span>
                        <span className="text-gray-400 text-[10px] flex items-center gap-1"><Calendar size={10} /> {match.date}</span>
                    </div>
                    {match.courtName && <p className="text-gray-500 text-[10px]">{match.courtName}</p>}
                    <div className="flex items-center justify-between bg-dark-900/50 rounded-lg p-2 border border-dark-700/50">
                        <span className="text-white text-xs font-medium truncate flex-1 text-center">{match.team1}</span>
                        <span className="text-gray-500 text-[10px] font-bold px-2">VS</span>
                        <span className="text-white text-xs font-medium truncate flex-1 text-center">{match.team2}</span>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-900/80 backdrop-blur-md sticky top-0 z-10">
                <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-white font-bold text-lg">Lanzar Torneo</h2>
                <div className="w-10"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                <div className="bg-dark-800/50 p-4 rounded-2xl border border-dark-700/50">
                    <h3 className="text-white font-bold mb-1">{tournament.name || 'Torneo'}</h3>
                    <div className="flex flex-col gap-1">
                        <p className="text-gray-400 text-xs flex items-center gap-1">
                            <Users size={12} /> {tournament.registeredUsers} / {tournament.expectedUsers || (tournament.numTeams * 2)} Jugadores Inscriptos
                        </p>
                        {tournament.registeredUsers < (tournament.expectedUsers || (tournament.numTeams * 2)) && (
                            <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-amber-500 text-[10px] leading-tight">
                                    El torneo no esta completo. Puedes lanzarlo ahora con los jugadores actuales, pero el fixture se generara solo con los inscriptos.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {previewError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                        <p className="text-red-200 text-xs font-bold">{previewError}</p>
                    </div>
                )}

                {!generatedData ? (
                    <>
                        <div className="space-y-3">
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Forma de Competir</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'eliminatoria', label: 'Eliminatoria', icon: <Trophy size={16} /> },
                                    { id: 'liga', label: 'Liga', icon: <Swords size={16} /> },
                                    { id: 'americano', label: 'Americano', icon: <Users size={16} /> },
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            if (lockToBackendTournamentFormat) return;
                                            setFormat(option.id as 'eliminatoria' | 'liga' | 'americano');
                                        }}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                            format === option.id
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                                                : 'bg-dark-800 border-dark-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                        disabled={lockToBackendTournamentFormat}
                                    >
                                        {option.icon}
                                        <span className="text-[10px] font-bold mt-1 uppercase">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                            {lockToBackendTournamentFormat && (
                                <p className="text-gray-500 text-[10px]">
                                    Este torneo ya fue creado como {lockedBackendFormatLabel}. El backend usara ese formato oficial al lanzarlo.
                                </p>
                            )}
                        </div>

                        {format === 'eliminatoria' && (
                            <>
                                <div className="space-y-3">
                                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Cantidad de Grupos</label>
                                    <div className="relative">
                                        <select
                                            value={numGroups}
                                            onChange={(e) => setNumGroups(parseInt(e.target.value, 10))}
                                            className="w-full h-12 bg-dark-800 border border-dark-700 rounded-xl px-4 text-white font-medium appearance-none focus:outline-none focus:border-amber-500"
                                        >
                                            {effectiveEliminationGroupOptions.map(option => (
                                                <option key={option} value={option}>{option} {option === 1 ? 'Grupo' : 'Grupos'}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Clasificacion a Playoffs</label>
                                    <div className="relative">
                                        <select
                                            value="backend-rule"
                                            disabled
                                            className="w-full h-12 bg-dark-800 border border-dark-700 rounded-xl px-4 text-white font-medium appearance-none focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="backend-rule">{eliminationPreviewRule}</option>
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                    <p className="text-gray-500 text-[10px]">
                                        La clasificacion de playoffs queda fijada por backend segun grupos confirmados y standings oficiales.
                                    </p>
                                </div>
                            </>
                        )}

                        {format === 'liga' && (
                            <div className="space-y-3">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Formato de Liga</label>
                                <div className="relative">
                                    <select
                                        value="dos_rondas"
                                        disabled
                                        className="w-full h-12 bg-dark-800 border border-dark-700 rounded-xl px-4 text-white font-medium appearance-none focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="dos_rondas">Liga: Dos Rondas</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <p className="text-gray-500 text-[10px]">
                                    Todos juegan contra todos en dos rondas. La agenda final la define el backend segun disponibilidad oficial.
                                </p>
                            </div>
                        )}

                        {format === 'americano' && (
                            <div className="space-y-3">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Tipo de Americano</label>
                                <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700">
                                    <button
                                        onClick={() => setAmericanoType('fijo')}
                                        disabled={lockToBackendTournamentFormat}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${americanoType === 'fijo' ? 'bg-amber-500 text-dark-900 shadow-lg' : 'text-gray-400'}`}
                                    >
                                        Americano Fijo
                                    </button>
                                    <button
                                        onClick={() => setAmericanoType('dinamico')}
                                        disabled={lockToBackendTournamentFormat}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${americanoType === 'dinamico' ? 'bg-amber-500 text-dark-900 shadow-lg' : 'text-gray-400'}`}
                                    >
                                        Americano Dinamico
                                    </button>
                                </div>
                                <p className="text-gray-500 text-[10px]">
                                    {americanoType === 'fijo'
                                        ? 'Las parejas se mantienen iguales durante todo el torneo.'
                                        : 'Los jugadores rotan de pareja en cada partido.'}
                                </p>
                            </div>
                        )}

                        {format !== 'liga' && (
                            <div className="space-y-3">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Canchas Disponibles</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        value={availableCourts}
                                        onChange={(e) => setAvailableCourts(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className="w-full h-12 bg-dark-800 border border-dark-700 rounded-xl px-4 text-white font-medium focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <p className="text-gray-500 text-[10px]">Permite coordinar partidos en simultaneo para agilizar el torneo.</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Coordinacion de Partidos</label>
                            <div className="w-full flex items-start gap-3 p-4 rounded-xl border bg-amber-500/10 border-amber-500/50 text-left">
                                <div className="w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 bg-amber-500 border-amber-500">
                                    <Check size={14} className="text-dark-900" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm mb-1 text-amber-500">Coordinar horarios automaticamente</p>
                                    <p className="text-gray-400 text-xs leading-relaxed">
                                        El backend agenda la fase inicial y los playoffs con la configuracion oficial del torneo y las canchas disponibles.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        {previewSections.map(section => {
                            if (!section.items.length && !section.empty) {
                                return null;
                            }

                            return (
                                <div key={section.title} className="space-y-4">
                                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        {section.icon}
                                        {section.title}
                                    </h4>
                                    {!section.items.length ? (
                                        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
                                            <p className="text-gray-400 text-xs">{section.empty}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {section.items.map(section.render)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="p-4 bg-dark-800 border-t border-dark-700 pb-safe">
                {!generatedData ? (
                    <Button fullWidth size="md" onClick={handleGenerate} disabled={previewLoading}>
                        {previewLoading ? 'Generando preview oficial...' : 'Generar Grupos y Playoffs'}
                    </Button>
                ) : (
                    <div className="flex gap-3">
                        <Button variant="secondary" size="md" onClick={() => setGeneratedData(null)} className="flex-1">
                            Atras
                        </Button>
                        <Button size="md" onClick={handleLaunch} className="flex-1">
                            Confirmar y Lanzar
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const AddTeamsToTournamentView: React.FC<{ currentUser: User, tournament: any, availablePlayers?: User[], onClose: () => void, onUpdate: (data: any) => void }> = ({ currentUser, tournament, availablePlayers = [currentUser], onClose, onUpdate }) => {
    // Extract existing players from tournament teams
    const initialPlayers = tournament.teams ? tournament.teams.flatMap((t: any) => t.players) : [];
    const initialPlayerIds = useMemo(() => new Set(initialPlayers.map((p: any) => p.id)), [initialPlayers]);
    const maxPlayers = tournament.expectedUsers || (tournament.numTeams * 2);
    const initialTeamNames = tournament.teams ? tournament.teams.reduce((acc: any, t: any) => {
        if (t.players.length === 2) {
            acc[`${t.players[0].id}-${t.players[1].id}`] = t.teamName;
        }
        return acc;
    }, {}) : {};
    const initialTeamPreferences = tournament.teams ? tournament.teams.reduce((acc: any, t: any) => {
        if (t.players.length === 2) {
            acc[`${t.players[0].id}-${t.players[1].id}`] = t.preferences || [];
        }
        return acc;
    }, {}) : {};
    
    const [selectedPlayers, setSelectedPlayers] = useState<User[]>(initialPlayers);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [teamNames, setTeamNames] = useState<Record<string, string>>(initialTeamNames);
    const [teamPreferences, setTeamPreferences] = useState<Record<string, string[]>>(initialTeamPreferences);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const remainingSlots = maxPlayers - selectedPlayers.length;

    const timeOptions = useMemo(
        () => buildTournamentTimePreferenceOptions(tournament.startDate, tournament.endDate),
        [tournament.startDate, tournament.endDate],
    );

    const selectablePlayers = useMemo(
        () => Array.from(new Map(availablePlayers.map(user => [user.id, user])).values()),
        [availablePlayers],
    );

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return [];
        const query = searchQuery.toLowerCase();
        return selectablePlayers.filter(u => 
            u.name.toLowerCase().includes(query) && 
            !selectedPlayers.some(sp => sp.id === u.id)
        );
    }, [searchQuery, selectablePlayers, selectedPlayers]);

    const addPlayer = (user: User) => {
        if (selectedPlayers.length < maxPlayers) {
            setSelectedPlayers([...selectedPlayers, user]);
            setSearchQuery('');
        }
    };

    const removePlayer = (userId: string) => {
        setSelectedPlayers(selectedPlayers.filter(p => p.id !== userId));
    };

    const togglePreference = (teamKey: string, pref: string) => {
        setTeamPreferences(prev => {
            const current = prev[teamKey] || [];
            if (current.includes(pref)) {
                return { ...prev, [teamKey]: current.filter(p => p !== pref) };
            } else {
                return { ...prev, [teamKey]: [...current, pref] };
            }
        });
    };

    const pairs = [];
    for (let i = 0; i < selectedPlayers.length; i += 2) {
        pairs.push(selectedPlayers.slice(i, i + 2));
    }

    const handleSave = () => {
        const updatedTeams = pairs
            .filter(p => p.length > 0)
            .map(p => ({
                players: p,
                teamName: p.length === 2
                    ? teamNames[`${p[0].id}-${p[1].id}`] || `${p[0].name.split(' ')[0]} & ${p[1].name.split(' ')[0]}`
                    : p[0].name,
                preferences: p.length === 2 ? (teamPreferences[`${p[0].id}-${p[1].id}`] || []) : []
            }));

        onUpdate({
            ...tournament,
            teams: updatedTeams
        });
    };

    return (
        <div className="fixed inset-0 bg-dark-900 z-50 flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-800 bg-dark-900/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-white">Inscribir Equipos</h2>
                        <p className="text-xs text-gray-500">{tournament.name}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                <div className="bg-dark-800/50 p-3 rounded-2xl border border-dark-700/50">
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserPlus size={14} /> Gestión de Equipos ({selectedPlayers.length}/{maxPlayers})
                        </div>
                        {remainingSlots > 0 ? (
                            <span className="text-amber-500 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full">
                                {remainingSlots} cupos restantes
                            </span>
                        ) : (
                            <span className="text-green-500 text-[10px] bg-green-500/10 px-2 py-0.5 rounded-full">
                                Torneo Completo
                            </span>
                        )}
                    </label>
                    
                    <div className="flex flex-col gap-3 mb-4 h-24">
                        {/* Search */}
                        <div className="relative shrink-0">
                            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar jugadores..."
                                className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                            />
                        </div>

                        {/* Carousel */}
                        <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-1 items-center flex-1">
                            {(searchQuery ? filteredUsers : selectablePlayers.filter(f => !selectedPlayers.some(sp => sp.id === f.id))).map(user => (
                                <button 
                                    key={user.id}
                                    onClick={() => addPlayer(user)}
                                    className="flex items-center gap-2 p-1.5 pr-3 bg-dark-700/50 hover:bg-dark-700 rounded-full transition-colors border border-dark-700 shrink-0"
                                >
                                    <img src={user.avatar} className="w-6 h-6 rounded-full object-cover" />
                                    <span className="text-xs text-gray-300 font-medium whitespace-nowrap">{user.name.split(' ')[0]}</span>
                                    <Plus size={12} className="text-padel-400 ml-1" />
                                </button>
                            ))}
                            {searchQuery && filteredUsers.length === 0 && (
                                <span className="text-xs text-gray-500 italic px-2 whitespace-nowrap">No se encontraron jugadores</span>
                            )}
                        </div>
                    </div>

                    {/* Teams List Feedback */}
                    {selectedPlayers.length > 0 && (
                        <div className="space-y-2 mt-2 pt-3 border-t border-dark-700">
                            <span className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Equipos Confirmados</span>
                            {pairs.map((pair, idx) => {
                                const teamKey = pair.length === 2 ? `${pair[0].id}-${pair[1].id}` : '';
                                return (
                                <div key={idx} className="flex flex-col gap-2 bg-dark-900 border border-dark-700 rounded-lg p-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] text-gray-500 font-bold w-3">{idx + 1}.</span>
                                            {/* Player 1 */}
                                            <div className={`flex items-center gap-1 bg-dark-800 px-1.5 py-0.5 rounded border ${initialPlayerIds.has(pair[0].id) ? 'border-amber-500/30' : 'border-dark-700'}`}>
                                                <img src={pair[0].avatar} className="w-4 h-4 rounded-full" />
                                                <span className="text-[10px] text-gray-300">{pair[0].name.split(' ')[0]}</span>
                                                {initialPlayerIds.has(pair[0].id) ? (
                                                    <span className="text-[8px] text-amber-500 font-bold ml-1 uppercase">Insc.</span>
                                                ) : (
                                                    <button onClick={() => removePlayer(pair[0].id)} className="ml-1 text-red-400 hover:text-red-300"><X size={8} /></button>
                                                )}
                                            </div>
                                            
                                            {pair.length === 2 ? (
                                                <>
                                                    <span className="text-gray-600 text-[10px]">&</span>
                                                    {/* Player 2 */}
                                                    <div className={`flex items-center gap-1 bg-dark-800 px-1.5 py-0.5 rounded border ${initialPlayerIds.has(pair[1].id) ? 'border-amber-500/30' : 'border-dark-700'}`}>
                                                        <img src={pair[1].avatar} className="w-4 h-4 rounded-full" />
                                                        <span className="text-[10px] text-gray-300">{pair[1].name.split(' ')[0]}</span>
                                                        {initialPlayerIds.has(pair[1].id) ? (
                                                            <span className="text-[8px] text-amber-500 font-bold ml-1 uppercase">Insc.</span>
                                                        ) : (
                                                            <button onClick={() => removePlayer(pair[1].id)} className="ml-1 text-red-400 hover:text-red-300"><X size={8} /></button>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-amber-500 italic ml-1 animate-pulse">Esperando pareja...</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Team Name Input & Preferences (Only if pair is complete) */}
                                    {pair.length === 2 && (
                                        <div className="flex flex-col gap-2 mt-1 pl-5">
                                            <input 
                                                type="text" 
                                                placeholder={`Nombre del Equipo (Ej: ${pair[0].name.split(' ')[0]} & ${pair[1].name.split(' ')[0]})`}
                                                value={teamNames[teamKey] || ''}
                                                onChange={(e) => setTeamNames({...teamNames, [teamKey]: e.target.value})}
                                                className="w-full bg-dark-800 border border-dark-700 rounded p-1.5 text-[10px] text-white focus:border-amber-500 focus:outline-none"
                                            />
                                            
                                            {/* Preferences Dropdown */}
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setOpenDropdown(openDropdown === teamKey ? null : teamKey)}
                                                    className="w-full flex items-center justify-between bg-dark-800 border border-dark-700 rounded p-1.5 text-[10px] text-gray-400 hover:text-gray-300"
                                                >
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} /> 
                                                        {teamPreferences[teamKey]?.length > 0 
                                                            ? `${teamPreferences[teamKey].length} preferencias de horario`
                                                            : 'Añadir preferencias de horario (Opcional)'}
                                                    </span>
                                                    <ChevronDown size={12} className={`transition-transform ${openDropdown === teamKey ? 'rotate-180' : ''}`} />
                                                </button>
                                                
                                                {openDropdown === teamKey && (
                                                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                        {timeOptions.length > 0 ? (
                                                            timeOptions.map((opt, i) => (
                                                                <label key={i} className="flex items-center gap-2 p-2 hover:bg-dark-700 cursor-pointer border-b border-dark-700/50 last:border-0">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={(teamPreferences[teamKey] || []).includes(opt.value)}
                                                                        onChange={() => togglePreference(teamKey, opt.value)}
                                                                        className="rounded border-dark-600 text-amber-500 focus:ring-amber-500 bg-dark-900"
                                                                    />
                                                                    <span className="text-[10px] text-gray-300">{opt.label}</span>
                                                                </label>
                                                            ))
                                                        ) : (
                                                            <div className="p-2 text-[10px] text-gray-500 italic text-center">
                                                                Selecciona fechas del torneo primero
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-dark-900/90 backdrop-blur-md border-t border-dark-800">
                <Button 
                    fullWidth 
                    size="md" 
                    onClick={handleSave} 
                    className="font-bold shadow-xl shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-dark-900"
                    disabled={pairs.length === 0}
                >
                    Guardar Equipos
                </Button>
            </div>
        </div>
    );
};

const CreateTournamentView: React.FC<{ currentUser: User, selectablePlayers?: User[], clubOptions?: Club[], defaultClubId?: string | null, onClose: () => void, onCreate: (data: any) => void }> = ({ currentUser, selectablePlayers = [currentUser], clubOptions = [], defaultClubId = null, onClose, onCreate }) => {
    const [name, setName] = useState<string>('');
    const [rules, setRules] = useState<string>('');
    const [cost, setCost] = useState<string>('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
    const [numTeams, setNumTeams] = useState<number>(8);
    const [availableCourts, setAvailableCourts] = useState<number>(1);
    const [courtNames, setCourtNames] = useState<string[]>(Array(15).fill(''));
    const [format, setFormat] = useState<'tournament' | 'league' | 'americano'>('tournament');
    const [americanoType, setAmericanoType] = useState<'fijo' | 'dinamico'>('fijo');
    const [matchesPerParticipant, setMatchesPerParticipant] = useState<number>(5);
    const [isCompetitive, setIsCompetitive] = useState<boolean>(true);
    const [openEnrollment, setOpenEnrollment] = useState<boolean>(true);
    const [standingsTiebreak, setStandingsTiebreak] = useState<TournamentStandingsTiebreak>('GAMES_DIFFERENCE');
    const [selectedClub, setSelectedClub] = useState<string | null>(defaultClubId);
    const [prizes, setPrizes] = useState<string>('');
    const [selectedPlayers, setSelectedPlayers] = useState<User[]>(currentUser.accountType === 'club' ? [] : [currentUser]); // Flat list of players

    const isPerfectAmericano = useMemo(() => {
        if (format !== 'americano') return true;
        const totalSlots = numTeams * matchesPerParticipant;
        return totalSlots % 4 === 0;
    }, [format, numTeams, matchesPerParticipant]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [teamNames, setTeamNames] = useState<Record<string, string>>({});
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [teamPreferences, setTeamPreferences] = useState<Record<string, string[]>>({});
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);

    const timeOptions = useMemo(
        () => buildTournamentTimePreferenceOptions(startDate, endDate),
        [startDate, endDate],
    );

    const TEAMS_OPTIONS = [4, 8, 12, 16];

    const CATEGORIES = [
        { id: '1', name: '1ra Categoría', range: '6.00+' },
        { id: '2', name: '2da Categoría', range: '5.50 - 5.99' },
        { id: '3', name: '3ra Categoría', range: '5.00 - 5.49' },
        { id: '4', name: '4ta Categoría', range: '4.50 - 4.99' },
        { id: '5', name: '5ta Categoría', range: '4.00 - 4.49' },
        { id: '6', name: '6ta Categoría', range: '3.50 - 3.99' },
        { id: '7', name: '7ma Categoría', range: '0.00 - 3.49' },
    ];

    const toggleCategory = (id: string) => {
        if (id === 'any') {
            setSelectedCategories([]);
            return;
        }
        
        if (selectedCategories.includes(id)) {
            setSelectedCategories(selectedCategories.filter(c => c !== id));
        } else {
            setSelectedCategories([...selectedCategories, id]);
        }
    };

    // Deduplicate selectable players before applying search filters.
    const uniqueUsers = Array.from(new Map(selectablePlayers.map(user => [user.id, user])).values());

    useEffect(() => {
        if (selectedClub || !defaultClubId) {
            return;
        }

        const matchedClub = clubOptions.find(club => club.id === defaultClubId);
        if (matchedClub) {
            setSelectedClub(matchedClub.id);
        }
    }, [clubOptions, defaultClubId, selectedClub]);

    const filteredUsers = uniqueUsers.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !selectedPlayers.some(sp => sp.id === u.id)
    );

    const addPlayer = (user: any) => {
        setSelectedPlayers([...selectedPlayers, user]);
        setSearchQuery('');
    };

    const removePlayer = (userId: string) => {
        setSelectedPlayers(selectedPlayers.filter(p => p.id !== userId));
    };

    // Calculate Teams from selected players (Pairs)
    const pairs = [];
    for (let i = 0; i < selectedPlayers.length; i += 2) {
        pairs.push(selectedPlayers.slice(i, i + 2));
    }

    return (
        <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="px-4 py-4 flex items-center gap-3 bg-dark-800 border-b border-dark-700 shrink-0 sticky top-0 z-20">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-dark-700 transition-colors">
                    <ArrowLeft size={20} className="text-gray-200" />
                </button>
                <div>
                    <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                        Crear Torneo <Trophy size={18} className="text-amber-500" />
                    </h2>
                    <p className="text-gray-400 text-xs">Configura tu competición personalizada</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* 3. Format */}
                <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <Network size={14} /> Formato
                    </label>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <button
                            onClick={() => setFormat('tournament')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                format === 'tournament'
                                ? 'bg-padel-600/20 border-padel-500 text-padel-400'
                                : 'bg-dark-800 border-dark-700 text-gray-500'
                            }`}
                        >
                            <Trophy size={24} />
                            <span className="text-xs font-bold">Eliminatoria</span>
                        </button>
                        <button
                            onClick={() => setFormat('league')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                format === 'league'
                                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                : 'bg-dark-800 border-dark-700 text-gray-500'
                            }`}
                        >
                            <List size={24} />
                            <span className="text-xs font-bold">Liga</span>
                        </button>
                        <button
                            onClick={() => setFormat('americano')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                format === 'americano'
                                ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                                : 'bg-dark-800 border-dark-700 text-gray-500'
                            }`}
                        >
                            <Users size={24} />
                            <span className="text-xs font-bold">Americano</span>
                        </button>
                    </div>

                    {/* Americano Sub-formats */}
                    {format === 'americano' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700">
                                <button 
                                    onClick={() => setAmericanoType('fijo')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${americanoType === 'fijo' ? 'bg-amber-500 text-dark-900 shadow' : 'text-gray-400'}`}
                                >
                                    Americano Fijo
                                </button>
                                <button 
                                    onClick={() => setAmericanoType('dinamico')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${americanoType === 'dinamico' ? 'bg-amber-500 text-dark-900 shadow' : 'text-gray-400'}`}
                                >
                                    Americano Dinámico
                                </button>
                            </div>

                            <div className="flex gap-2 p-2 bg-dark-800/50 rounded-lg border border-dark-700">
                                <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                    {americanoType === 'fijo' 
                                        ? 'Los equipos se mantienen fijos. Gana el equipo con más partidos ganados.' 
                                        : 'Los equipos rotan. El puntaje es individual y gana el jugador con más puntos.'}
                                </p>
                            </div>

                            <div>
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                                    <Swords size={14} /> {americanoType === 'fijo' ? 'Partidos por Equipo' : 'Partidos por Participante'}
                                </label>
                                <input 
                                    type="number" 
                                    value={matchesPerParticipant}
                                    onChange={(e) => setMatchesPerParticipant(parseInt(e.target.value) || 1)}
                                    className={`w-full bg-dark-800 border ${!isPerfectAmericano ? 'border-amber-500/50' : 'border-dark-700'} text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm`}
                                />
                                {!isPerfectAmericano && (
                                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2">
                                        <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-200/80 leading-tight">
                                            Con {numTeams} jugadores y {matchesPerParticipant} partidos, el total de cupos ({numTeams * matchesPerParticipant}) no es múltiplo de 4. 
                                            Algunos jugadores jugarán un partido extra como "comodín" para completar las canchas, pero solo se contarán sus primeros {matchesPerParticipant} partidos para la clasificación.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Type */}
                <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <Zap size={14} /> Tipo de Juego
                    </label>
                    <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700 mb-3">
                        <button 
                            onClick={() => setIsCompetitive(true)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isCompetitive ? 'bg-amber-500 text-dark-900 shadow' : 'text-gray-400'}`}
                        >
                            <Medal size={14} /> Competitivo
                        </button>
                        <button 
                            onClick={() => setIsCompetitive(false)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${!isCompetitive ? 'bg-blue-500 text-white shadow' : 'text-gray-400'}`}
                        >
                            <Handshake size={14} /> Recreativo
                        </button>
                    </div>
                    <div className="flex gap-2 p-2 bg-dark-800/50 rounded-lg border border-dark-700">
                        <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            Elige <span className="text-white font-bold">Competitivo</span> para identificar un torneo orientado al resultado o <span className="text-white font-bold">recreativo</span> para uno casual. Los torneos actuales no modifican el rating oficial de los jugadores.
                        </p>
                    </div>
                </div>

                <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <Link size={14} /> Inscripcion
                    </label>
                    <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700 mb-3">
                        <button
                            onClick={() => setOpenEnrollment(true)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${openEnrollment ? 'bg-padel-500 text-dark-900 shadow' : 'text-gray-400'}`}
                        >
                            <Link size={14} /> Abierta por link
                        </button>
                        <button
                            onClick={() => setOpenEnrollment(false)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${!openEnrollment ? 'bg-blue-500 text-white shadow' : 'text-gray-400'}`}
                        >
                            <Users size={14} /> Cerrada / directa
                        </button>
                    </div>
                    <div className="flex gap-2 p-2 bg-dark-800/50 rounded-lg border border-dark-700">
                        <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            {openEnrollment
                                ? 'Despues de crear el torneo podras compartir un link oficial para que los jugadores se inscriban desde la app.'
                                : 'Los cupos quedan cerrados y el creador define los equipos manualmente antes del launch.'}
                        </p>
                    </div>
                </div>

                {/* 5. Club Host (Optional) */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={14} /> Sede (Opcional)
                        </label>
                        {selectedClub && <button onClick={() => setSelectedClub(null)} className="text-[10px] text-red-400">Borrar</button>}
                    </div>
                    
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                        {clubOptions.map(club => (
                            <button
                                key={club.id}
                                onClick={() => setSelectedClub(club.id)}
                                className={`min-w-[120px] rounded-xl overflow-hidden border relative group transition-all ${
                                    selectedClub === club.id
                                    ? 'border-padel-500 ring-1 ring-padel-500'
                                    : 'border-dark-700 opacity-70'
                                }`}
                            >
                                <div className="h-16 relative">
                                    {club.image ? (
                                        <>
                                            <img src={club.image} alt={club.name} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent"></div>
                                        </>
                                    ) : (
                                        <div className={`w-full h-full bg-gradient-to-br ${getClubVisualGradient(club.name)} flex items-center justify-between px-3`}>
                                            <span className="text-white/95 font-black text-lg tracking-wide">
                                                {getClubInitials(club.name)}
                                            </span>
                                            {club.isIntegrated && (
                                                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/80">
                                                    Integrado
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {selectedClub === club.id && (
                                        <div className="absolute inset-0 bg-padel-500/20 flex items-center justify-center">
                                            <CheckCircle size={20} className="text-padel-500 bg-white rounded-full" fill="currentColor" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 bg-dark-800">
                                    <p className="text-[10px] font-bold text-white truncate">{club.name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 0. Tournament Name & Dates */}
                <div className="space-y-4">
                    <div>
                        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                            <Trophy size={14} /> Nombre del Torneo
                        </label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Torneo de Verano"
                            className="w-full bg-dark-800 border border-dark-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors placeholder:text-dark-600 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                                <Calendar size={14} /> Desde
                            </label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-dark-800 border border-dark-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm [color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                                <Calendar size={14} /> Hasta
                            </label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-dark-800 border border-dark-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm [color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>

                {/* 0.1 Tournament Rules */}
                <div className="bg-dark-800/50 rounded-xl border border-dark-700/50 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setIsRulesOpen(!isRulesOpen)}
                        className="w-full px-4 py-3 flex justify-between items-center text-gray-400 hover:text-white transition-colors"
                    >
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                            <List size={14} /> Reglas del Torneo
                        </div>
                        <ChevronDown size={16} className={`transition-transform ${isRulesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isRulesOpen && (
                        <div className="px-4 pb-4">
                            <textarea 
                                value={rules}
                                onChange={(e) => setRules(e.target.value)}
                                placeholder="Explica cómo se jugará el torneo, formato, etc."
                                className="w-full bg-dark-900 border border-dark-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors placeholder:text-dark-600 text-sm min-h-[80px] resize-none mt-2"
                            />
                        </div>
                    )}
                </div>

                {/* 0.2 Cost per Participant */}
                <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <DollarSign size={14} /> Costo por Participante
                    </label>
                    <input 
                        type="text" 
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        placeholder="Ej: $500 UYU"
                        className="w-full bg-dark-800 border border-dark-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors placeholder:text-dark-600 text-sm"
                    />
                </div>

                {/* 0.3 Level Range */}
                <div className="relative">
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <Filter size={14} /> Categorías Permitidas
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                        className="w-full bg-dark-800 border border-dark-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm flex justify-between items-center"
                    >
                        <span className="truncate pr-2">
                            {selectedCategories.length === 0 
                                ? 'Cualquier nivel' 
                                : selectedCategories.map(id => CATEGORIES.find(c => c.id === id)?.name.split(' ')[0]).join(', ')}
                        </span>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform shrink-0 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCategoryDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-dark-800 border border-dark-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                            <button
                                type="button"
                                onClick={() => { toggleCategory('any'); setIsCategoryDropdownOpen(false); }}
                                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-dark-700 transition-colors border-b border-dark-700"
                            >
                                <span className={`text-sm ${selectedCategories.length === 0 ? 'text-amber-500 font-bold' : 'text-gray-300'}`}>Cualquier nivel</span>
                                {selectedCategories.length === 0 && <Check size={16} className="text-amber-500" />}
                            </button>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCategory(cat.id)}
                                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-dark-700 transition-colors"
                                >
                                    <div>
                                        <div className={`text-sm ${selectedCategories.includes(cat.id) ? 'text-amber-500 font-bold' : 'text-gray-300'}`}>{cat.name}</div>
                                        <div className="text-[10px] text-gray-500">Rating: {cat.range}</div>
                                    </div>
                                    {selectedCategories.includes(cat.id) && <Check size={16} className="text-amber-500" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 1. Number of Teams */}
                <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <Users size={14} /> {format === 'americano' && americanoType === 'dinamico' ? 'Número de Jugadores' : 'Número de Equipos'}
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {TEAMS_OPTIONS.map(num => (
                            <button
                                key={num}
                                onClick={() => setNumTeams(num)}
                                className={`min-w-[48px] h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all border shrink-0 ${
                                    numTeams === num
                                    ? 'bg-amber-500 border-amber-500 text-dark-900 shadow-lg'
                                    : 'bg-dark-800 border-dark-700 text-gray-400 hover:border-gray-500'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                        <div className="relative shrink-0 w-20">
                            <input 
                                type="number" 
                                placeholder="Otro"
                                onChange={(e) => setNumTeams(parseInt(e.target.value) || 0)}
                                className={`w-full h-12 bg-dark-800 border ${!TEAMS_OPTIONS.includes(numTeams) && numTeams > 0 ? 'border-amber-500 text-amber-500' : 'border-dark-700 text-gray-400'} rounded-xl text-center font-bold text-sm focus:outline-none focus:border-amber-500`}
                            />
                        </div>
                    </div>
                </div>

                {/* 1.5. Available Courts */}
                <div className="bg-dark-800/50 p-3 rounded-2xl border border-dark-700/50">
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <MapPin size={14} /> Nro de canchas disponibles
                    </label>
                    <div className="relative mb-3">
                        <select 
                            value={availableCourts}
                            onChange={(e) => setAvailableCourts(parseInt(e.target.value))}
                            className="w-full bg-dark-800 border border-dark-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors appearance-none text-sm font-bold"
                        >
                            {[...Array(15)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {i + 1} {i === 0 ? 'Cancha' : 'Canchas'}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    
                    {/* Court Names Inputs */}
                    <div className="space-y-2">
                        <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                            Nombres de las canchas (Opcional)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[...Array(availableCourts)].map((_, i) => (
                                <input
                                    key={i}
                                    type="text"
                                    placeholder={`Cancha ${i + 1}`}
                                    value={courtNames[i] || ''}
                                    onChange={(e) => {
                                        const newNames = [...courtNames];
                                        newNames[i] = e.target.value;
                                        setCourtNames(newNames);
                                    }}
                                    className="w-full bg-dark-900 border border-dark-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 transition-colors text-xs"
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Player Selection & Grouping */}
                <div className="bg-dark-800/50 p-3 rounded-2xl border border-dark-700/50">
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <UserPlus size={14} /> {format === 'americano' && americanoType === 'dinamico' ? `Gestión de Jugadores (${selectedPlayers.length}/${numTeams})` : `Gestión de Equipos (${pairs.length}/${numTeams})`}
                    </label>
                    
                    <div className="flex flex-col gap-3 mb-4 h-24">
                        {/* Search */}
                        <div className="relative shrink-0">
                            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar jugadores..."
                                className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                            />
                        </div>

                        {/* Carousel */}
                        <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-1 items-center flex-1">
                            {(searchQuery ? filteredUsers : selectablePlayers.filter(f => !selectedPlayers.some(sp => sp.id === f.id))).map(user => (
                                <button 
                                    key={user.id}
                                    onClick={() => addPlayer(user)}
                                    className="flex items-center gap-2 p-1.5 pr-3 bg-dark-700/50 hover:bg-dark-700 rounded-full transition-colors border border-dark-700 shrink-0"
                                >
                                    <img src={user.avatar} className="w-6 h-6 rounded-full object-cover" />
                                    <span className="text-xs text-gray-300 font-medium whitespace-nowrap">{user.name.split(' ')[0]}</span>
                                    <Plus size={12} className="text-padel-400 ml-1" />
                                </button>
                            ))}
                            {searchQuery && filteredUsers.length === 0 && (
                                <span className="text-xs text-gray-500 italic px-2 whitespace-nowrap">No se encontraron jugadores</span>
                            )}
                        </div>
                    </div>

                    {/* Teams List Feedback */}
                    {selectedPlayers.length > 0 && (
                        <div className="space-y-2 mt-2 pt-3 border-t border-dark-700">
                            <span className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                                {format === 'americano' && americanoType === 'dinamico' ? 'Jugadores Confirmados' : 'Equipos Confirmados'}
                            </span>
                            {format === 'americano' && americanoType === 'dinamico' ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedPlayers.map((player, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-dark-900 border border-dark-700 rounded-lg p-2">
                                            <span className="text-[10px] text-gray-500 font-bold w-3">{idx + 1}.</span>
                                            <img src={player.avatar} className="w-5 h-5 rounded-full" />
                                            <span className="text-xs text-gray-300 truncate flex-1">{player.name.split(' ')[0]}</span>
                                            <button onClick={() => removePlayer(player.id)} className="text-red-400 hover:text-red-300"><X size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                pairs.map((pair, idx) => {
                                    const teamKey = pair.length === 2 ? `${pair[0].id}-${pair[1].id}` : '';
                                    return (
                                    <div key={idx} className="flex flex-col gap-2 bg-dark-900 border border-dark-700 rounded-lg p-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] text-gray-500 font-bold w-3">{idx + 1}.</span>
                                                {/* Player 1 */}
                                                <div className="flex items-center gap-1 bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700">
                                                    <img src={pair[0].avatar} className="w-4 h-4 rounded-full" />
                                                    <span className="text-[10px] text-gray-300">{pair[0].name.split(' ')[0]}</span>
                                                    <button onClick={() => removePlayer(pair[0].id)} className="ml-1 text-red-400 hover:text-red-300"><X size={8} /></button>
                                                </div>
                                                
                                                <span className="text-[9px] text-dark-500">&</span>

                                                {/* Player 2 */}
                                                {pair[1] ? (
                                                    <div className="flex items-center gap-1 bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700">
                                                        <img src={pair[1].avatar} className="w-4 h-4 rounded-full" />
                                                        <span className="text-[10px] text-gray-300">{pair[1].name.split(' ')[0]}</span>
                                                        <button onClick={() => removePlayer(pair[1].id)} className="ml-1 text-red-400 hover:text-red-300"><X size={8} /></button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-amber-500/70 italic animate-pulse">Esperando compa...</span>
                                                )}
                                            </div>
                                            {pair[1] && <CheckCircle size={12} className="text-padel-500 shrink-0" />}
                                        </div>
                                        {pair[1] && (
                                            <div className="flex flex-col gap-2 pl-5">
                                                <input 
                                                    type="text"
                                                    placeholder="Nombre del equipo..."
                                                    value={teamNames[teamKey] || ''}
                                                    onChange={(e) => setTeamNames({...teamNames, [teamKey]: e.target.value})}
                                                    className="w-full bg-dark-800 border border-dark-700 rounded px-2 py-1 text-[10px] text-white focus:border-padel-500 focus:outline-none placeholder:text-dark-500"
                                                />
                                                {timeOptions.length > 0 && (
                                                    <div className="relative">
                                                        <button 
                                                            onClick={() => setOpenDropdown(openDropdown === teamKey ? null : teamKey)}
                                                            className="w-full bg-dark-800 border border-dark-700 rounded px-2 py-1 text-[10px] text-left text-gray-400 flex justify-between items-center"
                                                        >
                                                            <span className="truncate">
                                                                {teamPreferences[teamKey]?.length > 0 
                                                                    ? timeOptions
                                                                        .filter(option => teamPreferences[teamKey]?.includes(option.value))
                                                                        .map(option => option.label)
                                                                        .join(', ') 
                                                                    : 'Sin restricciones horarias'}
                                                            </span>
                                                            <ChevronDown size={10} className={`shrink-0 transition-transform ${openDropdown === teamKey ? 'rotate-180' : ''}`} />
                                                        </button>
                                                        {openDropdown === teamKey && (
                                                            <div className="absolute z-10 mt-1 w-full bg-dark-800 border border-dark-700 rounded shadow-lg max-h-32 overflow-y-auto">
                                                                {timeOptions.map(option => (
                                                                    <label key={option.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-dark-700 cursor-pointer text-[10px] text-white">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={teamPreferences[teamKey]?.includes(option.value) || false}
                                                                            onChange={(e) => {
                                                                                const currentPrefs = teamPreferences[teamKey] || [];
                                                                                if (e.target.checked) {
                                                                                    setTeamPreferences({...teamPreferences, [teamKey]: [...currentPrefs, option.value]});
                                                                                } else {
                                                                                    setTeamPreferences({...teamPreferences, [teamKey]: currentPrefs.filter(p => p !== option.value)});
                                                                                }
                                                                            }}
                                                                            className="accent-padel-500"
                                                                        />
                                                                        {option.label}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {format === 'league' && (
                    <div className="space-y-3 rounded-2xl border border-dark-700 bg-dark-800/50 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-white text-sm font-bold">Liga MVP</p>
                                <p className="text-[10px] text-gray-400">Todos contra todos durante dos rondas. Tabla oficial 3-1-0.</p>
                            </div>
                            <span className="rounded-full border border-dark-700 bg-dark-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-padel-400">
                                Doble ronda
                            </span>
                        </div>
                        <div>
                            <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 block">
                                Desempate de tabla
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStandingsTiebreak('GAMES_DIFFERENCE')}
                                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${standingsTiebreak === 'GAMES_DIFFERENCE' ? 'border-padel-500 bg-padel-500/15 text-padel-300' : 'border-dark-700 bg-dark-900 text-gray-400'}`}
                                >
                                    Diferencia de games
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStandingsTiebreak('SETS_DIFFERENCE')}
                                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${standingsTiebreak === 'SETS_DIFFERENCE' ? 'border-padel-500 bg-padel-500/15 text-padel-300' : 'border-dark-700 bg-dark-900 text-gray-400'}`}
                                >
                                    Diferencia de sets
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. Prizes (Optional) */}
                <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                        <Gift size={14} /> Premios (Opcional)
                    </label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={prizes}
                            onChange={(e) => setPrizes(e.target.value)}
                            placeholder="Ej: Palas, Trofeos, Efectivo..."
                            className="w-full bg-dark-800 border border-dark-700 text-white pl-4 pr-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors placeholder:text-dark-600 text-sm"
                        />
                    </div>
                </div>

            </div>

            {/* Footer Summary */}
            <div className="p-4 bg-dark-800 border-t border-dark-700 pb-safe">
                <div className="flex justify-between items-center mb-3 text-xs text-gray-400">
                    <span>Resumen:</span>
                    <span className="text-white font-bold">
                        {numTeams} {format === 'americano' && americanoType === 'dinamico' ? 'Jugadores' : 'Equipos'} • {format === 'tournament' ? 'Eliminatoria' : format === 'league' ? 'Liga' : 'Americano'}
                    </span>
                </div>
                <Button 
                    fullWidth 
                    size="md" 
                    onClick={() => onCreate({
                        name: name || 'Torneo Relámpago',
                        startDate: startDate,
                        endDate: endDate,
                        numTeams,
                        format,
                        americanoType: format === 'americano' ? americanoType : undefined,
                        matchesPerParticipant: format === 'americano' ? matchesPerParticipant : undefined,
                        availableCourts,
                        courtNames: courtNames.slice(0, availableCourts),
                        isCompetitive,
                        openEnrollment,
                        standingsTiebreak,
                        categoryLabels: selectedCategories
                            .map(id => CATEGORIES.find(category => category.id === id)?.name)
                            .filter((categoryLabel): categoryLabel is string => Boolean(categoryLabel)),
                        clubId: selectedClub,
                        clubName: clubOptions.find(c => c.id === selectedClub)?.name,
                        teams: format === 'americano' && americanoType === 'dinamico'
                            ? selectedPlayers.map(player => ({
                                players: [player],
                                teamName: player.name,
                                preferences: []
                            }))
                            : pairs.filter(p => p.length > 0).map(p => ({
                                players: p,
                                teamName: p.length === 2
                                    ? teamNames[`${p[0].id}-${p[1].id}`] || `${p[0].name.split(' ')[0]} & ${p[1].name.split(' ')[0]}`
                                    : p[0].name,
                                preferences: p.length === 2 ? (teamPreferences[`${p[0].id}-${p[1].id}`] || []) : []
                            }))
                    })} 
                    className="font-bold shadow-xl shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-dark-900"
                >
                    Crear Torneo
                </Button>
            </div>
        </div>
    );
};

const NationalRankingBackendView: React.FC<{
    currentUser: User;
    rankingRows: ReturnType<typeof mapRankingRows>;
    rankingPosition: number | null;
    clubOptions?: Club[];
    onClose: () => void;
}> = ({ currentUser, rankingRows, rankingPosition, clubOptions = [], onClose }) => {
    const [selectedCity, setSelectedCity] = useState<string>('Todas');
    const [selectedClub, setSelectedClub] = useState<string>('Todos');
    const [selectedGender, setSelectedGender] = useState<string>('Todos');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [selectedAge, setSelectedAge] = useState<string>('Todas');

    const CITIES = useMemo(
        () => ['Todas', ...Array.from(new Set(rankingRows.map(player => player.cityName).filter((city): city is string => Boolean(city))))],
        [rankingRows],
    );
    const GENDERS = ['Todos', 'Hombre', 'Mujer'];
    const CATEGORIES = ['Todas', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª'];
    const AGES = ['Todas', 'Sub 18', '19-25', '26-30', '>30', '>40', '>50'];

    const filteredPlayers = rankingRows.filter(player => {
        const cityMatches = selectedCity === 'Todas' || player.cityName === selectedCity;
        const categoryMatches = selectedCategory === 'Todas' || player.categoryLabel === selectedCategory;
        return cityMatches && categoryMatches;
    });
    const topPlayers = filteredPlayers.slice(0, 10);
    const userPosition = rankingRows.find(player => player.playerProfileId === currentUser.backendPlayerProfileId) ?? null;

    return (
        <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col animate-fade-in overflow-y-auto">
            <div className="px-4 py-4 flex items-center gap-3 bg-dark-800 border-b border-dark-700 shrink-0 sticky top-0 z-20">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-dark-700 transition-colors">
                    <ArrowLeft size={20} className="text-gray-200" />
                </button>
                <div>
                    <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                        Ranking Nacional <Crown size={16} className="text-amber-500" fill="currentColor"/>
                    </h2>
                    <p className="text-gray-400 text-xs">Uruguay</p>
                </div>
            </div>

            <div className="p-4 space-y-6 pb-safe">
                <div className="bg-dark-800 rounded-2xl border border-dark-700 p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Filter size={16} className="text-padel-400" />
                        <h3 className="text-white font-bold text-sm">Filtros</h3>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Ciudad</label>
                            <div className="relative">
                                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate">
                                    {CITIES.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Club</label>
                            <div className="relative">
                                <select value={selectedClub} onChange={(e) => setSelectedClub(e.target.value)} className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate">
                                    <option value="Todos">Todos</option>
                                    {clubOptions.map(club => (
                                        <option key={club.id} value={club.id}>{club.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Sexo</label>
                            <div className="relative">
                                <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate">
                                    {GENDERS.map(gender => (
                                        <option key={gender} value={gender}>{gender}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Categoría</label>
                            <div className="relative">
                                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate">
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Edad</label>
                            <div className="relative">
                                <select value={selectedAge} onChange={(e) => setSelectedAge(e.target.value)} className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate">
                                    {AGES.map(age => (
                                        <option key={age} value={age}>{age}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
                    <div className="p-4 border-b border-dark-700 bg-dark-900/50">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <Trophy size={18} className="text-amber-400" />
                            Top 10 Nacional
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            {selectedCity !== 'Todas' ? selectedCity : 'Uruguay'} • {selectedCategory !== 'Todas' ? `Cat. ${selectedCategory}` : 'Todas las categorías'}
                        </p>
                    </div>

                    <div className="w-full overflow-hidden">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr className="bg-dark-900/80 border-b border-dark-700 text-[9px] text-gray-500 uppercase tracking-tighter">
                                    <th className="py-2 px-1 font-bold text-center w-6">#</th>
                                    <th className="py-2 px-1 font-bold w-auto">Jugador</th>
                                    <th className="py-2 px-1 font-bold text-center w-12">Ciudad</th>
                                    <th className="py-2 px-1 font-bold text-center w-8">PJ</th>
                                    <th className="py-2 px-1 font-bold text-center w-8">Cat</th>
                                    <th className="py-2 px-1 font-bold text-right w-8">Rat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-700">
                                {topPlayers.map((player) => (
                                    <tr key={player.rank} className="hover:bg-dark-700/50 transition-colors">
                                        <td className={`py-2 px-1 text-center font-black text-[10px] ${
                                            player.rank === 1 ? 'text-amber-400' :
                                            player.rank === 2 ? 'text-gray-300' :
                                            player.rank === 3 ? 'text-amber-700' : 'text-gray-500'
                                        }`}>
                                            {player.rank}
                                        </td>
                                        <td className="py-2 px-1 truncate">
                                            <div className="flex items-center gap-1.5">
                                                <img src={player.avatar} alt={player.name} className="w-5 h-5 rounded-full border border-dark-600 shrink-0" />
                                                <span className="text-white font-bold text-[10px] truncate">{player.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-1 text-center">
                                            <div className="flex items-center justify-center gap-1 bg-dark-900 px-1 py-0.5 rounded border border-dark-700 w-max mx-auto">
                                                <span className="text-[8px] text-gray-300 font-medium">{player.cityBadge}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-1 text-center text-white text-[10px]">{player.ratedMatchesCount}</td>
                                        <td className="py-2 px-1 text-center text-white text-[10px]">{player.categoryLabel}</td>
                                        <td className="py-2 px-1 text-right text-padel-400 font-black text-[10px]">{player.rating}</td>
                                    </tr>
                                ))}
                                {topPlayers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-sm text-gray-500">
                                            No hay jugadores para los filtros seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="w-full border-t-2 border-padel-500 bg-padel-900/20 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-padel-500/10 to-transparent pointer-events-none"></div>
                        <table className="w-full text-left border-collapse table-fixed relative z-10">
                            <tbody>
                                <tr>
                                    <td className="py-2 px-1 text-center font-black text-[10px] text-padel-400 w-6">
                                        {rankingPosition ?? '-'}
                                    </td>
                                    <td className="py-2 px-1 w-auto truncate">
                                        <div className="flex items-center gap-1.5">
                                            <img src={currentUser.avatar} alt={currentUser.name} className="w-5 h-5 rounded-full border-2 border-padel-500 shrink-0" />
                                            <span className="text-white font-bold text-[10px] truncate">Tú</span>
                                        </div>
                                    </td>
                                    <td className="py-2 px-1 text-center w-12">
                                        <div className="flex items-center justify-center gap-1 bg-dark-900 px-1 py-0.5 rounded border border-dark-700 w-max mx-auto">
                                            <span className="text-[8px] text-gray-300 font-medium">{userPosition?.cityBadge ?? '-'}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 px-1 text-center text-white text-[10px] w-8">{userPosition?.ratedMatchesCount ?? currentUser.matchesPlayed}</td>
                                    <td className="py-2 px-1 text-center text-white text-[10px] w-8">{currentUser.categoryNumber ? `${currentUser.categoryNumber}ª` : '-'}</td>
                                    <td className="py-2 px-1 text-right text-padel-400 font-black text-[10px] w-8">{currentUser.level.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ClubRankingsView: React.FC<{
    currentUser: User,
    clubs?: Club[],
    rankings?: Awaited<ReturnType<typeof backendApi.getMyClubRankings>>,
    onClose: () => void
}> = ({ currentUser, clubs = [], rankings = [], onClose }) => {
    // ... (No changes here, keeping existing code for ClubRankingsView)
    // State to toggle between rankings
    const [rankingType, setRankingType] = useState<'competitive' | 'social'>('competitive');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

    const CATEGORIES = ['Todas', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª'];
    const userCategory = getCategory(currentUser.level);

    return (
        <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col animate-fade-in overflow-y-auto">
             {/* Header */}
             <div className="px-4 py-4 flex items-center gap-3 bg-dark-800 border-b border-dark-700 shrink-0 sticky top-0 z-20">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-dark-700 transition-colors">
                    <ArrowLeft size={20} className="text-gray-200" />
                </button>
                <div>
                    <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                        Rankings de Club <Crown size={16} className="text-amber-500" fill="currentColor"/>
                    </h2>
                    <p className="text-gray-400 text-xs">Donde eres regular (+20 partidos)</p>
                </div>
            </div>

            <div className="p-4 space-y-6 pb-safe">
                {rankings.length === 0 && (
                    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 text-center">
                        <p className="text-white font-bold text-sm mb-1">Todavia no tienes rankings de club</p>
                        <p className="text-gray-400 text-xs">Juega mas partidos sociales en clubes para empezar a aparecer aca.</p>
                    </div>
                )}
                {rankings.map((clubData) => {
                    const club = clubs.find(c => c.name === clubData.clubName);
                    const data = rankingType === 'competitive' ? clubData.competitive : clubData.social;
                    const title = rankingType === 'competitive' ? "Mejores Jugadores" : "Jugadores Elite";
                    const subtitle = rankingType === 'competitive' ? "Ordenado por Rating (Mayor es mejor)" : "Ordenado por partidos jugados";
                    const primaryColor = rankingType === 'competitive' ? 'text-amber-400' : 'text-padel-400';
                    
                    // Filter Logic
                    const filteredList = data.topEntries.filter(entry => {
                        if (rankingType !== 'competitive' || selectedCategory === 'Todas') return true;
                        return formatCategoryBadge(entry.currentCategory) === selectedCategory;
                    });
                    
                    // User Row visibility Logic
                    const isUserInSelectedCategory = selectedCategory === 'Todas' || formatCategoryBadge(data.userEntry?.currentCategory) === selectedCategory;
                    const shouldShowUserRow = Boolean(data.userEntry) && (rankingType === 'social' || isUserInSelectedCategory);

                    return (
                        <div key={clubData.clubId} className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden relative">
                             {/* Club Header */}
                             <div className="h-20 relative">
                                <img src={club?.image ?? 'https://picsum.photos/400/200?random=12'} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/50 to-transparent"></div>
                                <div className="absolute bottom-2 left-3">
                                    <h3 className="text-white font-bold text-lg">{clubData.clubName}</h3>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{clubData.matchesPlayedByUser} partidos jugados aqui</p>
                                </div>
                             </div>

                             <div className="p-4">
                                {/* Ranking Type Toggle */}
                                <div className="flex bg-dark-900/50 p-1 rounded-xl mb-4 border border-dark-700">
                                    <button 
                                        onClick={() => setRankingType('competitive')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${rankingType === 'competitive' ? 'bg-amber-500 text-dark-900 shadow-lg' : 'text-gray-400'}`}
                                    >
                                        <Trophy size={12} /> Mejores
                                    </button>
                                    <button 
                                        onClick={() => setRankingType('social')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${rankingType === 'social' ? 'bg-padel-600 text-white shadow-lg' : 'text-gray-400'}`}
                                    >
                                        <Users size={12} /> Elite
                                    </button>
                                </div>

                                {/* Category Filter (Only for Competitive) */}
                                {rankingType === 'competitive' && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide -mx-1 px-1">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${
                                                    selectedCategory === cat
                                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                                                    : 'bg-dark-900 border-dark-700 text-gray-500 hover:text-gray-300'
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* List Header */}
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h4 className={`font-bold text-sm ${primaryColor}`}>{title}</h4>
                                        <p className="text-[10px] text-gray-500">{subtitle}</p>
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">
                                        # Ranking
                                    </div>
                                </div>

                                {/* Top List */}
                                <div className="space-y-2 mb-4">
                                    {filteredList.length > 0 ? (
                                        filteredList.map((entry, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-dark-700/30 border border-dark-700/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        idx === 0 ? 'bg-yellow-500 text-dark-900' :
                                                        idx === 1 ? 'bg-gray-400 text-dark-900' :
                                                        idx === 2 ? 'bg-orange-700 text-white' :
                                                        'bg-dark-600 text-gray-400'
                                                    }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <img src={resolveProfileAvatar(entry.fullName, entry.photoUrl)} className="w-8 h-8 rounded-full object-cover" />
                                                        <div className="flex flex-col">
                                                            <span className="text-gray-200 text-sm font-medium leading-none">{entry.fullName}</span>
                                                            {rankingType === 'competitive' && (
                                                                <span className="text-[9px] text-gray-500 font-medium mt-1">
                                                                    {formatCategoryBadge(entry.currentCategory)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-white font-bold text-sm block leading-none mb-0.5 ${rankingType === 'competitive' ? 'font-mono' : ''}`}>{formatClubRankingPrimaryValue(entry, rankingType)}</span>
                                                    <span className="text-[9px] font-normal text-gray-500">{rankingType === 'competitive' ? `${entry.matchesPlayedAtClub} partidos` : formatCategoryBadge(entry.currentCategory)}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 text-xs italic">No hay jugadores destacados en esta categoria.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-dark-700 mb-4 flex items-center justify-center">
                                    <span className="bg-dark-800 px-2 text-[10px] text-gray-600">...</span>
                                </div>

                                {/* User Position (Highlighted) - Conditional Rendering */}
                                {shouldShowUserRow ? (
                                    <div className={`flex items-center justify-between p-3 rounded-xl border-2 ${rankingType === 'competitive' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-padel-500/10 border-padel-500/50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="text-lg font-black text-white w-8 text-center">
                                                {data.userRank ?? '-'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover border border-white/20" />
                                                <div>
                                                    <span className="text-white text-sm font-bold block leading-none">Tú</span>
                                                    <span className="text-[10px] text-gray-400">{currentUser.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`block font-bold text-lg leading-none ${primaryColor} ${rankingType === 'competitive' ? 'font-mono' : ''}`}>{formatClubRankingPrimaryValue(data.userEntry!, rankingType)}</span>
                                            <span className="text-[9px] text-gray-500 uppercase font-bold">{rankingType === 'competitive' ? 'Rating' : 'Partidos'}</span>
                                        </div>
                                    </div>
                                ) : (
                                     <div className="p-3 text-center border border-dashed border-dark-700 rounded-xl bg-dark-800/50">
                                        <p className="text-gray-500 text-xs">No clasificas en Categoria {selectedCategory}</p>
                                        <p className="text-amber-500 text-[10px] font-bold mt-0.5">Tu categoría actual es {userCategory}</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TopPartnersView: React.FC<{
    currentUser: User,
    partners?: Awaited<ReturnType<typeof backendApi.getMyTopPartners>>,
    onClose: () => void
}> = ({ partners = [], onClose }) => {
    // ... (No changes here, keeping existing code)
    return (
        <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col animate-fade-in">
             {/* Header */}
             <div className="px-4 py-4 flex items-center gap-3 bg-dark-800 border-b border-dark-700 shrink-0 sticky top-0 z-20">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-dark-700 transition-colors">
                    <ArrowLeft size={20} className="text-gray-200" />
                </button>
                <div>
                    <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                        Mejores Companeros <Handshake size={18} className="text-amber-500" />
                    </h2>
                    <p className="text-gray-400 text-xs">Con quienes ganas mas partidos</p>
                </div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
                 {/* Column Headers */}
                 <div className="flex justify-between items-center px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    <div className="w-10 text-center">#</div>
                    <div className="flex-1 pl-2">Jugador</div>
                    <div className="w-20 text-center">Victorias</div>
                    <div className="w-20 text-right">Rating Ganado</div>
                </div>

                {partners.map((partner, index) => {
                    const rank = index + 1;
                    let rankColor = 'bg-dark-700 text-gray-400';
                    let borderColor = 'border-dark-700';
                    
                    if (rank === 1) {
                        rankColor = 'bg-gradient-to-br from-yellow-400 to-amber-600 text-dark-900';
                        borderColor = 'border-amber-500/50 bg-amber-500/5';
                    } else if (rank === 2) {
                        rankColor = 'bg-gradient-to-br from-gray-300 to-gray-500 text-dark-900';
                        borderColor = 'border-gray-500/50 bg-gray-500/5';
                    } else if (rank === 3) {
                         rankColor = 'bg-gradient-to-br from-orange-400 to-orange-700 text-white';
                         borderColor = 'border-orange-700/50 bg-orange-700/5';
                    }

                    return (
                        <div key={partner.playerProfileId} className={`flex items-center p-3 rounded-2xl border ${borderColor} relative overflow-hidden group`}>
                             {/* Rank */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-lg ${rankColor}`}>
                                {rank <= 3 && <Crown size={12} className="absolute -top-1 -right-1" />}
                                {rank}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 flex items-center gap-3 pl-4">
                                <img src={resolveProfileAvatar(partner.fullName, partner.photoUrl)} className="w-10 h-10 rounded-full object-cover border border-dark-600" />
                                <div>
                                    <span className="text-white font-bold text-sm block">{partner.fullName}</span>
                                    {rank === 1 && <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wide">Mejor Duo</span>}
                                </div>
                            </div>

                            {/* Wins */}
                            <div className="w-20 text-center">
                                <span className="block text-white font-bold text-base">{partner.matchesWonTogether}</span>
                                <span className="text-[9px] text-gray-500 uppercase font-bold">Partidos</span>
                            </div>

                            {/* Rating */}
                            <div className="w-20 text-right">
                                <span className="block text-green-400 font-bold text-base">+{partner.ratingGainedTogether.toFixed(2)}</span>
                                <span className="text-[9px] text-gray-500 uppercase font-bold">Rating</span>
                            </div>
                        </div>
                    );
                })}

                {partners.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-500 text-sm">Aun no has jugado suficientes partidos confirmados con companeros fijos.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TopRivalsView: React.FC<{
    rivals?: Awaited<ReturnType<typeof backendApi.getMyTopRivals>>,
    onClose: () => void
}> = ({ rivals = [], onClose }) => {
     // ... (No changes here, keeping existing code)
    return (
        <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col animate-fade-in">
             {/* Header */}
             <div className="px-4 py-4 flex items-center gap-3 bg-dark-800 border-b border-dark-700 shrink-0 sticky top-0 z-20">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-dark-700 transition-colors">
                    <ArrowLeft size={20} className="text-gray-200" />
                </button>
                <div>
                    <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                        Mayores Rivales <Swords size={18} className="text-red-500" />
                    </h2>
                    <p className="text-gray-400 text-xs">Contra quienes has perdido mas veces</p>
                </div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
                 {/* Column Headers */}
                 <div className="flex justify-between items-center px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    <div className="w-10 text-center">#</div>
                    <div className="flex-1 pl-2">Jugador</div>
                    <div className="w-20 text-center">Derrotas</div>
                    <div className="w-20 text-right">Rating Perdido</div>
                </div>

                {rivals.map((rival, index) => {
                    const rank = index + 1;
                    let rankColor = 'bg-dark-700 text-gray-400';
                    let borderColor = 'border-dark-700';
                    
                    if (rank === 1) {
                        rankColor = 'bg-gradient-to-br from-yellow-400 to-amber-600 text-dark-900';
                        borderColor = 'border-amber-500/50 bg-amber-500/5';
                    } else if (rank === 2) {
                        rankColor = 'bg-gradient-to-br from-gray-300 to-gray-500 text-dark-900';
                        borderColor = 'border-gray-500/50 bg-gray-500/5';
                    } else if (rank === 3) {
                         rankColor = 'bg-gradient-to-br from-orange-400 to-orange-700 text-white';
                         borderColor = 'border-orange-700/50 bg-orange-700/5';
                    }

                    return (
                        <div key={rival.playerProfileId} className={`flex items-center p-3 rounded-2xl border ${borderColor} relative overflow-hidden group`}>
                             {/* Rank */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-lg ${rankColor}`}>
                                {rank <= 3 && <Crown size={12} className="absolute -top-1 -right-1" />}
                                {rank}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 flex items-center gap-3 pl-4">
                                <img src={resolveProfileAvatar(rival.fullName, rival.photoUrl)} className="w-10 h-10 rounded-full object-cover border border-dark-600" />
                                <div>
                                    <span className="text-white font-bold text-sm block">{rival.fullName}</span>
                                    {rank === 1 && <span className="text-[9px] text-red-500 font-bold uppercase tracking-wide">Bestia Negra</span>}
                                </div>
                            </div>

                            {/* Losses */}
                            <div className="w-20 text-center">
                                <span className="block text-white font-bold text-base">{rival.matchesLostAgainst}</span>
                                <span className="text-[9px] text-gray-500 uppercase font-bold">Derrotas</span>
                            </div>

                            {/* Rating Lost */}
                            <div className="w-20 text-right">
                                <span className="block text-red-400 font-bold text-base">-{rival.ratingLostAgainst.toFixed(2)}</span>
                                <span className="text-[9px] text-gray-500 uppercase font-bold">Rating</span>
                            </div>
                        </div>
                    );
                })}

                {rivals.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-500 text-sm">Aun no has jugado suficientes partidos confirmados como para tener rivales recurrentes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const PlayView: React.FC<ViewProps> = ({
    currentUser,
    rankingPosition,
    myMatchesByScope,
    pendingResultMatches = [],
    pendingResultMatchesById,
    notifications = [],
    unreadNotificationsCount = 0,
    navigateTo,
    onOpenCoaches,
    onOpenNotifications,
    clubs = [],
    matches = [],
    tournaments = [],
    onJoin,
    onRequest,
    onLeaveMatch,
    onCancelMatch,
    onInviteMatch,
    inviteLoadingMatchId,
    onSubmitResult,
    onConfirmResult,
    onRejectResult,
    onUserClick,
    onLaunchTournament,
    onOpenTournamentStatus,
    onAddTeamsToTournament,
    onAddResult,
    onArchiveTournament,
}) => {
    // ... (No changes here, keeping existing code)
    const userCategory = getCategory(currentUser.level);
    const userRanking = rankingPosition;

    const mergeUniqueMatches = (primaryMatches: Match[], secondaryMatches: Match[]): Match[] => {
        const byId = new Map<string, Match>();
        [...primaryMatches, ...secondaryMatches].forEach(match => {
            byId.set(match.id, match);
        });
        return sortMatchesByScheduledDateAsc(Array.from(byId.values()));
    };

    const backendTournamentUpcomingMatches = matches.filter(match =>
        match.matchSource === 'backend-tournament'
        && isTournamentParticipant(match, currentUser)
        && match.status !== 'completed'
        && match.status !== 'cancelled'
        && !match.isAmericanoDinamico
    );

    const myMatches = mergeUniqueMatches(
        myMatchesByScope?.upcoming ?? [],
        backendTournamentUpcomingMatches,
    );
    
    const actionableMatchesById = pendingResultMatchesById
        ?? new Map(pendingResultMatches.map(match => [match.id, match]));

    const backendTournamentAgendaItems: AgendaItem[] = tournaments
        .filter(tournament => {
            if (!tournament?.isBackendTournament) return false;
            if (tournament.backendStatus === 'COMPLETED' || tournament.backendStatus === 'CANCELLED') return false;

            return tournament.teams?.some((team: any) =>
                team.players?.some((player: User) => player?.id === currentUser.id),
            );
        })
        .map((tournament): AgendaItem => {
            const playerSummary = tournament.expectedUsers
                ? `${tournament.registeredUsers}/${tournament.expectedUsers} jugadores`
                : `${tournament.registeredUsers} jugadores`;
            const teamLabel = tournament.userTeamName?.replace(' - Equipo: ', 'Equipo: ')?.trim();

            let status: AgendaStatus = 'scheduled';
            if (tournament.backendStatus === 'OPEN') {
                status = 'pending_players';
            } else if (tournament.backendStatus === 'IN_PROGRESS') {
                status = 'confirmed';
            }

            return {
                id: `backend-tournament-agenda-${tournament.id}`,
                type: 'tournament',
                title: tournament.name,
                location: tournament.clubName || 'Sede por definir',
                date: tournament.dateString || tournament.startDate,
                time: 'Todo el día',
                status,
                meta: teamLabel || playerSummary,
            };
        });

    // Agenda is backend-driven for official product state: only real matches and real tournaments.
    const otherEvents = backendTournamentAgendaItems;

    // Unified Agenda for sorting
    const unifiedAgenda = [
        ...myMatches.filter(m => m.status !== 'completed').map(m => ({
            id: m.id,
            type: 'match' as const,
            data: m,
            sortDate: (() => {
                const d = new Date(m.date);
                const [h, min] = m.time.split(':').map(Number);
                d.setHours(h, min, 0, 0);
                return d.getTime();
            })()
        })),
        ...otherEvents.map(e => ({
            id: e.id,
            type: 'event' as const,
            data: e,
            sortDate: (() => {
                const d = new Date();
                if (e.date === 'Mañana') {
                    d.setDate(d.getDate() + 1);
                } else if (e.date.includes('/')) {
                    const match = e.date.match(/(\d{1,2})\/(\d{1,2})/);
                    if (match) {
                        const day = parseInt(match[1]);
                        const month = parseInt(match[2]);
                        d.setMonth(month - 1, day);
                    }
                }
                const [h, min] = e.time.split(':').map(Number);
                d.setHours(h || 0, min || 0, 0, 0);
                return d.getTime();
            })()
        }))
    ].sort((a, b) => a.sortDate - b.sortDate);

    const getStatusStyles = (status: AgendaStatus) => {
        switch (status) {
            case 'confirmed': return 'bg-padel-500/20 text-padel-400 border-padel-500/50';
            case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
            case 'pending_players': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
            case 'pending_approval': return 'bg-red-500/20 text-red-400 border-red-500/50';
            default: return 'bg-gray-700 text-gray-400';
        }
    };

    const getStatusIcon = (status: AgendaStatus) => {
        switch (status) {
            case 'confirmed': return <CheckCircle size={14} />;
            case 'scheduled': return <CalendarRange size={14} />;
            case 'pending_players': return <Users size={14} />;
            case 'pending_approval': return <AlertCircle size={14} />;
        }
    };

    const getStatusText = (status: AgendaStatus) => {
        switch (status) {
            case 'confirmed': return 'Confirmado';
            case 'scheduled': return 'Agendado';
            case 'pending_players': return 'Faltan Jugadores';
            case 'pending_approval': return 'Pend. Aprobación';
        }
    };

    const hasAgendaItems = myMatches.length > 0 || otherEvents.length > 0;

    return (
        <div className="pb-24 pt-4 px-4">
            <header className="mb-6 flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <h1 className="text-2xl font-bold text-white">Hola, {currentUser.name.split(' ')[0]}</h1>
                    <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                        Tu rating actual es <span className="text-padel-400 font-bold">{currentUser.level.toFixed(2)}</span>, 
                        tu categoría es <span className="text-white font-bold">{userCategory}</span>
                        {' '}y estás <span className="text-amber-400 font-bold">{userRanking ? `#${userRanking}` : 'sin ranking'}</span> en el ranking de Uruguay.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onOpenNotifications && onOpenNotifications()}
                    className="bg-dark-800 p-2 rounded-full border border-dark-700 relative mt-1 shrink-0 hover:bg-dark-700 transition-colors"
                    aria-label="Abrir notificaciones"
                >
                     {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-dark-900"></span>
                     )}
                    <Bell size={20} className="text-gray-400" />
                </button>
            </header>

            {/* Quick Actions - Updated to 3 columns */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <button 
                    onClick={() => navigateTo && navigateTo('clubs')}
                    className="bg-padel-600 hover:bg-padel-500 active:scale-95 transition-all p-3 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-padel-500/20 group">
                    <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                        <Calendar size={20} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-xs text-center leading-tight">Crear Partido</span>
                </button>
                
                <button 
                    onClick={() => navigateTo && navigateTo('matches')}
                    className="bg-dark-800 hover:bg-dark-700 active:scale-95 transition-all p-3 rounded-2xl border border-dark-700 flex flex-col items-center justify-center gap-2 group">
                    <div className="bg-dark-700 p-2 rounded-full group-hover:bg-dark-600 transition-colors">
                        <Swords size={20} className="text-padel-400" />
                    </div>
                    <span className="text-gray-200 font-bold text-xs text-center leading-tight">Jugar</span>
                </button>

                <button 
                    onClick={() => onOpenCoaches && onOpenCoaches()}
                    className="bg-dark-800 hover:bg-dark-700 active:scale-95 transition-all p-3 rounded-2xl border border-dark-700 flex flex-col items-center justify-center gap-2 group">
                    <div className="bg-dark-700 p-2 rounded-full group-hover:bg-dark-600 transition-colors">
                        <GraduationCap size={20} className="text-blue-400" />
                    </div>
                    <span className="text-gray-200 font-bold text-xs text-center leading-tight">Clases</span>
                </button>
            </div>
            
            {/* AGENDA SECTION (Unified Horizontal Scroll) */}
            <div className="mb-6">
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-lg font-bold text-white">Tu Agenda</h2>
                    {hasAgendaItems && <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Próximos Eventos</span>}
                </div>
                
                {hasAgendaItems ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scroll-smooth snap-x scrollbar-hide">
                        {unifiedAgenda.map((item) => {
                            const isMatch = item.type === 'match';
                            const matchData = isMatch ? item.data as Match : null;
                            const actionableMatch = matchData ? actionableMatchesById.get(matchData.id) : undefined;
                            const canAddResult = Boolean(actionableMatch);
                            
                            return (
                            <div key={item.id} className="snap-center">
                                {isMatch && matchData ? (
                                    <div className="min-w-[85vw] sm:min-w-[340px]">
                                        <MatchCard 
                                            match={matchData} 
                                            currentUser={currentUser} 
                                            clubName={matchData.clubName || clubs.find(c => c.id === matchData.clubId)?.name || 'Unknown Club'}
                                            onJoin={onJoin}
                                            onRequest={onRequest}
                                            onLeave={onLeaveMatch}
                                            onCancel={onCancelMatch}
                                            onInvite={onInviteMatch}
                                            inviteLoading={inviteLoadingMatchId === matchData.id}
                                            onUserClick={onUserClick}
                                            onAddResult={canAddResult ? () => onAddResult && actionableMatch && onAddResult(actionableMatch) : undefined}
                                            className="mb-0 h-full shadow-lg border-dark-600"
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-dark-800 border border-dark-700 rounded-2xl min-w-[85vw] sm:min-w-[340px] flex flex-col relative overflow-hidden h-full">
                                        {/* Header */}
                                        <div className="bg-dark-900/40 px-3 py-2 flex justify-between items-center border-b border-dark-700/30">
                                            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${
                                                (item.data as AgendaItem).status === 'confirmed' ? 'text-padel-400' : 
                                                (item.data as AgendaItem).status.includes('pending') ? 'text-amber-400' : 'text-gray-400'
                                            }`}>
                                                {getStatusIcon((item.data as AgendaItem).status)}
                                                {getStatusText((item.data as AgendaItem).status)}
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                                                <Calendar size={10} />
                                                {(item.data as AgendaItem).date}
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-white font-bold text-base leading-tight">{(item.data as AgendaItem).title}</h3>
                                                {(item.data as AgendaItem).type === 'tournament' && <Trophy size={16} className="text-purple-400" />}
                                                {(item.data as AgendaItem).type === 'class' && <GraduationCap size={16} className="text-blue-400" />}
                                            </div>
                                            
                                            <div className="flex items-center gap-1 text-gray-400 text-xs mb-4">
                                                <MapPin size={12} /> {(item.data as AgendaItem).location}
                                            </div>

                                            <div className="mt-auto pt-3 border-t border-dark-700 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm text-gray-300 font-medium">
                                                        <Clock size={12} className="inline mr-1 text-gray-500"/>{(item.data as AgendaItem).time}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-medium text-gray-400">{(item.data as AgendaItem).meta}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="w-full text-center py-8 text-gray-500 bg-dark-800/50 rounded-2xl border border-dark-700 border-dashed">
                        No tienes eventos próximos.
                    </div>
                )}
            </div>

            {/* HIGHLIGHTS / DESTACADOS SECTION */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={18} className="text-amber-400" />
                    <h2 className="text-lg font-bold text-white">Destacado para ti</h2>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scroll-smooth snap-x scrollbar-hide">
                    {pendingResultMatches.length > 0 && onSubmitResult && onConfirmResult && pendingResultMatches.map(match => (
                        <div key={`res-${match.id}`} className="min-w-[85vw] sm:min-w-[340px] snap-center">
                            <ResultInputCard 
                                match={match}
                                currentUser={currentUser}
                                onSubmit={onSubmitResult}
                                onConfirm={onConfirmResult}
                                onReject={onRejectResult}
                            />
                        </div>
                    ))}

                    {pendingResultMatches.length === 0 && notifications.length > 0 && (
                        <div className="min-w-[85vw] sm:min-w-[340px] snap-center bg-dark-800 border border-dark-700 rounded-2xl shadow-lg relative overflow-hidden flex flex-col">
                            <div className="bg-dark-900/40 px-3 py-2 flex justify-between items-center border-b border-dark-700/30">
                                <div className="flex items-center gap-2 text-[9px] font-bold tracking-wider text-padel-400 uppercase">
                                    <Bell size={10} />
                                    <span>Notificaciones</span>
                                </div>
                                <div className="text-gray-500 text-[9px] font-bold uppercase tracking-wide">
                                    {notifications.length} activas
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white leading-tight mb-1">Tienes acciones pendientes</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Tus resultados y validaciones están en la bandeja. El backend decide cuándo corresponde pedirlos.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => onOpenNotifications && onOpenNotifications()}
                                    className="mt-4 w-full bg-padel-600 hover:bg-padel-500 text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors shadow-lg shadow-padel-900/40"
                                >
                                    Ver notificaciones
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {tournaments.filter(t => !t.isArchived).map(tournament => {
                        const isTournamentCreator = tournament.creatorId === currentUser.id;

                        return (
                        <div key={tournament.id} className="min-w-[85vw] sm:min-w-[340px] snap-center bg-dark-800 border border-dark-700 rounded-2xl shadow-lg relative overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="bg-dark-900/40 px-3 py-2 flex justify-between items-center border-b border-dark-700/30">
                                <div className="flex items-center gap-2 text-[9px] font-bold tracking-wider text-amber-400 uppercase">
                                    <Sparkles size={10} />
                                    <span>Mi Torneo</span>
                                </div>
                                <div className="text-gray-500 text-[9px] font-bold uppercase tracking-wide flex items-center gap-1">
                                    <Calendar size={10} />
                                    {tournament.dateString}
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-xl font-bold text-white leading-tight">{tournament.name}</h3>
                                    <span className="text-gray-400 text-[10px] font-bold bg-dark-900 px-2 py-0.5 rounded border border-dark-700 uppercase">
                                        {tournament.format === 'tournament' ? 'Eliminatoria' : tournament.format === 'league' ? 'Liga' : 'Americano'}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-xs mb-4 flex items-center gap-1">
                                    <MapPin size={12} /> {tournament.clubName || 'Sede por definir'}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700">
                                        <div className="text-gray-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1"><Users size={12}/> Inscritos</div>
                                        <div className="text-white font-bold text-lg">
                                            {tournament.registeredUsers} / {tournament.expectedUsers || ((tournament.format === 'americano' && tournament.americanoType === 'dinamico') ? tournament.numTeams : tournament.numTeams * 2)} 
                                            <span className="text-gray-500 text-xs font-normal ml-1">jugadores</span>
                                        </div>
                                    </div>
                                    <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700">
                                        <div className="text-gray-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1"><Swords size={12}/> Próx. Partido</div>
                                        <div className="text-white font-bold text-lg">{tournament.upcomingMatches} <span className="text-gray-500 text-xs font-normal">pendientes</span></div>
                                    </div>
                                </div>
                                
                                <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700 flex justify-between items-center mt-auto">
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1"><Trophy size={12}/> Mi Ranking</span>
                                        <span className="text-padel-400 font-bold">{tournament.ranking}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-gray-500 text-[10px] uppercase font-bold">Etapa Actual</span>
                                        {tournament.status === 'Empezar torneo' && isTournamentCreator ? (
                                            <button 
                                                onClick={() => onLaunchTournament && onLaunchTournament(tournament)}
                                                className="bg-amber-500 text-dark-900 text-xs font-bold px-3 py-1.5 rounded-lg mt-1 hover:bg-amber-400 transition-colors"
                                            >
                                                Lanzar Torneo
                                            </button>
                                        ) : tournament.status === 'En curso' ? (
                                            <button 
                                                onClick={() => onOpenTournamentStatus && onOpenTournamentStatus(tournament)}
                                                className="bg-padel-500 text-dark-900 text-xs font-bold px-3 py-1.5 rounded-lg mt-1 hover:bg-padel-400 transition-colors"
                                            >
                                                Estatus
                                            </button>
                                        ) : tournament.status === 'Inscripciones Abiertas' && isTournamentCreator ? (
                                            <div className="flex flex-col gap-1 mt-1">
                                                <button 
                                                    onClick={() => onAddTeamsToTournament && onAddTeamsToTournament(tournament)}
                                                    className="bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-400 transition-colors"
                                                >
                                                    Inscribir Equipos
                                                </button>
                                                <button 
                                                    onClick={() => onLaunchTournament && onLaunchTournament(tournament)}
                                                    className="bg-amber-500/20 text-amber-500 text-[10px] font-bold px-3 py-1 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                                                >
                                                    Lanzar ahora
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-white font-medium text-sm">{tournament.status}</span>
                                        )}
                                    </div>
                                </div>
                                {isTournamentCreator && (
                                    <button
                                        onClick={() => onArchiveTournament && onArchiveTournament(tournament.id)}
                                        className="mt-3 w-full bg-dark-700/50 text-gray-400 text-xs font-bold px-3 py-2 rounded-lg hover:bg-dark-600 transition-colors flex items-center justify-center gap-2 border border-dark-600"
                                    >
                                        <Archive size={14} />
                                        Archivar torneo
                                    </button>
                                )}
                            </div>
                        </div>
                        );
                    })}

                    {pendingResultMatches.length === 0 && tournaments.filter(t => !t.isArchived).length === 0 && (
                        <div className="min-w-[85vw] sm:min-w-[340px] snap-center relative rounded-2xl overflow-hidden border border-dark-700 group shadow-2xl">
                            {/* Background Image - Padel court vibe */}
                            <div className="absolute inset-0">
                                <img 
                                    src="https://images.unsplash.com/photo-1626248318954-4632c2562211?q=80&w=800&auto=format&fit=crop" 
                                    alt="Highlight" 
                                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent"></div>
                            </div>

                            <div className="relative p-5">
                                <div className="flex justify-between items-start mb-12">
                                    <span className="bg-padel-500 text-dark-900 text-xs font-extrabold px-2 py-1 rounded shadow-lg shadow-padel-500/20">
                                        98% MATCH
                                    </span>
                                    <button 
                                        onClick={() => navigateTo && navigateTo('matches')}
                                        className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1 leading-tight">Americano Nocturno</h3>
                                    <p className="text-gray-300 text-sm mb-3 font-medium flex items-center gap-1">
                                        <Users size={14} className="text-padel-400"/> 
                                        Tus amigos Martin y Felipe se inscribieron
                                    </p>
                                    
                                    <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><Calendar size={12}/> Vie 20:00</span>
                                        <span className="flex items-center gap-1"><MapPin size={12}/> Top Padel</span>
                                    </div>

                                    <Button 
                                        fullWidth 
                                        size="sm" 
                                        className="bg-white text-dark-900 hover:bg-gray-100 border-none font-bold"
                                        onClick={() => navigateTo && navigateTo('matches')}
                                    >
                                        Unirse Ahora
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const getNotificationActionLabel = (notification: NotificationResponse): string => {
    switch (notification.type) {
        case 'SUBMIT_MATCH_RESULT':
        case 'SUBMIT_TOURNAMENT_RESULT':
            return 'Cargar';
        case 'CONFIRM_MATCH_RESULT':
        case 'CONFIRM_TOURNAMENT_RESULT':
            return 'Validar';
        case 'CLUB_BOOKING_APPROVED':
        case 'CLUB_BOOKING_REJECTED':
        case 'TOURNAMENT_LAUNCHED':
        case 'CLUB_VERIFICATION_APPROVED':
        case 'CLUB_VERIFICATION_REJECTED':
        case 'MATCH_RESULT_REJECTED':
        case 'TOURNAMENT_RESULT_REJECTED':
            return 'Abrir';
        default:
            return 'Ver';
    }
};

const getNotificationActionIcon = (notification: NotificationResponse) => {
    switch (notification.type) {
        case 'CONFIRM_MATCH_RESULT':
        case 'CONFIRM_TOURNAMENT_RESULT':
            return <ShieldCheck size={16} className="text-amber-400" />;
        case 'MATCH_RESULT_CONFIRMED':
        case 'TOURNAMENT_RESULT_CONFIRMED':
            return <CheckCircle size={16} className="text-green-400" />;
        case 'MATCH_RESULT_REJECTED':
        case 'TOURNAMENT_RESULT_REJECTED':
        case 'MATCH_CANCELLED':
        case 'CLUB_BOOKING_REJECTED':
        case 'CLUB_VERIFICATION_REJECTED':
            return <AlertCircle size={16} className="text-red-400" />;
        case 'CLUB_VERIFICATION_APPROVED':
        case 'CLUB_BOOKING_APPROVED':
            return <BadgeCheck size={16} className="text-sky-400" />;
        case 'TOURNAMENT_LAUNCHED':
            return <Trophy size={16} className="text-purple-400" />;
        default:
            return notification.tournamentMatchId != null || notification.tournamentId != null
                ? <Trophy size={16} className="text-purple-400" />
                : <CalendarRange size={16} className="text-padel-400" />;
    }
};

const getNotificationDomainLabel = (notification: NotificationResponse): string => {
    if (notification.type === 'CLUB_BOOKING_APPROVED' || notification.type === 'CLUB_BOOKING_REJECTED') {
        return 'Reserva';
    }

    if (notification.type === 'CLUB_VERIFICATION_APPROVED' || notification.type === 'CLUB_VERIFICATION_REJECTED') {
        return 'Verificacion';
    }

    if (notification.tournamentMatchId != null || notification.tournamentId != null) {
        return 'Torneo';
    }

    if (notification.matchId != null) {
        return 'Partido social';
    }

    return 'Sistema';
};

const formatNotificationDate = (value: string | null): string => {
    if (!value) {
        return 'Sin fecha';
    }

    return new Date(value).toLocaleString('es-UY', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const NotificationsInboxView: React.FC<{
    notifications: NotificationResponse[];
    onClose: () => void;
    onOpenNotification: (notification: NotificationResponse) => void;
}> = ({ notifications, onClose, onOpenNotification }) => {
    const unreadCount = notifications.filter(notification => notification.status === 'UNREAD').length;

    return (
        <div className="fixed inset-0 bg-dark-900/90 z-[112] flex items-center justify-center p-4">
            <div className="w-full max-w-md max-h-[85vh] bg-dark-800 border border-dark-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                <div className="bg-dark-900/50 px-4 py-3 border-b border-dark-700/40 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Bell size={16} className="text-padel-400" />
                            <h3 className="text-white font-bold text-lg">Notificaciones</h3>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                            {notifications.length === 0
                                ? 'No tienes acciones pendientes por ahora.'
                                : unreadCount > 0
                                    ? `${unreadCount} sin leer`
                                    : 'Todo al día'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Cerrar notificaciones"
                    >
                        <X size={22} />
                    </button>
                </div>

                {notifications.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-dark-900 border border-dark-700 flex items-center justify-center mb-4">
                            <Bell size={22} className="text-gray-500" />
                        </div>
                        <h4 className="text-white font-bold mb-1">Sin novedades</h4>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Cuando un partido o torneo requiera resultado o validación, te va a aparecer acá.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-y-auto p-4 space-y-3">
                        {notifications.map(notification => (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() => onOpenNotification(notification)}
                                className="w-full text-left bg-dark-900/40 hover:bg-dark-900/70 border border-dark-700 rounded-2xl p-4 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center shrink-0">
                                            {getNotificationActionIcon(notification)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-white font-bold text-sm leading-tight">{notification.title}</h4>
                                                {notification.status === 'UNREAD' && (
                                                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                                                )}
                                            </div>
                                            <p className="text-gray-400 text-xs leading-relaxed mb-2">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} />
                                                    {formatNotificationDate(notification.createdAt)}
                                                </span>
                                                <span className="uppercase tracking-wide">{getNotificationDomainLabel(notification)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-padel-400 shrink-0">
                                        {getNotificationActionLabel(notification)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ProfileMatchHistoryView: React.FC<{
    currentUser: User;
    matches: Match[];
    onClose: () => void;
    onUserClick?: (user: User) => void;
    onAddResult?: (match: Match) => void;
    onLeaveMatch?: (matchId: string) => void;
    onCancelMatch?: (matchId: string) => void;
}> = ({ currentUser, matches, onClose, onUserClick, onAddResult, onLeaveMatch, onCancelMatch }) => {
    const [filter, setFilter] = useState<'all' | 'played' | 'pending' | 'cancelled'>('all');

    const realUserMatches = useMemo(() => {
        return matches
            .filter(match => {
                const isBackendDriven = match.matchSource === 'backend' || match.matchSource === 'backend-tournament';
                const isParticipant = match.players.some(player => player?.id === currentUser.id);
                return isBackendDriven && isParticipant;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [matches, currentUser.id]);

    const filteredMatches = realUserMatches.filter(match => {
        if (filter === 'played') {
            return match.status === 'completed';
        }

        if (filter === 'cancelled') {
            return match.status === 'cancelled';
        }

        if (filter === 'pending') {
            return match.status !== 'completed' && match.status !== 'cancelled';
        }

        return true;
    });

    const counts = {
        all: realUserMatches.length,
        played: realUserMatches.filter(match => match.status === 'completed').length,
        pending: realUserMatches.filter(match => match.status !== 'completed' && match.status !== 'cancelled').length,
        cancelled: realUserMatches.filter(match => match.status === 'cancelled').length,
    };

    const filters = [
        { key: 'all' as const, label: 'Todos', count: counts.all },
        { key: 'played' as const, label: 'Jugados', count: counts.played },
        { key: 'pending' as const, label: 'Pendientes', count: counts.pending },
        { key: 'cancelled' as const, label: 'Cancelados', count: counts.cancelled },
    ];

    return (
        <div className="fixed inset-0 bg-dark-900/90 z-[112] flex items-center justify-center p-4">
            <div className="w-full max-w-md max-h-[88vh] bg-dark-800 border border-dark-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                <div className="bg-dark-900/50 px-4 py-3 border-b border-dark-700/40 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <BarChart3 size={16} className="text-padel-400" />
                            <h3 className="text-white font-bold text-lg">Historial de Partidos</h3>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                            Sociales y torneos reales asociados a tu perfil.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Cerrar historial de partidos"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="p-4 border-b border-dark-700/40">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {filters.map(option => {
                            const isActive = filter === option.key;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setFilter(option.key)}
                                    className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                                        isActive
                                            ? 'bg-padel-600 text-white border-padel-500'
                                            : 'bg-dark-900/50 text-gray-400 border-dark-700 hover:text-white hover:bg-dark-900'
                                    }`}
                                >
                                    {option.label} <span className="opacity-70">{option.count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {filteredMatches.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-dark-900 border border-dark-700 flex items-center justify-center mb-4">
                            <CalendarRange size={22} className="text-gray-500" />
                        </div>
                        <h4 className="text-white font-bold mb-1">Todavia no hay partidos aca</h4>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Cuando juegues, canceles o tengas partidos pendientes reales en backend, van a aparecer en este historial.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-y-auto p-4 space-y-3">
                        {filteredMatches.map(match => (
                            <MatchCard
                                key={match.id}
                                match={match}
                                currentUser={currentUser}
                                clubName={match.clubName || 'Partido'}
                                onUserClick={onUserClick}
                                onAddResult={onAddResult}
                                onLeave={onLeaveMatch}
                                onCancel={onCancelMatch}
                                className="mb-0"
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const MatchesView: React.FC<ViewProps> = ({ currentUser, clubs = [], matches = [], onJoin, onRequest, onLeaveMatch, onCancelMatch, onUserClick }) => {
    // ... (No changes here, keeping existing code)
    // 1. Basic Availability Filter (Not full, User not in it)
    const availableMatches = matches.filter(m => 
        // Logic change: match is full if NO nulls exist in the array
        m.players.some(p => p === null) && 
        !m.players.some(p => p?.id === currentUser.id) &&
        !m.isTournamentMatch &&
        !m.isAmericanoDinamico
    );

    // 2. Sort by Date/Time (Soonest first)
    const sortedMatches = [...availableMatches].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const [hA, mA] = a.time.split(':').map(Number);
        const [hB, mB] = b.time.split(':').map(Number);
        dateA.setHours(hA, mA, 0, 0);
        dateB.setHours(hB, mB, 0, 0);
        return dateA.getTime() - dateB.getTime();
    });

    // 3. Split by Level
    const atLevelMatches = sortedMatches.filter(m => {
        const [min, max] = m.levelRange;
        return currentUser.level >= min && currentUser.level <= max;
    });

    const outsideLevelMatches = sortedMatches.filter(m => {
        const [min, max] = m.levelRange;
        return currentUser.level < min || currentUser.level > max;
    });

    return (
        <div className="pb-24 pt-4 px-4">
             <header className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Competir</h1>
                <p className="text-gray-400 text-sm">Encuentra tu próximo desafío</p>
            </header>

            {/* Filters */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide mb-6">
                <button className="px-4 py-2 bg-white text-dark-900 rounded-full text-sm font-bold whitespace-nowrap">
                    Todos
                </button>
                <button className="px-4 py-2 bg-dark-800 text-gray-300 border border-dark-700 rounded-full text-sm font-medium whitespace-nowrap">
                    Por los Puntos
                </button>
                <button className="px-4 py-2 bg-dark-800 text-gray-300 border border-dark-700 rounded-full text-sm font-medium whitespace-nowrap">
                    Clubes Favoritos
                </button>
            </div>

            {/* Section 1: At Level */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <BadgeCheck className="text-padel-500" size={20} />
                    <h2 className="text-lg font-bold text-white">Partidos a tu nivel</h2>
                </div>
                
                {atLevelMatches.length > 0 ? (
                    atLevelMatches.map(match => (
                        <MatchCard 
                            key={match.id} 
                            match={match} 
                            currentUser={currentUser} 
                            clubName={match.clubName || clubs.find(c => c.id === match.clubId)?.name || 'Unknown Club'}
                            onJoin={onJoin}
                            onRequest={onRequest}
                            onLeave={onLeaveMatch}
                            onCancel={onCancelMatch}
                            onUserClick={onUserClick}
                        />
                    ))
                ) : (
                    <div className="text-center py-8 bg-dark-800/30 rounded-xl border border-dark-700 border-dashed">
                        <p className="text-gray-500 text-sm">No hay partidos activos para tu nivel exacto hoy.</p>
                    </div>
                )}
            </div>

            {/* Section 2: Outside Level */}
            <div>
                 <div className="flex items-center gap-2 mb-4">
                    <Lock className="text-amber-500" size={20} />
                    <div>
                        <h2 className="text-lg font-bold text-white">Fuera de tu nivel</h2>
                        <p className="text-xs text-gray-500 font-medium">Requiere aprobación del organizador</p>
                    </div>
                </div>

                {outsideLevelMatches.length > 0 ? (
                    outsideLevelMatches.map(match => (
                        <MatchCard 
                            key={match.id} 
                            match={match} 
                            currentUser={currentUser} 
                            clubName={match.clubName || clubs.find(c => c.id === match.clubId)?.name || 'Unknown Club'}
                            onJoin={onJoin}
                            onRequest={onRequest}
                            onLeave={onLeaveMatch}
                            onCancel={onCancelMatch}
                            onUserClick={onUserClick}
                            className="opacity-90" // Slight fade to differentiate
                        />
                    ))
                ) : (
                    <div className="text-center py-6 bg-dark-800/30 rounded-xl border border-dark-700 border-dashed">
                        <p className="text-gray-500 text-sm">No hay otros partidos disponibles.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const CompetitionView: React.FC<ViewProps> = ({
    currentUser,
    tournaments = [],
    onCreateTournament,
    onOpenTournamentStatus,
    onJoinTournament,
    onLeaveTournament,
}) => {
    const visibleTournaments = [...tournaments]
        .filter(tournament => !tournament.isArchived)
        .sort((left, right) => {
            const leftPriority = left.backendStatus === 'IN_PROGRESS' ? 0 : left.backendStatus === 'OPEN' ? 1 : 2;
            const rightPriority = right.backendStatus === 'IN_PROGRESS' ? 0 : right.backendStatus === 'OPEN' ? 1 : 2;

            if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
            }

            const leftDate = left.startDate || left.date || '';
            const rightDate = right.startDate || right.date || '';
            return new Date(leftDate).getTime() - new Date(rightDate).getTime();
        })
        .map(tournament => {
            const theme = getTournamentTheme(tournament);
            const currentTeams = Array.isArray(tournament.teams) ? tournament.teams.length : 0;
            const expectedTeams = tournament.numTeams || currentTeams;

            return {
                ...tournament,
                title: tournament.title || tournament.name,
                date: tournament.date || tournament.dateString || 'Proximamente',
                location: tournament.location || tournament.clubName || 'Sede por definir',
                prizes: tournament.prizes || (tournament.isCompetitive === false ? 'Recreativo' : 'Competitivo'),
                participants: tournament.participants || (expectedTeams > 0
                    ? `${currentTeams}/${expectedTeams} equipos`
                    : `${currentTeams} equipos`),
                statusColor: tournament.statusColor || theme.statusColor,
                bg: tournament.bg || theme.bg,
            };
        });

    function getTournamentTheme(tournament: any) {
        switch (tournament.backendStatus) {
            case 'OPEN':
                return {
                    statusColor: 'bg-amber-500 text-dark-900',
                    bg: 'from-dark-800 to-dark-900'
                };
            case 'IN_PROGRESS':
                return {
                    statusColor: 'bg-padel-500 text-dark-900',
                    bg: 'from-blue-900/40 to-dark-900'
                };
            case 'COMPLETED':
                return {
                    statusColor: 'bg-blue-500 text-white',
                    bg: 'from-dark-700 to-dark-900'
                };
            case 'CANCELLED':
                return {
                    statusColor: 'bg-red-500 text-white',
                    bg: 'from-red-900/20 to-dark-900'
                };
            default:
                return {
                    statusColor: 'bg-purple-500 text-white',
                    bg: 'from-dark-800 to-dark-900'
                };
        }
    }

    const isRegistered = (tournament: any) =>
        Array.isArray(tournament.teams)
        && tournament.teams.some((team: any) =>
            Array.isArray(team.players)
            && team.players.some((player: User | null) => player?.id === currentUser.id)
        );

    const isPendingRegistration = (tournament: any) =>
        Boolean(
            tournament.isBackendTournament
            && tournament.backendStatus === 'OPEN'
            && tournament.currentUserEntryStatus === 'PENDING',
        );

    const isCreator = (tournament: any) => tournament.creatorId === currentUser.id;

    const canJoinTournament = (tournament: any) =>
        Boolean(
            tournament.isBackendTournament
            && !isCreator(tournament)
            && !isRegistered(tournament)
            && tournament.backendStatus === 'OPEN'
            && tournament.openEnrollment
        );

    const canLeaveTournament = (tournament: any) =>
        Boolean(
            tournament.isBackendTournament
            && !isCreator(tournament)
            && isRegistered(tournament)
            && tournament.backendStatus === 'OPEN'
        );

    const canOpenTournamentDetails = (tournament: any) =>
        !tournament.isBackendTournament || isCreator(tournament) || isRegistered(tournament);

    const getPrimaryActionLabel = (tournament: any) => {
        if (isPendingRegistration(tournament)) {
            return 'Completar equipo';
        }
        if (canJoinTournament(tournament)) {
            return 'Unirme';
        }
        if (canLeaveTournament(tournament)) {
            return 'Salir';
        }
        return 'Ver Detalles';
    };

    const handlePrimaryAction = (tournament: any) => {
        if (isPendingRegistration(tournament)) {
            onJoinTournament?.(tournament);
            return;
        }
        if (canJoinTournament(tournament)) {
            onJoinTournament?.(tournament);
            return;
        }
        if (canLeaveTournament(tournament)) {
            onLeaveTournament?.(tournament);
            return;
        }
        if (canOpenTournamentDetails(tournament)) {
            onOpenTournamentStatus?.(tournament);
        }
    };

    return (
        <div className="pb-24 pt-4 px-4">
             <header className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Competición</h1>
                <p className="text-gray-400 text-sm">Tu camino al profesionalismo</p>
            </header>

            {/* Summary Stats (Graph moved to profile) */}
            <div className="bg-dark-800 rounded-2xl p-5 border border-dark-700 mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Tu Nivel Actual</p>
                        <h2 className="text-4xl font-bold text-white mt-1">{currentUser.level.toFixed(2)}</h2>
                    </div>
                </div>
                 <div className="mt-4 pt-4 border-t border-dark-700">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                        <TrendingUp size={14} className="text-green-500" /> 
                        Tu rating oficial se actualiza desde resultados confirmados en backend
                    </p>
                </div>
            </div>

            {/* Create Tournament CTA */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 via-dark-800 to-dark-800 p-1 mb-6 group">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-colors"></div>

                <div className="relative bg-dark-900/40 backdrop-blur-sm rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Icon Box */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                        <Trophy size={24} className="text-white" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-bold text-base">Crea tu propio Torneo</h3>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-3 sm:mb-0">
                            Organiza tu torneo, define sede, formato y participantes desde el flujo real conectado al backend.
                        </p>
                    </div>

                    <div className="w-full sm:w-auto">
                        <button 
                            onClick={onCreateTournament}
                            className="w-full sm:w-auto px-4 py-2 bg-transparent border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-dark-900 rounded-xl text-xs font-bold transition-all uppercase tracking-wide flex items-center justify-center gap-2"
                        >
                            <Plus size={14} />
                            Crear
                        </button>
                    </div>
                </div>
            </div>

            {/* Tournaments */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">Torneos Activos</h2>
                <span className="text-gray-500 text-sm cursor-default">Ver todos</span>
            </div>

            <div className="space-y-4">
                {visibleTournaments.length === 0 && (
                    <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                        <h3 className="text-white font-bold text-base mb-1">Aun no hay ligas activas</h3>
                        <p className="text-gray-400 text-sm">
                            Cuando haya torneos de liga disponibles, apareceran aqui con su estado real desde el backend.
                        </p>
                    </div>
                )}

                {visibleTournaments.map(tournament => {
                    const theme = getTournamentTheme(tournament);
                    const currentTeams = Array.isArray(tournament.teams) ? tournament.teams.length : 0;
                    const expectedTeams = tournament.numTeams || currentTeams;
                    const competitionLabel = tournament.isCompetitive === false ? 'Recreativo' : 'Competitivo';
                    const participantsLabel = expectedTeams > 0
                        ? `${currentTeams}/${expectedTeams} equipos`
                        : `${currentTeams} equipos`;

                    return (
                    <div key={tournament.id} className={`bg-gradient-to-r ${theme.bg} border border-dark-700 rounded-2xl p-4 relative overflow-hidden`}>
                        <div className={`absolute top-0 right-0 px-3 py-1 ${theme.statusColor} font-bold text-[10px] rounded-bl-xl shadow-lg`}>
                            {tournament.status}
                        </div>
                        <h3 className="text-white font-bold text-lg mb-1">{tournament.title}</h3>
                        <p className="text-gray-400 text-sm mb-3 flex items-center gap-1">
                             <Calendar size={12} /> {tournament.date} • {tournament.location}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-300 mb-4">
                             <span className="flex items-center gap-1"><Trophy size={14} className="text-amber-400" /> {tournament.prizes}</span>
                             <span className="flex items-center gap-1"><Users size={14} /> {tournament.participants}</span>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() => handlePrimaryAction(tournament)}
                            disabled={!canJoinTournament(tournament) && !canLeaveTournament(tournament) && !canOpenTournamentDetails(tournament)}
                        >
                            {getPrimaryActionLabel(tournament)}
                        </Button>
                    </div>
                    );
                })}
            </div>
        </div>
    )
}

const ProfileView: React.FC<ViewProps> = ({
    currentUser,
    rankingPosition,
    ratingHistory = [],
    topPartners = [],
    topRivals = [],
    clubRankings = [],
    matches = [],
    onOpenClubRankings,
    onOpenTopPartners,
    onOpenTopRivals,
    onUserClick,
    onOpenNationalRanking,
    onOpenMatchHistory,
    onOpenPlayerClubVerification,
    onOpenEditProfile,
    notificationPreferences,
    notificationPreferencesLoading = false,
    notificationPreferencesSaving = false,
    onUpdateNotificationPreferences,
    accountDeletionRequest,
    accountDeletionLoading = false,
    accountDeletionSaving = false,
    onRequestAccountDeletion,
}) => {
    // State for Filter
    const [timeRange, setTimeRange] = useState<'LAST_10' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('LAST_10');
    const [accountDeletionReason, setAccountDeletionReason] = useState('');

    const hasHistory = ratingHistory.length > 0;

    // Filter Logic
    const getFilteredData = () => {
        if (!hasHistory) return [];
        const now = new Date();
        const data = [...ratingHistory];
        
        switch (timeRange) {
            case 'LAST_10':
                return data.slice(0, 10).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            case '1M':
                return data.filter(d => {
                    const date = new Date(d.date);
                    const diffTime = Math.abs(now.getTime() - date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    return diffDays <= 30;
                }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            case '3M':
                 return data.filter(d => {
                    const date = new Date(d.date);
                    const diffTime = Math.abs(now.getTime() - date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    return diffDays <= 90;
                }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            case '6M':
                 return data.filter(d => {
                    const date = new Date(d.date);
                    const diffTime = Math.abs(now.getTime() - date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    return diffDays <= 180;
                }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            case '1Y':
                 return data.filter(d => {
                    const date = new Date(d.date);
                    const diffTime = Math.abs(now.getTime() - date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    return diffDays <= 365;
                }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            case 'ALL':
                return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            default:
                return data.slice(0, 10).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
    };

    const chartData = getFilteredData();

    // Determine motivational message based on recent history (last 5 of filtered or absolute last 5)
    const recentMatches = hasHistory ? ratingHistory.slice(0, 5) : [];
    const wins = recentMatches.filter(m => m.result === 'W').length;
    const lastResult = recentMatches[0]?.result;
    const winRate = hasHistory
        ? Math.round((ratingHistory.filter(entry => entry.result === 'W').length / ratingHistory.length) * 100)
        : 0;

    let insightTitle = "Análisis de Rendimiento";
    let motivationalMessage = hasHistory 
        ? "Tu constancia es clave. Sigue sumando partidos para consolidar tu categoría."
        : "¡Bienvenido a Sentimos Padel! Juega tu primer partido para empezar a ver tus estadísticas.";

    if (hasHistory) {
        if (lastResult === 'W' && wins >= 3) {
            insightTitle = "¡Estás en racha!";
            motivationalMessage = `Has ganado ${wins} de tus últimos 5 partidos. Tu nivel 5.0 está más cerca que nunca. ¡No bajes el ritmo!`;
        } else if (lastResult === 'L') {
            insightTitle = "Tiempo de recuperación";
            motivationalMessage = "Una derrota es solo una oportunidad para aprender. ¡Reserva una pista y recupera esos puntos hoy mismo!";
        }
    }

    // Calculate dynamic domain for Y-Axis based on filtered data
    const minRating = chartData.length > 0 ? Math.min(...chartData.map(d => d.total)) : currentUser.level;
    const maxRating = chartData.length > 0 ? Math.max(...chartData.map(d => d.total)) : currentUser.level;
    const yDomain = [Math.max(1, minRating - 0.2), Math.min(7, maxRating + 0.2)];

    // Custom Label for Points
    const CustomizedLabel = (props: any) => {
        const { x, y, index } = props;
        const diff = chartData[index]?.diff;
        if (diff === undefined) return null;
        
        const isPositive = diff > 0;
        return (
            <text 
                x={x} 
                y={y} 
                dy={-12} 
                fill={isPositive ? "#4ade80" : "#f87171"} 
                fontSize={10} 
                textAnchor="middle" 
                fontWeight="bold"
            >
                {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
            </text>
        );
    };

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const isPositive = data.diff > 0;
            // Parse date for tooltip
            const dateObj = new Date(data.date);
            const formattedDate = dateObj.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });

            return (
                <div className="bg-dark-800 p-3 rounded-xl border border-dark-700 shadow-xl z-50">
                    <p className="text-gray-300 text-xs font-bold mb-1">{data.opponent}</p>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{data.diff.toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-[10px]">Rating: {data.total.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{formattedDate} • {data.result === 'W' ? 'Victoria' : 'Derrota'}</p>
                </div>
            );
        }
        return null;
    };

    const handleFilterChange = (range: typeof timeRange) => {
        setTimeRange(range);
    };

    const filters = [
        { label: '10P', value: 'LAST_10' },
        { label: '1M', value: '1M' },
        { label: '3M', value: '3M' },
        { label: '6M', value: '6M' },
        { label: '1A', value: '1Y' },
        { label: 'TODO', value: 'ALL' },
    ];

  const favoriteClub = getFavoriteClubRanking(clubRankings);
  const topPartner = getTopPartner(topPartners);
  const topRival = getTopRival(topRivals);
  const representedClubLabel = currentUser.representedClubName?.trim() || 'Sin club';
  const cityLabel = currentUser.city?.trim() || 'Sin ciudad';
  const preferredSideLabel = formatPreferredSide(currentUser.preferredSide);
  const operationalNotificationsEnabled = notificationPreferences?.operationalNotificationsEnabled ?? false;
  const activityTrackingEnabled = notificationPreferences?.activityTrackingEnabled ?? false;
  const notificationPreferenceTimestamp = notificationPreferences?.operationalNotificationsUpdatedAt
    ?? notificationPreferences?.activityTrackingUpdatedAt
    ?? null;
  const notificationPreferenceUpdatedAt = notificationPreferenceTimestamp
    ? new Date(notificationPreferenceTimestamp).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const accountDeletionRequestedAt = accountDeletionRequest?.requestedAt
    ? new Date(accountDeletionRequest.requestedAt).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const handlePreferenceToggle = (key: 'allowOperationalNotifications' | 'allowActivityTracking', checked: boolean) => {
    if (!onUpdateNotificationPreferences || notificationPreferencesSaving) {
      return;
    }

    void onUpdateNotificationPreferences({
      allowOperationalNotifications: key === 'allowOperationalNotifications' ? checked : operationalNotificationsEnabled,
      allowActivityTracking: key === 'allowActivityTracking' ? checked : activityTrackingEnabled,
    });
  };

  const handleAccountDeletionSubmit = () => {
    if (!onRequestAccountDeletion || accountDeletionSaving || accountDeletionRequest?.requested) {
      return;
    }

    const confirmed = window.confirm('Vas a iniciar una solicitud de eliminacion de cuenta. No borra datos automaticamente ni cierra tu sesion en este momento. Queres continuar?');
    if (!confirmed) {
      return;
    }

    void onRequestAccountDeletion(accountDeletionReason);
  };

  return (
        <div className="pb-24 pt-4 px-4">
            <div className="flex flex-col items-center mb-6 pt-4">
                <div className="relative">
                    <img src={currentUser.avatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-padel-500 object-cover" />
                    <div className="absolute bottom-0 right-0 bg-dark-900 p-1 rounded-full border border-dark-700">
                        <div className="bg-padel-500 w-8 h-8 rounded-full flex flex-col items-center justify-center text-[10px] font-bold text-dark-900 leading-none">
                            <span className="text-[8px] opacity-70">CAT</span>
                            {currentUser.categoryNumber || getCategory(currentUser.level)}
                        </div>
                    </div>
                </div>
                <h1 className="text-xl font-bold text-white mt-3">{currentUser.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-gray-400 text-sm">Rating <span className="text-white font-bold">{currentUser.level.toFixed(2)}</span> • Categoria {currentUser.categoryName || 'Sexta'}</p>
                    {currentUser.verificationStatus === 'verified' ? (
                        <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                            <BadgeCheck size={10} /> Verificado
                        </div>
                    ) : currentUser.verificationStatus === 'pending' ? (
                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            <Clock size={10} /> Pendiente
                        </div>
                    ) : currentUser.verificationStatus === 'rejected' ? (
                        <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            <AlertTriangle size={10} /> Rechazado
                        </div>
                    ) : null}
                </div>
                <div className="flex gap-1 mt-1">
                    {[1,2,3,4,5].map(s => <Star key={s} size={12} className="text-amber-400" fill="currentColor" />)}
                </div>
                {onOpenEditProfile && (
                    <button
                        onClick={onOpenEditProfile}
                        className="mt-4 inline-flex items-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                        <Pencil size={14} />
                        Editar perfil
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Posicion</p>
                    <p className="text-white font-bold text-sm">{preferredSideLabel}</p>
                </div>
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Ciudad</p>
                    <p className="text-white font-bold text-sm">{cityLabel}</p>
                </div>
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Club</p>
                    <p className="text-white font-bold text-sm truncate">{representedClubLabel}</p>
                </div>
            </div>

            {currentUser.categoryNumber && currentUser.categoryNumber <= 2 && onOpenPlayerClubVerification && (
                <button
                    onClick={() => onOpenPlayerClubVerification()}
                    className="w-full mb-6 bg-gradient-to-r from-dark-800 to-green-900/20 border border-green-500/20 rounded-2xl p-4 flex items-start gap-4 text-left hover:bg-dark-800/90 transition-colors"
                >
                    <div className="bg-green-500/10 p-2.5 rounded-full shrink-0 border border-green-500/20">
                        <ShieldCheck size={20} className="text-green-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-sm mb-1">Verificacion de Categoria</h3>
                        <p className="text-gray-300 text-xs leading-relaxed">
                            {currentUser.verificationStatus === 'verified'
                                ? 'Tu categoria ya fue validada por un club. Podes revisar el estado oficial y el historial.'
                                : currentUser.verificationStatus === 'rejected'
                                    ? 'La ultima solicitud fue rechazada. Podes revisar el motivo y volver a solicitar en un club real.'
                                    : 'Esta categoria necesita validacion oficial. Entra para pedirla en un club real.'}
                        </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-500 shrink-0 mt-1" />
                </button>
            )}

            {currentUser.accountType === 'player' && onUpdateNotificationPreferences && (
                <div className="mb-6 bg-dark-800 border border-dark-700 rounded-2xl p-4">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="bg-padel-500/10 p-2.5 rounded-full border border-padel-500/20">
                            <Bell size={18} className="text-padel-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-sm">Preferencias de notificaciones</h3>
                            <p className="text-gray-400 text-xs leading-relaxed mt-1">
                                Controla avisos operativos de partidos, torneos, reservas y verificaciones. El permiso del telefono se pide solo en la app mobile.
                            </p>
                        </div>
                    </div>

                    {notificationPreferencesLoading ? (
                        <div className="text-xs text-gray-400 bg-dark-900/60 border border-dark-700 rounded-xl px-3 py-2">
                            Cargando preferencias...
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <label className="flex items-center justify-between gap-3 bg-dark-900/60 border border-dark-700 rounded-xl px-3 py-3">
                                <div>
                                    <p className="text-white text-sm font-bold">Notificaciones operativas</p>
                                    <p className="text-gray-400 text-xs">Push e inbox para resultados, reservas, torneos y validaciones.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={operationalNotificationsEnabled}
                                    disabled={notificationPreferencesSaving}
                                    onChange={event => handlePreferenceToggle('allowOperationalNotifications', event.target.checked)}
                                    className="w-5 h-5 accent-padel-500"
                                />
                            </label>

                            <label className="flex items-center justify-between gap-3 bg-dark-900/60 border border-dark-700 rounded-xl px-3 py-3">
                                <div>
                                    <p className="text-white text-sm font-bold">Analisis de actividad</p>
                                    <p className="text-gray-400 text-xs">Permite usar actividad de juego para estadisticas y mejoras del perfil.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={activityTrackingEnabled}
                                    disabled={notificationPreferencesSaving}
                                    onChange={event => handlePreferenceToggle('allowActivityTracking', event.target.checked)}
                                    className="w-5 h-5 accent-padel-500"
                                />
                            </label>

                            <p className="text-[10px] text-gray-500">
                                {notificationPreferencesSaving
                                    ? 'Guardando preferencias...'
                                    : notificationPreferenceUpdatedAt
                                        ? `Ultima actualizacion: ${notificationPreferenceUpdatedAt}`
                                        : 'Todavia no hay actualizacion registrada.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {currentUser.accountType === 'player' && onRequestAccountDeletion && (
                <div className="mb-6 bg-red-950/20 border border-red-500/20 rounded-2xl p-4">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="bg-red-500/10 p-2.5 rounded-full border border-red-500/20">
                            <Trash2 size={18} className="text-red-300" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-sm">Eliminar cuenta</h3>
                            <p className="text-gray-400 text-xs leading-relaxed mt-1">
                                Desde aca podes iniciar una solicitud de eliminacion. El equipo procesara la baja segun la politica de retencion y auditoria.
                            </p>
                        </div>
                    </div>

                    {accountDeletionLoading ? (
                        <div className="text-xs text-gray-400 bg-dark-900/60 border border-dark-700 rounded-xl px-3 py-2">
                            Consultando estado de la solicitud...
                        </div>
                    ) : accountDeletionRequest?.requested ? (
                        <div className="bg-dark-900/60 border border-red-500/20 rounded-xl px-3 py-3">
                            <p className="text-red-200 text-sm font-bold">Solicitud registrada</p>
                            <p className="text-gray-400 text-xs mt-1">
                                {accountDeletionRequestedAt
                                    ? `Recibida el ${accountDeletionRequestedAt}.`
                                    : 'Recibida correctamente.'} No hace falta volver a enviarla.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <textarea
                                value={accountDeletionReason}
                                onChange={event => setAccountDeletionReason(event.target.value)}
                                maxLength={1000}
                                rows={3}
                                placeholder="Motivo opcional"
                                className="w-full bg-dark-900/60 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-red-400"
                            />
                            <button
                                type="button"
                                onClick={handleAccountDeletionSubmit}
                                disabled={accountDeletionSaving}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 border border-red-500/30 text-red-200 text-sm font-bold px-4 py-3 rounded-xl transition-colors"
                            >
                                {accountDeletionSaving ? 'Enviando solicitud...' : 'Solicitar eliminacion de cuenta'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Coach Insight Card */}
            <div className="mb-6 bg-gradient-to-r from-dark-800 to-padel-900/20 border border-padel-500/30 rounded-xl p-4 flex items-start gap-4 shadow-lg relative overflow-hidden">
                <div className="bg-padel-500/10 p-2.5 rounded-full shrink-0 border border-padel-500/20 z-10">
                    <BrainCircuit size={20} className="text-padel-400" />
                </div>
                <div className="z-10 relative">
                    <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                        {insightTitle}
                    </h3>
                    <p className="text-gray-300 text-xs leading-relaxed font-medium">
                        {motivationalMessage}
                    </p>
                </div>
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-padel-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            </div>

            {/* Badges Section */}
            {currentUser.badges && currentUser.badges.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <Trophy size={16} className="text-amber-500" />
                        Logros y Trofeos
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                        {currentUser.badges.map((badge, idx) => (
                            <div key={idx} className="bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 rounded-xl p-3 flex flex-col items-center justify-center min-w-[100px] snap-center shrink-0">
                                <Trophy size={24} className="text-amber-400 mb-2 drop-shadow-md" />
                                <p className="text-amber-100 text-[10px] font-bold text-center leading-tight">{badge}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-dark-800 p-3 rounded-xl border border-dark-700 text-center">
                    <p className="text-gray-400 text-xs uppercase">Partidos</p>
                    <p className="text-white font-bold text-xl">{currentUser.matchesPlayed}</p>
                </div>
                <div className="bg-dark-800 p-3 rounded-xl border border-dark-700 text-center">
                    <p className="text-gray-400 text-xs uppercase">Win Rate</p>
                    <p className="text-padel-400 font-bold text-xl">{hasHistory ? `${winRate}%` : '0%'}</p>
                </div>
                <div onClick={onOpenNationalRanking} className="bg-dark-800 p-3 rounded-xl border border-dark-700 text-center cursor-pointer hover:bg-dark-700 transition-colors">
                    <p className="text-gray-400 text-xs uppercase">Ranking</p>
                    <p className="text-white font-bold text-xl">{rankingPosition ? `#${rankingPosition}` : '-'}</p>
                </div>
            </div>

            {/* ELO Evolution Chart */}
            <div className="bg-dark-800 rounded-2xl p-4 border border-dark-700 mb-6 relative overflow-hidden h-80 flex flex-col">
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-padel-400" />
                        <h3 className="font-bold text-white text-sm">Evolución de Nivel</h3>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-dark-900/50 p-1 rounded-lg mb-4 border border-dark-700/50 justify-between">
                    {filters.map(f => {
                         const isActive = timeRange === f.value;
                         return (
                            <button
                                key={f.value}
                                onClick={() => handleFilterChange(f.value as any)}
                                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                                    isActive 
                                    ? 'bg-padel-600 text-white shadow-md' 
                                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                                }`}
                            >
                                {f.label}
                            </button>
                         )
                    })}
                </div>
                
                <div className="flex-1 w-full min-h-0">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                             <defs>
                                <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" opacity={0.4} />
                             <XAxis 
                                dataKey="date" 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10}
                                tickFormatter={(str) => {
                                    const d = new Date(str);
                                    return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' });
                                }}
                                minTickGap={30}
                             />
                             <YAxis 
                                domain={yDomain} 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                width={40}
                             />
                             <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }} />
                             <Line 
                                type="monotone" 
                                dataKey="total" 
                                stroke="#22c55e" 
                                strokeWidth={2} 
                                dot={chartData.length < 20 ? { fill: '#0f172a', strokeWidth: 2, r: 3, stroke: '#22c55e' } : false} 
                                activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff' }} 
                            >
                                {chartData.length < 15 && <LabelList content={<CustomizedLabel />} />}
                            </Line>
                        </LineChart>
                     </ResponsiveContainer>
                </div>
            </div>

            {/* Insight Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {/* Card 1: Club Favorito (CLICKABLE) */}
                <button 
                    onClick={onOpenClubRankings}
                    className="bg-dark-800 p-3 rounded-xl border border-amber-500/20 text-center relative overflow-hidden group hover:bg-dark-700 transition-colors active:scale-95"
                >
                    <div className="absolute top-1 right-1">
                        <Crown size={10} className="text-amber-500" fill="currentColor" />
                    </div>
                    <p className="text-gray-400 text-[10px] uppercase truncate">Club Favorito</p>
                    <p className="text-white font-bold text-sm mt-1 truncate">{favoriteClub?.clubName ?? 'Sin club'}</p>
                </button>

                {/* Card 2: Compañero (CLICKABLE) */}
                <button
                    onClick={onOpenTopPartners}
                    className="bg-dark-800 p-3 rounded-xl border border-amber-500/20 text-center relative overflow-hidden group hover:bg-dark-700 transition-colors active:scale-95"
                >
                    <div className="absolute top-1 right-1">
                         <Crown size={10} className="text-amber-500" fill="currentColor" />
                    </div>
                    <p className="text-gray-400 text-[10px] uppercase truncate">Compañero</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                        <img src={resolveProfileAvatar(topPartner?.fullName ?? currentUser.name, topPartner?.photoUrl)} className="w-5 h-5 rounded-full border border-amber-500/30" />
                        <span className="text-white font-bold text-sm truncate">{topPartner?.fullName ?? 'Sin datos'}</span>
                    </div>
                </button>

                {/* Card 3: Rival (CLICKABLE) */}
                <button 
                    onClick={onOpenTopRivals}
                    className="bg-dark-800 p-3 rounded-xl border border-amber-500/20 text-center relative overflow-hidden group hover:bg-dark-700 transition-colors active:scale-95"
                >
                     <div className="absolute top-1 right-1">
                         <Crown size={10} className="text-amber-500" fill="currentColor" />
                    </div>
                    <p className="text-gray-400 text-[10px] uppercase truncate">Rival</p>
                    <p className="text-white font-bold text-sm mt-1 truncate text-red-400">{topRival?.fullName ?? 'Sin datos'}</p>
                </button>
            </div>

            {/* Últimos Resultados Carousel */}
            {hasHistory && (
                <div className="mb-6">
                    <h3 className="text-white font-bold mb-3">Últimos Resultados</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scroll-smooth snap-x scrollbar-hide">
                        {recentMatches.slice().reverse().map((hist) => (
                            <div key={hist.id} className="min-w-[85vw] sm:min-w-[340px] snap-center">
                                <MatchCard
                                    match={hist.matchCard}
                                    currentUser={currentUser}
                                    clubName={hist.matchCard.clubName || 'Partido puntuado'}
                                    onUserClick={onUserClick}
                                />
                            </div>
                        ))}
                        {false && recentMatches.slice().reverse().map((hist, index) => {
                            const isWin = hist.result === 'W';
                            
                            // Create mock users for the match
                            const opponentUser: User = {
                                id: `opp-${hist.id}`,
                                name: hist.opponent,
                                level: hist.total - (isWin ? -0.2 : 0.2),
                                matchesPlayed: 10,
                                reputation: 90,
                                avatar: `https://picsum.photos/100/100?r=${index + 10}`,
                                categoryNumber: getCategory(hist.total - (isWin ? -0.2 : 0.2)) === "1ª" ? 1 : 3,
                                isPremium: false
                            };
                            const partnerUser: User = {
                                id: `part-${hist.id}`,
                                name: 'Compañero',
                                level: hist.total,
                                matchesPlayed: 10,
                                reputation: 90,
                                avatar: `https://picsum.photos/100/100?r=${index + 20}`,
                                isPremium: false
                            };
                            const otherOpponent: User = {
                                id: `opp2-${hist.id}`,
                                name: 'Rival 2',
                                level: hist.total,
                                matchesPlayed: 10,
                                reputation: 90,
                                avatar: `https://picsum.photos/100/100?r=${index + 30}`,
                                isPremium: false
                            };

                            // Create mock match
                            const mockMatch: Match = {
                                id: `m-hist-${hist.id}`,
                                clubId: 'c1',
                                courtName: 'Cancha Central',
                                date: hist.date,
                                time: '19:00',
                                duration: 90,
                                type: MatchType.COMPETITIVE,
                                pricePerPlayer: 400,
                                currency: 'UYU',
                                players: isWin ? [currentUser, partnerUser, opponentUser, otherOpponent] : [opponentUser, otherOpponent, currentUser, partnerUser],
                                maxPlayers: 4,
                                levelRange: [hist.total - 0.5, hist.total + 0.5],
                                isPrivate: false,
                                status: 'completed',
                                result: isWin ? [[6, 4], [6, 3]] : [[4, 6], [3, 6]]
                            };

                            return (
                                <div key={hist.id} className="min-w-[85vw] sm:min-w-[340px] snap-center">
                                    <MatchCard 
                                        match={mockMatch} 
                                        currentUser={currentUser} 
                                        clubName="Top Padel"
                                        onUserClick={onUserClick}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <h3 className="text-white font-bold mb-3">Ajustes & Cuenta</h3>
            <div className="space-y-2">
                <button className="w-full bg-dark-800 p-4 rounded-xl flex justify-between items-center text-gray-200 hover:bg-dark-700 transition-colors">
                    <span className="flex items-center gap-3"><Settings size={18} /> Preferencias de Matching</span>
                    <ChevronRight size={16} className="text-gray-500" />
                </button>
                <button
                    onClick={onOpenMatchHistory}
                    className="w-full bg-dark-800 p-4 rounded-xl flex justify-between items-center text-gray-200 hover:bg-dark-700 transition-colors"
                >
                    <span className="flex items-center gap-3"><BarChart3 size={18} /> Historial de Partidos</span>
                    <ChevronRight size={16} className="text-gray-500" />
                </button>
            </div>
        </div>
    )
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USER);
  const [tempName, setTempName] = useState('');
  const [currentTab, setCurrentTab] = useState('play');
  const [matches, setMatches] = useState<Match[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [showClubRankings, setShowClubRankings] = useState(false);
  const [showNationalRanking, setShowNationalRanking] = useState(false);
  const [showTopPartners, setShowTopPartners] = useState(false);
  const [showTopRivals, setShowTopRivals] = useState(false);
  const [showCoaches, setShowCoaches] = useState(false);
  const [showPlayerClubVerification, setShowPlayerClubVerification] = useState(false);
  const [showClubVerificationRequests, setShowClubVerificationRequests] = useState(false);
  const [showClubUsers, setShowClubUsers] = useState(false);
  const [showClubAgenda, setShowClubAgenda] = useState(false);
  const [showClubCourts, setShowClubCourts] = useState(false);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [tournamentToLaunch, setTournamentToLaunch] = useState<any | null>(null);
  const [tournamentToEdit, setTournamentToEdit] = useState<any | null>(null);
  const [selectedTournamentStatus, setSelectedTournamentStatus] = useState<any | null>(null);
  const [selectedMatchForResult, setSelectedMatchForResult] = useState<Match | null>(null);
  const [showNotificationsInbox, setShowNotificationsInbox] = useState(false);
  const [showProfileMatchHistory, setShowProfileMatchHistory] = useState(false);
  const [showEditPlayerProfile, setShowEditPlayerProfile] = useState(false);
  const [savingPlayerProfile, setSavingPlayerProfile] = useState(false);
  const [clubCatalog, setClubCatalog] = useState<Club[] | null>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [leagueTournamentCatalog, setLeagueTournamentCatalog] = useState<any[]>([]);
  const [selectedPublicUser, setSelectedPublicUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authAccountMode, setAuthAccountMode] = useState<'player' | 'club'>('player');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState<{ tone: 'success' | 'info'; message: string } | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [rankingEntries, setRankingEntries] = useState<Awaited<ReturnType<typeof backendApi.getRankings>>>([]);
  const [myRatingHistory, setMyRatingHistory] = useState<Awaited<ReturnType<typeof backendApi.getMyRatingHistory>>>([]);
  const [topPartnersInsights, setTopPartnersInsights] = useState<Awaited<ReturnType<typeof backendApi.getMyTopPartners>>>([]);
  const [topRivalsInsights, setTopRivalsInsights] = useState<Awaited<ReturnType<typeof backendApi.getMyTopRivals>>>([]);
  const [clubRankingSummaries, setClubRankingSummaries] = useState<Awaited<ReturnType<typeof backendApi.getMyClubRankings>>>([]);
  const [myMatchesByScope, setMyMatchesByScope] = useState<ScopedMyMatches>(EMPTY_SCOPED_MY_MATCHES);
  const [pendingActions, setPendingActions] = useState<PendingActionResponse[]>([]);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferencesResponse | null>(null);
  const [notificationPreferencesLoading, setNotificationPreferencesLoading] = useState(false);
  const [notificationPreferencesSaving, setNotificationPreferencesSaving] = useState(false);
  const [accountDeletionRequest, setAccountDeletionRequest] = useState<AccountDeletionResponse | null>(null);
  const [accountDeletionLoading, setAccountDeletionLoading] = useState(false);
  const [accountDeletionSaving, setAccountDeletionSaving] = useState(false);
  const [tournamentSelectablePlayers, setTournamentSelectablePlayers] = useState<User[]>([]);
  const [tournamentClubOptions, setTournamentClubOptions] = useState<Club[]>([]);
  const [postMatchResult, setPostMatchResult] = useState<{ oldRating: number, newRating: number, delta: number } | null>(null);
  const [pendingMatchInviteToken, setPendingMatchInviteToken] = useState<string | null>(null);
  const [pendingMatchInvitePreview, setPendingMatchInvitePreview] = useState<MatchInvitePreviewResponse | null>(null);
  const [pendingMatchInviteLoading, setPendingMatchInviteLoading] = useState(false);
  const [pendingMatchInviteError, setPendingMatchInviteError] = useState<string | null>(null);
  const [joiningMatchInvite, setJoiningMatchInvite] = useState(false);
  const [generatedMatchInvite, setGeneratedMatchInvite] = useState<MatchInviteLinkResponse | null>(null);
  const [generatedMatchInviteCopied, setGeneratedMatchInviteCopied] = useState(false);
  const [generatedMatchInviteSharing, setGeneratedMatchInviteSharing] = useState(false);
  const [inviteLoadingMatchId, setInviteLoadingMatchId] = useState<string | null>(null);
  const [pendingTournamentInviteToken, setPendingTournamentInviteToken] = useState<string | null>(null);
  const [pendingTournamentInvitePreview, setPendingTournamentInvitePreview] = useState<TournamentInvitePreviewResponse | null>(null);
  const [pendingTournamentInviteLoading, setPendingTournamentInviteLoading] = useState(false);
  const [pendingTournamentInviteError, setPendingTournamentInviteError] = useState<string | null>(null);
  const [joiningTournamentInvite, setJoiningTournamentInvite] = useState(false);
  const [generatedTournamentInvite, setGeneratedTournamentInvite] = useState<TournamentInviteLinkResponse | null>(null);
  const [generatedTournamentInviteCopied, setGeneratedTournamentInviteCopied] = useState(false);
  const [generatedTournamentInviteSharing, setGeneratedTournamentInviteSharing] = useState(false);
  const [inviteLoadingTournamentId, setInviteLoadingTournamentId] = useState<string | null>(null);
  const [savingTournamentTeamName, setSavingTournamentTeamName] = useState(false);
  const [tournamentToRegister, setTournamentToRegister] = useState<any | null>(null);
  const [submittingTournamentRegistration, setSubmittingTournamentRegistration] = useState(false);

  const hasStoredToken = () => {
    if (typeof window === 'undefined') {
      return false;
    }

    return Boolean(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
  };

  const copyTextToClipboard = async (value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    if (typeof document === 'undefined') {
      throw new Error('Clipboard API unavailable');
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  };

  const expectedBackendRoleForAccountMode = (mode: 'player' | 'club') => (
    mode === 'club' ? 'ADMIN' : 'PLAYER'
  );

  const ensureAuthModeMatchesRole = (
    mode: 'player' | 'club',
    role: 'PLAYER' | 'ADMIN',
  ) => {
    if (role !== expectedBackendRoleForAccountMode(mode)) {
      throw new BackendApiError(
        mode === 'club'
          ? 'Esta cuenta no es una cuenta de club.'
          : 'Esta cuenta no es una cuenta de jugador.',
        400,
        null,
      );
    }
  };

  const showAuthError = (error: unknown, fallbackMessage: string) => {
    console.error(error);

    if (error instanceof BackendApiError) {
      alert(error.message);
      return;
    }

    alert(fallbackMessage);
  };

  const showMatchError = (error: unknown, fallbackMessage: string) => {
    console.error(error);

    if (error instanceof BackendApiError) {
      setNotification(error.message);
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setNotification(fallbackMessage);
    setTimeout(() => setNotification(null), 4000);
  };

  const showCriticalRefreshError = (error: unknown, fallbackMessage: string) => {
    console.error(error);

    if (!IS_PRODUCTION_LIKE_ENV) {
      return;
    }

    setNotification(fallbackMessage);
    setTimeout(() => setNotification(null), 5000);
  };

  const syncCurrentUserVerificationStatus = (
    requiresClubVerification: boolean,
    clubVerificationStatus: 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'REJECTED',
  ) => {
    const verificationStatus = toFrontendVerificationStatus(
      requiresClubVerification,
      clubVerificationStatus,
    );

    setCurrentUser(previous => ({
      ...previous,
      verificationStatus,
      isCategoryVerified: verificationStatus === 'verified',
    }));
  };

  const replaceBackendManagedMatches = (nextBackendMatches: Match[]) => {
    setMatches(prevMatches => {
      const localMatches = prevMatches.filter(match => !isBackendManagedMatch(match));
      return [...nextBackendMatches, ...localMatches];
    });
  };

  const replaceBackendTournamentMatches = (nextTournamentMatches: Match[]) => {
    setMatches(prevMatches => {
      const nonTournamentMatches = prevMatches.filter(match => match.matchSource !== 'backend-tournament');
      return [...nextTournamentMatches, ...nonTournamentMatches];
    });
  };

  const refreshBackendMatches = async (userOverride?: User) => {
    if (!hasStoredToken()) {
      setMyMatchesByScope(EMPTY_SCOPED_MY_MATCHES);
      return;
    }

    const user = userOverride ?? currentUser;
    const clubsRequest = backendApi.getClubs().catch(
      criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getClubs>>),
    );
    const myMatchesRequest = user.backendPlayerProfileId
      ? backendApi.getMyMatches()
      : Promise.resolve([] as Awaited<ReturnType<typeof backendApi.getMyMatches>>);
    const scopeRequests = user.backendPlayerProfileId
      ? Promise.all([
          backendApi.getMyMatches('upcoming').catch(criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getMyMatches>>)),
          backendApi.getMyMatches('completed').catch(criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getMyMatches>>)),
          backendApi.getMyMatches('cancelled').catch(criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getMyMatches>>)),
          backendApi.getMyMatches('pending_result').catch(criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getMyMatches>>)),
        ] as const)
      : Promise.resolve([
          [],
          [],
          [],
          [],
        ] as [
          Awaited<ReturnType<typeof backendApi.getMyMatches>>,
          Awaited<ReturnType<typeof backendApi.getMyMatches>>,
          Awaited<ReturnType<typeof backendApi.getMyMatches>>,
          Awaited<ReturnType<typeof backendApi.getMyMatches>>,
        ]);
    const [clubs, publicMatches, myMatches, scopedMatches] = await Promise.all([
      clubsRequest,
      backendApi.listMatches(),
      myMatchesRequest,
      scopeRequests,
    ]);

    setClubCatalog(buildTournamentClubOptions(clubs));
    const clubLookup = buildClubLookup(clubs);
    const nextMatches = mergeBackendMatches(myMatches, publicMatches, user, clubLookup);
    const [upcomingMatches, completedMatches, cancelledMatches, pendingResultMatches] = scopedMatches;
    setMyMatchesByScope({
      upcoming: mapScopedPlayerMatches(upcomingMatches, publicMatches, user, clubLookup),
      completed: mapScopedPlayerMatches(completedMatches, publicMatches, user, clubLookup),
      cancelled: mapScopedPlayerMatches(cancelledMatches, publicMatches, user, clubLookup),
      pendingResult: mapScopedPlayerMatches(pendingResultMatches, publicMatches, user, clubLookup),
    });
    replaceBackendManagedMatches(nextMatches);
  };

  const refreshBackendTournaments = async (userOverride?: User) => {
    if (!hasStoredToken()) {
      setClubCatalog(null);
      setLeagueTournamentCatalog([]);
      return;
    }

    const user = userOverride ?? currentUser;
    const [clubs, playerProfiles, tournamentResponses] = await Promise.all([
      backendApi.getClubs().catch(
        criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getClubs>>),
      ),
      backendApi.getPlayerProfiles().catch(
        criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getPlayerProfiles>>),
      ),
      backendApi.getTournaments().catch(
        criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getTournaments>>),
      ),
    ]);

    setClubCatalog(buildTournamentClubOptions(clubs));
    setTournamentClubOptions(buildTournamentClubOptions(clubs));
    setTournamentSelectablePlayers(buildTournamentSelectablePlayers(playerProfiles, user));

    const clubLookup = buildClubLookup(clubs);
    const backendOperationalTournaments = tournamentResponses.filter(
      tournament => tournament.format === 'LEAGUE'
        || tournament.format === 'ELIMINATION'
        || tournament.format === 'AMERICANO',
    );
    const isRelevantOperationalTournament = (
      tournament: Awaited<ReturnType<typeof backendApi.getTournaments>>[number],
    ) =>
      (user.accountType === 'club' && user.managedClubId != null && tournament.clubId === user.managedClubId)
      || tournament.createdByPlayerProfileId === user.backendPlayerProfileId
      || tournament.entries.some(entry =>
        entry.members.some(member => member.playerProfileId === user.backendPlayerProfileId),
      );

    const backendTournamentSnapshots = await Promise.all(
      backendOperationalTournaments.map(async tournament => {
        const shouldLoadOperationalData = tournament.generatedMatchesCount > 0
          || tournament.status === 'IN_PROGRESS'
          || tournament.status === 'COMPLETED';

        const [tournamentMatches, standings] = await Promise.all([
          shouldLoadOperationalData
            ? backendApi.getTournamentMatches(tournament.id).catch(
                criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getTournamentMatches>>),
              )
            : Promise.resolve([] as Awaited<ReturnType<typeof backendApi.getTournamentMatches>>),
          shouldLoadOperationalData
            ? backendApi.getTournamentStandings(tournament.id).catch(criticalRefreshFallback(null))
            : Promise.resolve(null),
        ]);

        const frontendTournamentMatches = toFrontendTournamentMatches(
          tournament,
          tournamentMatches,
          user,
          clubLookup,
        );

        return {
          isRelevant: isRelevantOperationalTournament(tournament),
          tournament: toFrontendTournament(
            tournament,
            frontendTournamentMatches,
            standings,
            user,
            clubLookup,
          ),
          matches: frontendTournamentMatches,
        };
      }),
    );

    setLeagueTournamentCatalog(
      backendTournamentSnapshots.map(snapshot => snapshot.tournament),
    );

    setTournaments(prevTournaments => [
      ...backendTournamentSnapshots
        .filter(snapshot => snapshot.isRelevant)
        .map(snapshot => snapshot.tournament),
      ...(ENABLE_LEGACY_LOCAL_FLOWS
        ? prevTournaments.filter(tournament => !tournament.isBackendTournament)
        : []),
    ]);

    replaceBackendTournamentMatches(
      backendTournamentSnapshots
        .filter(snapshot => snapshot.isRelevant)
        .flatMap(snapshot => snapshot.matches),
    );
  };

  const refreshRankingAndHistory = async (userOverride?: User) => {
    if (!hasStoredToken()) {
      setTopPartnersInsights([]);
      setTopRivalsInsights([]);
      setClubRankingSummaries([]);
      return;
    }

    const user = userOverride ?? currentUser;
    const rankingsRequest = backendApi.getRankings().catch(
      criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getRankings>>),
    );
    const historyRequest = user.backendPlayerProfileId
      ? backendApi.getMyRatingHistory().catch(
          criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getMyRatingHistory>>),
        )
      : Promise.resolve([] as Awaited<ReturnType<typeof backendApi.getMyRatingHistory>>);
    const topPartnersRequest = user.backendPlayerProfileId
      ? backendApi.getMyTopPartners().catch(
          criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getMyTopPartners>>),
        )
      : Promise.resolve([] as Awaited<ReturnType<typeof backendApi.getMyTopPartners>>);
    const topRivalsRequest = user.backendPlayerProfileId
      ? backendApi.getMyTopRivals().catch(
          criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getMyTopRivals>>),
        )
      : Promise.resolve([] as Awaited<ReturnType<typeof backendApi.getMyTopRivals>>);
    const clubRankingsRequest = user.backendPlayerProfileId
      ? backendApi.getMyClubRankings().catch(
          criticalRefreshFallback([] as Awaited<ReturnType<typeof backendApi.getMyClubRankings>>),
        )
      : Promise.resolve([] as Awaited<ReturnType<typeof backendApi.getMyClubRankings>>);

    const [nextRankings, nextHistory, nextTopPartners, nextTopRivals, nextClubRankings] = await Promise.all([
      rankingsRequest,
      historyRequest,
      topPartnersRequest,
      topRivalsRequest,
      clubRankingsRequest,
    ]);
    setRankingEntries(nextRankings);
    setMyRatingHistory(nextHistory);
    setTopPartnersInsights(nextTopPartners);
    setTopRivalsInsights(nextTopRivals);
    setClubRankingSummaries(nextClubRankings);
  };

  const refreshInbox = async () => {
    if (!hasStoredToken()) {
      setPendingActions([]);
      setNotifications([]);
      return;
    }

    const [nextPendingActions, nextNotifications] = await Promise.all([
      backendApi.getMyPendingActions().catch(() => [] as Awaited<ReturnType<typeof backendApi.getMyPendingActions>>),
      backendApi.getMyNotifications().catch(() => [] as Awaited<ReturnType<typeof backendApi.getMyNotifications>>),
    ]);

    setPendingActions(nextPendingActions);
    setNotifications(nextNotifications);
  };

  const resolveConsentPreferencesVersion = async (): Promise<string> => {
    if (notificationPreferences?.consentPreferencesVersion) {
      return notificationPreferences.consentPreferencesVersion;
    }

    const legalDocuments = await backendApi.getLegalDocuments();
    const consentDocument = legalDocuments.find(document => document.type === 'CONSENT_PREFERENCES_NOTICE');
    if (!consentDocument?.version) {
      throw new Error('No se pudo resolver la version vigente de preferencias de consentimiento.');
    }
    return consentDocument.version;
  };

  const handleUpdateNotificationPreferences = async (next: {
    allowActivityTracking: boolean;
    allowOperationalNotifications: boolean;
  }) => {
    setNotificationPreferencesSaving(true);
    try {
      const consentPreferencesVersion = await resolveConsentPreferencesVersion();
      const updatedPreferences = await backendApi.updateMyNotificationPreferences({
        ...next,
        consentPreferencesVersion,
      });
      setNotificationPreferences(updatedPreferences);
      setNotification('Preferencias de notificaciones actualizadas.');
      setTimeout(() => setNotification(null), 3500);
    } catch (error) {
      showAuthError(error, 'No se pudieron actualizar las preferencias de notificaciones.');
    } finally {
      setNotificationPreferencesSaving(false);
    }
  };

  const handleRequestAccountDeletion = async (reason: string) => {
    setAccountDeletionSaving(true);
    try {
      const nextRequest = await backendApi.requestMyAccountDeletion({
        reason: reason.trim() || null,
      });
      setAccountDeletionRequest(nextRequest);
      setNotification('Solicitud de eliminacion de cuenta registrada.');
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      showAuthError(error, 'No se pudo registrar la solicitud de eliminacion de cuenta.');
    } finally {
      setAccountDeletionSaving(false);
    }
  };

  const resetPendingMatchInvite = (clearFromUrl: boolean = true) => {
    setPendingMatchInviteToken(null);
    setPendingMatchInvitePreview(null);
    setPendingMatchInviteError(null);
    setPendingMatchInviteLoading(false);
    setJoiningMatchInvite(false);

    if (clearFromUrl) {
      clearMatchInviteTokenFromUrl();
    }
  };

  const resetPendingTournamentInvite = (clearFromUrl: boolean = true) => {
    setPendingTournamentInviteToken(null);
    setPendingTournamentInvitePreview(null);
    setPendingTournamentInviteError(null);
    setPendingTournamentInviteLoading(false);
    setJoiningTournamentInvite(false);

    if (clearFromUrl) {
      clearTournamentInviteTokenFromUrl();
    }
  };

  const resolveMatchInvitePreview = async (token: string) => {
    setPendingMatchInviteToken(token);
    setPendingMatchInviteLoading(true);
    setPendingMatchInviteError(null);

    try {
      const preview = await backendApi.resolveMatchInvite(token);
      setPendingMatchInvitePreview(preview);
    } catch (error) {
      const message = error instanceof BackendApiError && error.message
        ? error.message
        : 'No se pudo resolver el link del partido.';
      setPendingMatchInvitePreview(null);
      setPendingMatchInviteError(message);
    } finally {
      setPendingMatchInviteLoading(false);
    }
  };

  const resolveTournamentInvitePreview = async (token: string) => {
    setPendingTournamentInviteToken(token);
    setPendingTournamentInviteLoading(true);
    setPendingTournamentInviteError(null);

    try {
      const preview = await backendApi.resolveTournamentInvite(token);
      setPendingTournamentInvitePreview(preview);
    } catch (error) {
      const message = error instanceof BackendApiError && error.message
        ? error.message
        : 'No se pudo resolver el link del torneo.';
      setPendingTournamentInvitePreview(null);
      setPendingTournamentInviteError(message);
    } finally {
      setPendingTournamentInviteLoading(false);
    }
  };

  const handleCopyGeneratedMatchInvite = async (inviteUrlOverride?: string) => {
    const inviteUrl = inviteUrlOverride ?? generatedMatchInvite?.inviteUrl;
    if (!inviteUrl) {
      return;
    }

    await copyTextToClipboard(inviteUrl);
    setGeneratedMatchInviteCopied(true);
    setNotification('Link de invitacion copiado.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopyGeneratedTournamentInvite = async (inviteUrlOverride?: string) => {
    const inviteUrl = inviteUrlOverride ?? generatedTournamentInvite?.inviteUrl;
    if (!inviteUrl) {
      return;
    }

    await copyTextToClipboard(inviteUrl);
    setGeneratedTournamentInviteCopied(true);
    setNotification('Link de torneo copiado.');
    setTimeout(() => setNotification(null), 3000);
  };

  const presentGeneratedMatchInvite = async (
    inviteLink: MatchInviteLinkResponse,
    autoCopy: boolean = false,
  ) => {
    setGeneratedMatchInvite(inviteLink);
    setGeneratedMatchInviteCopied(false);
    setGeneratedMatchInviteSharing(false);

    if (!autoCopy) {
      return;
    }

    try {
      await handleCopyGeneratedMatchInvite(inviteLink.inviteUrl);
    } catch (error) {
      console.error(error);
      setNotification('Link listo para compartir desde la app.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const presentGeneratedTournamentInvite = async (
    inviteLink: TournamentInviteLinkResponse,
    autoCopy: boolean = false,
  ) => {
    setGeneratedTournamentInvite(inviteLink);
    setGeneratedTournamentInviteCopied(false);
    setGeneratedTournamentInviteSharing(false);

    if (!autoCopy) {
      return;
    }

    try {
      await handleCopyGeneratedTournamentInvite(inviteLink.inviteUrl);
    } catch (error) {
      console.error(error);
      setNotification('Link del torneo listo para compartir.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleShareGeneratedMatchInvite = async () => {
    if (!generatedMatchInvite?.inviteUrl || typeof navigator === 'undefined' || !navigator.share) {
      return;
    }

    setGeneratedMatchInviteSharing(true);

    try {
      await navigator.share({
        title: 'Sentimos Padel',
        text: 'Te comparto este link para sumarte al partido.',
        url: generatedMatchInvite.inviteUrl,
      });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') {
        showMatchError(error, 'No se pudo compartir el link desde este dispositivo.');
      }
    } finally {
      setGeneratedMatchInviteSharing(false);
    }
  };

  const handleShareGeneratedTournamentInvite = async () => {
    if (!generatedTournamentInvite?.inviteUrl || typeof navigator === 'undefined' || !navigator.share) {
      return;
    }

    setGeneratedTournamentInviteSharing(true);

    try {
      await navigator.share({
        title: 'Sentimos Padel',
        text: 'Te comparto este link para sumarte al torneo.',
        url: generatedTournamentInvite.inviteUrl,
      });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') {
        showMatchError(error, 'No se pudo compartir el link del torneo desde este dispositivo.');
      }
    } finally {
      setGeneratedTournamentInviteSharing(false);
    }
  };

  const handleCreateMatchInviteLink = async (match: Match) => {
    if (!match.backendMatchId) {
      showMatchError(new Error('Invite link requires a backend match id.'), 'Este partido todavia no tiene link oficial para compartir.');
      return;
    }

    setInviteLoadingMatchId(match.id);

    try {
      const inviteLink = await backendApi.createMatchInviteLink(match.backendMatchId);
      await presentGeneratedMatchInvite(inviteLink, true);
    } catch (error) {
      showMatchError(error, 'No se pudo generar el link de invitacion.');
    } finally {
      setInviteLoadingMatchId(null);
    }
  };

  const handleCreateTournamentInviteLink = async (tournament: any, autoCopy: boolean = true) => {
    const backendTournamentId = getBackendTournamentId(tournament.id);
    if (!backendTournamentId) {
      showMatchError(new Error('Invite link requires a backend tournament id.'), 'Este torneo todavia no tiene link oficial para compartir.');
      return;
    }

    setInviteLoadingTournamentId(tournament.id);

    try {
      const inviteLink = await backendApi.createTournamentInviteLink(backendTournamentId);
      await presentGeneratedTournamentInvite(inviteLink, autoCopy);
    } catch (error) {
      showMatchError(error, 'No se pudo generar el link del torneo.');
    } finally {
      setInviteLoadingTournamentId(null);
    }
  };

  const hydrateAuthenticatedUser = async (preferredName?: string | null) => {
    const authUser = await backendApi.getCurrentUser();

    let playerProfile = null;
    let onboarding = null;

    if (authUser.role === 'PLAYER') {
      try {
        playerProfile = await backendApi.getMyPlayerProfile();
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }

      try {
        onboarding = await backendApi.getInitialSurvey();
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    const nextUser = buildFrontendUser(
      MOCK_USER,
      authUser,
      playerProfile,
      onboarding,
      preferredName ?? readStoredDisplayName(),
    );

    setCurrentUser(nextUser);
    setTempName(nextUser.name);
    setAuthEmail(authUser.email);
    setAuthAccountMode(authUser.role === 'ADMIN' ? 'club' : 'player');
    setShowOnboarding(authUser.role === 'PLAYER' && !onboarding);
    setIsAuthenticated(authUser.role === 'ADMIN' || Boolean(onboarding));
    setCurrentTab(authUser.role === 'ADMIN' ? 'club_dashboard' : 'play');

    return { authUser, playerProfile, onboarding, nextUser };
  };

  const handleUpdateMyPlayerProfile = async (request: UpdatePlayerProfileRequest, photoFile: File | null) => {
    setSavingPlayerProfile(true);

    try {
      await backendApi.updateMyPlayerProfile(request);
      if (photoFile) {
        await backendApi.uploadMyPlayerProfilePhoto(photoFile);
      }
      await hydrateAuthenticatedUser(request.fullName);
      setShowEditPlayerProfile(false);
      setNotification('Perfil actualizado.');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      showMatchError(error, 'No se pudo actualizar el perfil.');
    } finally {
      setSavingPlayerProfile(false);
    }
  };

  const completeRegistration = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    photoUrl?: string;
    preferredSide?: 'LEFT' | 'RIGHT' | 'BOTH' | null;
    city?: string;
    representedClubId?: number | null;
    clubCity?: string;
    clubAddress?: string;
    acceptTerms: boolean;
    acceptedTermsVersion: string;
    acceptPrivacyPolicy: boolean;
    acceptedPrivacyVersion: string;
    allowActivityTracking?: boolean;
    allowOperationalNotifications?: boolean;
    consentPreferencesVersion: string;
  }) => {
    setAuthLoading(true);
    setAuthNotice(null);

    try {
      await backendApi.register({
        fullName: authAccountMode === 'player' ? data.name : null,
        email: data.email,
        phone: data.phone,
        password: data.password,
        accountType: authAccountMode === 'club' ? 'CLUB' : 'PLAYER',
        clubName: authAccountMode === 'club' ? data.name : null,
        clubCity: authAccountMode === 'club' ? data.clubCity?.trim() || null : null,
        clubAddress: authAccountMode === 'club' ? data.clubAddress?.trim() || null : null,
        photoUrl: authAccountMode === 'player' ? data.photoUrl?.trim() || null : null,
        preferredSide: authAccountMode === 'player' ? data.preferredSide ?? null : null,
        city: authAccountMode === 'player' ? data.city?.trim() || null : null,
        representedClubId: authAccountMode === 'player' ? data.representedClubId ?? null : null,
        acceptTerms: data.acceptTerms,
        acceptedTermsVersion: data.acceptedTermsVersion,
        acceptPrivacyPolicy: data.acceptPrivacyPolicy,
        acceptedPrivacyVersion: data.acceptedPrivacyVersion,
        allowActivityTracking: data.allowActivityTracking ?? false,
        allowOperationalNotifications: data.allowOperationalNotifications ?? false,
        consentPreferencesVersion: data.consentPreferencesVersion,
      });
      setAuthEmail(data.email.trim());
      setAuthPassword('');
      setPendingVerificationEmail(data.email.trim());
      setAuthNotice({
        tone: 'success',
        message: `Te enviamos un link de confirmacion a ${data.email.trim()}. Confirma tu correo y despues inicia sesion.`,
      });
      setIsRegistering(false);
    } catch (error) {
      showAuthError(error, 'No se pudo crear la cuenta.');
    } finally {
      setAuthLoading(false);
      setSessionChecked(true);
    }
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthNotice(null);
    const email = authEmail.trim();
    const password = authPassword;

    try {
      setAuthEmail(email);
      setAuthPassword(password);

      const loginResponse = await backendApi.login({ email, password });
      ensureAuthModeMatchesRole(authAccountMode, loginResponse.role);
      storeAuthTokens(loginResponse.accessToken, loginResponse.refreshToken);
      setAuthNotice(null);
      setPendingVerificationEmail('');
      await hydrateAuthenticatedUser();
    } catch (error) {
      clearAccessToken();
      if (error instanceof BackendApiError && error.message.toLowerCase().includes('confirmar tu email')) {
        setPendingVerificationEmail(email);
        setAuthNotice({
          tone: 'info',
          message: error.message,
        });
        return;
      }
      showAuthError(error, 'No se pudo iniciar sesion.');
    } finally {
      setAuthLoading(false);
      setSessionChecked(true);
    }
  };

  const handleAcceptMatchInvite = async () => {
    if (!pendingMatchInvitePreview) {
      return;
    }

    if (currentUser.accountType === 'club') {
      setNotification('Necesitas una cuenta de jugador para unirte desde este link.');
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    if (pendingInviteAlreadyJoined) {
      setCurrentTab('play');
      resetPendingMatchInvite();
      setNotification('Ya estabas dentro de este partido.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setJoiningMatchInvite(true);

    try {
      await backendApi.joinMatch(pendingMatchInvitePreview.matchId);
      await refreshBackendMatches();
      setCurrentTab('play');
      resetPendingMatchInvite();
      setNotification('Te uniste al partido desde el link.');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      if (error instanceof BackendApiError && error.message.toLowerCase().includes('already part')) {
        await refreshBackendMatches();
        setCurrentTab('play');
        resetPendingMatchInvite();
        setNotification('Ya estabas dentro de este partido.');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      showMatchError(error, 'No se pudo unir al partido desde el link.');

      if (pendingMatchInviteToken) {
        void resolveMatchInvitePreview(pendingMatchInviteToken);
      }
    } finally {
      setJoiningMatchInvite(false);
    }
  };

  const handleAcceptTournamentInvite = async () => {
    if (!pendingTournamentInvitePreview) {
      return;
    }

    if (currentUser.accountType === 'club') {
      setNotification('Necesitas una cuenta de jugador para unirte a este torneo.');
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    if (pendingInviteTournament && !(pendingInviteTournament.format === 'americano' && pendingInviteTournament.americanoType === 'dinamico')) {
      setCurrentTab('competition');
      resetPendingTournamentInvite();
      setTournamentToRegister(pendingInviteTournament);
      return;
    }

    setJoiningTournamentInvite(true);

    try {
      await backendApi.joinTournament(pendingTournamentInvitePreview.tournamentId);
      await refreshBackendTournaments();
      setCurrentTab('competition');
      resetPendingTournamentInvite();
      setNotification('Ya quedaste inscripto en el torneo.');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      if (error instanceof BackendApiError && error.message.toLowerCase().includes('already')) {
        await refreshBackendTournaments();
        setCurrentTab('competition');
        resetPendingTournamentInvite();
        setNotification('Ya estabas inscripto en este torneo.');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      showMatchError(error, 'No se pudo completar la inscripcion desde el link.');

      if (pendingTournamentInviteToken) {
        void resolveTournamentInvitePreview(pendingTournamentInviteToken);
      }
    } finally {
      setJoiningTournamentInvite(false);
    }
  };

  const handleSubmitTournamentRegistration = async (tournament: any, request: UpsertMyTournamentEntryRequest) => {
    const backendTournamentId = getBackendTournamentId(tournament.id);
    if (!backendTournamentId) {
      return;
    }

    const alreadyRegistered = Array.isArray(tournament.teams)
      && tournament.teams.some((team: any) =>
        Array.isArray(team.players)
        && team.players.some((player: User | null) => player?.id === currentUser.id),
      );

    setSubmittingTournamentRegistration(true);

    try {
      if (alreadyRegistered) {
        await backendApi.updateMyTournamentEntry(backendTournamentId, request);
      } else {
        await backendApi.joinTournament(backendTournamentId, request);
      }

      await refreshBackendTournaments();
      setTournamentToRegister(null);
      setCurrentTab('competition');
      const needsPartner = !(tournament.format === 'americano' && tournament.americanoType === 'dinamico')
        && !request.secondaryPlayerProfileId;
      setNotification(alreadyRegistered
        ? 'Inscripcion actualizada.'
        : needsPartner
          ? 'Inscripcion guardada. Tu equipo queda pendiente hasta sumar companero.'
          : 'Ya quedaste inscripto en el torneo.');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      showMatchError(error, alreadyRegistered
        ? 'No se pudo actualizar tu inscripcion al torneo.'
        : 'No se pudo completar la inscripcion al torneo.');
    } finally {
      setSubmittingTournamentRegistration(false);
    }
  };

  const handleUpdateMyTournamentTeamName = async (tournament: any, nextTeamName: string) => {
    const backendTournamentId = getBackendTournamentId(tournament.id);
    if (!backendTournamentId) {
      return;
    }

    setSavingTournamentTeamName(true);

    try {
      await backendApi.updateMyTournamentEntryTeamName(backendTournamentId, {
        teamName: nextTeamName.trim(),
      });
      await refreshBackendTournaments();
      setNotification('Nombre de equipo actualizado.');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      showMatchError(error, 'No se pudo actualizar el nombre del equipo.');
    } finally {
      setSavingTournamentTeamName(false);
    }
  };

  const handleResendEmailVerification = async () => {
    const email = (pendingVerificationEmail || authEmail).trim();
    if (!email) {
      return;
    }

    setAuthLoading(true);
    setAuthNotice(null);

    try {
      const response = await backendApi.resendEmailVerification({ email });
      setPendingVerificationEmail(email);
      setAuthNotice({
        tone: 'success',
        message: response.message,
      });
    } catch (error) {
      showAuthError(error, 'No se pudo reenviar el correo de confirmacion.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOnboardingComplete = async (rating: number, category: string) => {
    try {
      await hydrateAuthenticatedUser(tempName || readStoredDisplayName());
      await refreshRankingAndHistory();
      setAgenda([]);
      setIsAuthenticated(true);
      setShowOnboarding(false);
      setNotification(`¡Bienvenido! Tu rating inicial es ${rating.toFixed(2)} (${category})`);
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      showAuthError(error, 'No se pudo refrescar tu perfil luego del onboarding.');
    }
  };

  const handleOnboardingCancel = () => {
    setIsAuthenticated(true);
    setShowOnboarding(false);
  };

  const handleLogout = () => {
    const refreshToken = getStoredRefreshToken();
    void unregisterNativePushDevice().catch(error => {
      console.error('No se pudo desregistrar el dispositivo de push notifications.', error);
    });
    if (refreshToken) {
      void backendApi.logout(refreshToken).catch(error => {
        console.error('No se pudo cerrar la sesion en el backend.', error);
      });
    }
    clearAccessToken();
    clearStoredDisplayName();
    setIsAuthenticated(false);
    setShowOnboarding(false);
    setCurrentTab('play');
    setAuthAccountMode('player');
    setAuthEmail('');
    setAuthPassword('');
    setAuthNotice(null);
    setPendingVerificationEmail('');
    setCurrentUser(MOCK_USER);
    setMatches([]);
    setAgenda([]);
    setTournaments([]);
    setLeagueTournamentCatalog([]);
    setRankingEntries([]);
    setMyRatingHistory([]);
    setTopPartnersInsights([]);
    setTopRivalsInsights([]);
    setClubRankingSummaries([]);
    setMyMatchesByScope(EMPTY_SCOPED_MY_MATCHES);
    setPendingActions([]);
    setNotifications([]);
    setNotificationPreferences(null);
    setAccountDeletionRequest(null);
    setShowNotificationsInbox(false);
    setShowProfileMatchHistory(false);
    resetPendingMatchInvite(false);
    resetPendingTournamentInvite(false);
    setGeneratedMatchInvite(null);
    setGeneratedTournamentInvite(null);
  };

  useEffect(() => {
    const inviteToken = readMatchInviteTokenFromUrl();
    if (!inviteToken) {
      return;
    }

    void resolveMatchInvitePreview(inviteToken);
  }, []);

  useEffect(() => {
    const inviteToken = readTournamentInviteTokenFromUrl();
    if (!inviteToken) {
      return;
    }

    void resolveTournamentInvitePreview(inviteToken);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleNativeUrl = () => {
      const matchInviteToken = readMatchInviteTokenFromUrl();
      if (matchInviteToken) {
        void resolveMatchInvitePreview(matchInviteToken);
      }

      const tournamentInviteToken = readTournamentInviteTokenFromUrl();
      if (tournamentInviteToken) {
        void resolveTournamentInvitePreview(tournamentInviteToken);
      }
    };

    window.addEventListener(MOBILE_URL_EVENT_NAME, handleNativeUrl as EventListener);
    return () => {
      window.removeEventListener(MOBILE_URL_EVENT_NAME, handleNativeUrl as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      if (!hasStoredToken()) {
        setSessionChecked(true);
        return;
      }

      setAuthLoading(true);

      try {
        await hydrateAuthenticatedUser();
      } catch (error) {
        if (!cancelled) {
          clearAccessToken();
          clearStoredDisplayName();
          setIsAuthenticated(false);
          setShowOnboarding(false);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
          setSessionChecked(true);
        }
      }
    };

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMatches = async () => {
      if (!hasStoredToken() || !currentUser.backendUserId || currentUser.accountType === 'club') {
        return;
      }

      try {
        await refreshBackendMatches(currentUser);
      } catch (error) {
        if (!cancelled) {
          showCriticalRefreshError(error, 'No se pudieron cargar los partidos oficiales.');
        }
      }
    };

    loadMatches();

    return () => {
      cancelled = true;
    };
  }, [currentUser.backendUserId, currentUser.backendPlayerProfileId]);

  useEffect(() => {
    if (!hasStoredToken() || !currentUser.backendUserId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      void refreshBackendTournaments(currentUser).catch(error =>
        showCriticalRefreshError(error, 'No se pudieron actualizar los torneos oficiales.'),
      );
      if (currentUser.accountType !== 'club') {
        void refreshInbox();
      }
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentUser.backendUserId, currentUser.backendPlayerProfileId, currentUser.accountType]);

  useEffect(() => {
    let cancelled = false;

    const loadRankingHistory = async () => {
      if (!hasStoredToken() || !currentUser.backendUserId || currentUser.accountType === 'club') {
        return;
      }

      try {
        await refreshRankingAndHistory(currentUser);
      } catch (error) {
        if (!cancelled) {
          showCriticalRefreshError(error, 'No se pudo cargar ranking e historial oficial.');
        }
      }
    };

    loadRankingHistory();

    return () => {
      cancelled = true;
    };
  }, [currentUser.backendUserId, currentUser.backendPlayerProfileId]);

  useEffect(() => {
    let cancelled = false;

    const loadNotificationPreferences = async () => {
      if (!hasStoredToken() || !currentUser.backendUserId || currentUser.accountType === 'club') {
        setNotificationPreferences(null);
        return;
      }

      setNotificationPreferencesLoading(true);
      try {
        const nextPreferences = await backendApi.getMyNotificationPreferences();
        if (!cancelled) {
          setNotificationPreferences(nextPreferences);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudieron cargar las preferencias de notificaciones.', error);
        }
      } finally {
        if (!cancelled) {
          setNotificationPreferencesLoading(false);
        }
      }
    };

    void loadNotificationPreferences();

    return () => {
      cancelled = true;
    };
  }, [currentUser.backendUserId, currentUser.accountType]);

  useEffect(() => {
    let cancelled = false;

    const loadAccountDeletionRequest = async () => {
      if (!hasStoredToken() || !currentUser.backendUserId || currentUser.accountType === 'club') {
        setAccountDeletionRequest(null);
        return;
      }

      setAccountDeletionLoading(true);
      try {
        const nextRequest = await backendApi.getMyAccountDeletionRequest();
        if (!cancelled) {
          setAccountDeletionRequest(nextRequest);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudo cargar el estado de eliminacion de cuenta.', error);
        }
      } finally {
        if (!cancelled) {
          setAccountDeletionLoading(false);
        }
      }
    };

    void loadAccountDeletionRequest();

    return () => {
      cancelled = true;
    };
  }, [currentUser.backendUserId, currentUser.accountType]);

  useEffect(() => {
    let cancelled = false;

    const loadTournaments = async () => {
      if (!hasStoredToken() || !currentUser.backendUserId) {
        return;
      }

      try {
        await refreshBackendTournaments(currentUser);
      } catch (error) {
        if (!cancelled) {
          showCriticalRefreshError(error, 'No se pudieron cargar los torneos oficiales.');
        }
      }
    };

    loadTournaments();

    return () => {
      cancelled = true;
    };
  }, [currentUser.backendUserId, currentUser.backendPlayerProfileId]);

  useEffect(() => {
    let cancelled = false;

    const loadInbox = async () => {
      if (!hasStoredToken() || !currentUser.backendUserId || currentUser.accountType === 'club') {
        return;
      }

      try {
        await refreshInbox();
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    };

    loadInbox();

    return () => {
      cancelled = true;
    };
  }, [currentUser.backendUserId, currentUser.backendPlayerProfileId]);

  useEffect(() => {
    if (!hasStoredToken() || !currentUser.backendUserId || currentUser.accountType === 'club') {
      return;
    }

    void registerNativePushDevice().catch(error => {
      console.error('No se pudo inicializar push notifications nativas.', error);
    });
  }, [currentUser.backendUserId, currentUser.accountType]);

  const rankingRows = useMemo(() => mapRankingRows(rankingEntries), [rankingEntries]);
  const currentUserRankingPosition = useMemo(
    () => findRankingPosition(rankingEntries, currentUser),
    [rankingEntries, currentUser],
  );
  const ratingHistoryView = useMemo(
    () => mapRatingHistory(myRatingHistory, matches, currentUser),
    [myRatingHistory, matches, currentUser],
  );
  const competitionTournaments = useMemo(
    () => [
      ...leagueTournamentCatalog,
      ...(ENABLE_LEGACY_LOCAL_FLOWS
        ? tournaments.filter(tournament => !tournament.isBackendTournament)
        : []),
    ],
    [leagueTournamentCatalog, tournaments],
  );
  const pendingResultActionableMatches = useMemo(
    () => buildActionableResultMatches(pendingActions, matches),
    [pendingActions, matches],
  );
  const pendingResultActionableMatchesById = useMemo(
    () => buildActionableResultMatchesById(pendingActions, matches),
    [pendingActions, matches],
  );
  const unreadNotificationsCount = useMemo(
    () => getUnreadNotificationsCount(notifications),
    [notifications],
  );
  const pendingInviteMatch = useMemo(
    () => pendingMatchInvitePreview
      ? matches.find(match => match.backendMatchId === pendingMatchInvitePreview.matchId) ?? null
      : null,
    [matches, pendingMatchInvitePreview],
  );
  const pendingInviteTournament = useMemo(
    () => pendingTournamentInvitePreview
      ? tournaments.find(tournament => getBackendTournamentId(tournament.id) === pendingTournamentInvitePreview.tournamentId) ?? null
      : null,
    [tournaments, pendingTournamentInvitePreview],
  );

  const findActionableMatchForNotification = (notificationItem: NotificationResponse): Match | null => {
    if (notificationItem.matchId != null) {
      return pendingResultActionableMatches.find(
        match => match.matchSource === 'backend' && match.backendMatchId === notificationItem.matchId,
      ) ?? null;
    }

    if (notificationItem.tournamentMatchId != null) {
      return pendingResultActionableMatches.find(
        match => match.matchSource === 'backend-tournament' && match.backendMatchId === notificationItem.tournamentMatchId,
      ) ?? null;
    }

    return null;
  };

  const pendingInviteAlreadyJoined = Boolean(
    pendingInviteMatch?.players.some(player => player?.id === currentUser.id),
  );
  const pendingInviteIsFull = Boolean(
    pendingMatchInvitePreview
    && (pendingMatchInvitePreview.status === 'FULL'
      || pendingMatchInvitePreview.currentPlayerCount >= pendingMatchInvitePreview.maxPlayers),
  );
  const pendingInviteIsLocked = Boolean(
    pendingMatchInvitePreview
    && ['CANCELLED', 'COMPLETED', 'RESULT_PENDING', 'PENDING_CLUB_CONFIRMATION'].includes(pendingMatchInvitePreview.status),
  );
  const pendingTournamentInviteAlreadyJoined = Boolean(
    pendingInviteTournament?.teams?.some((team: any) =>
      Array.isArray(team.players) && team.players.some((player: User | null) => player?.id === currentUser.id),
    ),
  );
  const pendingTournamentInviteIsFull = Boolean(
    pendingTournamentInvitePreview
    && pendingTournamentInvitePreview.maxEntries != null
    && pendingTournamentInvitePreview.currentEntriesCount >= pendingTournamentInvitePreview.maxEntries,
  );
  const pendingTournamentInviteIsLocked = Boolean(
    pendingTournamentInvitePreview
    && (pendingTournamentInvitePreview.status !== 'OPEN' || !pendingTournamentInvitePreview.openEnrollment),
  );

  if (!isAuthenticated) {
    if (!sessionChecked && !showOnboarding && !isRegistering) {
      return (
        <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-6 overflow-hidden bg-dark-900">
          <div className="absolute inset-0 z-0">
            <img src="https://images.unsplash.com/photo-1554068865-24131878f8ee?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover object-center" alt="Padel Background" />
            <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-[2px]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-dark-900/50"></div>
          </div>
          <div className="relative z-10 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-padel-400 to-padel-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-padel-500/30 mb-4 mx-auto transform rotate-3">
              <Trophy size={32} className="text-dark-900" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-3">Sentimos Padel</h1>
            <p className="text-gray-400 text-sm">Cargando sesion...</p>
          </div>
        </div>
      );
    }

    if (showOnboarding) {
      return (
        <OnboardingSurvey 
          onComplete={(rating, category) => {
            void handleOnboardingComplete(rating, category);
            return;
          
            setNotification(`¡Bienvenido! Tu rating inicial es ${rating} (${category})`);
          }}
          onCancel={handleOnboardingCancel}
        />
      );
    }
    if (isRegistering) {
      return (
        <RegisterView
          onBack={() => setIsRegistering(false)}
          accountMode={authAccountMode}
          onAccountModeChange={setAuthAccountMode}
          onRegister={(data) => {
            void completeRegistration(data);
          }}
          onDetermineRating={(data) => {
            void completeRegistration(data);
          }}
        />
      );
    }
    return (
        <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-6 overflow-hidden bg-dark-900">
            <div className="absolute inset-0 z-0">
                <img src="https://images.unsplash.com/photo-1554068865-24131878f8ee?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover object-center" alt="Padel Background" />
                <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-[2px]"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-dark-900/50"></div>
            </div>
            <div className="relative z-10 w-full max-w-sm flex flex-col h-full justify-between py-8">
                <div className="flex flex-col items-center mb-8 animate-fade-in-down">
                    <div className="w-16 h-16 bg-gradient-to-br from-padel-400 to-padel-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-padel-500/30 mb-4 transform rotate-3">
                        <Trophy size={32} className="text-dark-900" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-1">Sentimos Padel</h1>
                    <p className="text-padel-400 text-sm font-bold tracking-widest uppercase">Uruguay</p>
                </div>
                <div className="bg-dark-800/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl animate-fade-in-up">
                        {(pendingMatchInviteToken || pendingMatchInviteLoading || pendingMatchInvitePreview || pendingMatchInviteError) && (
                          <div className="mb-5">
                            <MatchInvitePreviewPanel
                              preview={pendingMatchInvitePreview}
                              loading={pendingMatchInviteLoading}
                              error={pendingMatchInviteError}
                              actionHint="Ingresa con una cuenta de jugador para confirmar tu lugar desde este link."
                            />
                          </div>
                        )}
                        {(pendingTournamentInviteToken || pendingTournamentInviteLoading || pendingTournamentInvitePreview || pendingTournamentInviteError) && (
                          <div className="mb-5">
                            <TournamentInvitePreviewPanel
                              preview={pendingTournamentInvitePreview}
                              loading={pendingTournamentInviteLoading}
                              error={pendingTournamentInviteError}
                              actionHint="Ingresa con una cuenta de jugador para completar la inscripcion desde este link."
                            />
                          </div>
                        )}
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <h2 className="text-xl font-bold text-white mb-2">Bienvenido</h2>
                            <div className="grid grid-cols-2 gap-2 bg-dark-900/50 border border-dark-700 rounded-2xl p-1">
                                <button
                                  type="button"
                                  onClick={() => setAuthAccountMode('player')}
                                  className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                                    authAccountMode === 'player' ? 'bg-padel-500 text-dark-900' : 'text-gray-400'
                                  }`}
                                >
                                  Persona
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAuthAccountMode('club')}
                                  className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                                    authAccountMode === 'club' ? 'bg-padel-500 text-dark-900' : 'text-gray-400'
                                  }`}
                                >
                                  Club
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">
                              {authAccountMode === 'club'
                                ? 'Ingresa con una cuenta administradora de club para ver solo la operacion de tu sede.'
                                : 'Ingresa con tu cuenta de jugador para ver partidos, ranking, torneos y perfil.'}
                            </p>
                            {authNotice && (
                              <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                                authNotice.tone === 'success'
                                  ? 'bg-green-500/10 border-green-500/20 text-green-200'
                                  : 'bg-amber-500/10 border-amber-500/20 text-amber-100'
                              }`}>
                                {authNotice.message}
                              </div>
                            )}
                            <div className="relative group">
                                <Users className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
                                <input
                                  type="email"
                                  placeholder="Correo Electronico"
                                  className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
                                  value={authEmail}
                                  onChange={(event) => setAuthEmail(event.target.value)}
                                />
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
                                <input
                                  type="password"
                                  placeholder="Contrasena"
                                  className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
                                  value={authPassword}
                                  onChange={(event) => setAuthPassword(event.target.value)}
                                />
                            </div>
                            <Button type="submit" fullWidth disabled={authLoading} className="mt-2 font-bold text-lg shadow-xl shadow-padel-500/10 group relative overflow-hidden">
                                {authLoading ? 'Ingresando...' : 'Ingresar'}
                            </Button>
                            {pendingVerificationEmail && (
                              <button
                                type="button"
                                onClick={() => {
                                  void handleResendEmailVerification();
                                }}
                                className="w-full text-center text-sm text-padel-400 font-bold hover:text-padel-300 transition-colors"
                              >
                                Reenviar correo de confirmacion
                              </button>
                            )}
                        </form>
                    <div className="mt-6 pt-6 border-t border-white/5 text-center">
                      <p className="text-sm text-gray-400">
                        No tienes cuenta? <button onClick={() => setIsRegistering(true)} className="text-white font-bold hover:underline">Registrate gratis</button>
                      </p>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  const handleJoinMatch = async (matchId: string, slotIndex: number) => {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      if (isBackendManagedMatch(match) && match.backendMatchId) {
          try {
              await backendApi.joinMatch(match.backendMatchId);
              await refreshBackendMatches();
              setNotification(`Te uniste al partido en ${match.clubName || 'la sede seleccionada'}.`);
              setTimeout(() => setNotification(null), 3000);
          } catch (error) {
              showMatchError(error, 'No se pudo unir al partido.');
          }
          return;
      }

      setMatches(prevMatches => prevMatches.map(m => {
          if (m.id === matchId) {
              const newPlayers = [...m.players];
              newPlayers[slotIndex] = currentUser;
              
              return { 
                  ...m, 
                  players: newPlayers, 
                  pendingPlayerIds: m.pendingPlayerIds?.filter(id => id !== currentUser.id), 
                  approvedGuestIds: m.approvedGuestIds?.filter(id => id !== currentUser.id) 
              };
          }
          return m;
      }));

      const localMatch = match;
      if (localMatch) {
	        const clubName = localMatch.clubName || clubCatalog?.find(c => c.id === localMatch.clubId)?.name || 'Club';
        setNotification(`¡Te has unido al partido en ${clubName}!`);
        setTimeout(() => setNotification(null), 3000);
      }
	  };

	  const handleLeaveMatch = async (matchId: string) => {
	      const match = matches.find(m => m.id === matchId);
	      if (!match) return;

	      if (isBackendManagedMatch(match) && match.backendMatchId) {
	          try {
	              await backendApi.leaveMatch(match.backendMatchId);
	              await refreshBackendMatches();
	              setNotification('Saliste del partido.');
	              setTimeout(() => setNotification(null), 3000);
	          } catch (error) {
	              showMatchError(error, 'No se pudo salir del partido.');
	          }
	          return;
	      }

	      setMatches(prevMatches => prevMatches.map(currentMatch => ({
	          ...currentMatch,
	          players: currentMatch.id === matchId
	              ? currentMatch.players.map(player => player?.id === currentUser.id ? null : player)
	              : currentMatch.players,
	      })));
	  };

	  const handleCancelMatch = async (matchId: string) => {
	      const match = matches.find(m => m.id === matchId);
	      if (!match) return;

	      if (isBackendManagedMatch(match) && match.backendMatchId) {
	          try {
	              await backendApi.cancelMatch(match.backendMatchId);
	              await refreshBackendMatches();
	              setNotification('Partido cancelado.');
	              setTimeout(() => setNotification(null), 3000);
	          } catch (error) {
	              showMatchError(error, 'No se pudo cancelar el partido.');
	          }
	          return;
	      }

	      setMatches(prevMatches => prevMatches.map(currentMatch => currentMatch.id === matchId
	          ? { ...currentMatch, status: 'cancelled' }
	          : currentMatch));
	  };
	
	  const handleBookMatch = async (newMatch: Match) => {
      if (hasStoredToken()) {
          try {
              const backendClubId = newMatch.backendClubId ?? getBackendClubId(newMatch.clubId);
              const locationParts = [newMatch.clubName, newMatch.courtName].filter(Boolean);

              const createdMatch = await backendApi.createMatch({
                  scheduledAt: combineFrontendMatchDateTime(newMatch),
                  clubId: backendClubId,
                  locationText: locationParts.length > 0 ? locationParts.join(' - ') : newMatch.courtName,
                  notes: newMatch.type === MatchType.FRIENDLY ? 'Recreativo' : 'Por los puntos',
              });

              await refreshBackendMatches();

              if (createdMatch.status === 'PENDING_CLUB_CONFIRMATION') {
                  setNotification("Solicitud enviada. Esperando confirmacion del club.");
                  setTimeout(() => setNotification(null), 3000);
                  setCurrentTab(currentUser.accountType === 'club' ? 'club_dashboard' : 'play');
                  return;
              }

              let inviteLinkReady = true;

              try {
                  const inviteLink = await backendApi.createMatchInviteLink(createdMatch.id);
                  await presentGeneratedMatchInvite(inviteLink, true);
              } catch (error) {
                  console.error(error);
                  inviteLinkReady = false;
              }

              setNotification(inviteLinkReady
                  ? "Reserva confirmada con exito."
                  : "Reserva confirmada. El link de invitacion no se pudo generar.");
              setTimeout(() => setNotification(null), 3000);
              setCurrentTab(currentUser.accountType === 'club' ? 'club_dashboard' : 'play');
              return;
          } catch (error) {
              showMatchError(error, 'No se pudo crear el partido.');
              return;
          }
      }

      setMatches(prev => [...prev, newMatch]);
      setNotification("¡Reserva confirmada con éxito!");
      setTimeout(() => setNotification(null), 3000);
      setCurrentTab(currentUser.accountType === 'club' ? 'club_dashboard' : 'play'); // Redirect to agenda
  };

  const handleLaunchTournament = async (config: any) => {
      if (!tournamentToLaunch) return;

      const backendTournamentId = getBackendTournamentId(tournamentToLaunch.id);
      if (!backendTournamentId) {
          showMatchError(new Error('Tournament launch requires a backend tournament.'), 'Este launch MVP solo funciona con torneos backend-driven.');
          return;
      }

      try {
          await backendApi.launchTournament(backendTournamentId, {
              availableCourts: config.availableCourts ?? tournamentToLaunch.availableCourts ?? 1,
              numberOfGroups: tournamentToLaunch.format === 'league'
                  ? 1
                  : tournamentToLaunch.format === 'tournament'
                      ? (config.numGroups ?? tournamentToLaunch.numberOfGroups ?? 1)
                      : 1,
              leagueRounds: tournamentToLaunch.format === 'league' ? 2 : undefined,
              courtNames: (config.courtNames || tournamentToLaunch.courtNames || []).filter((courtName: string) => courtName?.trim()),
          });
          await refreshBackendTournaments();
          setTournamentToLaunch(null);
          setNotification("Torneo lanzado con exito.");
          setTimeout(() => setNotification(null), 3000);
      } catch (error) {
          showMatchError(error, 'No se pudo lanzar el torneo.');
      }
  };

  const handleUpdateTournament = async (updatedTournament: any) => {
      const backendTournamentId = getBackendTournamentId(updatedTournament.id);
      if (backendTournamentId) {
          try {
              await backendApi.syncTournamentEntries(
                  backendTournamentId,
                  buildSyncTournamentEntriesRequest(updatedTournament),
              );
              await refreshBackendTournaments();
              setTournamentToEdit(null);
              setNotification("¡Torneo actualizado con éxito!");
              setTimeout(() => setNotification(null), 3000);
          } catch (error) {
              showMatchError(error, 'No se pudieron actualizar los equipos del torneo.');
          }
          return;
      }

      if (!ENABLE_LEGACY_LOCAL_FLOWS) {
          setTournamentToEdit(null);
          showMatchError(
              new Error('Legacy local tournament update blocked outside development.'),
              'Este torneo local no se puede editar en este ambiente. Crea o edita torneos oficiales conectados al backend.',
          );
          return;
      }

      setTournamentToEdit(null);
      
      const expectedUsers = (updatedTournament.format === 'americano' && updatedTournament.americanoType === 'dinamico')
          ? (updatedTournament.numTeams || 8)
          : (updatedTournament.numTeams || 8) * 2;
      const registeredUsers = updatedTournament.teams 
          ? updatedTournament.teams.reduce((acc: number, t: any) => acc + (t.players?.length || 0), 0) 
          : 0;
      
      const newStatus = registeredUsers < expectedUsers ? 'Inscripciones Abiertas' : 'Empezar torneo';

      let userTeamName = '';
      if (updatedTournament.teams) {
          const userTeam = updatedTournament.teams.find((t: any) => 
              t.players && t.players.some((p: any) => p.id === currentUser.id)
          );
          if (userTeam) {
              userTeamName = ` - Equipo: ${userTeam.teamName}`;
          }
      }

      setTournaments(prev => prev.map(t => t.id === updatedTournament.id ? {
          ...t,
          ...updatedTournament,
          registeredUsers: registeredUsers,
          status: newStatus,
          userTeamName
      } : t));

      if (userTeamName) {
          setAgenda(prev => {
              const existingIndex = prev.findIndex(item => item.title === updatedTournament.name);
              if (existingIndex >= 0) {
                  // Update existing agenda item
                  const newAgenda = [...prev];
                  newAgenda[existingIndex] = {
                      ...newAgenda[existingIndex],
                      meta: `${updatedTournament.numTeams || 8} Equipos${userTeamName}`
                  };
                  return newAgenda;
              } else {
                  // Add new agenda item
                  return [{
                      id: `t-${Date.now()}`,
                      type: 'tournament',
                      title: updatedTournament.name || 'Torneo Relámpago',
                      location: updatedTournament.clubName || 'Club Local',
                      date: updatedTournament.dateString || 'Próximamente',
                      time: '10:00',
                      status: 'scheduled',
                      meta: `${updatedTournament.numTeams || 8} Equipos${userTeamName}`
                  }, ...prev];
              }
          });
      }

      setNotification("¡Torneo actualizado con éxito!");
      setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateTournament = async (tournamentData?: any) => {
      if (hasStoredToken() && (
          tournamentData?.format === 'league'
          || tournamentData?.format === 'tournament'
          || tournamentData?.format === 'americano'
      )) {
          try {
              const createdTournament = await backendApi.createTournament(buildCreateBackendTournamentRequest(tournamentData));
              await refreshBackendTournaments();
              setShowCreateTournament(false);
              if (createdTournament.openEnrollment) {
                  try {
                      const inviteLink = await backendApi.createTournamentInviteLink(createdTournament.id);
                      await presentGeneratedTournamentInvite(inviteLink, true);
                  } catch (error) {
                      console.error(error);
                  }
              }
              setNotification(createdTournament.openEnrollment
                  ? "Torneo creado. Link oficial listo para compartir."
                  : "¡Torneo creado con éxito!");
              setTimeout(() => setNotification(null), 3000);
          } catch (error) {
              showMatchError(error, 'No se pudo crear el torneo.');
          }
          return;
      }

      if (!ENABLE_LEGACY_LOCAL_FLOWS) {
          setShowCreateTournament(false);
          showMatchError(
              new Error('Legacy local tournament creation blocked outside development.'),
              'No se puede crear un torneo local en este ambiente. El torneo debe crearse conectado al backend.',
          );
          return;
      }

      setShowCreateTournament(false);
      
      // Find if current user is in any team
      let userTeamName = '';
      if (tournamentData?.teams) {
          const userTeam = tournamentData.teams.find((t: any) => t.players.some((p: any) => p.id === currentUser.id));
          if (userTeam) {
              userTeamName = ` - Equipo: ${userTeam.teamName}`;
          }
      }

      // Format date range
      let dateString = 'Próximamente';
      if (tournamentData?.startDate && tournamentData?.endDate) {
          const [sYear, sMonth, sDay] = tournamentData.startDate.split('-');
          const [eYear, eMonth, eDay] = tournamentData.endDate.split('-');
          dateString = `${parseInt(sDay)}/${parseInt(sMonth)} al ${parseInt(eDay)}/${parseInt(eMonth)}`;
      } else if (tournamentData?.startDate) {
          const [sYear, sMonth, sDay] = tournamentData.startDate.split('-');
          dateString = `${parseInt(sDay)}/${parseInt(sMonth)}`;
      }

      const isAmericanoDinamico = tournamentData?.format === 'americano' && tournamentData?.americanoType === 'dinamico';
      const expectedUsers = isAmericanoDinamico 
          ? (tournamentData?.numTeams || 8) 
          : (tournamentData?.numTeams || 8) * 2;
      const registeredUsers = tournamentData?.teams ? tournamentData.teams.reduce((acc: number, t: any) => acc + t.players.length, 0) : 0;

      // Add to agenda if we want it to show up there
      if (userTeamName) {
          const newAgendaItem: AgendaItem = {
              id: `t-${Date.now()}`,
              type: 'tournament',
              title: tournamentData?.name || 'Torneo Relámpago',
              location: tournamentData?.clubName || 'Club Local',
              date: dateString,
              time: '10:00',
              status: 'scheduled',
              meta: `${tournamentData?.numTeams || 8} ${isAmericanoDinamico ? 'Jugadores' : 'Equipos'}${userTeamName}`
          };
          setAgenda(prev => [newAgendaItem, ...prev]);
      }
      
      const newTournament = {
          id: `t-${Date.now()}`,
          creatorId: currentUser.id,
          ...tournamentData,
          dateString,
          userTeamName,
          status: registeredUsers < expectedUsers ? 'Inscripciones Abiertas' : 'Empezar torneo',
          format: tournamentData?.format || 'tournament',
          registeredUsers,
          expectedUsers,
          ranking: '-', // Placeholder for ranking
          upcomingMatches: 0 // Placeholder for upcoming matches
      };
      setTournaments(prev => [newTournament, ...prev]);

      setNotification("¡Torneo creado con éxito!");
      setTimeout(() => setNotification(null), 3000);
	  };

	  const handleJoinTournament = async (tournament: any) => {
	      const backendTournamentId = getBackendTournamentId(tournament.id);
	      if (!backendTournamentId) return;

	      if (!(tournament.format === 'americano' && tournament.americanoType === 'dinamico')) {
	          setTournamentToRegister(tournament);
	          return;
	      }

	      try {
	          await backendApi.joinTournament(backendTournamentId);
	          await refreshBackendTournaments();
	          setNotification('Ya quedaste inscripto en el torneo.');
	          setTimeout(() => setNotification(null), 3000);
	      } catch (error) {
	          showMatchError(error, 'No se pudo completar la inscripcion al torneo.');
	      }
	  };

	  const handleLeaveTournament = async (tournament: any) => {
	      const backendTournamentId = getBackendTournamentId(tournament.id);
	      if (!backendTournamentId) return;

	      try {
	          await backendApi.leaveTournament(backendTournamentId);
	          await refreshBackendTournaments();
	          setNotification('Saliste del torneo correctamente.');
	          setTimeout(() => setNotification(null), 3000);
	      } catch (error) {
	          showMatchError(error, 'No se pudo salir del torneo.');
	      }
	  };

	  const handleArchiveTournament = async (tournamentId: string) => {
	      const backendTournamentId = getBackendTournamentId(tournamentId);
	      if (!backendTournamentId) {
	          if (!ENABLE_LEGACY_LOCAL_FLOWS) {
	              showMatchError(
	                  new Error('Legacy local tournament archive blocked outside development.'),
	                  'Este torneo local no se puede archivar en este ambiente.',
	              );
	              return;
	          }

	          setTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, isArchived: true } : t));
	          return;
	      }

	      try {
	          await backendApi.archiveTournament(backendTournamentId);
	          await refreshBackendTournaments();
	          setNotification('Torneo archivado.');
	          setTimeout(() => setNotification(null), 3000);
	      } catch (error) {
	          showMatchError(error, 'No se pudo archivar el torneo.');
	      }
	  };
	
	  const handleRequestAccess = async (matchId: string) => {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      if (isBackendManagedMatch(match) && match.backendMatchId) {
          try {
              await backendApi.joinMatch(match.backendMatchId);
              await refreshBackendMatches();
              setNotification("¡Te has unido al partido!");
              setTimeout(() => setNotification(null), 3000);
          } catch (error) {
              showMatchError(error, 'No se pudo unir al partido.');
          }
          return;
      }

      // 1. Set to pending
      setMatches(prevMatches => prevMatches.map(m => {
          if (m.id === matchId) {
              return { ...m, pendingPlayerIds: [...(m.pendingPlayerIds || []), currentUser.id] };
          }
          return m;
      }));

      // 2. Simulate Approval process (3 seconds delay)
      setTimeout(() => {
          setMatches(prevMatches => prevMatches.map(m => {
              if (m.id === matchId) {
                  return { 
                      ...m, 
                      pendingPlayerIds: m.pendingPlayerIds?.filter(id => id !== currentUser.id),
                      approvedGuestIds: [...(m.approvedGuestIds || []), currentUser.id]
                  };
              }
              return m;
          }));
          setNotification("¡Solicitud Aprobada! Ya puedes unirte al partido.");
          setTimeout(() => setNotification(null), 4000);
      }, 3000);
  };

  const handleSubmitResult = async (matchId: string, result: [number, number][]) => {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      if (isBackendTournamentMatch(match) && match.backendMatchId && match.tournamentId) {
          const backendTournamentId = getBackendTournamentId(match.tournamentId);
          if (!backendTournamentId) {
              setNotification('No se pudo resolver el torneo asociado a este partido.');
              setTimeout(() => setNotification(null), 4000);
              return;
          }

          try {
              await backendApi.submitTournamentMatchResult(
                  backendTournamentId,
                  match.backendMatchId,
                  buildSubmitTournamentResultRequest(result),
              );
              await refreshBackendTournaments();
              await refreshInbox();
              setNotification("Resultado enviado. Esperando validación del equipo rival...");
              setTimeout(() => setNotification(null), 4000);
          } catch (error) {
              const fallbackMessage = error instanceof Error ? error.message : 'No se pudo enviar el resultado del torneo.';
              showMatchError(error, fallbackMessage);
          }
          return;
      }

      if (isBackendManagedMatch(match) && match.backendMatchId) {
          try {
              if (!match.teamsAssigned) {
                  if (!isBackendMatchCreator(match, currentUser)) {
                      setNotification("El creador del partido debe definir los equipos antes de cargar el resultado.");
                      setTimeout(() => setNotification(null), 4000);
                      return;
                  }

                  const assignments = buildAutoTeamAssignments(match);
                  if (!assignments) {
                      setNotification("Se necesitan 4 jugadores definidos para asignar equipos.");
                      setTimeout(() => setNotification(null), 4000);
                      return;
                  }

                  await backendApi.assignMatchTeams(match.backendMatchId, assignments);
              }

              await backendApi.submitMatchResult(match.backendMatchId, buildSubmitResultRequest(result));
              await refreshBackendMatches();
              await refreshInbox();
              setNotification("Resultado enviado. Esperando validacion del rival...");
              setTimeout(() => setNotification(null), 4000);
          } catch (error) {
              const fallbackMessage = error instanceof Error ? error.message : 'No se pudo enviar el resultado.';
              showMatchError(error, fallbackMessage);
          }
          return;
      }

      // Check participation or if user is tournament creator
      const isUserInMatch = match.players.some(p => p?.id === currentUser.id);
      let isTournamentCreator = false;
      if (match.isTournamentMatch && match.tournamentId) {
          const tournament = tournaments.find(t => t.id === match.tournamentId);
          if (tournament && tournament.creatorId === currentUser.id) {
              isTournamentCreator = true;
          }
      }

      if (!isUserInMatch && !isTournamentCreator) {
          setNotification("Solo puedes subir resultados de partidos en los que participaste o de torneos que organizas.");
          setTimeout(() => setNotification(null), 3000);
          return;
      }

      setMatches(prevMatches => prevMatches.map(m => {
          if (m.id === matchId) {
              return {
                  ...m,
                  status: 'awaiting_validation',
                  result: result,
                  resultSubmittedBy: currentUser.id
              };
          }
          return m;
      }));
      setNotification("Resultado enviado. Esperando validación del rival...");
      
      // Simulate rival confirming the result after 3 seconds
      setTimeout(() => {
          setNotification("¡El resultado ha sido confirmado!");
          setTimeout(() => {
              setNotification(null);
              handleConfirmResult(matchId, result);
          }, 2000);
      }, 3000);
  };

  const handleOpenResultInput = (match: Match) => {
      if (match.pendingNotificationId) {
          backendApi.markNotificationRead(match.pendingNotificationId)
              .then(() => refreshInbox())
              .catch(error => console.error(error));
      }
      setSelectedMatchForResult(match);
  };

  const handleOpenNotification = async (notificationItem: NotificationResponse) => {
      const actionableMatch = findActionableMatchForNotification(notificationItem);

      if (actionableMatch) {
          setShowNotificationsInbox(false);
          handleOpenResultInput(actionableMatch);
          return;
      }

      const markAsReadIfNeeded = async () => {
          if (notificationItem.status === 'READ') {
              return;
          }

          try {
              await backendApi.markNotificationRead(notificationItem.id);
              await refreshInbox();
          } catch (error) {
              console.error(error);
          }
      };

      if (notificationItem.tournamentId != null) {
          const tournament = tournaments.find(
              item => item.isBackendTournament && item.backendTournamentId === notificationItem.tournamentId,
          );
          await markAsReadIfNeeded();
          setShowNotificationsInbox(false);

          if (tournament) {
              setSelectedTournamentStatus(tournament);
              return;
          }
      }

      if (notificationItem.type === 'CLUB_VERIFICATION_APPROVED' || notificationItem.type === 'CLUB_VERIFICATION_REJECTED') {
          await markAsReadIfNeeded();
          setShowNotificationsInbox(false);
          setShowPlayerClubVerification(true);
          return;
      }

      if (notificationItem.type === 'CLUB_BOOKING_APPROVED' || notificationItem.type === 'CLUB_BOOKING_REJECTED') {
          await markAsReadIfNeeded();
          setShowNotificationsInbox(false);
          setCurrentTab('play');
          return;
      }

      await markAsReadIfNeeded();
      setShowNotificationsInbox(false);
      setNotification('Notificacion marcada como leida.');
      setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
      const parsePushId = (value: unknown): number | null => {
          if (typeof value === 'number' && Number.isFinite(value)) {
              return value;
          }
          if (typeof value === 'string' && value.trim() !== '') {
              const parsed = Number(value);
              return Number.isFinite(parsed) ? parsed : null;
          }
          return null;
      };

      const resultActionTypes = new Set([
          'SUBMIT_MATCH_RESULT',
          'CONFIRM_MATCH_RESULT',
          'SUBMIT_TOURNAMENT_RESULT',
          'CONFIRM_TOURNAMENT_RESULT',
      ]);

      const handlePushOpened = (event: Event) => {
          const detail = event instanceof CustomEvent ? event.detail : null;
          if (!detail || typeof detail !== 'object') {
              return;
          }

          const data = detail as Record<string, unknown>;
          const type = typeof data.type === 'string' ? data.type : null;
          const matchId = parsePushId(data.matchId);
          const tournamentId = parsePushId(data.tournamentId);
          const tournamentMatchId = parsePushId(data.tournamentMatchId);

          setShowNotificationsInbox(false);

          if (type === 'CLUB_VERIFICATION_APPROVED' || type === 'CLUB_VERIFICATION_REJECTED') {
              setShowPlayerClubVerification(true);
              return;
          }

          const actionableMatch = matches.find(match => {
              if (match.matchSource === 'backend' && match.backendMatchId === matchId) {
                  return true;
              }
              return match.matchSource === 'backend-tournament' && match.backendMatchId === tournamentMatchId;
          });

          if (type && resultActionTypes.has(type) && actionableMatch) {
              handleOpenResultInput(actionableMatch);
              return;
          }

          if (tournamentId != null) {
              const tournament = tournaments.find(
                  item => item.isBackendTournament && item.backendTournamentId === tournamentId,
              );
              if (tournament) {
                  setSelectedTournamentStatus(tournament);
                  return;
              }
          }

          if (matchId != null || type === 'CLUB_BOOKING_APPROVED' || type === 'CLUB_BOOKING_REJECTED') {
              setCurrentTab('play');
          }
      };

      window.addEventListener(PUSH_OPENED_EVENT_NAME, handlePushOpened);
      return () => {
          window.removeEventListener(PUSH_OPENED_EVENT_NAME, handlePushOpened);
      };
  }, [matches, tournaments]);

  const handleRejectResult = async (matchId: string) => {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      if (isBackendTournamentMatch(match) && match.backendMatchId && match.tournamentId) {
          const backendTournamentId = getBackendTournamentId(match.tournamentId);
          if (!backendTournamentId) {
              setNotification('No se pudo resolver el torneo asociado a este partido.');
              setTimeout(() => setNotification(null), 4000);
              return;
          }

          try {
              await backendApi.rejectTournamentMatchResult(backendTournamentId, match.backendMatchId);
              await refreshBackendTournaments();
              await refreshInbox();
              setNotification("Resultado rechazado. El partido volvió a quedar listo para reenviar marcador.");
              setTimeout(() => setNotification(null), 4000);
          } catch (error) {
              showMatchError(error, 'No se pudo rechazar el resultado del torneo.');
          }
          return;
      }

      if (isBackendManagedMatch(match) && match.backendMatchId) {
          try {
              await backendApi.rejectMatchResult(match.backendMatchId);
              await refreshBackendMatches();
              await refreshInbox();
              setNotification("Resultado rechazado. El partido volvio a quedar listo para reenviar marcador.");
              setTimeout(() => setNotification(null), 4000);
          } catch (error) {
              showMatchError(error, 'No se pudo rechazar el resultado.');
          }
          return;
      }

      setNotification("El rechazo de resultados sigue pendiente para este flujo local.");
      setTimeout(() => setNotification(null), 3000);
  };

  const handleConfirmResult = async (matchId: string, overrideResult?: [number, number][]) => {
      const match = matches.find(m => m.id === matchId);
      const finalResult = overrideResult || match?.result;
      if (!match || !finalResult) return;

      if (isBackendTournamentMatch(match) && match.backendMatchId && match.tournamentId) {
          const backendTournamentId = getBackendTournamentId(match.tournamentId);
          if (!backendTournamentId) {
              setNotification('No se pudo resolver el torneo asociado a este partido.');
              setTimeout(() => setNotification(null), 4000);
              return;
          }

          try {
              await backendApi.confirmTournamentMatchResult(backendTournamentId, match.backendMatchId);
              await refreshBackendTournaments();
              await refreshInbox();
              setNotification("Resultado confirmado. La tabla oficial del torneo ya fue actualizada por el backend.");
              setTimeout(() => setNotification(null), 4000);
          } catch (error) {
              showMatchError(error, 'No se pudo confirmar el resultado del torneo.');
          }
          return;
      }

      if (isBackendManagedMatch(match) && match.backendMatchId) {
          try {
              await backendApi.confirmMatchResult(match.backendMatchId);
              await hydrateAuthenticatedUser(tempName || readStoredDisplayName());
              await refreshRankingAndHistory();
              await refreshBackendMatches();
              await refreshInbox();
              setNotification("Resultado confirmado. El estado oficial y el rating ya fueron actualizados por el backend.");
              setTimeout(() => setNotification(null), 4000);
          } catch (error) {
              showMatchError(error, 'No se pudo confirmar el resultado.');
          }
          return;
      }

      // Check participation or if user is tournament creator
      const isUserInMatch = match.players.some(p => p?.id === currentUser.id);
      let isTournamentCreator = false;
      let isLeagueMatch = false;
      if (match.isTournamentMatch && match.tournamentId) {
          const tournament = tournaments.find(t => t.id === match.tournamentId);
          if (tournament && tournament.creatorId === currentUser.id) {
              isTournamentCreator = true;
          }
          if (tournament && tournament.format === 'league') {
              isLeagueMatch = true;
          }
      }

      if (!isUserInMatch && !isTournamentCreator) {
          setNotification("Solo puedes confirmar resultados de partidos en los que participaste o de torneos que organizas.");
          setTimeout(() => setNotification(null), 3000);
          return;
      }

      if (!ENABLE_LEGACY_LOCAL_RATING) {
          setMatches(prevMatches => prevMatches.map(m => {
              if (m.id === matchId) {
                  return { ...m, status: 'completed', result: finalResult };
              }
              return m;
          }));
          setNotification("Resultado confirmado localmente. El rating oficial solo se actualiza desde el backend.");
          setTimeout(() => setNotification(null), 4000);
          return;
      }

      // Extract sets from finalResult
      let setsA = 0;
      let setsB = 0;
      finalResult.forEach(set => {
          if (set[0] > set[1]) setsA++;
          else if (set[1] > set[0]) setsB++;
      });

      const affectsRating = match.type === MatchType.COMPETITIVE || match.type === MatchType.TOURNAMENT;

      setCurrentUser(prevUser => {
          // Prepare input for ELO calculation
          const getPlayerInput = (p: User | null | undefined): EloMatchInput['teamA'][0] => {
              if (p && p.id === prevUser.id) {
                  return { id: p.id, rating: prevUser.level, matchesPlayed: prevUser.matchesPlayed };
              }
              if (p) return { id: p.id, rating: p.level, matchesPlayed: p.matchesPlayed || 10 };
              return { id: 'mock', rating: 3.5, matchesPlayed: 10 }; // Fallback
          };

          const input: EloMatchInput = {
              teamA: [getPlayerInput(match.players[0]), getPlayerInput(match.players[1])],
              teamB: [getPlayerInput(match.players[2]), getPlayerInput(match.players[3])],
              setsA,
              setsB
          };

          const eloResult = computeMatchRatingUpdatesElo(input);

          // Find current user's result
          let userResult = eloResult.teamA.find(p => p.id === prevUser.id) || eloResult.teamB.find(p => p.id === prevUser.id);

          if (userResult && affectsRating) {
              // Determine opponent name
              const isUserInTeamA = match.players.slice(0, 2).some(p => p?.id === prevUser.id);
              const opponentTeam = isUserInTeamA ? match.players.slice(2, 4) : match.players.slice(0, 2);
              const opponentName = opponentTeam.find(p => p !== null)?.name || 'Rival';

              // Add to history
              MATCH_ELO_HISTORY.push({
                  id: `hist-${Date.now()}-${Math.random()}`,
                  date: new Date().toISOString(),
                  opponent: opponentName,
                  result: (userResult.delta > 0) ? 'W' : 'L',
                  diff: userResult.delta,
                  total: userResult.newRating
              });

              // Only show PostMatchView if not in a tournament status view or if not currently inputting another result
              if (!selectedTournamentStatus && !selectedMatchForResult) {
                  setPostMatchResult({
                      oldRating: userResult.oldRating,
                      newRating: userResult.newRating,
                      delta: userResult.delta
                  });
              } else {
                  // Show a less intrusive notification instead
                  setNotification(`¡Resultado confirmado! Rating: ${userResult.newRating.toFixed(2)} (${userResult.delta > 0 ? '+' : ''}${userResult.delta.toFixed(2)})`);
                  setTimeout(() => setNotification(null), 4000);
              }

              let updatedUser = {
                  ...prevUser,
                  level: userResult.newRating,
                  matchesPlayed: userResult.newMatchesPlayed,
                  categoryNumber: getCategory(userResult.newRating) === '1ª' ? 1 : 
                                  getCategory(userResult.newRating) === '2ª' ? 2 : 
                                  getCategory(userResult.newRating) === '3ª' ? 3 : 
                                  getCategory(userResult.newRating) === '4ª' ? 4 : 
                                  getCategory(userResult.newRating) === '5ª' ? 5 : 
                                  getCategory(userResult.newRating) === '6ª' ? 6 : 7,
                  categoryName: getCategory(userResult.newRating)
              };

              // Check for tournament win
              if (match.tournamentId && match.round === 'Final') {
                  const tournament = tournaments.find(t => t.id === match.tournamentId);
                  if (tournament) {
                      const isUserInTeamA = match.players.slice(0, 2).some(p => p?.id === prevUser.id);
                      const isUserInTeamB = match.players.slice(2, 4).some(p => p?.id === prevUser.id);
                      const userWon = (isUserInTeamA && setsA > setsB) || (isUserInTeamB && setsB > setsA);
                      
                      if (userWon) {
                          const badgeName = `🏆 Campeón ${tournament.name}`;
                          if (!updatedUser.badges?.includes(badgeName)) {
                              updatedUser = {
                                  ...updatedUser,
                                  badges: [...(updatedUser.badges || []), badgeName]
                              };
                          }
                      }
                  }
              }

              return updatedUser;
          }

          // Check for tournament win even if it doesn't affect rating
          let updatedUser = { ...prevUser };
          if (match.tournamentId && match.round === 'Final') {
              const tournament = tournaments.find(t => t.id === match.tournamentId);
              if (tournament) {
                  const isUserInTeamA = match.players.slice(0, 2).some(p => p?.id === prevUser.id);
                  const isUserInTeamB = match.players.slice(2, 4).some(p => p?.id === prevUser.id);
                  const userWon = (isUserInTeamA && setsA > setsB) || (isUserInTeamB && setsB > setsA);
                  
                  if (userWon) {
                      const badgeName = `🏆 Campeón ${tournament.name}`;
                      if (!updatedUser.badges?.includes(badgeName)) {
                          updatedUser = {
                              ...updatedUser,
                              badges: [...(updatedUser.badges || []), badgeName]
                          };
                      }
                  }
              }
          }

          return updatedUser;
      });

      setMatches(prevMatches => {
          let updatedMatches = prevMatches.map(m => {
              if (m.id === matchId) {
                  return { ...m, status: 'completed', result: finalResult };
              }
              return m;
          });

          // Update tournament playoffs if applicable
          if (match.tournamentId) {
              const tournament = tournaments.find(t => t.id === match.tournamentId);
              if (tournament && tournament.format === 'tournament') {
                  const config = tournament.launchConfig?.generatedData || {};
                  const groups = config.groups || [];
                  
                  const tournamentMatches = updatedMatches.filter(m => m.tournamentId === tournament.id);
                  const groupMatches = tournamentMatches.filter(m => m.round?.startsWith('Fase de Grupos'));
                  const allGroupMatchesCompleted = groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');
                  
                  let newAgendaItems: AgendaItem[] = [];
                  const userTeamName = tournament.userTeamName?.replace(' - Equipo: ', '');

                  if (allGroupMatchesCompleted) {
                      const groupStandings: Record<string, any[]> = {};
                      
                      groups.forEach((group: any) => {
                          const standings = group.teams.map((team: any) => ({
                              name: team.name,
                              pts: 0, pj: 0, pg: 0, pp: 0, setsWon: 0, setsLost: 0, netSets: 0
                          }));
                          
                          const groupCompletedMatches = groupMatches.filter(m => m.round === `Fase de Grupos - ${group.name}`);
                          
                          groupCompletedMatches.forEach(gm => {
                              const teamA = standings.find((t: any) => t.name === gm.team1Name);
                              const teamB = standings.find((t: any) => t.name === gm.team2Name);
                              
                              if (gm.result) {
                                  let setsA = 0;
                                  let setsB = 0;
                                  gm.result.forEach(set => {
                                      if (set[0] > set[1]) setsA++;
                                      else if (set[1] > set[0]) setsB++;
                                  });
                                  
                                  if (teamA) {
                                      teamA.pj++;
                                      teamA.setsWon += setsA;
                                      teamA.setsLost += setsB;
                                      if (setsA > setsB) { teamA.pg++; teamA.pts += 2; } else { teamA.pp++; }
                                  }
                                  if (teamB) {
                                      teamB.pj++;
                                      teamB.setsWon += setsB;
                                      teamB.setsLost += setsA;
                                      if (setsB > setsA) { teamB.pg++; teamB.pts += 2; } else { teamB.pp++; }
                                  }
                              }
                          });
                          
                          standings.forEach((t: any) => t.netSets = t.setsWon - t.setsLost);
                          standings.sort((a: any, b: any) => {
                              if (b.pts !== a.pts) return b.pts - a.pts;
                              if (b.netSets !== a.netSets) return b.netSets - a.netSets;
                              return b.setsWon - a.setsWon;
                          });
                          
                          groupStandings[group.name] = standings;
                      });
                      
                      updatedMatches = updatedMatches.map(m => {
                          if (m.tournamentId === tournament.id && (m.round?.startsWith('Semifinal') || m.round === 'Final')) {
                              let updated = { ...m };
                              let changed = false;
                              
                              const updateTeam = (teamKey: 'team1Name' | 'team2Name') => {
                                  const name = updated[teamKey];
                                  if (name) {
                                      const matchRegex = name.match(/(\d)(ro|do|to) Grupo ([A-Z])/);
                                      if (matchRegex) {
                                          const pos = parseInt(matchRegex[1]) - 1;
                                          const groupName = `Grupo ${matchRegex[3]}`;
                                          if (groupStandings[groupName] && groupStandings[groupName][pos]) {
                                              updated[teamKey] = groupStandings[groupName][pos].name;
                                              const teamData = tournament.teams?.find((t: any) => t.teamName === updated[teamKey]);
                                              if (teamData) {
                                                  updated.players = [...updated.players];
                                                  if (teamKey === 'team1Name') {
                                                      updated.players[0] = teamData.players[0] || null;
                                                      updated.players[1] = teamData.players[1] || null;
                                                  } else {
                                                      updated.players[2] = teamData.players[0] || null;
                                                      updated.players[3] = teamData.players[1] || null;
                                                  }
                                              }
                                              changed = true;
                                          }
                                      }
                                  }
                              };
                              
                              updateTeam('team1Name');
                              updateTeam('team2Name');
                              
                              if (changed && userTeamName && (updated.team1Name === userTeamName || updated.team2Name === userTeamName)) {
                                  newAgendaItems.push({
                                      id: `playoff-${updated.id}`,
                                      type: 'match',
                                      title: `${tournament.name} - ${updated.round}`,
                                      location: updated.courtName || 'Cancha',
                                      date: updated.date.split('T')[0],
                                      time: updated.time,
                                      status: 'scheduled',
                                      meta: `${updated.team1Name} vs ${updated.team2Name}`
                                  });
                              }
                              
                              return updated;
                          }
                          return m;
                      });
                  }
                  
                  // Update Final match if Semifinals are completed
                  const semifinals = updatedMatches.filter(m => m.tournamentId === tournament.id && m.round?.startsWith('Semifinal'));
                  if (semifinals.length > 0) {
                      updatedMatches = updatedMatches.map(m => {
                          if (m.tournamentId === tournament.id && m.round === 'Final') {
                              let updated = { ...m };
                              let changed = false;
                              
                              const updateWinner = (teamKey: 'team1Name' | 'team2Name', semiName: string) => {
                                  if (updated[teamKey] === `Ganador ${semiName.replace('Semifinal', 'Semi')}`) {
                                      const semi = semifinals.find(s => s.round === semiName);
                                      if (semi && semi.status === 'completed' && semi.result) {
                                          let setsA = 0;
                                          let setsB = 0;
                                          semi.result.forEach(set => {
                                              if (set[0] > set[1]) setsA++;
                                              else if (set[1] > set[0]) setsB++;
                                          });
                                          updated[teamKey] = setsA > setsB ? semi.team1Name! : semi.team2Name!;
                                          const teamData = tournament.teams?.find((t: any) => t.teamName === updated[teamKey]);
                                          if (teamData) {
                                              updated.players = [...updated.players];
                                              if (teamKey === 'team1Name') {
                                                  updated.players[0] = teamData.players[0] || null;
                                                  updated.players[1] = teamData.players[1] || null;
                                              } else {
                                                  updated.players[2] = teamData.players[0] || null;
                                                  updated.players[3] = teamData.players[1] || null;
                                              }
                                          }
                                          changed = true;
                                      }
                                  }
                              };
                              
                              updateWinner('team1Name', 'Semifinal 1');
                              updateWinner('team2Name', 'Semifinal 2');
                              
                              if (changed && userTeamName && (updated.team1Name === userTeamName || updated.team2Name === userTeamName)) {
                                  newAgendaItems.push({
                                      id: `playoff-${updated.id}`,
                                      type: 'match',
                                      title: `${tournament.name} - ${updated.round}`,
                                      location: updated.courtName || 'Cancha',
                                      date: updated.date.split('T')[0],
                                      time: updated.time,
                                      status: 'scheduled',
                                      meta: `${updated.team1Name} vs ${updated.team2Name}`
                                  });
                              }
                              
                              return updated;
                          }
                          return m;
                      });
                  }
                  
                  if (newAgendaItems.length > 0) {
                      setTimeout(() => {
                          setAgenda(prev => {
                              const existingIds = new Set(prev.map(a => a.id));
                              const uniqueNewItems = newAgendaItems.filter(item => !existingIds.has(item.id));
                              return [...uniqueNewItems, ...prev];
                          });
                      }, 0);
                  }
              }
          }

          return updatedMatches;
      });

      // Update tournament info if applicable
      if (match.tournamentId) {
          setTournaments(prevTournaments => prevTournaments.map(t => {
              if (t.id === match.tournamentId) {
                  return {
                      ...t,
                      upcomingMatches: Math.max(0, (t.upcomingMatches || 0) - 1)
                  };
              }
              return t;
          }));
      }
  };


  const closeGeneratedMatchInvite = () => {
      setGeneratedMatchInvite(null);
      setGeneratedMatchInviteCopied(false);
      setGeneratedMatchInviteSharing(false);
  };

  const closeGeneratedTournamentInvite = () => {
      setGeneratedTournamentInvite(null);
      setGeneratedTournamentInviteCopied(false);
      setGeneratedTournamentInviteSharing(false);
  };

  let pendingInviteActionLabel: string | null = null;
  let pendingInviteActionHint: string | null = null;
  let pendingInviteActionDisabled = false;
  let pendingInviteActionHandler: (() => void) | undefined;

  if (pendingMatchInvitePreview) {
      if (currentUser.accountType === 'club') {
          pendingInviteActionHint = 'Este link se puede abrir desde la cuenta del club, pero para unirte necesitas una cuenta de jugador.';
      } else if (pendingInviteAlreadyJoined) {
          pendingInviteActionLabel = 'Ver en agenda';
          pendingInviteActionHandler = () => {
              setCurrentTab('play');
              resetPendingMatchInvite();
          };
          pendingInviteActionHint = 'Ya estabas dentro del partido, asi que solo queda verlo desde tu agenda.';
      } else if (pendingMatchInvitePreview.status === 'PENDING_CLUB_CONFIRMATION') {
          pendingInviteActionHint = 'Este partido sigue pendiente de aprobacion del club. El link se va a poder usar una vez que la reserva quede aprobada.';
      } else if (pendingInviteIsLocked) {
          pendingInviteActionHint = 'Este partido ya no admite nuevos jugadores desde el link.';
      } else if (pendingInviteIsFull) {
          pendingInviteActionHint = 'Este partido ya esta completo.';
      } else {
          pendingInviteActionLabel = 'Unirme al partido';
          pendingInviteActionHandler = () => {
              void handleAcceptMatchInvite();
          };
          pendingInviteActionDisabled = joiningMatchInvite;
      }
  }

  let pendingTournamentInviteActionLabel: string | null = null;
  let pendingTournamentInviteActionHint: string | null = null;
  let pendingTournamentInviteActionDisabled = false;
  let pendingTournamentInviteActionHandler: (() => void) | undefined;

  if (pendingTournamentInvitePreview) {
      if (currentUser.accountType === 'club') {
          pendingTournamentInviteActionHint = 'Este link se puede abrir desde la cuenta del club, pero para inscribirte necesitas una cuenta de jugador.';
      } else if (pendingTournamentInviteAlreadyJoined) {
          const pendingEntryNeedsCompletion = pendingInviteTournament?.currentUserEntryStatus === 'PENDING';
          pendingTournamentInviteActionLabel = pendingEntryNeedsCompletion ? 'Completar equipo' : 'Ver torneo';
          pendingTournamentInviteActionHandler = () => {
              if (pendingInviteTournament && pendingEntryNeedsCompletion) {
                  setTournamentToRegister(pendingInviteTournament);
              } else if (pendingInviteTournament) {
                  setSelectedTournamentStatus(pendingInviteTournament);
              }
              setCurrentTab('competition');
              resetPendingTournamentInvite();
          };
          pendingTournamentInviteActionHint = pendingEntryNeedsCompletion
              ? 'Ya estabas dentro del torneo, pero tu equipo sigue pendiente.'
              : 'Ya estabas dentro del torneo.';
      } else if (pendingTournamentInviteIsLocked) {
          pendingTournamentInviteActionHint = 'Este torneo ya no admite nuevas inscripciones desde el link.';
      } else if (pendingTournamentInviteIsFull) {
          pendingTournamentInviteActionHint = 'Este torneo ya completo todos sus cupos.';
      } else {
          pendingTournamentInviteActionLabel = 'Inscribirme al torneo';
          pendingTournamentInviteActionHandler = () => {
              void handleAcceptTournamentInvite();
          };
          pendingTournamentInviteActionDisabled = joiningTournamentInvite;
      }
  }

  return (
    <div className="min-h-screen bg-dark-900 font-sans text-gray-100 selection:bg-padel-500 selection:text-dark-900 relative">
      <main className="max-w-md mx-auto min-h-screen bg-dark-900 shadow-2xl relative overflow-hidden">
         {/* Top decorative gradient mesh */}
         <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-padel-900/20 to-transparent pointer-events-none"></div>

         {/* Notification Toast */}
         {notification && (
             <div className="absolute top-4 left-4 right-4 z-[110] animate-fade-in-down">
                 <div className="bg-dark-800 border border-padel-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                     <div className="bg-padel-500 rounded-full p-1">
                        <CheckCircle size={16} className="text-dark-900" />
                     </div>
                     <span className="text-sm font-medium">{notification}</span>
                 </div>
             </div>
         )}

         {generatedMatchInvite && (
             <div className="absolute inset-0 z-[115] flex items-end justify-center bg-dark-900/80 p-4 backdrop-blur-sm sm:items-center">
                 <div className="w-full max-w-md rounded-3xl border border-dark-700 bg-dark-800 p-5 shadow-2xl">
                     <div className="flex items-start justify-between gap-4">
                         <div>
                             <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-padel-400">Link listo</p>
                             <h3 className="mt-2 text-xl font-bold text-white">Invita a un amigo por link</h3>
                             <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                 Comparte este link por WhatsApp o por el canal que quieras. El backend valida el estado real del partido cuando la otra persona abre el link.
                             </p>
                         </div>
                         <button
                             type="button"
                             onClick={closeGeneratedMatchInvite}
                             className="rounded-full border border-dark-600 bg-dark-900/70 p-2 text-gray-400 transition-colors hover:text-white"
                             aria-label="Cerrar link de invitacion"
                         >
                             <X size={16} />
                         </button>
                     </div>

                     <div className="mt-4 rounded-2xl border border-dark-700 bg-dark-900/60 p-3">
                         <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">URL oficial</p>
                         <p className="mt-2 break-all text-sm text-gray-200">{generatedMatchInvite.inviteUrl}</p>
                     </div>

                     <p className="mt-3 text-xs text-gray-500">
                         Expira: {new Date(generatedMatchInvite.expiresAt).toLocaleString('es-UY')}
                     </p>

                     <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                         <Button
                             type="button"
                             onClick={() => {
                                 void handleCopyGeneratedMatchInvite();
                             }}
                             className="font-bold"
                         >
                             {generatedMatchInviteCopied ? 'Copiado' : 'Copiar link'}
                         </Button>
                         {typeof navigator !== 'undefined' && navigator.share ? (
                             <Button
                                 type="button"
                                 variant="secondary"
                                 onClick={() => {
                                     void handleShareGeneratedMatchInvite();
                                 }}
                                 disabled={generatedMatchInviteSharing}
                                 className="font-bold"
                             >
                                 {generatedMatchInviteSharing ? 'Compartiendo...' : 'Compartir'}
                             </Button>
                         ) : (
                             <Button
                                 type="button"
                                 variant="secondary"
                                 onClick={closeGeneratedMatchInvite}
                                 className="font-bold"
                             >
                                 Cerrar
                             </Button>
                         )}
                     </div>
                 </div>
             </div>
         )}

         {generatedTournamentInvite && (
             <div className="absolute inset-0 z-[115] flex items-end justify-center bg-dark-900/80 p-4 backdrop-blur-sm sm:items-center">
                 <div className="w-full max-w-md rounded-3xl border border-dark-700 bg-dark-800 p-5 shadow-2xl">
                     <div className="flex items-start justify-between gap-4">
                         <div>
                             <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-padel-400">Link listo</p>
                             <h3 className="mt-2 text-xl font-bold text-white">Invita jugadores al torneo</h3>
                             <p className="mt-2 text-sm leading-relaxed text-gray-400">
                                 Comparte este link para inscripcion abierta. El backend valida el estado real del torneo cuando la otra persona lo abre.
                             </p>
                         </div>
                         <button
                             type="button"
                             onClick={closeGeneratedTournamentInvite}
                             className="rounded-full border border-dark-600 bg-dark-900/70 p-2 text-gray-400 transition-colors hover:text-white"
                             aria-label="Cerrar link de invitacion del torneo"
                         >
                             <X size={16} />
                         </button>
                     </div>

                     <div className="mt-4 rounded-2xl border border-dark-700 bg-dark-900/60 p-3">
                         <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">URL oficial</p>
                         <p className="mt-2 break-all text-sm text-gray-200">{generatedTournamentInvite.inviteUrl}</p>
                     </div>

                     <p className="mt-3 text-xs text-gray-500">
                         Expira: {new Date(generatedTournamentInvite.expiresAt).toLocaleString('es-UY')}
                     </p>

                     <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                         <Button
                             type="button"
                             onClick={() => {
                                 void handleCopyGeneratedTournamentInvite();
                             }}
                             className="font-bold"
                         >
                             {generatedTournamentInviteCopied ? 'Copiado' : 'Copiar link'}
                         </Button>
                         {typeof navigator !== 'undefined' && navigator.share ? (
                             <Button
                                 type="button"
                                 variant="secondary"
                                 onClick={() => {
                                     void handleShareGeneratedTournamentInvite();
                                 }}
                                 disabled={generatedTournamentInviteSharing}
                                 className="font-bold"
                             >
                                 {generatedTournamentInviteSharing ? 'Compartiendo...' : 'Compartir'}
                             </Button>
                         ) : (
                             <Button
                                 type="button"
                                 variant="secondary"
                                 onClick={closeGeneratedTournamentInvite}
                                 className="font-bold"
                             >
                                 Cerrar
                             </Button>
                         )}
                     </div>
                 </div>
             </div>
         )}

         {isAuthenticated && (pendingMatchInviteToken || pendingMatchInviteLoading || pendingMatchInvitePreview || pendingMatchInviteError) && (
             <div className="absolute inset-0 z-[114] flex items-end justify-center bg-dark-900/80 p-4 backdrop-blur-sm sm:items-center">
                 <div className="w-full max-w-md">
                     <div className="mb-3 flex justify-end">
                         <button
                             type="button"
                             onClick={() => resetPendingMatchInvite()}
                             className="rounded-full border border-dark-600 bg-dark-900/80 p-2 text-gray-400 transition-colors hover:text-white"
                             aria-label="Cerrar invitacion"
                         >
                             <X size={16} />
                         </button>
                     </div>
                     <MatchInvitePreviewPanel
                         preview={pendingMatchInvitePreview}
                         loading={pendingMatchInviteLoading}
                         error={pendingMatchInviteError}
                         actionLabel={pendingInviteActionLabel}
                         actionDisabled={pendingInviteActionDisabled}
                         actionLoading={joiningMatchInvite}
                         actionHint={pendingInviteActionHint}
                         onAction={pendingInviteActionHandler}
                     />
                 </div>
             </div>
         )}

         {isAuthenticated && (pendingTournamentInviteToken || pendingTournamentInviteLoading || pendingTournamentInvitePreview || pendingTournamentInviteError) && (
             <div className="absolute inset-0 z-[114] flex items-end justify-center bg-dark-900/80 p-4 backdrop-blur-sm sm:items-center">
                 <div className="w-full max-w-md">
                     <div className="mb-3 flex justify-end">
                         <button
                             type="button"
                             onClick={() => resetPendingTournamentInvite()}
                             className="rounded-full border border-dark-600 bg-dark-900/80 p-2 text-gray-400 transition-colors hover:text-white"
                             aria-label="Cerrar invitacion"
                         >
                             <X size={16} />
                         </button>
                     </div>
                     <TournamentInvitePreviewPanel
                         preview={pendingTournamentInvitePreview}
                         loading={pendingTournamentInviteLoading}
                         error={pendingTournamentInviteError}
                         actionLabel={pendingTournamentInviteActionLabel}
                         actionDisabled={pendingTournamentInviteActionDisabled}
                         actionLoading={joiningTournamentInvite}
                         actionHint={pendingTournamentInviteActionHint}
                         onAction={pendingTournamentInviteActionHandler}
                     />
                 </div>
             </div>
         )}
         
         {showClubRankings && <ClubRankingsView currentUser={currentUser} clubs={clubCatalog ?? undefined} rankings={clubRankingSummaries} onClose={() => setShowClubRankings(false)} />}
         {showNationalRanking && (
             <NationalRankingBackendView
                 currentUser={currentUser}
                 rankingRows={rankingRows}
                 rankingPosition={currentUserRankingPosition}
                 clubOptions={clubCatalog ?? undefined}
                 onClose={() => setShowNationalRanking(false)}
             />
         )}
         {showCoaches && <CoachesView onClose={() => setShowCoaches(false)} />}
         {showPlayerClubVerification && (
             <PlayerClubVerificationView
                 onClose={() => setShowPlayerClubVerification(false)}
                 onSummaryChange={(summary) => syncCurrentUserVerificationStatus(
                     summary.requiresClubVerification,
                     summary.clubVerificationStatus,
                 )}
             />
         )}
         {showClubVerificationRequests && <ClubVerificationRequestsView onClose={() => setShowClubVerificationRequests(false)} />}
         {showClubUsers && <ClubUsersView onClose={() => setShowClubUsers(false)} />}
         {showClubAgenda && <ClubAgendaView onClose={() => setShowClubAgenda(false)} />}
         {showClubCourts && <ClubCourtsView onClose={() => setShowClubCourts(false)} />}
         {showTopPartners && <TopPartnersView currentUser={currentUser} partners={topPartnersInsights} onClose={() => setShowTopPartners(false)} />}
         {showTopRivals && <TopRivalsView rivals={topRivalsInsights} onClose={() => setShowTopRivals(false)} />}
         {showCreateTournament && <CreateTournamentView currentUser={currentUser} selectablePlayers={tournamentSelectablePlayers} clubOptions={tournamentClubOptions.length > 0 ? tournamentClubOptions : undefined} defaultClubId={currentUser.accountType === 'club' && currentUser.managedClubId != null ? `backend-club-${currentUser.managedClubId}` : undefined} onClose={() => setShowCreateTournament(false)} onCreate={(data) => handleCreateTournament(data)} />}
         {tournamentToEdit && <AddTeamsToTournamentView currentUser={currentUser} availablePlayers={tournamentSelectablePlayers} tournament={tournamentToEdit} onClose={() => setTournamentToEdit(null)} onUpdate={handleUpdateTournament} />}
         {postMatchResult && (
             <PostMatchView 
                 oldRating={postMatchResult.oldRating} 
                 newRating={postMatchResult.newRating} 
                 delta={postMatchResult.delta} 
                 onContinue={() => setPostMatchResult(null)} 
             />
         )}

        {currentTab === 'play' && <PlayView currentUser={currentUser} rankingPosition={currentUserRankingPosition} myMatchesByScope={myMatchesByScope} pendingResultMatches={pendingResultActionableMatches} pendingResultMatchesById={pendingResultActionableMatchesById} notifications={notifications} unreadNotificationsCount={unreadNotificationsCount} navigateTo={setCurrentTab} onOpenCoaches={() => setShowCoaches(true)} onOpenNotifications={() => setShowNotificationsInbox(true)} agenda={agenda} clubs={clubCatalog ?? undefined} matches={matches} tournaments={tournaments} onJoin={handleJoinMatch} onRequest={handleRequestAccess} onLeaveMatch={handleLeaveMatch} onCancelMatch={handleCancelMatch} onInviteMatch={handleCreateMatchInviteLink} inviteLoadingMatchId={inviteLoadingMatchId} onSubmitResult={handleSubmitResult} onConfirmResult={handleConfirmResult} onRejectResult={handleRejectResult} onUserClick={setSelectedPublicUser} onLaunchTournament={setTournamentToLaunch} onOpenTournamentStatus={setSelectedTournamentStatus} onAddTeamsToTournament={setTournamentToEdit} onAddResult={handleOpenResultInput} onArchiveTournament={handleArchiveTournament} />}
        {currentTab === 'matches' && <MatchesView currentUser={currentUser} clubs={clubCatalog ?? undefined} matches={matches} onJoin={handleJoinMatch} onRequest={handleRequestAccess} onLeaveMatch={handleLeaveMatch} onCancelMatch={handleCancelMatch} onUserClick={setSelectedPublicUser} />}
        {currentTab === 'competition' && (
            <CompetitionView
                currentUser={currentUser}
                tournaments={competitionTournaments}
                onCreateTournament={() => setShowCreateTournament(true)}
                onOpenTournamentStatus={setSelectedTournamentStatus}
                onJoinTournament={handleJoinTournament}
                onLeaveTournament={handleLeaveTournament}
            />
        )}
        {currentTab === 'club_dashboard' && (
          <ClubDashboardBackendView
            onCreateMatch={() => setCurrentTab('clubs')}
            onCreateTournament={() => setShowCreateTournament(true)}
            onOpenClubUsers={() => setShowClubUsers(true)}
            onOpenClubAgenda={() => setShowClubAgenda(true)}
            onOpenClubCourts={() => setShowClubCourts(true)}
            onOpenClubVerification={() => setShowClubVerificationRequests(true)}
            onLogout={handleLogout}
          />
        )}
        {currentTab === 'clubs' && <ClubsBookingView currentUser={currentUser} clubs={clubCatalog ?? undefined} onBook={handleBookMatch} onBack={currentUser.accountType === 'club' ? () => setCurrentTab('club_dashboard') : undefined} preferredClubId={currentUser.accountType === 'club' && currentUser.managedClubId != null ? `backend-club-${currentUser.managedClubId}` : undefined} title={currentUser.accountType === 'club' ? 'Crear partido' : 'Reservas'} />}
        {currentTab === 'profile' && <ProfileView currentUser={currentUser} rankingPosition={currentUserRankingPosition} ratingHistory={ratingHistoryView} topPartners={topPartnersInsights} topRivals={topRivalsInsights} clubRankings={clubRankingSummaries} matches={matches} onOpenClubRankings={() => setShowClubRankings(true)} onOpenTopPartners={() => setShowTopPartners(true)} onOpenTopRivals={() => setShowTopRivals(true)} onUserClick={setSelectedPublicUser} onOpenNationalRanking={() => setShowNationalRanking(true)} onOpenMatchHistory={() => setShowProfileMatchHistory(true)} onOpenPlayerClubVerification={() => setShowPlayerClubVerification(true)} onOpenEditProfile={() => setShowEditPlayerProfile(true)} notificationPreferences={notificationPreferences} notificationPreferencesLoading={notificationPreferencesLoading} notificationPreferencesSaving={notificationPreferencesSaving} onUpdateNotificationPreferences={handleUpdateNotificationPreferences} accountDeletionRequest={accountDeletionRequest} accountDeletionLoading={accountDeletionLoading} accountDeletionSaving={accountDeletionSaving} onRequestAccountDeletion={handleRequestAccountDeletion} />}

        {tournamentToLaunch && <LaunchTournamentView tournament={tournamentToLaunch} onClose={() => setTournamentToLaunch(null)} onLaunch={handleLaunchTournament} />}
        {selectedTournamentStatus && (
            <TournamentStatusView 
                tournament={tournaments.find(t => t.id === selectedTournamentStatus.id) || selectedTournamentStatus} 
                currentUser={currentUser} 
                matches={matches} 
                onClose={() => setSelectedTournamentStatus(null)} 
                onAddResult={handleOpenResultInput} 
                onUserClick={setSelectedPublicUser}
                pendingResultMatchesById={pendingResultActionableMatchesById}
                onCreateInviteLink={(tournament) => {
                    void handleCreateTournamentInviteLink(tournament);
                }}
                tournamentInviteLoading={inviteLoadingTournamentId === selectedTournamentStatus.id}
                onUpdateMyTeamName={(tournament, nextTeamName) => {
                    void handleUpdateMyTournamentTeamName(tournament, nextTeamName);
                }}
                onCompleteMyRegistration={(tournament) => {
                    setTournamentToRegister(tournament);
                }}
                savingTeamName={savingTournamentTeamName}
            />
        )}
        {tournamentToRegister && (
            <TournamentRegistrationView
                currentUser={currentUser}
                tournament={tournaments.find(tournament => tournament.id === tournamentToRegister.id) || tournamentToRegister}
                availablePlayers={tournamentSelectablePlayers}
                submitting={submittingTournamentRegistration}
                onClose={() => setTournamentToRegister(null)}
                onSubmit={(request) => {
                    void handleSubmitTournamentRegistration(tournamentToRegister, request);
                }}
            />
        )}
        
        {selectedPublicUser && (
            <PublicProfileView user={selectedPublicUser} onClose={() => setSelectedPublicUser(null)} />
        )}

        {showNotificationsInbox && (
            <NotificationsInboxView
                notifications={notifications}
                onClose={() => setShowNotificationsInbox(false)}
                onOpenNotification={handleOpenNotification}
            />
        )}

        {showProfileMatchHistory && (
            <ProfileMatchHistoryView
                currentUser={currentUser}
                matches={matches}
                onClose={() => setShowProfileMatchHistory(false)}
                onUserClick={setSelectedPublicUser}
                onAddResult={handleOpenResultInput}
                onLeaveMatch={handleLeaveMatch}
                onCancelMatch={handleCancelMatch}
            />
        )}

        {showEditPlayerProfile && currentUser.accountType === 'player' && (
            <PlayerProfileEditView
                currentUser={currentUser}
                clubs={clubCatalog ?? undefined}
                saving={savingPlayerProfile}
                onClose={() => setShowEditPlayerProfile(false)}
                onSave={handleUpdateMyPlayerProfile}
            />
        )}

        {selectedMatchForResult && (
            <div className="fixed inset-0 bg-dark-900/90 z-[110] flex items-center justify-center p-4">
                <div className="w-full max-w-md relative">
                    <button 
                        onClick={() => setSelectedMatchForResult(null)}
                        className="absolute -top-10 right-0 text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                    <ResultInputCard 
                        match={selectedMatchForResult}
                        currentUser={currentUser}
                        onSubmit={(matchId, result) => {
                            handleSubmitResult(matchId, result);
                            setSelectedMatchForResult(null);
                        }}
                        onConfirm={(matchId) => {
                            handleConfirmResult(matchId);
                            setSelectedMatchForResult(null);
                        }}
                        onReject={(matchId) => {
                            handleRejectResult(matchId);
                            setSelectedMatchForResult(null);
                        }}
                    />
                </div>
            </div>
        )}

        <NavBar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          userAvatar={currentUser.avatar}
          accountType={currentUser.accountType}
        />
      </main>
    </div>
  );
}



