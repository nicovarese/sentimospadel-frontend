import { Match } from '../types';
import type { NotificationResponse, PendingActionResponse } from './backendApi';

const isMatchSubmitAction = (type: PendingActionResponse['type']): boolean =>
  type === 'SUBMIT_MATCH_RESULT' || type === 'SUBMIT_TOURNAMENT_RESULT';

const isMatchConfirmAction = (type: PendingActionResponse['type']): boolean =>
  type === 'CONFIRM_MATCH_RESULT' || type === 'CONFIRM_TOURNAMENT_RESULT';

const toActionableStatus = (type: PendingActionResponse['type']): Match['status'] =>
  isMatchConfirmAction(type) ? 'awaiting_validation' : 'awaiting_result';

const findBaseMatch = (action: PendingActionResponse, matches: Match[]): Match | undefined => {
  if (action.type === 'SUBMIT_MATCH_RESULT' || action.type === 'CONFIRM_MATCH_RESULT') {
    return matches.find(match => match.matchSource === 'backend' && match.backendMatchId === action.matchId);
  }

  return matches.find(
    match => match.matchSource === 'backend-tournament' && match.backendMatchId === action.tournamentMatchId,
  );
};

export const buildActionableResultMatches = (
  pendingActions: PendingActionResponse[],
  matches: Match[],
): Match[] =>
  pendingActions
    .map(action => {
      const baseMatch = findBaseMatch(action, matches);
      if (!baseMatch) {
        return null;
      }

      return {
        ...baseMatch,
        status: toActionableStatus(action.type),
        pendingNotificationId: action.notificationId ?? undefined,
        pendingActionType: action.type,
      } satisfies Match;
    })
    .filter((match): match is NonNullable<typeof match> => match != null);

export const buildActionableResultMatchesById = (
  pendingActions: PendingActionResponse[],
  matches: Match[],
): Map<string, Match> =>
  new Map(
    buildActionableResultMatches(pendingActions, matches).map(match => [match.id, match]),
  );

export const getUnreadNotificationsCount = (notifications: NotificationResponse[]): number =>
  notifications.filter(notification => notification.status === 'UNREAD' && notification.active).length;

export const isPendingResultAction = (actionType?: Match['pendingActionType']): boolean =>
  actionType != null && (isMatchSubmitAction(actionType) || isMatchConfirmAction(actionType));
