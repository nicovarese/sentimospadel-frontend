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
import { ClubUsersView } from './components/ClubUsersView';
import { ClubAgendaView } from './components/ClubAgendaView';
import { PublicProfileView } from './components/PublicProfileView';
import { computeMatchRatingUpdatesElo, EloMatchInput } from './utils/eloCalculator';
import { ACCESS_TOKEN_STORAGE_KEY, backendApi, BackendApiError, clearAccessToken, storeAccessToken, type MyMatchesScope } from './services/backendApi';
import { buildFrontendUser, clearStoredDisplayName, isNotFoundError, readStoredDisplayName, storeDisplayName } from './services/authOnboardingSession';
import { buildAutoTeamAssignments, buildClubLookup, buildSubmitResultRequest, combineFrontendMatchDateTime, isBackendManagedMatch, isBackendMatchCreator, mapScopedPlayerMatches, mergeBackendMatches } from './services/matchBackendIntegration';
import { findRankingPosition, mapRankingRows, mapRatingHistory } from './services/ratingHistoryIntegration';
import {
    buildCreateLeagueTournamentRequest,
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
import { Plus, Search, Filter, Trophy, Star, TrendingUp, Calendar, MapPin, ChevronRight, ChevronDown, ChevronLeft, BarChart3, Settings, Users, Zap, GraduationCap, Swords, Clock, CheckCircle, AlertCircle, AlertTriangle, CalendarRange, Sparkles, Bell, BadgeCheck, Lock, TrendingDown, Heart, ArrowLeft, Info, Check, Share2, Wallet, UserPlus, Grid, X, Crown, BrainCircuit, Medal, Handshake, Skull, List, Gift, Network, Link, Copy, Trash2, Store, DollarSign, Archive } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid, LabelList } from 'recharts';

// --- MOCK DATA ---
const MOCK_USER: User = {
  id: 'u1',
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
  isPremium: true // Set to true to test filters, false to test locks
};

const MOCK_FRIENDS = [
    { id: 'u2', name: 'Martin G.', level: 4.4, avatar: 'https://picsum.photos/100/100?r=2', frequent: true },
    { id: 'u3', name: 'Felipe R.', level: 4.6, avatar: 'https://picsum.photos/100/100?r=3', frequent: true },
    { id: 'u5', name: 'Diego F.', level: 5.0, avatar: 'https://picsum.photos/100/100?r=5', frequent: false },
    { id: 'u9', name: 'Juan B.', level: 4.5, avatar: 'https://picsum.photos/100/100?r=9', frequent: false },
    { id: 'd1', name: 'Carlos M.', level: 4.1, avatar: 'https://picsum.photos/100/100?r=101', frequent: false },
    { id: 'd2', name: 'Andres T.', level: 4.3, avatar: 'https://picsum.photos/100/100?r=102', frequent: false },
    { id: 'd3', name: 'Javier L.', level: 4.8, avatar: 'https://picsum.photos/100/100?r=103', frequent: false },
    { id: 'd4', name: 'Matias P.', level: 4.2, avatar: 'https://picsum.photos/100/100?r=104', frequent: false },
    { id: 'd5', name: 'Nicolas R.', level: 4.9, avatar: 'https://picsum.photos/100/100?r=105', frequent: false },
    { id: 'd6', name: 'Sebastian V.', level: 4.5, avatar: 'https://picsum.photos/100/100?r=106', frequent: false },
    { id: 'd7', name: 'Gonzalo H.', level: 4.7, avatar: 'https://picsum.photos/100/100?r=107', frequent: false },
    { id: 'd8', name: 'Rodrigo C.', level: 4.0, avatar: 'https://picsum.photos/100/100?r=108', frequent: false },
    { id: 'd9', name: 'Facundo D.', level: 4.6, avatar: 'https://picsum.photos/100/100?r=109', frequent: false },
    { id: 'd10', name: 'Ignacio S.', level: 4.4, avatar: 'https://picsum.photos/100/100?r=110', frequent: false },
    { id: 'd11', name: 'Joaquin G.', level: 4.2, avatar: 'https://picsum.photos/100/100?r=111', frequent: false },
    { id: 'd12', name: 'Agustin F.', level: 4.5, avatar: 'https://picsum.photos/100/100?r=112', frequent: false },
    { id: 'd13', name: 'Emiliano K.', level: 4.8, avatar: 'https://picsum.photos/100/100?r=113', frequent: false },
    { id: 'd14', name: 'Federico N.', level: 4.1, avatar: 'https://picsum.photos/100/100?r=114', frequent: false },
    { id: 'd15', name: 'Tomas W.', level: 4.9, avatar: 'https://picsum.photos/100/100?r=115', frequent: false },
];

const MOCK_TOP_PARTNERS = [
    { id: 'u2', name: 'Martin G.', avatar: 'https://picsum.photos/100/100?r=2', matchesWon: 12, ratingGained: 1.45 },
    { id: 'u3', name: 'Felipe R.', avatar: 'https://picsum.photos/100/100?r=3', matchesWon: 8, ratingGained: 0.96 },
    { id: 'u5', name: 'Diego F.', avatar: 'https://picsum.photos/100/100?r=5', matchesWon: 5, ratingGained: 0.60 },
    { id: 'u6', name: 'Pablo S.', avatar: 'https://picsum.photos/100/100?r=6', matchesWon: 3, ratingGained: 0.32 },
    { id: 'u7', name: 'Lucas M.', avatar: 'https://picsum.photos/100/100?r=7', matchesWon: 2, ratingGained: 0.24 },
];

const MOCK_TOP_RIVALS = [
    { id: 'u9', name: 'Juan B.', avatar: 'https://picsum.photos/100/100?r=9', matchesLost: 8, ratingLost: 1.10 },
    { id: 'u10', name: 'Pedro X.', avatar: 'https://picsum.photos/100/100?r=10', matchesLost: 6, ratingLost: 0.85 },
    { id: 'u11', name: 'Luis Z.', avatar: 'https://picsum.photos/100/100?r=11', matchesLost: 4, ratingLost: 0.52 },
    { id: 'u12', name: 'Ana P.', avatar: 'https://picsum.photos/100/100?r=31', matchesLost: 3, ratingLost: 0.40 },
    { id: 'u13', name: 'Gaston B.', avatar: 'https://picsum.photos/100/100?r=40', matchesLost: 2, ratingLost: 0.28 },
];

const MOCK_CLUBS: Club[] = [
  { id: 'c1', name: 'Top Padel', location: 'Av. Rivera 6000', rating: 5.0, isPremium: true, courtsAvailable: 8, image: 'https://picsum.photos/400/200?random=1' },
  { id: 'c2', name: 'World Padel', location: 'Ellauri 350', rating: 4.6, isPremium: true, courtsAvailable: 6, image: 'https://picsum.photos/400/200?random=2' },
  { id: 'c3', name: 'Cordon Padel', location: 'Galicia 1234', rating: 4.4, isPremium: false, courtsAvailable: 4, image: 'https://picsum.photos/400/200?random=3' },
  { id: 'c4', name: 'Boss', location: 'Av. Brasil 2000', rating: 4.7, isPremium: false, courtsAvailable: 5, image: 'https://picsum.photos/400/200?random=4' },
  { id: 'c5', name: 'Reducto', location: 'San Martín 2500', rating: 4.3, isPremium: false, courtsAvailable: 3, image: 'https://picsum.photos/400/200?random=5' },
];

// Mock Data for Club Rankings
interface RankingEntry {
    rank: number;
    name: string;
    avatar: string;
    primaryValue: string; // "Rating 6.0" or "540 pts"
    secondaryValue: string; // "32 W" or "32 partidos"
    isUser: boolean;
}

interface ClubRankingData {
    clubId: string;
    matchesPlayedByUser: number;
    competitive: {
        userRank: number;
        userPrimaryValue: string;
        userSecondaryValue: string;
        label: string;
        topList: RankingEntry[];
    };
    social: {
        userRank: number;
        userPrimaryValue: string;
        userSecondaryValue: string;
        label: string;
        topList: RankingEntry[];
    };
}

const MOCK_CLUB_RANKINGS: ClubRankingData[] = [
    {
        clubId: 'c1', // Top Padel
        matchesPlayedByUser: 32,
        competitive: {
            userRank: 52, // User requested position 52
            userPrimaryValue: '4.50',
            userSecondaryValue: '14 Victorias',
            label: 'Rating',
            topList: [
                { rank: 1, name: 'Agustin T.', avatar: 'https://picsum.photos/100/100?r=20', primaryValue: '6.05', secondaryValue: '42 Victorias', isUser: false },
                { rank: 2, name: 'Fede C.', avatar: 'https://picsum.photos/100/100?r=21', primaryValue: '5.98', secondaryValue: '38 Victorias', isUser: false },
                { rank: 3, name: 'Lucas M.', avatar: 'https://picsum.photos/100/100?r=22', primaryValue: '5.92', secondaryValue: '35 Victorias', isUser: false },
                { rank: 4, name: 'Gaston B.', avatar: 'https://picsum.photos/100/100?r=40', primaryValue: '5.85', secondaryValue: '28 Victorias', isUser: false },
                { rank: 5, name: 'Diego F.', avatar: 'https://picsum.photos/100/100?r=5', primaryValue: '5.70', secondaryValue: '22 Victorias', isUser: false },
                { rank: 6, name: 'Juan B.', avatar: 'https://picsum.photos/100/100?r=9', primaryValue: '5.65', secondaryValue: '20 Victorias', isUser: false },
                { rank: 7, name: 'Pablo S.', avatar: 'https://picsum.photos/100/100?r=6', primaryValue: '5.50', secondaryValue: '18 Victorias', isUser: false },
            ]
        },
        social: {
            userRank: 5,
            userPrimaryValue: '320',
            userSecondaryValue: '32 Partidos',
            label: 'Puntos',
            topList: [
                { rank: 1, name: 'Pedro X.', avatar: 'https://picsum.photos/100/100?r=30', primaryValue: '540', secondaryValue: '54 Partidos', isUser: false },
                { rank: 2, name: 'Ana P.', avatar: 'https://picsum.photos/100/100?r=31', primaryValue: '480', secondaryValue: '48 Partidos', isUser: false },
                { rank: 3, name: 'Martin G.', avatar: 'https://picsum.photos/100/100?r=32', primaryValue: '450', secondaryValue: '45 Partidos', isUser: false },
            ]
        }
    },
    {
        clubId: 'c2', // World Padel
        matchesPlayedByUser: 24,
        competitive: {
            userRank: 89,
            userPrimaryValue: '4.50',
            userSecondaryValue: '8 Victorias',
            label: 'Rating',
            topList: [
                { rank: 1, name: 'Ale G.', avatar: 'https://picsum.photos/100/100?r=41', primaryValue: '6.12', secondaryValue: '48 Victorias', isUser: false },
                { rank: 2, name: 'Nico S.', avatar: 'https://picsum.photos/100/100?r=42', primaryValue: '6.05', secondaryValue: '45 Victorias', isUser: false },
                { rank: 3, name: 'Pablo R.', avatar: 'https://picsum.photos/100/100?r=43', primaryValue: '5.95', secondaryValue: '40 Victorias', isUser: false },
            ]
        },
        social: {
            userRank: 12,
            userPrimaryValue: '240',
            userSecondaryValue: '24 Partidos',
            label: 'Puntos',
            topList: [
                { rank: 1, name: 'Luis Z.', avatar: 'https://picsum.photos/100/100?r=50', primaryValue: '800', secondaryValue: '80 Partidos', isUser: false },
                { rank: 2, name: 'Maria F.', avatar: 'https://picsum.photos/100/100?r=51', primaryValue: '760', secondaryValue: '76 Partidos', isUser: false },
                { rank: 3, name: 'Jose L.', avatar: 'https://picsum.photos/100/100?r=52', primaryValue: '720', secondaryValue: '72 Partidos', isUser: false },
            ]
        }
    }
];

const INITIAL_MATCHES: Match[] = [
  // ... Existing open/confirmed matches ...
  {
    id: 'm1',
    clubId: 'c1',
    courtName: 'Cancha Central (WPT)',
    date: new Date().toISOString(),
    time: '18:30',
    duration: 90,
    type: MatchType.COMPETITIVE,
    pricePerPlayer: 450,
    currency: 'UYU',
    players: [
      { id: 'u2', name: 'Martin G.', level: 4.4, avatar: 'https://picsum.photos/100/100?r=2' } as User,
      { id: 'u3', name: 'Felipe R.', level: 4.6, avatar: 'https://picsum.photos/100/100?r=3' } as User,
      null,
      null
    ],
    maxPlayers: 4,
    levelRange: [4.0, 5.0], 
    isPrivate: false,
    status: 'open',
    pendingPlayerIds: [],
    rejectedPlayerIds: [],
    approvedGuestIds: []
  },
  {
    id: 'm2',
    clubId: 'c2',
    courtName: 'Cancha 2',
    date: new Date().toISOString(),
    time: '20:00',
    duration: 60,
    type: MatchType.FRIENDLY,
    pricePerPlayer: 350,
    currency: 'UYU',
    players: [
        { id: 'u4', name: 'Ana P.', level: 3.0, avatar: 'https://picsum.photos/100/100?r=4' } as User,
        null,
        null,
        null
    ],
    maxPlayers: 4,
    levelRange: [2.5, 3.5], 
    isPrivate: false,
    status: 'open',
    pendingPlayerIds: [],
    rejectedPlayerIds: [],
    approvedGuestIds: []
  },
  {
    id: 'm3',
    clubId: 'c3',
    courtName: 'Cancha Panorámica',
    date: new Date().toISOString(),
    time: '21:30',
    duration: 90,
    type: MatchType.COMPETITIVE,
    pricePerPlayer: 500,
    currency: 'UYU',
    players: [
        { id: 'u5', name: 'Diego F.', level: 5.0, avatar: 'https://picsum.photos/100/100?r=5' } as User,
        { id: 'u6', name: 'Pablo S.', level: 5.1, avatar: 'https://picsum.photos/100/100?r=6' } as User,
        { id: 'u7', name: 'Lucas M.', level: 4.9, avatar: 'https://picsum.photos/100/100?r=7' } as User,
        { id: 'u8', name: 'Santi L.', level: 5.0, avatar: 'https://picsum.photos/100/100?r=8' } as User,
    ],
    maxPlayers: 4,
    levelRange: [4.8, 5.2],
    isPrivate: true,
    status: 'confirmed',
    pendingPlayerIds: [],
    rejectedPlayerIds: [],
    approvedGuestIds: []
  },
  // --- NEW MATCH FOR RESULT FLOW ---
  {
    id: 'm4',
    clubId: 'c1',
    courtName: 'Cancha 3',
    date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    time: '19:00',
    duration: 90,
    type: MatchType.COMPETITIVE,
    pricePerPlayer: 450,
    currency: 'UYU',
    players: [
        { id: 'u1', name: 'Santiago López', level: 4.5, avatar: 'https://picsum.photos/100/100?r=1' } as User,
        { id: 'u9', name: 'Juan B.', level: 4.5, avatar: 'https://picsum.photos/100/100?r=9' } as User,
        { id: 'u10', name: 'Pedro X.', level: 4.6, avatar: 'https://picsum.photos/100/100?r=10' } as User,
        { id: 'u11', name: 'Luis Z.', level: 4.4, avatar: 'https://picsum.photos/100/100?r=11' } as User,
    ],
    maxPlayers: 4,
    levelRange: [4.0, 5.0],
    isPrivate: false,
    status: 'awaiting_result', // Trigger Result Card
    pendingPlayerIds: [],
    rejectedPlayerIds: [],
    approvedGuestIds: []
  },
  {
    id: 'm5',
    clubId: 'c2',
    courtName: 'Cancha 1',
    date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    time: '20:30',
    duration: 90,
    type: MatchType.COMPETITIVE,
    pricePerPlayer: 400,
    currency: 'UYU',
    players: [
        { id: 'u12', name: 'Carlos M.', level: 4.7, avatar: 'https://picsum.photos/100/100?r=12' } as User,
        { id: 'u13', name: 'Andres G.', level: 4.8, avatar: 'https://picsum.photos/100/100?r=13' } as User,
        { id: 'u1', name: 'Santiago López', level: 4.5, avatar: 'https://picsum.photos/100/100?r=1' } as User,
        { id: 'u14', name: 'Matias R.', level: 4.6, avatar: 'https://picsum.photos/100/100?r=14' } as User,
    ],
    maxPlayers: 4,
    levelRange: [4.0, 5.0],
    isPrivate: false,
    status: 'awaiting_validation', // Trigger Validation Card
    result: [[6, 4], [4, 6], [6, 3]],
    resultSubmittedBy: 'u12',
    pendingPlayerIds: [],
    rejectedPlayerIds: [],
    approvedGuestIds: []
  },
  {
    id: 'm-tournament-1',
    clubId: 'c1',
    courtName: 'Cancha 1',
    date: new Date().toISOString(),
    time: '18:00',
    duration: 90,
    type: MatchType.COMPETITIVE,
    pricePerPlayer: 0,
    currency: 'UYU',
    players: [
      { id: 'u1', name: 'Martin G.', level: 4.4, avatar: 'https://picsum.photos/100/100?r=1' } as User,
      { id: 'u3', name: 'Felipe R.', level: 4.6, avatar: 'https://picsum.photos/100/100?r=3' } as User,
      { id: 'u5', name: 'Diego F.', level: 5.0, avatar: 'https://picsum.photos/100/100?r=5' } as User,
      { id: 'u6', name: 'Pablo S.', level: 5.1, avatar: 'https://picsum.photos/100/100?r=6' } as User,
    ],
    maxPlayers: 4,
    levelRange: [4.0, 5.5],
    isPrivate: true,
    status: 'awaiting_validation',
    tournamentId: 'mock-t-2',
    result: [[6, 4], [6, 2]],
    pendingPlayerIds: [],
    rejectedPlayerIds: [],
    approvedGuestIds: []
  }
];

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

const INITIAL_AGENDA: AgendaItem[] = [
    {
        id: 'a2',
        type: 'class',
        title: 'Clase Técnica (Voleas)',
        location: 'World Padel',
        date: 'Mañana',
        time: '09:00',
        status: 'scheduled',
        meta: 'Coach: Agus T.'
    },
    {
        id: 'a4',
        type: 'tournament',
        title: 'Copa Montevideo',
        location: 'Top Padel',
        date: '15-17 Nov',
        time: 'Todo el día',
        status: 'confirmed',
        meta: 'Cat. 4ta'
    }
];

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

// --- VIEWS ---

interface ViewProps {
    currentUser: User;
    rankingPosition?: number | null;
    rankingRows?: ReturnType<typeof mapRankingRows>;
    ratingHistory?: ReturnType<typeof mapRatingHistory>;
    myMatchesByScope?: ScopedMyMatches;
    navigateTo?: (tab: string) => void;
    onOpenCoaches?: () => void;
    agenda?: AgendaItem[];
    clubs?: Club[];
    matches?: Match[];
    tournaments?: any[];
    onJoin?: (id: string, slotIndex: number) => void;
    onRequest?: (id: string) => void;
    onLeaveMatch?: (matchId: string) => void;
    onCancelMatch?: (matchId: string) => void;
    onSubmitResult?: (matchId: string, result: [number, number][]) => void;
    onConfirmResult?: (matchId: string) => void;
    onRejectResult?: (matchId: string) => void;
    onBook?: (match: Match) => void;
    onOpenClubRankings?: () => void;
    onOpenTopPartners?: () => void;
    onOpenTopRivals?: () => void;
    onPremiumFeatureAttempt?: (feature: string) => void;
    onCreateTournament?: () => void;
    onOpenClubUsers?: () => void;
    onOpenClubAgenda?: () => void;
    onUserClick?: (user: User) => void;
    onOpenNationalRanking?: () => void;
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

const ClubDashboardView: React.FC<ViewProps> = ({ onOpenClubUsers, onOpenClubAgenda }) => {
    return (
        <div className="pb-24 pt-4 px-4 animate-fade-in">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Panel de Club</h1>
                <p className="text-gray-400 text-sm">Gestión integral de tu sede</p>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                    <p className="text-gray-400 text-xs uppercase font-bold">Canchas Activas</p>
                    <h2 className="text-2xl font-bold text-white mt-1">6/8</h2>
                    <span className="text-green-400 text-xs font-bold flex items-center gap-1 mt-1">
                        <TrendingUp size={12} /> +12% vs ayer
                    </span>
                </div>
                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                    <p className="text-gray-400 text-xs uppercase font-bold">Ingresos Hoy</p>
                    <h2 className="text-2xl font-bold text-white mt-1">$14.500</h2>
                    <span className="text-gray-500 text-xs mt-1">32 Reservas</span>
                </div>
            </div>

            {/* Management Modules Grid */}
            <h3 className="text-white font-bold mb-3">Gestión</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                    onClick={() => onOpenClubAgenda && onOpenClubAgenda()}
                    className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition-colors">
                    <Calendar size={24} className="text-padel-400" />
                    <span className="text-gray-200 text-xs font-bold">Agenda</span>
                </button>
                <button 
                    onClick={() => onOpenClubUsers && onOpenClubUsers()}
                    className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition-colors">
                    <Users size={24} className="text-blue-400" />
                    <span className="text-gray-200 text-xs font-bold">Usuarios</span>
                </button>
                <button className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition-colors">
                    <Trophy size={24} className="text-amber-400" />
                    <span className="text-gray-200 text-xs font-bold">Torneos</span>
                </button>
                <button className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition-colors">
                    <Settings size={24} className="text-gray-400" />
                    <span className="text-gray-200 text-xs font-bold">Config</span>
                </button>
            </div>

            {/* Live Activity */}
            <h3 className="text-white font-bold mb-3">Actividad Reciente</h3>
            <div className="space-y-3">
                <div className="bg-dark-800 p-3 rounded-xl border border-dark-700 flex items-center gap-3">
                    <div className="bg-green-500/10 p-2 rounded-full text-green-500">
                        <CheckCircle size={16} />
                    </div>
                    <div>
                        <p className="text-white text-xs font-bold">Reserva Confirmada</p>
                        <p className="text-gray-400 text-[10px]">Cancha 3 • 18:30 • Martin G.</p>
                    </div>
                    <span className="ml-auto text-gray-500 text-[10px]">Hace 5m</span>
                </div>
                <div className="bg-dark-800 p-3 rounded-xl border border-dark-700 flex items-center gap-3">
                    <div className="bg-amber-500/10 p-2 rounded-full text-amber-500">
                        <Trophy size={16} />
                    </div>
                    <div>
                        <p className="text-white text-xs font-bold">Resultado Validado</p>
                        <p className="text-gray-400 text-[10px]">Torneo Cat 4ta • Semi Final</p>
                    </div>
                    <span className="ml-auto text-gray-500 text-[10px]">Hace 12m</span>
                </div>
            </div>
        </div>
    );
};

const TournamentStatusView: React.FC<{ 
    tournament: any, 
    currentUser: User, 
    matches: Match[], 
    onClose: () => void,
    onAddResult?: (match: Match) => void,
    onUserClick?: (user: User) => void
}> = ({ tournament, currentUser, matches, onClose, onAddResult, onUserClick }) => {
    const [activeTab, setActiveTab] = useState<'matches' | 'standings'>('matches');
    const isCreator = tournament.creatorId === currentUser.id;
    const isBackendLeagueTournament = Boolean(tournament?.isBackendTournament && tournament?.format === 'league');
    const backendLeagueStandings = tournament?.backendStandings?.standings ?? [];

    const config = tournament.launchConfig?.generatedData || {};
    const groups = config.groups || [];
    const groupMatches = config.groupMatches || [];
    const playoffs = config.playoffs || [];

    const isAmericano = tournament.format === 'americano';
    const isAmericanoDinamico = tournament.format === 'americano' && tournament.americanoType === 'dinamico';

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
                            teamA.pts += 2;
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
                            teamB.pts += 2;
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
            if (b.netSets !== a.netSets) return b.netSets - a.netSets;
            return b.setsWon - a.setsWon;
        });
    };

    const currentStandings = isAmericanoDinamico ? calculateStandings([]) : [];
    const winner = isTournamentFinished && isAmericanoDinamico && currentStandings.length > 0 ? currentStandings[0] : null;

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
                                            {((isBackendLeagueTournament && match.players.some(p => p?.id === currentUser.id))
                                                || (!isBackendLeagueTournament && isCreator)) && match.status !== 'completed' && (
                                                <div className="mt-2 pt-2 border-t border-dark-700 flex justify-end">
                                                    <button 
                                                        onClick={() => onAddResult && onAddResult(match)}
                                                        className="text-xs text-amber-500 font-bold hover:text-amber-400 transition-colors"
                                                    >
                                                        {match.status === 'awaiting_validation' ? 'Validar Resultado' : 'Cargar Resultado'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};

const LaunchTournamentView: React.FC<{ tournament: any, matches: Match[], onClose: () => void, onLaunch: (config: any) => void }> = ({ tournament, matches, onClose, onLaunch }) => {
    const [format, setFormat] = useState<'eliminatoria' | 'liga' | 'americano'>(
        tournament?.format === 'americano' ? 'americano' : 
        tournament?.format === 'league' ? 'liga' : 'eliminatoria'
    );
    const [americanoType, setAmericanoType] = useState<'fijo' | 'dinamico'>(tournament?.americanoType || 'fijo');
    const [numGroups, setNumGroups] = useState<number>(1);
    const [qualifiers, setQualifiers] = useState<string>('top2');
    const [leagueFormat, setLeagueFormat] = useState<string>('dos_rondas');
    const [autoGenerate, setAutoGenerate] = useState<boolean>(true);
    const [availableCourts, setAvailableCourts] = useState<number>(tournament?.availableCourts || 1);
    const [generatedData, setGeneratedData] = useState<any | null>(null);
    const lockToLeagueBackend = Boolean(tournament?.isBackendTournament && tournament?.format === 'league');

    const handleGenerate = () => {
        let teamsToUse: any[] = [];
        if (tournament && tournament.teams && tournament.teams.length > 0) {
            teamsToUse = tournament.teams.map((t: any, index: number) => ({
                id: t.id || `t${index + 1}`,
                name: t.teamName || `Equipo ${index + 1}`,
                players: t.players.map((p: any) => p.name),
                preferences: t.preferences || []
            }));
        } else if (tournament && tournament.registeredUsers > 0) {
            // If teams are not explicitly defined but registeredUsers > 0, 
            // create dummy teams based on registered users count
            const numTeams = Math.floor(tournament.registeredUsers / 2);
            for (let i = 0; i < numTeams; i++) {
                teamsToUse.push({
                    id: `t${i + 1}`,
                    name: `Equipo ${i + 1}`,
                    players: [`Jugador ${i * 2 + 1}`, `Jugador ${i * 2 + 2}`],
                    preferences: []
                });
            }
        } else {
            // Only use mock teams if it's a demo/test or explicitly requested
            teamsToUse = [
                { id: 't1', name: 'Los Galácticos', players: ['Juan P.', 'Carlos M.'], preferences: ['Noche Lun 20'] },
                { id: 't2', name: 'Padel Bros', players: ['Diego R.', 'Martín S.'], preferences: ['Noche Lun 20'] },
                { id: 't3', name: 'Smashers', players: ['Fede G.', 'Nico L.'], preferences: ['Tarde Mar 21'] },
                { id: 't4', name: 'Volea Mágica', players: ['Alejandro T.', 'Sebastián V.'], preferences: ['Tarde Mar 21'] }
            ];
        }

        if (teamsToUse.length < 2) {
            alert("Se necesitan al menos 2 equipos para generar el torneo.");
            return;
        }

        let groups: any[] = [];
        const actualNumGroups = format === 'liga' ? 1 : Math.min(numGroups, teamsToUse.length);
        for (let i = 0; i < actualNumGroups; i++) {
            groups.push({ name: format === 'liga' ? 'Liga' : `Grupo ${String.fromCharCode(65 + i)}`, teams: [] });
        }
        
        // Distribute teams evenly
        teamsToUse.forEach((team, index) => {
            groups[index % actualNumGroups].teams.push(team);
        });

        // Date calculation helpers
        const getTournamentDate = (dayOffset: number) => {
            if (!tournament?.startDate) return null;
            const [y, m, d] = tournament.startDate.split('-');
            const date = new Date(Number(y), Number(m) - 1, Number(d));
            date.setDate(date.getDate() + dayOffset);
            return date;
        };

        const formatDateStr = (date: Date, time: string) => {
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            return `${days[date.getDay()]} ${date.getDate()} ${time}`;
        };

        const getTournamentDuration = () => {
            if (!tournament?.startDate || !tournament?.endDate) return 1;
            const [sy, sm, sd] = tournament.startDate.split('-');
            const [ey, em, ed] = tournament.endDate.split('-');
            const start = new Date(Number(sy), Number(sm) - 1, Number(sd));
            const end = new Date(Number(ey), Number(em) - 1, Number(ed));
            const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return diff + 1;
        };

        const duration = getTournamentDuration();
        const groupStageDays = format === 'liga' ? duration : Math.max(1, Math.ceil(duration * 0.6)); // 60% of time for groups
        const playoffDays = duration - groupStageDays;

        const getDayString = (date: Date) => {
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            return `${days[date.getDay()]} ${date.getDate()}`;
        };

        const teamSchedules: Record<string, Date[]> = {};
        const courtSchedules: Record<number, Date[]> = {};
        const availableCourtsCount = availableCourts;
        for (let i = 1; i <= availableCourtsCount; i++) {
            courtSchedules[i] = [];
        }

        // Pre-fill courtSchedules with existing matches from the same club
        matches.forEach(m => {
            if (m.clubId === tournament.clubId && m.status !== 'completed') {
                const matchDate = new Date(m.date);
                if (m.time) {
                    const [h, min] = m.time.split(':').map(Number);
                    if (!isNaN(h) && !isNaN(min)) {
                        matchDate.setHours(h, min, 0, 0);
                    }
                }
                // Try to parse court number from courtName (e.g., "Cancha 1")
                const courtMatch = m.courtName.match(/Cancha (\d+)/i);
                if (courtMatch) {
                    const courtNum = parseInt(courtMatch[1]);
                    if (courtNum >= 1 && courtNum <= availableCourtsCount) {
                        courtSchedules[courtNum].push(matchDate);
                    }
                }
            }
        });

        const addSchedule = (teamId: string, time: Date, courtNum: number) => {
            if (!teamSchedules[teamId]) teamSchedules[teamId] = [];
            teamSchedules[teamId].push(time);
            courtSchedules[courtNum].push(time);
        };

        const getAvailableCourt = (proposedTime: Date) => {
            if (format === 'liga') {
                return 1; // Always return a dummy court number for liga
            }
            for (let i = 1; i <= availableCourtsCount; i++) {
                const schedule = courtSchedules[i] || [];
                let isAvailable = true;
                for (const scheduledTime of schedule) {
                    if (Math.abs(proposedTime.getTime() - scheduledTime.getTime()) < 90 * 60 * 1000) {
                        isAvailable = false;
                        break;
                    }
                }
                if (isAvailable) return i;
            }
            return null;
        };

        const isValidTime = (teamA: any, teamB: any, proposedTime: Date) => {
            const checkTeam = (teamId: string) => {
                const schedule = teamSchedules[teamId] || [];
                for (const scheduledTime of schedule) {
                    if (Math.abs(proposedTime.getTime() - scheduledTime.getTime()) < 60 * 60 * 1000) {
                        return false;
                    }
                }
                
                // Check for 3 consecutive matches (no 1-hour rest between 3 matches)
                const allTimes = [...schedule, proposedTime].sort((a, b) => a.getTime() - b.getTime());
                for (let i = 0; i < allTimes.length - 2; i++) {
                    const t1 = allTimes[i].getTime();
                    const t2 = allTimes[i+1].getTime();
                    const t3 = allTimes[i+2].getTime();
                    
                    const gap1 = (t2 - t1) / (60 * 60 * 1000);
                    const gap2 = (t3 - t2) / (60 * 60 * 1000);
                    
                    if (gap1 < 2 && gap2 < 2) {
                        return false;
                    }
                }
                
                return true;
            };
            return checkTeam(teamA.id) && checkTeam(teamB.id) && getAvailableCourt(proposedTime) !== null;
        };

        const getHoursForPeriod = (period: string) => {
            if (period === 'Mañana') return [9, 10, 11];
            if (period === 'Tarde') return [12, 13, 14, 15, 16, 17, 18];
            if (period === 'Noche') return [19, 20, 21];
            return [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        };

        const formatReturn = (time: Date, courtNum: number, warning?: string) => {
            const timeStr = `${time.getHours().toString().padStart(2, '0')}:00`;
            return { 
                date: formatDateStr(time, timeStr), 
                isoDate: time.toISOString(),
                time: timeStr,
                courtNum,
                warning 
            };
        };

        const findMatchTime = (teamA: any, teamB: any, matchIndex: number, totalMatches: number) => {
            let warning: string | undefined = undefined;

            const trySchedule = (dayIndex: number, hours: number[]) => {
                const baseDate = getTournamentDate(dayIndex);
                if (!baseDate) return null;
                
                for (const hour of hours) {
                    const proposedTime = new Date(baseDate);
                    proposedTime.setHours(hour, 0, 0, 0);
                    const courtNum = getAvailableCourt(proposedTime);
                    if (courtNum !== null && isValidTime(teamA, teamB, proposedTime)) {
                        addSchedule(teamA.id, proposedTime, courtNum);
                        addSchedule(teamB.id, proposedTime, courtNum);
                        return { time: proposedTime, courtNum };
                    }
                }
                return null;
            };

            if (autoGenerate) {
                const prefsA = teamA.preferences || [];
                const prefsB = teamB.preferences || [];

                const hasPrefsA = prefsA.length > 0;
                const hasPrefsB = prefsB.length > 0;

                if (!hasPrefsA && !hasPrefsB) {
                    // Both have no restrictions
                    for (let i = 0; i < groupStageDays; i++) {
                        const dayIndex = (Math.floor((matchIndex / totalMatches) * groupStageDays) + i) % groupStageDays;
                        const result = trySchedule(dayIndex, getHoursForPeriod('All'));
                        if (result) return formatReturn(result.time, result.courtNum, undefined);
                    }
                } else if (hasPrefsA && !hasPrefsB) {
                    // Only A has restrictions
                    for (let i = 0; i < groupStageDays; i++) {
                        const date = getTournamentDate(i);
                        if (!date) continue;
                        const dayStr = getDayString(date);
                        const prefA = prefsA.find((p: string) => p.includes(dayStr));
                        if (prefA) {
                            const period = prefA.split(' ')[0];
                            const result = trySchedule(i, getHoursForPeriod(period));
                            if (result) return formatReturn(result.time, result.courtNum, undefined);
                        }
                    }
                    warning = '⚠️ Chequear disponibilidad del equipo';
                } else if (!hasPrefsA && hasPrefsB) {
                    // Only B has restrictions
                    for (let i = 0; i < groupStageDays; i++) {
                        const date = getTournamentDate(i);
                        if (!date) continue;
                        const dayStr = getDayString(date);
                        const prefB = prefsB.find((p: string) => p.includes(dayStr));
                        if (prefB) {
                            const period = prefB.split(' ')[0];
                            const result = trySchedule(i, getHoursForPeriod(period));
                            if (result) return formatReturn(result.time, result.courtNum, undefined);
                        }
                    }
                    warning = '⚠️ Chequear disponibilidad del equipo';
                } else {
                    // Both have restrictions
                    for (let i = 0; i < groupStageDays; i++) {
                        const date = getTournamentDate(i);
                        if (!date) continue;
                        const dayStr = getDayString(date);
                        
                        const common = prefsA.find((p: string) => prefsB.includes(p) && p.includes(dayStr));
                        if (common) {
                            const period = common.split(' ')[0];
                            const result = trySchedule(i, getHoursForPeriod(period));
                            if (result) return formatReturn(result.time, result.courtNum, undefined);
                        }
                    }
                    
                    for (let i = 0; i < groupStageDays; i++) {
                        const date = getTournamentDate(i);
                        if (!date) continue;
                        const dayStr = getDayString(date);
                        
                        const prefA = prefsA.find((p: string) => p.includes(dayStr));
                        const prefB = prefsB.find((p: string) => p.includes(dayStr));
                        
                        if (prefA || prefB) {
                            const pref = prefA || prefB;
                            const period = pref.split(' ')[0];
                            const result = trySchedule(i, getHoursForPeriod(period));
                            if (result) {
                                warning = '⚠️ Chequear disponibilidad del equipo';
                                return formatReturn(result.time, result.courtNum, warning);
                            }
                        }
                    }
                    
                    warning = '⚠️ Chequear disponibilidad del equipo';
                }
            }
            
            // Fallback if no time found or autoGenerate is false
            const defaultTimes = ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00', '21:30'];
            for (let i = 0; i < groupStageDays; i++) {
                const dayIndex = (Math.floor((matchIndex / totalMatches) * groupStageDays) + i) % groupStageDays;
                const result = trySchedule(dayIndex, getHoursForPeriod('All'));
                if (result) return formatReturn(result.time, result.courtNum, warning);
            }

            // Absolute fallback (should rarely happen unless too many matches in too few days)
            const dayIndex = Math.floor((matchIndex / totalMatches) * groupStageDays);
            const date = getTournamentDate(dayIndex) || new Date();
            const timeIndex = matchIndex % defaultTimes.length;
            const timeStr = defaultTimes[timeIndex];
            const [h, m] = timeStr.split(':');
            date.setHours(Number(h), Number(m), 0, 0);
            const courtNum = getAvailableCourt(date) || 1;
            return { 
                date: formatDateStr(date, timeStr), 
                isoDate: date.toISOString(),
                time: timeStr,
                courtNum,
                warning 
            };
        };

        const groupMatches: any[] = [];
        let matchCounter = 0;
        
        // Calculate total group matches first for distribution
        let totalGroupMatches = 0;
        groups.forEach(g => {
            const n = g.teams.length;
            if (format === 'liga') {
                totalGroupMatches += n * (n - 1); // Double round-robin
            } else {
                totalGroupMatches += (n * (n - 1)) / 2;
            }
        });

        groups.forEach(group => {
            if (format === 'liga') {
                // Double round-robin
                const n = group.teams.length;
                const isOdd = n % 2 !== 0;
                const teamsList = isOdd ? [...group.teams, null] : [...group.teams];
                const numTeams = teamsList.length;
                const rounds = numTeams - 1;
                
                // Round 1
                for (let r = 0; r < rounds; r++) {
                    for (let i = 0; i < numTeams / 2; i++) {
                        const teamA = teamsList[i];
                        const teamB = teamsList[numTeams - 1 - i];
                        if (teamA !== null && teamB !== null) {
                            const timeResult = findMatchTime(teamA, teamB, matchCounter++, totalGroupMatches);
                            groupMatches.push({
                                id: `m_${group.name}_r1_${r}_${i}`,
                                round: `Ronda 1 - Fecha ${r + 1}`,
                                team1: teamA.name,
                                team2: teamB.name,
                                date: timeResult.date,
                                isoDate: timeResult.isoDate,
                                time: timeResult.time,
                                courtNum: format === 'liga' ? undefined : timeResult.courtNum,
                                warning: timeResult.warning
                            });
                        }
                    }
                    teamsList.splice(1, 0, teamsList.pop());
                }
                
                // Round 2 (reverse roles)
                for (let r = 0; r < rounds; r++) {
                    for (let i = 0; i < numTeams / 2; i++) {
                        const teamB = teamsList[i];
                        const teamA = teamsList[numTeams - 1 - i];
                        if (teamA !== null && teamB !== null) {
                            const timeResult = findMatchTime(teamA, teamB, matchCounter++, totalGroupMatches);
                            groupMatches.push({
                                id: `m_${group.name}_r2_${r}_${i}`,
                                round: `Ronda 2 - Fecha ${r + 1}`,
                                team1: teamA.name,
                                team2: teamB.name,
                                date: timeResult.date,
                                isoDate: timeResult.isoDate,
                                time: timeResult.time,
                                courtNum: format === 'liga' ? undefined : timeResult.courtNum,
                                warning: timeResult.warning
                            });
                        }
                    }
                    teamsList.splice(1, 0, teamsList.pop());
                }
            } else {
                for (let i = 0; i < group.teams.length; i++) {
                    for (let j = i + 1; j < group.teams.length; j++) {
                        const teamA = group.teams[i];
                        const teamB = group.teams[j];
                        const timeResult = findMatchTime(teamA, teamB, matchCounter++, totalGroupMatches);
                        groupMatches.push({
                            id: `m_${group.name}_${i}_${j}`,
                            round: `Fase de Grupos - ${group.name}`,
                            team1: teamA.name,
                            team2: teamB.name,
                            date: timeResult.date,
                            isoDate: timeResult.isoDate,
                            time: timeResult.time,
                            courtNum: timeResult.courtNum,
                            warning: timeResult.warning
                        });
                    }
                }
            }
        });

        const playoffs = [];
        const playoffStartDate = getTournamentDate(groupStageDays) || getTournamentDate(duration - 1) || new Date();
        const finalDate = getTournamentDate(duration - 1) || new Date();

        const createPlayoff = (id: string, round: string, team1: string, team2: string, dateObj: Date, defaultTimeStr: string) => {
            const d = new Date(dateObj);
            let [h, m] = defaultTimeStr.split(':').map(Number);
            d.setHours(h, m, 0, 0);
            
            let courtNum = getAvailableCourt(d);
            let timeStr = defaultTimeStr;
            
            // If the default time is busy, try finding the next available slot on the same day
            if (courtNum === null) {
                const possibleHours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
                for (const hour of possibleHours) {
                    d.setHours(hour, 0, 0, 0);
                    courtNum = getAvailableCourt(d);
                    if (courtNum !== null) {
                        timeStr = `${hour.toString().padStart(2, '0')}:00`;
                        break;
                    }
                }
            }
            
            // Fallback to court 1 if absolutely no slots are available
            if (courtNum === null) {
                courtNum = 1;
                d.setHours(h, m, 0, 0);
                timeStr = defaultTimeStr;
            } else {
                // Register the scheduled time so subsequent playoffs don't overlap
                addSchedule(team1, d, courtNum);
                addSchedule(team2, d, courtNum);
            }

            return {
                id, round, team1, team2,
                date: formatDateStr(d, timeStr),
                isoDate: d.toISOString(),
                time: timeStr,
                courtNum
            };
        };

        if (format !== 'liga') {
            if (actualNumGroups === 1) {
                playoffs.push(createPlayoff('p1', 'Semifinal 1', '1ro Grupo A', '4to Grupo A', playoffStartDate, '10:00'));
                playoffs.push(createPlayoff('p2', 'Semifinal 2', '2do Grupo A', '3ro Grupo A', playoffStartDate, '12:00'));
                playoffs.push(createPlayoff('p3', 'Final', 'Ganador Semi 1', 'Ganador Semi 2', finalDate, '18:00'));
            } else if (actualNumGroups === 2) {
                playoffs.push(createPlayoff('p1', 'Semifinal 1', '1ro Grupo A', '2do Grupo B', playoffStartDate, '10:00'));
                playoffs.push(createPlayoff('p2', 'Semifinal 2', '1ro Grupo B', '2do Grupo A', playoffStartDate, '12:00'));
                playoffs.push(createPlayoff('p3', 'Final', 'Ganador Semi 1', 'Ganador Semi 2', finalDate, '18:00'));
            } else {
                 playoffs.push(createPlayoff('p1', 'Final', '1ro Grupo A', '1ro Grupo B', finalDate, '18:00'));
            }
        }

        setGeneratedData({ groups, groupMatches, playoffs });
    };

    const handleLaunch = () => {
        onLaunch({
            format,
            americanoType: format === 'americano' ? americanoType : undefined,
            availableCourts,
            courtNames: tournament.courtNames,
            leagueRounds: leagueFormat === 'dos_rondas' ? 2 : 1,
            numGroups,
            qualifiers,
            autoGenerate,
            generatedData,
            matchesPerParticipant: tournament.matchesPerParticipant
        });
    };

    return (
        <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col overflow-hidden">
            {/* Header */}
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
                                    El torneo no está completo. Puedes lanzarlo ahora con los jugadores actuales, pero el fixture se generará solo con los inscritos.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {!generatedData ? (
                    <>
                        {/* Forma de competir */}
                        <div className="space-y-3">
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Forma de Competir</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'eliminatoria', label: 'Eliminatoria', icon: <Trophy size={16} /> },
                                    { id: 'liga', label: 'Liga', icon: <Swords size={16} /> },
                                    { id: 'americano', label: 'Americano', icon: <Users size={16} /> }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => {
                                            if (lockToLeagueBackend) return;
                                            setFormat(f.id as any);
                                        }}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                            format === f.id 
                                            ? 'bg-amber-500/20 border-amber-500 text-amber-500' 
                                            : 'bg-dark-800 border-dark-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                        disabled={lockToLeagueBackend}
                                    >
                                        {f.icon}
                                        <span className="text-[10px] font-bold mt-1 uppercase">{f.label}</span>
                                    </button>
                                ))}
                            </div>
                            {lockToLeagueBackend && (
                                <p className="text-gray-500 text-[10px]">
                                    Este torneo ya fue creado como liga. El backend usará ese formato oficial al lanzarlo.
                                </p>
                            )}
                        </div>

                        {format === 'eliminatoria' && (
                            <>
                                {/* Cantidad de Grupos */}
                                <div className="space-y-3">
                                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Cantidad de Grupos</label>
                                    <div className="relative">
                                        <select 
                                            value={numGroups}
                                            onChange={(e) => setNumGroups(parseInt(e.target.value))}
                                            className="w-full h-12 bg-dark-800 border border-dark-700 rounded-xl px-4 text-white font-medium appearance-none focus:outline-none focus:border-amber-500"
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                                <option key={num} value={num}>{num} {num === 1 ? 'Grupo' : 'Grupos'}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Equipos clasificados por serie */}
                                <div className="space-y-3">
                                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Clasificación a Playoffs</label>
                                    <div className="relative">
                                        <select 
                                            value={qualifiers}
                                            onChange={(e) => setQualifiers(e.target.value)}
                                            className="w-full h-12 bg-dark-800 border border-dark-700 rounded-xl px-4 text-white font-medium appearance-none focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="top2">Primeros dos equipos de cada grupo</option>
                                            <option value="top1_best2nd">Primero de cada grupo y mejor segundo</option>
                                            <option value="top1">Solo el primero de cada grupo</option>
                                            <option value="all">Todos los equipos (Playoffs directos)</option>
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </>
                        )}

                        {format === 'liga' && (
                            <div className="space-y-3">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Formato de Liga</label>
                                <div className="relative">
                                    <select 
                                        value={leagueFormat}
                                        onChange={(e) => setLeagueFormat(e.target.value)}
                                        className="w-full h-12 bg-dark-800 border border-dark-700 rounded-xl px-4 text-white font-medium appearance-none focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="dos_rondas">Liga: Dos Rondas</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <p className="text-gray-500 text-[10px]">Todos juegan contra todos una primera ronda y luego comienzan de nuevo. La segunda ronda solo comienza cuando todos los partidos de la primera ronda han sido agendados.</p>
                            </div>
                        )}

                        {format === 'americano' && (
                            <div className="space-y-3">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Tipo de Americano</label>
                                <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700">
                                    <button 
                                        onClick={() => setAmericanoType('fijo')}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${americanoType === 'fijo' ? 'bg-amber-500 text-dark-900 shadow-lg' : 'text-gray-400'}`}
                                    >
                                        Americano Fijo
                                    </button>
                                    <button 
                                        onClick={() => setAmericanoType('dinamico')}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${americanoType === 'dinamico' ? 'bg-amber-500 text-dark-900 shadow-lg' : 'text-gray-400'}`}
                                    >
                                        Americano Dinámico
                                    </button>
                                </div>
                                <p className="text-gray-500 text-[10px]">
                                    {americanoType === 'fijo' 
                                        ? 'Las parejas se mantienen iguales durante todo el torneo.' 
                                        : 'Los jugadores rotan de pareja en cada partido.'}
                                </p>
                            </div>
                        )}

                        {/* Canchas Disponibles */}
                        {format !== 'liga' && (
                            <div className="space-y-3">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Canchas Disponibles</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={availableCourts}
                                        onChange={(e) => setAvailableCourts(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full h-12 bg-dark-800 border border-dark-700 rounded-xl px-4 text-white font-medium focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <p className="text-gray-500 text-[10px]">Permite coordinar partidos en simultáneo para agilizar el torneo.</p>
                            </div>
                        )}

                        {/* Generación Automática */}
                        <div className="space-y-3">
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Coordinación de Partidos</label>
                            <button 
                                onClick={() => setAutoGenerate(!autoGenerate)}
                                className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                                    autoGenerate ? 'bg-amber-500/10 border-amber-500/50' : 'bg-dark-800 border-dark-700'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${autoGenerate ? 'bg-amber-500 border-amber-500' : 'border-gray-500'}`}>
                                    {autoGenerate && <Check size={14} className="text-dark-900" />}
                                </div>
                                <div>
                                    <p className={`font-bold text-sm mb-1 ${autoGenerate ? 'text-amber-500' : 'text-white'}`}>Coordinar horarios automáticamente</p>
                                    <p className="text-gray-400 text-xs leading-relaxed">
                                        Considerar las restricciones horarias de los distintos equipos para coordinar los partidos dependiendo de la disponibilidad de los usuarios.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        {/* Grupos Generados */}
                        <div className="space-y-4">
                            <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                <Users size={16} className="text-padel-500" />
                                Grupos Generados
                            </h4>
                            <div className="grid gap-4">
                                {generatedData.groups.map((group: any, idx: number) => (
                                    <div key={idx} className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                                        <div className="bg-dark-700/50 px-4 py-2 border-b border-dark-700">
                                            <h5 className="text-white font-bold text-sm">{group.name}</h5>
                                        </div>
                                        <div className="divide-y divide-dark-700">
                                            {group.teams.map((team: any, tIdx: number) => (
                                                <div key={tIdx} className="p-3 px-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-white font-medium text-sm">{team.name}</p>
                                                        <p className="text-gray-400 text-[10px]">{team.players.join(' & ')}</p>
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono">
                                                        Equipo {tIdx + 1}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Playoffs Generados */}
                        {generatedData.playoffs && generatedData.playoffs.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Trophy size={16} className="text-amber-500" />
                                    Próximos Partidos (Playoffs)
                                </h4>
                                <div className="space-y-3">
                                    {generatedData.playoffs.map((match: any, idx: number) => (
                                        <div key={idx} className="bg-dark-800 border border-dark-700 rounded-xl p-3 flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-amber-500 text-[10px] font-bold uppercase">{match.round}</span>
                                                <span className="text-gray-400 text-[10px] flex items-center gap-1"><Calendar size={10}/> {match.date}</span>
                                            </div>
                                            {match.warning && (
                                                <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold">
                                                    <AlertCircle size={10} />
                                                    {match.warning}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between bg-dark-900/50 rounded-lg p-2 border border-dark-700/50">
                                                <span className="text-white text-xs font-medium truncate flex-1 text-center">{match.team1}</span>
                                                <span className="text-gray-500 text-[10px] font-bold px-2">VS</span>
                                                <span className="text-white text-xs font-medium truncate flex-1 text-center">{match.team2}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Partidos de Fase de Grupos */}
                        {generatedData.groupMatches && generatedData.groupMatches.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={16} className="text-padel-500" />
                                    {format === 'liga' ? 'Partidos de la Liga' : 'Partidos de Fase de Grupos'}
                                </h4>
                                <div className="space-y-3">
                                    {generatedData.groupMatches.map((match: any, idx: number) => (
                                        <div key={idx} className="bg-dark-800 border border-dark-700 rounded-xl p-3 flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-padel-500 text-[10px] font-bold uppercase">{match.round}</span>
                                                <span className="text-gray-400 text-[10px] flex items-center gap-1"><Calendar size={10}/> {match.date}</span>
                                            </div>
                                            {match.warning && (
                                                <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold">
                                                    <AlertCircle size={10} />
                                                    {match.warning}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between bg-dark-900/50 rounded-lg p-2 border border-dark-700/50">
                                                <span className="text-white text-xs font-medium truncate flex-1 text-center">{match.team1}</span>
                                                <span className="text-gray-500 text-[10px] font-bold px-2">VS</span>
                                                <span className="text-white text-xs font-medium truncate flex-1 text-center">{match.team2}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-dark-800 border-t border-dark-700 pb-safe">
                {!generatedData ? (
                    <Button fullWidth size="md" onClick={handleGenerate}>
                        Generar Grupos y Playoffs
                    </Button>
                ) : (
                    <div className="flex gap-3">
                        <Button variant="secondary" size="md" onClick={() => setGeneratedData(null)} className="flex-1">
                            Atrás
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

const AddTeamsToTournamentView: React.FC<{ currentUser: User, tournament: any, availablePlayers?: User[], onClose: () => void, onUpdate: (data: any) => void }> = ({ currentUser, tournament, availablePlayers = [currentUser, ...MOCK_FRIENDS], onClose, onUpdate }) => {
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
    
    const [selectedPlayers, setSelectedPlayers] = useState<User[]>(initialPlayers);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [teamNames, setTeamNames] = useState<Record<string, string>>(initialTeamNames);
    const [teamPreferences, setTeamPreferences] = useState<Record<string, string[]>>({});
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const remainingSlots = maxPlayers - selectedPlayers.length;

    const timeOptions = useMemo(() => {
        if (!tournament.startDate || !tournament.endDate) return [];
        const [sYear, sMonth, sDay] = tournament.startDate.split('-').map(Number);
        const [eYear, eMonth, eDay] = tournament.endDate.split('-').map(Number);
        
        const start = new Date(sYear, sMonth - 1, sDay);
        const end = new Date(eYear, eMonth - 1, eDay);
        
        const options = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayStr = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            options.push({ value: `${dayStr} Mañana`, label: `${dayStr} - Mañana (08:00 - 13:00)` });
            options.push({ value: `${dayStr} Tarde`, label: `${dayStr} - Tarde (13:00 - 18:00)` });
            options.push({ value: `${dayStr} Noche`, label: `${dayStr} - Noche (18:00 - 23:00)` });
        }
        return options;
    }, [tournament.startDate, tournament.endDate]);

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
        const updatedTeams = pairs.filter(p => p.length === 2).map(p => ({
            players: p,
            teamName: teamNames[`${p[0].id}-${p[1].id}`] || `${p[0].name.split(' ')[0]} & ${p[1].name.split(' ')[0]}`,
            preferences: teamPreferences[`${p[0].id}-${p[1].id}`] || []
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
                    disabled={pairs.length === 0 || pairs.some(p => p.length !== 2)}
                >
                    Guardar Equipos
                </Button>
            </div>
        </div>
    );
};

const CreateTournamentView: React.FC<{ currentUser: User, selectablePlayers?: User[], clubOptions?: Club[], onClose: () => void, onCreate: (data: any) => void }> = ({ currentUser, selectablePlayers = [currentUser, ...MOCK_FRIENDS], clubOptions = MOCK_CLUBS, onClose, onCreate }) => {
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
    const [selectedClub, setSelectedClub] = useState<string | null>(null);
    const [prizes, setPrizes] = useState<string>('');
    const [selectedPlayers, setSelectedPlayers] = useState<User[]>([currentUser]); // Flat list of players

    const isPerfectAmericano = useMemo(() => {
        if (format !== 'americano') return true;
        const totalSlots = numTeams * matchesPerParticipant;
        return totalSlots % 4 === 0;
    }, [format, numTeams, matchesPerParticipant]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [linkCopied, setLinkCopied] = useState(false);
    const [teamNames, setTeamNames] = useState<Record<string, string>>({});
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [teamPreferences, setTeamPreferences] = useState<Record<string, string[]>>({});
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);

    const timeOptions = useMemo(() => {
        if (!startDate || !endDate) return [];
        const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
        
        let current = new Date(sYear, sMonth - 1, sDay);
        const last = new Date(eYear, eMonth - 1, eDay);
        
        if (current > last) return [];

        const options = [];
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        
        let count = 0;
        while (current <= last && count < 30) {
            const dayName = days[current.getDay()];
            const dateStr = `${dayName} ${current.getDate()}`;
            options.push(`Mañana ${dateStr}`);
            options.push(`Tarde ${dateStr}`);
            options.push(`Noche ${dateStr}`);
            current.setDate(current.getDate() + 1);
            count++;
        }
        return options;
    }, [startDate, endDate]);

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

    // Combine mocks for searching
    const uniqueUsers = Array.from(new Map(selectablePlayers.map(user => [user.id, user])).values());

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

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`https://sentimospadel.uy/t/invite/${Date.now()}`);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

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
                            <Medal size={14} /> Por los puntos
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
                            Elige <span className="text-white font-bold">Por los puntos</span>, si quieres que los resultados de los partidos de este torneo afecten tu rating, o por el contrario, elige <span className="text-white font-bold">recreativo</span> si no quieres que afecten tu rating.
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
                                    <img src={club.image} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent"></div>
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
                            {(searchQuery ? filteredUsers : [currentUser, ...MOCK_FRIENDS].filter(f => !selectedPlayers.some(sp => sp.id === f.id))).map(user => (
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
                                                                    ? teamPreferences[teamKey].join(', ') 
                                                                    : 'Sin restricciones horarias'}
                                                            </span>
                                                            <ChevronDown size={10} className={`shrink-0 transition-transform ${openDropdown === teamKey ? 'rotate-180' : ''}`} />
                                                        </button>
                                                        {openDropdown === teamKey && (
                                                            <div className="absolute z-10 mt-1 w-full bg-dark-800 border border-dark-700 rounded shadow-lg max-h-32 overflow-y-auto">
                                                                {timeOptions.map(opt => (
                                                                    <label key={opt} className="flex items-center gap-2 px-2 py-1.5 hover:bg-dark-700 cursor-pointer text-[10px] text-white">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={teamPreferences[teamKey]?.includes(opt) || false}
                                                                            onChange={(e) => {
                                                                                const currentPrefs = teamPreferences[teamKey] || [];
                                                                                if (e.target.checked) {
                                                                                    setTeamPreferences({...teamPreferences, [teamKey]: [...currentPrefs, opt]});
                                                                                } else {
                                                                                    setTeamPreferences({...teamPreferences, [teamKey]: currentPrefs.filter(p => p !== opt)});
                                                                                }
                                                                            }}
                                                                            className="accent-padel-500"
                                                                        />
                                                                        {opt}
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

                {/* Share Link Option */}
                <button 
                    onClick={handleCopyLink}
                    className="w-full bg-dark-800 border border-padel-500/30 p-3 rounded-xl flex items-center justify-between group active:scale-95 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-padel-500/10 p-2 rounded-lg group-hover:bg-padel-500/20 transition-colors">
                            <Link size={18} className="text-padel-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-white text-sm font-bold">Invitar vía Link</p>
                            <p className="text-gray-400 text-[10px]">Comparte por WhatsApp o Mensaje</p>
                        </div>
                    </div>
                    {linkCopied ? (
                        <span className="text-xs text-green-400 font-bold flex items-center gap-1 bg-green-900/20 px-2 py-1 rounded">
                            <Check size={12} /> Copiado
                        </span>
                    ) : (
                        <div className="bg-dark-700 p-1.5 rounded-md">
                            <Copy size={14} className="text-gray-400" />
                        </div>
                    )}
                </button>

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
                        clubId: selectedClub,
                        clubName: clubOptions.find(c => c.id === selectedClub)?.name,
                        teams: pairs.filter(p => p.length === 2).map(p => ({
                            players: p,
                            teamName: teamNames[`${p[0].id}-${p[1].id}`] || `${p[0].name.split(' ')[0]} & ${p[1].name.split(' ')[0]}`,
                            preferences: teamPreferences[`${p[0].id}-${p[1].id}`] || []
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

const NationalRankingView: React.FC<{ currentUser: User, onClose: () => void }> = ({ currentUser, onClose }) => {
    const [selectedCity, setSelectedCity] = useState<string>('Todas');
    const [selectedClub, setSelectedClub] = useState<string>('Todos');
    const [selectedGender, setSelectedGender] = useState<string>('Todos');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [selectedAge, setSelectedAge] = useState<string>('Todas');

    const CITIES = ['Todas', 'Montevideo', 'Canelones', 'Maldonado', 'Salto'];
    const GENDERS = ['Todos', 'Hombre', 'Mujer'];
    const CATEGORIES = ['Todas', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª'];
    const AGES = ['Todas', 'Sub 18', '19-25', '26-30', '>30', '>40', '>50'];

    // Generate mock top 10 players
    const topPlayers = Array.from({ length: 10 }).map((_, i) => ({
        rank: i + 1,
        name: `Jugador ${i + 1}`,
        avatar: `https://picsum.photos/100/100?random=${100 + i}`,
        rating: (6.5 - i * 0.1).toFixed(2),
        points: 2500 - i * 150,
        matchesWon: 45 - i * 2,
        winRate: (75 - i * 1.5).toFixed(1) + '%',
        tournamentsWon: Math.max(0, 5 - i),
        representedClub: i % 3 === 0 ? MOCK_CLUBS[0] : (i % 4 === 0 ? MOCK_CLUBS[1] : null)
    }));

    // User's mock position
    const userPosition = {
        rank: 42,
        name: currentUser.name,
        avatar: currentUser.avatar,
        rating: currentUser.level.toFixed(2),
        points: 850,
        matchesWon: 12,
        winRate: '58.0%',
        tournamentsWon: currentUser.badges?.length || 0,
        representedClub: MOCK_CLUBS[0]
    };

    return (
        <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col animate-fade-in overflow-y-auto">
             {/* Header */}
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
                {/* Filters */}
                <div className="bg-dark-800 rounded-2xl border border-dark-700 p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Filter size={16} className="text-padel-400" />
                        <h3 className="text-white font-bold text-sm">Filtros</h3>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                        {/* City Filter */}
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Ciudad</label>
                            <div className="relative">
                                <select
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate"
                                >
                                    {CITIES.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Club Filter */}
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Club</label>
                            <div className="relative">
                                <select
                                    value={selectedClub}
                                    onChange={(e) => setSelectedClub(e.target.value)}
                                    className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate"
                                >
                                    <option value="Todos">Todos</option>
                                    {MOCK_CLUBS.map(club => (
                                        <option key={club.id} value={club.id}>{club.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Gender Filter */}
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Sexo</label>
                            <div className="relative">
                                <select
                                    value={selectedGender}
                                    onChange={(e) => setSelectedGender(e.target.value)}
                                    className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate"
                                >
                                    {GENDERS.map(gender => (
                                        <option key={gender} value={gender}>{gender}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Categoría</label>
                            <div className="relative">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Age Filter */}
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase mb-0.5 block truncate">Edad</label>
                            <div className="relative">
                                <select
                                    value={selectedAge}
                                    onChange={(e) => setSelectedAge(e.target.value)}
                                    className="w-full bg-dark-900 border border-dark-700 text-white text-[10px] rounded-md p-1.5 pr-4 appearance-none focus:outline-none focus:border-padel-500 transition-colors truncate"
                                >
                                    {AGES.map(age => (
                                        <option key={age} value={age}>{age}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ranking List */}
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
                                    <th className="py-2 px-1 font-bold text-center w-12">Club</th>
                                    <th className="py-2 px-1 font-bold text-center w-6">PG</th>
                                    <th className="py-2 px-1 font-bold text-center w-8">%</th>
                                    <th className="py-2 px-1 font-bold text-center w-6"><Trophy size={10} className="mx-auto"/></th>
                                    <th className="py-2 px-1 font-bold text-right w-8">Pts</th>
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
                                            {player.representedClub ? (
                                                <div className="flex items-center justify-center gap-1 bg-dark-900 px-1 py-0.5 rounded border border-dark-700 w-max mx-auto">
                                                    <img src={player.representedClub.image} alt={player.representedClub.name} className="w-3 h-3 rounded-full object-cover shrink-0" />
                                                    <span className="text-[8px] text-gray-300 font-medium truncate max-w-[24px]">{player.representedClub.name.substring(0,3)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-600">-</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-1 text-center text-white text-[10px]">{player.matchesWon}</td>
                                        <td className="py-2 px-1 text-center text-white text-[10px]">{player.winRate.replace('.0', '')}</td>
                                        <td className="py-2 px-1 text-center text-white text-[10px]">
                                            {player.tournamentsWon > 0 ? (
                                                <span className="text-amber-400 font-bold">{player.tournamentsWon}</span>
                                            ) : (
                                                <span className="text-gray-600">-</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-1 text-right text-gray-300 text-[10px]">{player.points}</td>
                                        <td className="py-2 px-1 text-right text-padel-400 font-black text-[10px]">{player.rating}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* User Position Highlight */}
                    <div className="w-full border-t-2 border-padel-500 bg-padel-900/20 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-padel-500/10 to-transparent pointer-events-none"></div>
                        <table className="w-full text-left border-collapse table-fixed relative z-10">
                            <tbody>
                                <tr>
                                    <td className="py-2 px-1 text-center font-black text-[10px] text-padel-400 w-6">
                                        {userPosition.rank}
                                    </td>
                                    <td className="py-2 px-1 w-auto truncate">
                                        <div className="flex items-center gap-1.5">
                                            <img src={userPosition.avatar} alt={userPosition.name} className="w-5 h-5 rounded-full border-2 border-padel-500 shrink-0" />
                                            <span className="text-white font-bold text-[10px] truncate">Tú</span>
                                        </div>
                                    </td>
                                    <td className="py-2 px-1 text-center w-12">
                                        {userPosition.representedClub ? (
                                            <div className="flex items-center justify-center gap-1 bg-dark-900 px-1 py-0.5 rounded border border-dark-700 w-max mx-auto">
                                                <img src={userPosition.representedClub.image} alt={userPosition.representedClub.name} className="w-3 h-3 rounded-full object-cover shrink-0" />
                                                <span className="text-[8px] text-gray-300 font-medium truncate max-w-[24px]">{userPosition.representedClub.name.substring(0,3)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-600">-</span>
                                        )}
                                    </td>
                                    <td className="py-2 px-1 text-center text-white text-[10px] w-6">{userPosition.matchesWon}</td>
                                    <td className="py-2 px-1 text-center text-white text-[10px] w-8">{userPosition.winRate.replace('.0', '')}</td>
                                    <td className="py-2 px-1 text-center text-white text-[10px] w-6">
                                        {userPosition.tournamentsWon > 0 ? (
                                            <span className="text-amber-400 font-bold">{userPosition.tournamentsWon}</span>
                                        ) : (
                                            <span className="text-gray-600">-</span>
                                        )}
                                    </td>
                                    <td className="py-2 px-1 text-right text-padel-300 text-[10px] w-8">{userPosition.points}</td>
                                    <td className="py-2 px-1 text-right text-padel-400 font-black text-[10px] w-8">{userPosition.rating}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NationalRankingBackendView: React.FC<{
    currentUser: User;
    rankingRows: ReturnType<typeof mapRankingRows>;
    rankingPosition: number | null;
    onClose: () => void;
}> = ({ currentUser, rankingRows, rankingPosition, onClose }) => {
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
                                    {MOCK_CLUBS.map(club => (
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

const ClubRankingsView: React.FC<{ currentUser: User, onClose: () => void }> = ({ currentUser, onClose }) => {
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
                {MOCK_CLUB_RANKINGS.map((clubData) => {
                    const club = MOCK_CLUBS.find(c => c.id === clubData.clubId);
                    if (!club) return null;

                    const data = rankingType === 'competitive' ? clubData.competitive : clubData.social;
                    const title = rankingType === 'competitive' ? "Mejores Jugadores" : "Jugadores Elite";
                    const subtitle = rankingType === 'competitive' ? "Ordenado por Rating (Mayor es mejor)" : "Ordenado por partidos jugados";
                    const primaryColor = rankingType === 'competitive' ? 'text-amber-400' : 'text-padel-400';
                    
                    // Filter Logic
                    const filteredList = data.topList.filter(entry => {
                        if (rankingType !== 'competitive' || selectedCategory === 'Todas') return true;
                        const rating = parseFloat(entry.primaryValue);
                        return getCategory(rating) === selectedCategory;
                    });
                    
                    // User Row visibility Logic
                    const isUserInSelectedCategory = selectedCategory === 'Todas' || selectedCategory === userCategory;
                    const shouldShowUserRow = rankingType === 'social' || isUserInSelectedCategory;

                    return (
                        <div key={clubData.clubId} className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden relative">
                             {/* Club Header */}
                             <div className="h-20 relative">
                                <img src={club.image} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/50 to-transparent"></div>
                                <div className="absolute bottom-2 left-3">
                                    <h3 className="text-white font-bold text-lg">{club.name}</h3>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{clubData.matchesPlayedByUser} partidos jugados aquí</p>
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
                                                        entry.rank === 1 ? 'bg-yellow-500 text-dark-900' :
                                                        entry.rank === 2 ? 'bg-gray-400 text-dark-900' :
                                                        entry.rank === 3 ? 'bg-orange-700 text-white' :
                                                        'bg-dark-600 text-gray-400'
                                                    }`}>
                                                        {entry.rank}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <img src={entry.avatar} className="w-8 h-8 rounded-full object-cover" />
                                                        <div className="flex flex-col">
                                                            <span className="text-gray-200 text-sm font-medium leading-none">{entry.name}</span>
                                                            {rankingType === 'competitive' && (
                                                                <span className="text-[9px] text-gray-500 font-medium mt-1">
                                                                    {getCategory(parseFloat(entry.primaryValue))}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-white font-bold text-sm block leading-none mb-0.5 ${rankingType === 'competitive' ? 'font-mono' : ''}`}>{entry.primaryValue}</span>
                                                    <span className="text-[9px] font-normal text-gray-500">{entry.secondaryValue}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 text-xs italic">No hay jugadores destacados en esta categoría.</p>
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
                                                {data.userRank}
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
                                            <span className={`block font-bold text-lg leading-none ${primaryColor} ${rankingType === 'competitive' ? 'font-mono' : ''}`}>{data.userPrimaryValue}</span>
                                            <span className="text-[9px] text-gray-500 uppercase font-bold">{data.label}</span>
                                        </div>
                                    </div>
                                ) : (
                                     <div className="p-3 text-center border border-dashed border-dark-700 rounded-xl bg-dark-800/50">
                                        <p className="text-gray-500 text-xs">No clasificas en Categoría {selectedCategory}</p>
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

const TopPartnersView: React.FC<{ currentUser: User, onClose: () => void }> = ({ currentUser, onClose }) => {
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
                        Mejores Compañeros <Handshake size={18} className="text-amber-500" />
                    </h2>
                    <p className="text-gray-400 text-xs">Con quiénes ganas más partidos</p>
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

                {MOCK_TOP_PARTNERS.map((partner, index) => {
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
                        <div key={partner.id} className={`flex items-center p-3 rounded-2xl border ${borderColor} relative overflow-hidden group`}>
                             {/* Rank */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-lg ${rankColor}`}>
                                {rank <= 3 && <Crown size={12} className="absolute -top-1 -right-1" />}
                                {rank}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 flex items-center gap-3 pl-4">
                                <img src={partner.avatar} className="w-10 h-10 rounded-full object-cover border border-dark-600" />
                                <div>
                                    <span className="text-white font-bold text-sm block">{partner.name}</span>
                                    {rank === 1 && <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wide">Mejor Duo</span>}
                                </div>
                            </div>

                            {/* Wins */}
                            <div className="w-20 text-center">
                                <span className="block text-white font-bold text-base">{partner.matchesWon}</span>
                                <span className="text-[9px] text-gray-500 uppercase font-bold">Partidos</span>
                            </div>

                            {/* Rating */}
                            <div className="w-20 text-right">
                                <span className="block text-green-400 font-bold text-base">+{partner.ratingGained.toFixed(2)}</span>
                                <span className="text-[9px] text-gray-500 uppercase font-bold">Rating</span>
                            </div>
                        </div>
                    );
                })}

                {MOCK_TOP_PARTNERS.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-500 text-sm">Aún no has jugado suficientes partidos con compañeros fijos.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TopRivalsView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
                    <p className="text-gray-400 text-xs">Contra quiénes has perdido más veces</p>
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

                {MOCK_TOP_RIVALS.map((rival, index) => {
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
                        <div key={rival.id} className={`flex items-center p-3 rounded-2xl border ${borderColor} relative overflow-hidden group`}>
                             {/* Rank */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-lg ${rankColor}`}>
                                {rank <= 3 && <Crown size={12} className="absolute -top-1 -right-1" />}
                                {rank}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 flex items-center gap-3 pl-4">
                                <img src={rival.avatar} className="w-10 h-10 rounded-full object-cover border border-dark-600" />
                                <div>
                                    <span className="text-white font-bold text-sm block">{rival.name}</span>
                                    {rank === 1 && <span className="text-[9px] text-red-500 font-bold uppercase tracking-wide">Bestia Negra</span>}
                                </div>
                            </div>

                            {/* Losses */}
                            <div className="w-20 text-center">
                                <span className="block text-white font-bold text-base">{rival.matchesLost}</span>
                                <span className="text-[9px] text-gray-500 uppercase font-bold">Derrotas</span>
                            </div>

                            {/* Rating Lost */}
                            <div className="w-20 text-right">
                                <span className="block text-red-400 font-bold text-base">-{rival.ratingLost.toFixed(2)}</span>
                                <span className="text-[9px] text-gray-500 uppercase font-bold">Rating</span>
                            </div>
                        </div>
                    );
                })}

                {MOCK_TOP_RIVALS.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-500 text-sm">Aún no has jugado suficientes partidos.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const PlayView: React.FC<ViewProps> = ({ currentUser, rankingPosition, myMatchesByScope, navigateTo, onOpenCoaches, agenda = [], matches = [], tournaments = [], onJoin, onRequest, onLeaveMatch, onCancelMatch, onSubmitResult, onConfirmResult, onRejectResult, onUserClick, onLaunchTournament, onOpenTournamentStatus, onAddTeamsToTournament, onAddResult, onArchiveTournament }) => {
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
    
    const backendTournamentPendingResultMatches = matches.filter(match => {
        if (match.matchSource !== 'backend-tournament') return false;
        if (match.status !== 'awaiting_result' && match.status !== 'awaiting_validation') return false;
        if (match.isAmericanoDinamico) return false;
        return isTournamentParticipant(match, currentUser);
    });

    const pendingResultMatches = mergeUniqueMatches(
        myMatchesByScope?.pendingResult ?? [],
        backendTournamentPendingResultMatches,
    );
    
    // Filter agenda items that are NOT matches (classes, tournaments)
    const otherEvents = agenda.filter(item => item.type !== 'match');

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
                <div className="bg-dark-800 p-2 rounded-full border border-dark-700 relative mt-1 shrink-0">
                     <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-dark-900"></span>
                    <Settings size={20} className="text-gray-400" />
                </div>
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
                            const isLigaMatch = matchData?.isTournamentMatch && tournaments.find(t => t.id === matchData.tournamentId)?.format === 'league';
                            const canAddResult = isLigaMatch && pendingResultMatches.some(m => m.id === matchData?.id);
                            
                            return (
                            <div key={item.id} className="snap-center">
                                {isMatch && matchData ? (
                                    <div className="min-w-[85vw] sm:min-w-[340px]">
                                        <MatchCard 
                                            match={matchData} 
                                            currentUser={currentUser} 
                                            clubName={matchData.clubName || MOCK_CLUBS.find(c => c.id === matchData.clubId)?.name || 'Unknown Club'}
                                            onJoin={onJoin}
                                            onRequest={onRequest}
                                            onLeave={onLeaveMatch}
                                            onCancel={onCancelMatch}
                                            onUserClick={onUserClick}
                                            onAddResult={canAddResult ? () => onAddResult && onAddResult(matchData) : undefined}
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

const MatchesView: React.FC<ViewProps> = ({ currentUser, matches = [], onJoin, onRequest, onLeaveMatch, onCancelMatch, onUserClick }) => {
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
                            clubName={match.clubName || MOCK_CLUBS.find(c => c.id === match.clubId)?.name || 'Unknown Club'}
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
                            clubName={match.clubName || MOCK_CLUBS.find(c => c.id === match.clubId)?.name || 'Unknown Club'}
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
    // ... (No changes here, keeping existing code)
    const TOURNAMENTS = [
        {
            id: 't1',
            title: 'Copa Montevideo Open',
            date: '15-17 Nov',
            location: 'Carrasco Padel',
            prizes: '$50.000 Premios',
            participants: '32 Parejas',
            status: 'INSCRIPCIÓN ABIERTA',
            statusColor: 'bg-amber-500 text-dark-900',
            bg: 'from-dark-800 to-dark-900'
        },
        {
            id: 't2',
            title: 'Copa Montevideo 2027',
            date: '10-20 Dic 2027',
            location: 'World Padel Center',
            prizes: '$100.000 USD',
            participants: '64 Parejas',
            status: 'FUTURO',
            statusColor: 'bg-purple-500 text-white',
            bg: 'from-blue-900/40 to-dark-900'
        },
        {
            id: 't3',
            title: 'Master Final 2024',
            date: '01-03 Dic',
            location: 'Top Padel',
            prizes: 'Equipamiento Pro',
            participants: '16 Mejores',
            status: 'ÚLTIMOS CUPOS',
            statusColor: 'bg-red-500 text-white',
            bg: 'from-red-900/20 to-dark-900'
        }
    ];
    const hasLegacyTournamentMocks = TOURNAMENTS.length > 0;

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
                prizes: tournament.prizes || (tournament.isCompetitive === false ? 'Liga Recreativa' : 'Por los puntos'),
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

    const isCreator = (tournament: any) => tournament.creatorId === currentUser.id;

    const canJoinTournament = (tournament: any) =>
        Boolean(
            tournament.isBackendTournament
            && tournament.format === 'league'
            && !isCreator(tournament)
            && !isRegistered(tournament)
            && tournament.backendStatus === 'OPEN'
            && tournament.openEnrollment
        );

    const canLeaveTournament = (tournament: any) =>
        Boolean(
            tournament.isBackendTournament
            && tournament.format === 'league'
            && !isCreator(tournament)
            && isRegistered(tournament)
            && tournament.backendStatus === 'OPEN'
        );

    const canOpenTournamentDetails = (tournament: any) =>
        !tournament.isBackendTournament || isCreator(tournament) || isRegistered(tournament);

    const getPrimaryActionLabel = (tournament: any) => {
        if (canJoinTournament(tournament)) {
            return 'Unirme';
        }
        if (canLeaveTournament(tournament)) {
            return 'Salir';
        }
        return 'Ver Detalles';
    };

    const handlePrimaryAction = (tournament: any) => {
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
                        Has subido <span className="text-white font-bold">+35 puntos</span> este mes
                    </p>
                </div>
            </div>

            {/* Create Tournament CTA - Premium Feature */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 via-dark-800 to-dark-800 p-1 mb-6 group">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-colors"></div>

                <div className="relative bg-dark-900/40 backdrop-blur-sm rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Icon Box */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                        <Crown size={24} className="text-white" fill="currentColor" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-bold text-base">Crea tu propio Torneo</h3>
                            <span className="bg-amber-500 text-dark-900 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                                PRO
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-3 sm:mb-0">
                            Organiza tu propio torneo, fija tus reglas, premios y diviértete con tus amigos.
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
                <a href="#" className="text-padel-400 text-sm">Ver todos</a>
            </div>

            <div className="space-y-4">
                {visibleTournaments.length === 0 && (
                    <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                        <h3 className="text-white font-bold text-base mb-1">Aun no hay ligas activas</h3>
                        <p className="text-gray-400 text-sm">
                            {hasLegacyTournamentMocks
                                ? 'La vista ya no usa el listado estatico. Cuando haya ligas reales, apareceran aqui desde el backend.'
                                : 'Cuando haya torneos de liga disponibles, apareceran aqui con su estado real desde el backend.'}
                        </p>
                    </div>
                )}

                {visibleTournaments.map(tournament => {
                    const theme = getTournamentTheme(tournament);
                    const currentTeams = Array.isArray(tournament.teams) ? tournament.teams.length : 0;
                    const expectedTeams = tournament.numTeams || currentTeams;
                    const competitionLabel = tournament.isCompetitive === false ? 'Liga Recreativa' : 'Por los puntos';
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

const ClubsView: React.FC<ViewProps> = ({ currentUser, clubs = MOCK_CLUBS, onBook }) => {
    // ... (No changes here, keeping existing code)
    const [selectedClub, setSelectedClub] = useState<Club | null>(null);
    const [bookingStep, setBookingStep] = useState<'time' | 'config'>('time');
    const [selectedDate, setSelectedDate] = useState<string>('Hoy');
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    
    // Booking Configuration State
    const [matchType, setMatchType] = useState<MatchType>(MatchType.COMPETITIVE);
    const [isPrivate, setIsPrivate] = useState<boolean>(false);
    const [levelRange, setLevelRange] = useState<[number, number]>([currentUser.level - 0.5, currentUser.level + 0.5]);
    const [payFullCourt, setPayFullCourt] = useState<boolean>(false);
    const [position, setPosition] = useState<'drive' | 'reves'>('reves');
    const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
    const [selectedCourt, setSelectedCourt] = useState<number>(1);

    const DATES = ['Hoy', 'Mañana', 'Jue 16', 'Vie 17', 'Sab 18'];
    const TIME_SLOTS = [
        { time: '17:00', courts: 2 },
        { time: '18:30', courts: 0 }, // Full
        { time: '20:00', courts: 4 },
        { time: '21:30', courts: 1 },
        { time: '23:00', courts: 8 }
    ];

    const handleBookClick = (club: Club) => {
        setSelectedClub(club);
        setBookingStep('time');
        setSelectedTime(null);
        setSelectedCourt(1);
    };

    const handleTimeSelect = (time: string, available: number) => {
        if (available === 0) return;
        setSelectedTime(time);
        setTimeout(() => setBookingStep('config'), 200);
    };

    const handleConfirmBooking = () => {
        if (!selectedClub || !selectedTime) return;

        const players: (User | null)[] = [currentUser, null, null, null];
        invitedFriends.forEach((friendId, idx) => {
             const friend = MOCK_FRIENDS.find(f => f.id === friendId);
             if (friend && idx < 3) {
                 players[idx + 1] = { 
                     ...friend, 
                     matchesPlayed: 20, 
                     reputation: 90, 
                     clubAffiliation: 'c1',
                     isPremium: false 
                 } as unknown as User;
             }
        });

        const newMatch: Match = {
            id: `m-${Date.now()}`,
            clubId: selectedClub.id,
            clubName: selectedClub.name,
            backendClubId: getBackendClubId(selectedClub.id),
            courtName: `Cancha ${selectedCourt}`,
            date: new Date().toISOString(),
            time: selectedTime,
            duration: 90,
            type: matchType,
            pricePerPlayer: payFullCourt ? 1800 : 450,
            currency: 'UYU',
            players: players,
            maxPlayers: 4,
            levelRange: levelRange,
            isPrivate: isPrivate,
            status: 'open',
            pendingPlayerIds: [],
            rejectedPlayerIds: [],
            approvedGuestIds: []
        };

        if (onBook) onBook(newMatch);
        setSelectedClub(null);
    };

    const toggleFriend = (id: string) => {
        if (invitedFriends.includes(id)) {
            setInvitedFriends(prev => prev.filter(fid => fid !== id));
        } else {
            if (invitedFriends.length < 3) {
                setInvitedFriends(prev => [...prev, id]);
            }
        }
    };

    if (selectedClub) {
        return (
            <div className="fixed inset-0 bg-dark-900 z-[100] flex flex-col animate-fade-in">
                {/* Header */}
                <div className="px-3 py-3 flex items-center gap-3 bg-dark-800 border-b border-dark-700 shrink-0">
                    <button onClick={() => bookingStep === 'config' ? setBookingStep('time') : setSelectedClub(null)} className="p-2 rounded-full hover:bg-dark-700 transition-colors">
                        <ArrowLeft size={18} className="text-gray-200" />
                    </button>
                    <div>
                        <h2 className="text-white font-bold text-base leading-tight">{selectedClub.name}</h2>
                        <p className="text-gray-400 text-[10px] flex items-center gap-1">
                            <MapPin size={10} /> {selectedClub.location}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {bookingStep === 'time' ? (
                        <div className="p-3 space-y-5">
                            {/* Date Selector */}
                            <div>
                                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">Selecciona Fecha</h3>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {DATES.map(date => (
                                        <button 
                                            key={date}
                                            onClick={() => setSelectedDate(date)}
                                            className={`min-w-[60px] p-2 rounded-xl flex flex-col items-center gap-0.5 border transition-all ${
                                                selectedDate === date 
                                                ? 'bg-padel-600 border-padel-500 text-white shadow-lg' 
                                                : 'bg-dark-800 border-dark-700 text-gray-400'
                                            }`}
                                        >
                                            <span className="text-[10px] font-medium">{date.split(' ')[0]}</span>
                                            <span className="text-base font-bold">{date.split(' ')[1] || new Date().getDate()}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time Grid - More Compact (3 Cols) */}
                            <div>
                                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">Horarios (90 min)</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {TIME_SLOTS.map(slot => (
                                        <button 
                                            key={slot.time}
                                            disabled={slot.courts === 0}
                                            onClick={() => handleTimeSelect(slot.time, slot.courts)}
                                            className={`p-2 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                                slot.courts === 0 
                                                ? 'bg-dark-800/40 border-dark-800 text-gray-600 cursor-not-allowed opacity-50' 
                                                : selectedTime === slot.time
                                                    ? 'bg-padel-600/20 border-padel-500 text-padel-400'
                                                    : 'bg-dark-800 border-dark-700 text-white active:bg-dark-700'
                                            }`}
                                        >
                                            <span className="text-lg font-bold font-mono leading-none">{slot.time}</span>
                                            <div className="flex items-center gap-1">
                                                <div className={`w-1.5 h-1.5 rounded-full ${slot.courts === 0 ? 'bg-red-500' : slot.courts < 3 ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                                                <span className="text-[9px] font-medium text-gray-400">
                                                    {slot.courts === 0 ? 'Agotado' : `${slot.courts} Libres`}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 pb-32 space-y-3 relative">
                            {/* Summary Header */}
                            <div className="bg-dark-800 p-2.5 rounded-xl border border-dark-700 flex justify-between items-center sticky top-0 z-10 shadow-lg">
                                <div>
                                    <p className="text-gray-400 text-[9px] uppercase font-bold">Reserva</p>
                                    <p className="text-white font-bold text-sm">{selectedDate} • {selectedTime}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-[9px] uppercase font-bold">Duración</p>
                                    <p className="text-white font-bold text-sm">1:30 hs</p>
                                </div>
                            </div>

                            {/* 1. Type */}
                            <div>
                                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Tipo de Partido</label>
                                <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700">
                                    <button 
                                        onClick={() => setMatchType(MatchType.COMPETITIVE)}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${matchType === MatchType.COMPETITIVE ? 'bg-amber-500 text-dark-900 shadow' : 'text-gray-400'}`}
                                    >
                                        <Trophy size={12} /> Por Puntos
                                    </button>
                                    <button 
                                        onClick={() => setMatchType(MatchType.FRIENDLY)}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${matchType === MatchType.FRIENDLY ? 'bg-blue-500 text-white shadow' : 'text-gray-400'}`}
                                    >
                                        <Zap size={12} /> Recreativo
                                    </button>
                                </div>
                            </div>

                            {/* 2. Privacy */}
                            <div>
                                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Privacidad</label>
                                <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700">
                                    <button 
                                        onClick={() => setIsPrivate(false)}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${!isPrivate ? 'bg-padel-600 text-white shadow' : 'text-gray-400'}`}
                                    >
                                        <Grid size={12} /> Abierto
                                    </button>
                                    <button 
                                        onClick={() => setIsPrivate(true)}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${isPrivate ? 'bg-dark-600 text-white shadow' : 'text-gray-400'}`}
                                    >
                                        <Lock size={12} /> Privado
                                    </button>
                                </div>
                            </div>

                            {/* 3. Level */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Nivel Admitido</label>
                                    <span className="text-padel-400 text-[10px] font-bold">{levelRange[0].toFixed(1)} - {levelRange[1].toFixed(1)}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" max="7" step="0.5"
                                    value={levelRange[1]}
                                    onChange={(e) => setLevelRange([parseFloat(e.target.value) - 1.0, parseFloat(e.target.value)])}
                                    className="w-full h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-padel-500 block my-2"
                                />
                            </div>

                            {/* 6. Position */}
                            <div>
                                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Tu Posición</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setPosition('reves')}
                                        className={`flex-1 h-9 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all ${position === 'reves' ? 'border-padel-500 bg-padel-500/10 text-white' : 'border-dark-700 text-gray-500'}`}
                                    >
                                        Revés (Izq)
                                    </button>
                                    <button 
                                        onClick={() => setPosition('drive')}
                                        className={`flex-1 h-9 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all ${position === 'drive' ? 'border-padel-500 bg-padel-500/10 text-white' : 'border-dark-700 text-gray-500'}`}
                                    >
                                        Drive (Der)
                                    </button>
                                </div>
                            </div>

                             {/* 5. Guests / Recommendations */}
                             <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Invitar Jugadores</label>
                                    <button className="text-padel-400 text-[10px] flex items-center gap-1"><UserPlus size={10}/> Buscar</button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
                                    {MOCK_FRIENDS.map(friend => {
                                        const isSelected = invitedFriends.includes(friend.id);
                                        return (
                                            <button 
                                                key={friend.id}
                                                onClick={() => toggleFriend(friend.id)}
                                                className={`min-w-[64px] p-1.5 rounded-xl border transition-all relative ${isSelected ? 'bg-padel-500/20 border-padel-500' : 'bg-dark-800 border-dark-700'}`}
                                            >
                                                {isSelected && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-padel-500 rounded-full border border-dark-900 z-10"></div>}
                                                {friend.frequent && <span className="absolute top-0 left-0 bg-amber-500 text-dark-900 text-[7px] px-1 rounded-br font-bold">TOP</span>}
                                                
                                                <div className="flex flex-col items-center gap-1">
                                                    <img src={friend.avatar} className={`w-8 h-8 rounded-full object-cover ${isSelected ? 'ring-2 ring-padel-500' : 'opacity-80'}`} />
                                                    <span className={`text-[9px] font-bold leading-tight truncate w-full text-center ${isSelected ? 'text-white' : 'text-gray-400'}`}>{friend.name.split(' ')[0]}</span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* 7. Court Selection */}
                            <div>
                                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Seleccionar Cancha</label>
                                <div className="relative">
                                    <select 
                                        value={selectedCourt}
                                        onChange={(e) => setSelectedCourt(Number(e.target.value))}
                                        className="w-full bg-dark-800 border border-dark-700 text-white text-sm rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:border-padel-500"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                            <option key={num} value={num}>Cancha {num}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* 4. Payment */}
                            <div className="bg-dark-800 rounded-xl p-2.5 border border-dark-700">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Wallet size={14} className="text-gray-400"/>
                                        <span className="text-xs font-bold text-white">Pago</span>
                                    </div>
                                    <span className="text-base font-bold text-white font-mono">$ {payFullCourt ? 1800 : 450}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setPayFullCourt(false)}
                                        className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors ${!payFullCourt ? 'bg-white text-dark-900 border-white' : 'border-dark-600 text-gray-400'}`}
                                    >
                                        Mi Parte
                                    </button>
                                    <button 
                                        onClick={() => setPayFullCourt(true)}
                                        className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors ${payFullCourt ? 'bg-white text-dark-900 border-white' : 'border-dark-600 text-gray-400'}`}
                                    >
                                        Completo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Footer for Config Step */}
                {bookingStep === 'config' && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 pb-safe bg-dark-900/95 backdrop-blur-md border-t border-dark-700 z-20">
                         <Button fullWidth size="md" onClick={handleConfirmBooking} className="font-bold shadow-xl shadow-padel-500/20">
                            Confirmar Reserva
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
         <div className="pb-24 pt-4 px-4">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white">Reservas</h1>
                <div className="mt-2 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o zona..." 
                        className="w-full bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-colors placeholder:text-dark-700"
                    />
                </div>
            </header>

            <div className="space-y-4">
                {clubs.length === 0 && (
                    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-4">
                        <h3 className="text-white font-bold text-base mb-1">No hay clubes disponibles</h3>
                        <p className="text-gray-400 text-sm">
                            Cuando el backend tenga clubes cargados, apareceran aqui para reservar.
                        </p>
                    </div>
                )}

                {clubs.map(club => (
                    <div key={club.id} className="bg-dark-800 rounded-2xl overflow-hidden border border-dark-700 group relative">
                         {/* Favorite Indicator for Top Padel */}
                        {club.id === 'c1' && (
                            <div className="absolute top-2 right-2 z-10 bg-white/20 backdrop-blur-md p-1.5 rounded-full text-red-500 shadow-lg">
                                 <Heart size={14} fill="currentColor" />
                            </div>
                        )}

                        <div className="h-28 bg-gray-700 relative">
                            <img src={club.image} alt={club.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            {club.isPremium && (
                                <div className="absolute top-2 left-2 bg-dark-900/80 backdrop-blur-sm text-padel-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                    <Star size={8} fill="currentColor" /> PREMIUM
                                </div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-white text-dark-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {club.rating} ★
                            </div>
                        </div>
                        <div className="p-3">
                            <h3 className="text-white font-bold text-base mb-0.5">{club.name}</h3>
                            <p className="text-gray-400 text-xs flex items-center gap-1 mb-2.5">
                                <MapPin size={12} /> {club.location}
                            </p>
                            <div className="flex gap-2">
                                <Button size="sm" fullWidth onClick={() => handleBookClick(club)} className="text-xs py-2">Reservar</Button>
                                <Button variant="secondary" size="sm" className="px-3 py-2">
                                    <ChevronRight size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
         </div>
    )
}

const ProfileView: React.FC<ViewProps> = ({ currentUser, rankingPosition, ratingHistory = [], matches = [], onOpenClubRankings, onOpenTopPartners, onOpenTopRivals, onPremiumFeatureAttempt, onUserClick, onOpenNationalRanking }) => {
    // State for Filter
    const [timeRange, setTimeRange] = useState<'LAST_10' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('LAST_10');

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
        if (range === 'LAST_10') {
            setTimeRange(range);
            return;
        }
        
        if (currentUser.isPremium) {
            setTimeRange(range);
        } else {
            // Trigger Notification via callback or simple alert for now
            if (onPremiumFeatureAttempt) onPremiumFeatureAttempt('Filtros de Historial');
        }
    };

    const filters = [
        { label: '10P', value: 'LAST_10', premium: false },
        { label: '1M', value: '1M', premium: true },
        { label: '3M', value: '3M', premium: true },
        { label: '6M', value: '6M', premium: true },
        { label: '1A', value: '1Y', premium: true },
        { label: 'TODO', value: 'ALL', premium: true },
    ];

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
                    {currentUser.isPremium && (
                         <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-amber-600 text-dark-900 p-1.5 rounded-full border-2 border-dark-900 shadow-lg">
                            <Crown size={12} fill="currentColor" />
                        </div>
                    )}
                </div>
                <h1 className="text-xl font-bold text-white mt-3 flex items-center gap-2">
                    {currentUser.name} 
                    {currentUser.isPremium && <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Pro</span>}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-gray-400 text-sm">Nivel <span className="text-white font-bold">{currentUser.level.toFixed(2)}</span> • Categoría {currentUser.categoryName || 'Sexta'}</p>
                    {currentUser.verificationStatus === 'verified' ? (
                        <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                            <BadgeCheck size={10} /> Verificado
                        </div>
                    ) : currentUser.verificationStatus === 'pending' ? (
                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            <Clock size={10} /> Pendiente
                        </div>
                    ) : null}
                </div>
                <div className="flex gap-1 mt-1">
                    {[1,2,3,4,5].map(s => <Star key={s} size={12} className="text-amber-400" fill="currentColor" />)}
                </div>
            </div>

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
                         const isLocked = f.premium && !currentUser.isPremium;
                         return (
                            <button
                                key={f.value}
                                onClick={() => handleFilterChange(f.value as any)}
                                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                                    isActive 
                                    ? 'bg-padel-600 text-white shadow-md' 
                                    : isLocked 
                                        ? 'text-gray-600 cursor-not-allowed' 
                                        : 'text-gray-400 hover:text-white hover:bg-dark-700'
                                }`}
                            >
                                {f.label}
                                {isLocked && <Lock size={8} className="text-amber-500" />}
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

            {/* Premium Stats Grid */}
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
                    <p className="text-white font-bold text-sm mt-1 truncate">Top Padel</p>
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
                        <img src="https://picsum.photos/100/100?r=2" className="w-5 h-5 rounded-full border border-amber-500/30" />
                        <span className="text-white font-bold text-sm truncate">Martin</span>
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
                    <p className="text-white font-bold text-sm mt-1 truncate text-red-400">Juan B.</p>
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
                <button className="w-full bg-dark-800 p-4 rounded-xl flex justify-between items-center text-gray-200 hover:bg-dark-700 transition-colors">
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
  const [agenda, setAgenda] = useState<AgendaItem[]>(INITIAL_AGENDA);
  const [notification, setNotification] = useState<string | null>(null);
  const [showClubRankings, setShowClubRankings] = useState(false);
  const [showNationalRanking, setShowNationalRanking] = useState(false);
  const [showTopPartners, setShowTopPartners] = useState(false);
  const [showTopRivals, setShowTopRivals] = useState(false);
  const [showCoaches, setShowCoaches] = useState(false);
  const [showClubUsers, setShowClubUsers] = useState(false);
  const [showClubAgenda, setShowClubAgenda] = useState(false);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [tournamentToLaunch, setTournamentToLaunch] = useState<any | null>(null);
  const [tournamentToEdit, setTournamentToEdit] = useState<any | null>(null);
  const [selectedTournamentStatus, setSelectedTournamentStatus] = useState<any | null>(null);
  const [selectedMatchForResult, setSelectedMatchForResult] = useState<Match | null>(null);
  const [clubCatalog, setClubCatalog] = useState<Club[] | null>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [leagueTournamentCatalog, setLeagueTournamentCatalog] = useState<any[]>([]);
  const [selectedPublicUser, setSelectedPublicUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState('demo@sentimospadel.uy');
  const [authPassword, setAuthPassword] = useState('password');
  const [authLoading, setAuthLoading] = useState(false);
  const [rankingEntries, setRankingEntries] = useState<Awaited<ReturnType<typeof backendApi.getRankings>>>([]);
  const [myRatingHistory, setMyRatingHistory] = useState<Awaited<ReturnType<typeof backendApi.getMyRatingHistory>>>([]);
  const [myMatchesByScope, setMyMatchesByScope] = useState<ScopedMyMatches>(EMPTY_SCOPED_MY_MATCHES);
  const [tournamentSelectablePlayers, setTournamentSelectablePlayers] = useState<User[]>([]);
  const [tournamentClubOptions, setTournamentClubOptions] = useState<Club[]>(MOCK_CLUBS);
  const [postMatchResult, setPostMatchResult] = useState<{ oldRating: number, newRating: number, delta: number } | null>(null);

  const hasStoredToken = () => {
    if (typeof window === 'undefined') {
      return false;
    }

    return Boolean(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
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
      () => [] as Awaited<ReturnType<typeof backendApi.getClubs>>,
    );
    const myMatchesRequest = user.backendPlayerProfileId
      ? backendApi.getMyMatches()
      : Promise.resolve([] as Awaited<ReturnType<typeof backendApi.getMyMatches>>);
    const scopeRequests = user.backendPlayerProfileId
      ? Promise.all([
          backendApi.getMyMatches('upcoming').catch(() => [] as Awaited<ReturnType<typeof backendApi.getMyMatches>>),
          backendApi.getMyMatches('completed').catch(() => [] as Awaited<ReturnType<typeof backendApi.getMyMatches>>),
          backendApi.getMyMatches('cancelled').catch(() => [] as Awaited<ReturnType<typeof backendApi.getMyMatches>>),
          backendApi.getMyMatches('pending_result').catch(() => [] as Awaited<ReturnType<typeof backendApi.getMyMatches>>),
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
        () => [] as Awaited<ReturnType<typeof backendApi.getClubs>>,
      ),
      backendApi.getPlayerProfiles().catch(
        () => [] as Awaited<ReturnType<typeof backendApi.getPlayerProfiles>>,
      ),
      backendApi.getTournaments().catch(
        () => [] as Awaited<ReturnType<typeof backendApi.getTournaments>>,
      ),
    ]);

    setClubCatalog(buildTournamentClubOptions(clubs));
    setTournamentClubOptions(buildTournamentClubOptions(clubs));
    setTournamentSelectablePlayers(buildTournamentSelectablePlayers(playerProfiles, user));

    const clubLookup = buildClubLookup(clubs);
    const leagueTournaments = tournamentResponses.filter(tournament => tournament.format === 'LEAGUE');
    const isRelevantLeagueTournament = (
      tournament: Awaited<ReturnType<typeof backendApi.getTournaments>>[number],
    ) =>
      tournament.createdByPlayerProfileId === user.backendPlayerProfileId
      || tournament.entries.some(entry =>
        entry.members.some(member => member.playerProfileId === user.backendPlayerProfileId),
      );

    const backendTournamentSnapshots = await Promise.all(
      leagueTournaments.map(async tournament => {
        const shouldLoadOperationalData = tournament.generatedMatchesCount > 0
          || tournament.status === 'IN_PROGRESS'
          || tournament.status === 'COMPLETED';

        const [tournamentMatches, standings] = await Promise.all([
          shouldLoadOperationalData
            ? backendApi.getTournamentMatches(tournament.id).catch(
                () => [] as Awaited<ReturnType<typeof backendApi.getTournamentMatches>>,
              )
            : Promise.resolve([] as Awaited<ReturnType<typeof backendApi.getTournamentMatches>>),
          shouldLoadOperationalData
            ? backendApi.getTournamentStandings(tournament.id).catch(() => null)
            : Promise.resolve(null),
        ]);

        const frontendTournamentMatches = toFrontendTournamentMatches(
          tournament,
          tournamentMatches,
          user,
          clubLookup,
        );

        return {
          isRelevant: isRelevantLeagueTournament(tournament),
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
      ...prevTournaments.filter(tournament => !tournament.isBackendTournament),
    ]);

    replaceBackendTournamentMatches(
      backendTournamentSnapshots
        .filter(snapshot => snapshot.isRelevant)
        .flatMap(snapshot => snapshot.matches),
    );
  };

  const refreshRankingAndHistory = async (userOverride?: User) => {
    if (!hasStoredToken()) {
      return;
    }

    const user = userOverride ?? currentUser;
    const rankingsRequest = backendApi.getRankings().catch(
      () => [] as Awaited<ReturnType<typeof backendApi.getRankings>>,
    );
    const historyRequest = user.backendPlayerProfileId
      ? backendApi.getMyRatingHistory().catch(
          () => [] as Awaited<ReturnType<typeof backendApi.getMyRatingHistory>>,
        )
      : Promise.resolve([] as Awaited<ReturnType<typeof backendApi.getMyRatingHistory>>);

    const [nextRankings, nextHistory] = await Promise.all([rankingsRequest, historyRequest]);
    setRankingEntries(nextRankings);
    setMyRatingHistory(nextHistory);
  };

  const hydrateAuthenticatedUser = async (preferredName?: string | null) => {
    const authUser = await backendApi.getCurrentUser();

    let playerProfile = null;
    try {
      playerProfile = await backendApi.getMyPlayerProfile();
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }

    let onboarding = null;
    try {
      onboarding = await backendApi.getInitialSurvey();
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
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
    setShowOnboarding(!onboarding);
    setIsAuthenticated(Boolean(onboarding));

    return { authUser, playerProfile, onboarding, nextUser };
  };

  const completeRegistration = async (data: { name: string; email: string; password: string }) => {
    setAuthLoading(true);

    try {
      await backendApi.register({ email: data.email, password: data.password });
      const loginResponse = await backendApi.login({ email: data.email, password: data.password });

      storeAccessToken(loginResponse.accessToken);
      storeDisplayName(data.name);
      setTempName(data.name);
      setAuthPassword(data.password);
      setIsRegistering(false);

      await hydrateAuthenticatedUser(data.name);
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

    const form = event.currentTarget as HTMLFormElement;
    const inputs = Array.from(form.querySelectorAll('input'));
    const email = (inputs[0] as HTMLInputElement | undefined)?.value?.trim() || '';
    const password = (inputs[1] as HTMLInputElement | undefined)?.value || '';

    try {
      setAuthEmail(email);
      setAuthPassword(password);

      const loginResponse = await backendApi.login({ email, password });
      storeAccessToken(loginResponse.accessToken);
      await hydrateAuthenticatedUser();
    } catch (error) {
      clearAccessToken();
      showAuthError(error, 'No se pudo iniciar sesión.');
    } finally {
      setAuthLoading(false);
      setSessionChecked(true);
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
      if (!hasStoredToken() || !currentUser.backendUserId) {
        return;
      }

      try {
        await refreshBackendMatches(currentUser);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    };

    loadMatches();

    return () => {
      cancelled = true;
    };
  }, [currentUser.backendUserId, currentUser.backendPlayerProfileId]);

  useEffect(() => {
    let cancelled = false;

    const loadRankingHistory = async () => {
      if (!hasStoredToken() || !currentUser.backendUserId) {
        return;
      }

      try {
        await refreshRankingAndHistory(currentUser);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
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

    const loadTournaments = async () => {
      if (!hasStoredToken() || !currentUser.backendUserId) {
        return;
      }

      try {
        await refreshBackendTournaments(currentUser);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    };

    loadTournaments();

    return () => {
      cancelled = true;
    };
  }, [currentUser.backendUserId, currentUser.backendPlayerProfileId]);

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
      ...tournaments.filter(tournament => !tournament.isBackendTournament),
    ],
    [leagueTournamentCatalog, tournaments],
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
            <p className="text-gray-400 text-sm">Cargando sesión...</p>
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
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <h2 className="text-xl font-bold text-white mb-2">Bienvenido</h2>
                            <div className="relative group">
                                <Users className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
                                <input type="email" placeholder="Correo Electrónico" className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all" defaultValue="demo@sentimospadel.uy" />
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
                                <input type="password" placeholder="Contraseña" className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all" defaultValue="password" />
                            </div>
                            <Button type="submit" fullWidth disabled={authLoading} className="mt-2 font-bold text-lg shadow-xl shadow-padel-500/10 group relative overflow-hidden">
                                {authLoading ? 'Ingresando...' : 'Ingresar'}
                            </Button>
                        </form>
                    <div className="mt-6 pt-6 border-t border-white/5 text-center">
                      <p className="text-sm text-gray-400">
                        ¿No tienes cuenta? <button onClick={() => setIsRegistering(true)} className="text-white font-bold hover:underline">Regístrate gratis</button>
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
	        const clubName = localMatch.clubName || clubCatalog?.find(c => c.id === localMatch.clubId)?.name || MOCK_CLUBS.find(c => c.id === localMatch.clubId)?.name || 'Club';
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

              await backendApi.createMatch({
                  scheduledAt: combineFrontendMatchDateTime(newMatch),
                  clubId: backendClubId,
                  locationText: locationParts.length > 0 ? locationParts.join(' - ') : newMatch.courtName,
                  notes: newMatch.type === MatchType.FRIENDLY ? 'Recreativo' : 'Por los puntos',
              });

              await refreshBackendMatches();
              setNotification("Reserva confirmada con exito.");
              setTimeout(() => setNotification(null), 3000);
              setCurrentTab('play');
              return;
          } catch (error) {
              showMatchError(error, 'No se pudo crear el partido.');
              return;
          }
      }

      setMatches(prev => [...prev, newMatch]);
      setNotification("¡Reserva confirmada con éxito!");
      setTimeout(() => setNotification(null), 3000);
      setCurrentTab('play'); // Redirect to agenda
  };

  const handleLaunchTournament = async (config: any) => {
      if (!tournamentToLaunch) return;

      const backendTournamentId = getBackendTournamentId(tournamentToLaunch.id);
      if (backendTournamentId && tournamentToLaunch.format === 'league') {
          try {
              await backendApi.launchTournament(backendTournamentId, {
                  availableCourts: config.availableCourts ?? tournamentToLaunch.availableCourts ?? 1,
                  numberOfGroups: 1,
                  leagueRounds: 2,
                  courtNames: (config.courtNames || tournamentToLaunch.courtNames || []).filter((courtName: string) => courtName?.trim()),
              });
              await refreshBackendTournaments();
              setTournamentToLaunch(null);
              setNotification("¡Torneo lanzado con éxito!");
              setTimeout(() => setNotification(null), 3000);
          } catch (error) {
              showMatchError(error, 'No se pudo lanzar el torneo.');
          }
          return;
      }
      
      // Find user's team name
      let userTeamName = '';
      if (tournamentToLaunch.teams) {
          const userTeam = tournamentToLaunch.teams.find((t: any) => t.players.some((p: any) => p.id === currentUser.id));
          if (userTeam) {
              userTeamName = userTeam.teamName;
          }
      }

      const newMatches: Match[] = [];
      
      if (tournamentToLaunch.format === 'americano' && config.americanoType === 'dinamico') {
          // Dynamic Americano Match Generation
          const players = tournamentToLaunch.teams?.flatMap((t: any) => t.players) || [];
          const matchesPerParticipant = tournamentToLaunch.matchesPerParticipant || config.matchesPerParticipant || 3;
          
          if (players.length < 4) {
              console.error("Not enough players for Americano Dinámico");
              return;
          }

          const playerMatchCount = new Map<string, number>();
          const partnerHistory = new Map<string, Set<string>>();
          players.forEach((p: any) => {
              playerMatchCount.set(p.id, 0);
              partnerHistory.set(p.id, new Set());
          });

          let matchIndex = 0;
          while (Array.from(playerMatchCount.values()).some(count => count < matchesPerParticipant)) {
              // Priority sorting:
              // 1. Minimum matches played (those who still NEED matches)
              // 2. Minimum partner variety
              const sortedPlayers = [...players].sort((a, b) => {
                  const countA = playerMatchCount.get(a.id) || 0;
                  const countB = playerMatchCount.get(b.id) || 0;
                  
                  // Prioritize those who haven't reached the limit
                  const needsA = countA < matchesPerParticipant;
                  const needsB = countB < matchesPerParticipant;
                  if (needsA !== needsB) return needsA ? -1 : 1;
                  
                  if (countA !== countB) return countA - countB;
                  return (partnerHistory.get(a.id)?.size || 0) - (partnerHistory.get(b.id)?.size || 0);
              });

              const selectedForMatch: any[] = [];
              
              // Pick p1 (one who needs matches most)
              const p1 = sortedPlayers[0];
              selectedForMatch.push(p1);

              // Find p2 (partner for p1)
              // Prefer someone who needs matches AND hasn't partnered with p1
              let p2 = sortedPlayers.slice(1).find(p => 
                  (playerMatchCount.get(p.id) || 0) < matchesPerParticipant &&
                  !partnerHistory.get(p1.id)?.has(p.id)
              );
              
              // Fallback 1: Someone who needs matches (even if partnered before)
              if (!p2) {
                  p2 = sortedPlayers.slice(1).find(p => (playerMatchCount.get(p.id) || 0) < matchesPerParticipant);
              }
              
              // Fallback 2: Filler (someone who already finished but is needed to complete the 4)
              if (!p2) p2 = sortedPlayers[1];
              selectedForMatch.push(p2);

              // Find p3 and p4 (opponents)
              const remaining = sortedPlayers.filter(p => !selectedForMatch.find(s => s.id === p.id));
              
              // Pick p3
              const p3 = remaining[0];
              selectedForMatch.push(p3);
              
              // Pick p4
              let p4 = remaining.slice(1).find(p => 
                  (playerMatchCount.get(p.id) || 0) < matchesPerParticipant &&
                  !partnerHistory.get(p3.id)?.has(p.id)
              );
              
              if (!p4) {
                  p4 = remaining.slice(1).find(p => (playerMatchCount.get(p.id) || 0) < matchesPerParticipant);
              }
              
              if (!p4) p4 = remaining[1];
              selectedForMatch.push(p4);

              // Update counts
              selectedForMatch.forEach(p => playerMatchCount.set(p.id, (playerMatchCount.get(p.id) || 0) + 1));
              
              // Record partners
              partnerHistory.get(p1.id)?.add(p2.id);
              partnerHistory.get(p2.id)?.add(p1.id);
              partnerHistory.get(p3.id)?.add(p4.id);
              partnerHistory.get(p4.id)?.add(p3.id);

              newMatches.push({
                  id: `tm-dyn-${Date.now()}-${matchIndex}`,
                  clubId: tournamentToLaunch.clubId || 'c1',
                  courtName: tournamentToLaunch.courtNames?.[matchIndex % (tournamentToLaunch.availableCourts || 2)] || `Cancha ${1 + (matchIndex % (tournamentToLaunch.availableCourts || 2))}`,
                  date: tournamentToLaunch.startDate || new Date().toISOString(),
                  time: `${10 + Math.floor(matchIndex / 2)}:00`,
                  duration: 30,
                  type: MatchType.TOURNAMENT,
                  pricePerPlayer: 0,
                  currency: 'UYU',
                  players: selectedForMatch,
                  maxPlayers: 4,
                  levelRange: [1, 7],
                  isPrivate: true,
                  status: 'awaiting_result',
                  isTournamentMatch: true,
                  isAmericano: true,
                  isAmericanoDinamico: true,
                  tournamentId: tournamentToLaunch.id,
                  round: `Ronda ${Math.floor(matchIndex / (players.length / 4)) + 1}`,
                  team1Name: `${selectedForMatch[0].name.split(' ')[0]} & ${selectedForMatch[1].name.split(' ')[0]}`,
                  team2Name: `${selectedForMatch[2].name.split(' ')[0]} & ${selectedForMatch[3].name.split(' ')[0]}`,
                  result: []
              });
              matchIndex++;
          }
      } else if (config.generatedData) {
          const allMatches = [...(config.generatedData.groupMatches || []), ...(config.generatedData.playoffs || [])];
          allMatches.forEach((m: any) => {
              const team1Data = tournamentToLaunch.teams?.find((t: any) => t.teamName === m.team1);
              const team2Data = tournamentToLaunch.teams?.find((t: any) => t.teamName === m.team2);
              
              const players = [
                  team1Data?.players?.[0] || null,
                  team1Data?.players?.[1] || null,
                  team2Data?.players?.[0] || null,
                  team2Data?.players?.[1] || null,
              ];

              newMatches.push({
                  id: `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  clubId: tournamentToLaunch.clubId || 'c1',
                  courtName: m.courtNum ? (tournamentToLaunch.courtNames?.[m.courtNum - 1] || `Cancha ${m.courtNum}`) : `${tournamentToLaunch.name} - ${m.round || 'Torneo'}`,
                  date: m.isoDate || new Date().toISOString(),
                  time: m.time || 'A conf.',
                  duration: 60,
                  type: tournamentToLaunch.isCompetitive !== false ? MatchType.TOURNAMENT : MatchType.FRIENDLY,
                  pricePerPlayer: 0,
                  currency: 'UYU',
                  players: players,
                  maxPlayers: 4,
                  levelRange: [1, 7],
                  isPrivate: true,
                  status: 'awaiting_result',
                  isTournamentMatch: true,
                  isAmericano: tournamentToLaunch.format === 'americano',
                  tournamentId: tournamentToLaunch.id,
                  round: m.round,
                  team1Name: m.team1,
                  team2Name: m.team2
              });
          });
      }

      if (newMatches.length > 0) {
          setMatches(prev => [...newMatches, ...prev]);
      }

      setTournaments(prev => prev.map(t => {
          if (t.id === tournamentToLaunch.id) {
              return {
                  ...t,
                  status: 'En curso',
                  launchConfig: config
              };
          }
          return t;
      }));
      
      setTournamentToLaunch(null);
      setNotification("¡Torneo lanzado con éxito!");
      setTimeout(() => setNotification(null), 3000);
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
      if (tournamentData?.format === 'league' && hasStoredToken()) {
          try {
              await backendApi.createTournament(buildCreateLeagueTournamentRequest(tournamentData));
              await refreshBackendTournaments();
              setShowCreateTournament(false);
              setNotification("¡Torneo creado con éxito!");
              setTimeout(() => setNotification(null), 3000);
          } catch (error) {
              showMatchError(error, 'No se pudo crear el torneo.');
          }
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

	      try {
	          await backendApi.joinTournament(backendTournamentId);
	          await refreshBackendTournaments();
	          setNotification('Ya quedaste inscripto en la liga.');
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
	          setNotification('Saliste de la liga correctamente.');
	          setTimeout(() => setNotification(null), 3000);
	      } catch (error) {
	          showMatchError(error, 'No se pudo salir del torneo.');
	      }
	  };
	
	  const handleRequestAccess = async (matchId: string) => {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      if (isBackendManagedMatch(match) && match.backendMatchId) {
          try {
              await backendApi.joinMatch(match.backendMatchId);
              await refreshBackendMatches();
              setNotification("Â¡Te has unido al partido!");
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
      setSelectedMatchForResult(match);
  };

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

  const handlePremiumAttempt = (feature: string) => {
      setNotification(`🔒 ${feature} es una función Premium.`);
      setTimeout(() => setNotification(null), 3000);
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
         
         {showClubRankings && <ClubRankingsView currentUser={currentUser} onClose={() => setShowClubRankings(false)} />}
         {showNationalRanking && (
             <NationalRankingBackendView
                 currentUser={currentUser}
                 rankingRows={rankingRows}
                 rankingPosition={currentUserRankingPosition}
                 onClose={() => setShowNationalRanking(false)}
             />
         )}
         {showCoaches && <CoachesView onClose={() => setShowCoaches(false)} />}
         {showClubUsers && <ClubUsersView onClose={() => setShowClubUsers(false)} />}
         {showClubAgenda && <ClubAgendaView onClose={() => setShowClubAgenda(false)} />}
         {showTopPartners && <TopPartnersView currentUser={currentUser} onClose={() => setShowTopPartners(false)} />}
         {showTopRivals && <TopRivalsView onClose={() => setShowTopRivals(false)} />}
         {showCreateTournament && <CreateTournamentView currentUser={currentUser} selectablePlayers={tournamentSelectablePlayers.length > 0 ? tournamentSelectablePlayers : undefined} clubOptions={tournamentClubOptions.length > 0 ? tournamentClubOptions : undefined} onClose={() => setShowCreateTournament(false)} onCreate={(data) => handleCreateTournament(data)} />}
         {tournamentToEdit && <AddTeamsToTournamentView currentUser={currentUser} availablePlayers={tournamentSelectablePlayers.length > 0 ? tournamentSelectablePlayers : undefined} tournament={tournamentToEdit} onClose={() => setTournamentToEdit(null)} onUpdate={handleUpdateTournament} />}
         {postMatchResult && (
             <PostMatchView 
                 oldRating={postMatchResult.oldRating} 
                 newRating={postMatchResult.newRating} 
                 delta={postMatchResult.delta} 
                 onContinue={() => setPostMatchResult(null)} 
             />
         )}

        {currentTab === 'play' && <PlayView currentUser={currentUser} rankingPosition={currentUserRankingPosition} myMatchesByScope={myMatchesByScope} navigateTo={setCurrentTab} onOpenCoaches={() => setShowCoaches(true)} agenda={agenda} matches={matches} tournaments={tournaments} onJoin={handleJoinMatch} onRequest={handleRequestAccess} onLeaveMatch={handleLeaveMatch} onCancelMatch={handleCancelMatch} onSubmitResult={handleSubmitResult} onConfirmResult={handleConfirmResult} onRejectResult={handleRejectResult} onUserClick={setSelectedPublicUser} onLaunchTournament={setTournamentToLaunch} onOpenTournamentStatus={setSelectedTournamentStatus} onAddTeamsToTournament={setTournamentToEdit} onAddResult={handleOpenResultInput} onArchiveTournament={(id) => setTournaments(prev => prev.map(t => t.id === id ? { ...t, isArchived: true } : t))} />}
        {currentTab === 'matches' && <MatchesView currentUser={currentUser} matches={matches} onJoin={handleJoinMatch} onRequest={handleRequestAccess} onLeaveMatch={handleLeaveMatch} onCancelMatch={handleCancelMatch} onUserClick={setSelectedPublicUser} />}
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
        {currentTab === 'club_dashboard' && <ClubDashboardView onOpenClubUsers={() => setShowClubUsers(true)} onOpenClubAgenda={() => setShowClubAgenda(true)} />}
        {currentTab === 'clubs' && <ClubsView currentUser={currentUser} clubs={clubCatalog ?? undefined} onBook={handleBookMatch} />}
        {currentTab === 'profile' && <ProfileView currentUser={currentUser} rankingPosition={currentUserRankingPosition} ratingHistory={ratingHistoryView} onOpenClubRankings={() => setShowClubRankings(true)} onOpenTopPartners={() => setShowTopPartners(true)} onOpenTopRivals={() => setShowTopRivals(true)} onPremiumFeatureAttempt={handlePremiumAttempt} onUserClick={setSelectedPublicUser} onOpenNationalRanking={() => setShowNationalRanking(true)} />}

        {tournamentToLaunch && <LaunchTournamentView tournament={tournamentToLaunch} matches={matches} onClose={() => setTournamentToLaunch(null)} onLaunch={handleLaunchTournament} />}
        {selectedTournamentStatus && (
            <TournamentStatusView 
                tournament={tournaments.find(t => t.id === selectedTournamentStatus.id) || selectedTournamentStatus} 
                currentUser={currentUser} 
                matches={matches} 
                onClose={() => setSelectedTournamentStatus(null)} 
                onAddResult={setSelectedMatchForResult} 
                onUserClick={setSelectedPublicUser}
            />
        )}
        
        {selectedPublicUser && (
            <PublicProfileView user={selectedPublicUser} onClose={() => setSelectedPublicUser(null)} />
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

        <NavBar currentTab={currentTab} onTabChange={setCurrentTab} userAvatar={currentUser.avatar} />
      </main>
    </div>
  );
}
