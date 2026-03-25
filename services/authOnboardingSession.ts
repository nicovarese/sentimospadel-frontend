import type { User } from '../types';
import type {
  ClubVerificationStatus,
  CurrentUserResponse,
  InitialSurveyResponse,
  PlayerProfileResponse,
  UruguayCategory,
} from './backendApi';
import { BackendApiError } from './backendApi';

export const DISPLAY_NAME_STORAGE_KEY = 'sentimos.displayName';

const CATEGORY_DISPLAY: Record<UruguayCategory, { categoryNumber: number; categoryName: string }> = {
  PRIMERA: { categoryNumber: 1, categoryName: 'Primera' },
  SEGUNDA: { categoryNumber: 2, categoryName: 'Segunda' },
  TERCERA: { categoryNumber: 3, categoryName: 'Tercera' },
  CUARTA: { categoryNumber: 4, categoryName: 'Cuarta' },
  QUINTA: { categoryNumber: 5, categoryName: 'Quinta' },
  SEXTA: { categoryNumber: 6, categoryName: 'Sexta' },
  SEPTIMA: { categoryNumber: 7, categoryName: 'Séptima' },
};

export const storeDisplayName = (displayName: string): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName);
  }
};

export const readStoredDisplayName = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
};

export const clearStoredDisplayName = (): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
  }
};

export const isNotFoundError = (error: unknown): boolean =>
  error instanceof BackendApiError && error.status === 404;

export const categoryToDisplay = (category?: UruguayCategory | null): { categoryNumber?: number; categoryName?: string } => {
  if (!category) {
    return {};
  }

  return CATEGORY_DISPLAY[category];
};

const deriveDisplayName = (email: string, preferredName?: string | null, profileName?: string | null): string => {
  if (preferredName?.trim()) {
    return preferredName.trim();
  }

  if (profileName?.trim()) {
    return profileName.trim();
  }

  const [localPart] = email.split('@', 1);
  const normalized = localPart.replace(/[._-]+/g, ' ').trim();
  if (!normalized) {
    return 'Jugador';
  }

  return normalized
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const toFrontendVerificationStatus = (
  requiresClubVerification: boolean,
  clubVerificationStatus: ClubVerificationStatus,
): User['verificationStatus'] => {
  if (!requiresClubVerification || clubVerificationStatus === 'NOT_REQUIRED') {
    return 'none';
  }

  if (clubVerificationStatus === 'VERIFIED') {
    return 'verified';
  }

  if (clubVerificationStatus === 'REJECTED') {
    return 'rejected';
  }

  return 'pending';
};

export const buildFrontendUser = (
  baseUser: User,
  authUser: CurrentUserResponse,
  profile: PlayerProfileResponse | null,
  onboarding: InitialSurveyResponse | null,
  preferredName?: string | null,
): User => {
  const rating = profile?.currentRating ?? onboarding?.initialRating ?? 1.0;
  const category = profile?.currentCategory ?? onboarding?.estimatedCategory ?? null;
  const verificationStatus = toFrontendVerificationStatus(
    profile?.requiresClubVerification ?? onboarding?.requiresClubVerification ?? false,
    profile?.clubVerificationStatus ?? onboarding?.clubVerificationStatus ?? 'NOT_REQUIRED',
  );
  const { categoryName, categoryNumber } = categoryToDisplay(category);

  return {
    ...baseUser,
    backendUserId: authUser.id,
    backendPlayerProfileId: profile?.id,
    email: authUser.email,
    name: deriveDisplayName(authUser.email, preferredName, profile?.fullName),
    level: Number(rating),
    categoryName,
    categoryNumber,
    publicCategoryNumber: categoryNumber ?? null,
    verificationStatus,
    isCategoryVerified: verificationStatus === 'verified',
    surveyCompleted: Boolean(profile?.surveyCompleted ?? onboarding),
    matchesPlayed: profile?.matchesPlayed ?? 0,
  };
};
