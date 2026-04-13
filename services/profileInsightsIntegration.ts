import type {
  ClubRankingEntryResponse,
  PlayerClubRankingSummaryResponse,
  PlayerPartnerInsightResponse,
  PlayerRivalInsightResponse,
  PreferredSide,
  UruguayCategory,
} from './backendApi';

const CATEGORY_LABELS: Record<UruguayCategory, string> = {
  PRIMERA: '1ª',
  SEGUNDA: '2ª',
  TERCERA: '3ª',
  CUARTA: '4ª',
  QUINTA: '5ª',
  SEXTA: '6ª',
  SEPTIMA: '7ª',
};

export const buildFallbackAvatar = (fullName: string): string =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0f172a&color=ffffff&bold=true`;

export const resolveProfileAvatar = (fullName: string, photoUrl?: string | null): string =>
  photoUrl?.trim() ? photoUrl : buildFallbackAvatar(fullName);

export const formatPreferredSide = (preferredSide?: PreferredSide | null): string => {
  if (preferredSide === 'LEFT') {
    return 'Reves';
  }

  if (preferredSide === 'RIGHT') {
    return 'Drive';
  }

  if (preferredSide === 'BOTH') {
    return 'Ambos lados';
  }

  return 'Sin declarar';
};

export const formatCategoryBadge = (category?: UruguayCategory | null): string =>
  category ? CATEGORY_LABELS[category] : '-';

export const getFavoriteClubRanking = (
  clubRankings: PlayerClubRankingSummaryResponse[],
): PlayerClubRankingSummaryResponse | null =>
  clubRankings.length > 0 ? clubRankings[0] : null;

export const getTopPartner = (
  partners: PlayerPartnerInsightResponse[],
): PlayerPartnerInsightResponse | null =>
  partners.length > 0 ? partners[0] : null;

export const getTopRival = (
  rivals: PlayerRivalInsightResponse[],
): PlayerRivalInsightResponse | null =>
  rivals.length > 0 ? rivals[0] : null;

export const formatClubRankingPrimaryValue = (
  entry: ClubRankingEntryResponse,
  rankingType: 'competitive' | 'social',
): string =>
  rankingType === 'competitive'
    ? entry.currentRating.toFixed(2)
    : String(entry.matchesPlayedAtClub);
