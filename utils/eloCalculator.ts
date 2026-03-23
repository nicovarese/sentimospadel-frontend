export interface EloPlayerInput {
  id: string;
  rating: number;
  matchesPlayed: number;
}

export interface EloMatchInput {
  teamA: [EloPlayerInput, EloPlayerInput];
  teamB: [EloPlayerInput, EloPlayerInput];
  setsA: number;
  setsB: number;
}

export interface EloPlayerResult {
  id: string;
  oldRating: number;
  newRating: number;
  delta: number;
  newMatchesPlayed: number;
}

export interface EloMatchResult {
  teamA: [EloPlayerResult, EloPlayerResult];
  teamB: [EloPlayerResult, EloPlayerResult];
  PA: number;
  K: number;
  deltaTeamA: number;
}

export const computeMatchRatingUpdatesElo = (input: EloMatchInput): EloMatchResult => {
  const { teamA, teamB, setsA, setsB } = input;

  // 1) Rating de equipo (promedio)
  const RA = (teamA[0].rating + teamA[1].rating) / 2;
  const RB = (teamB[0].rating + teamB[1].rating) / 2;
  const D = RA - RB;

  // 2) Probabilidad esperada (logística)
  const s = 0.55;
  const PA = 1 / (1 + Math.exp(-D / s));
  // PB = 1 - PA;

  // 3) Resultado real
  const SA = setsA > setsB ? 1 : 0;
  // SB = 1 - SA;

  // 4) K dinámico por experiencia (por EQUIPO)
  const getK = (n: number) => {
    if (n <= 10) return 0.28;
    if (n <= 25) return 0.22;
    if (n <= 60) return 0.12;
    return 0.10;
  };

  const nTeamA = Math.round((teamA[0].matchesPlayed + teamA[1].matchesPlayed) / 2);
  const nTeamB = Math.round((teamB[0].matchesPlayed + teamB[1].matchesPlayed) / 2);
  
  const KTeamA = getK(nTeamA);
  const KTeamB = getK(nTeamB);
  const K = (KTeamA + KTeamB) / 2; // K global promedio

  // 5) Delta base Elo por equipo
  const deltaBaseA = K * (SA - PA);
  // deltaBaseB = -deltaBaseA;

  // 6) Bonus por sets (pequeño, cap a 2 sets)
  const setsA_c = Math.min(setsA, 2);
  const setsB_c = Math.min(setsB, 2);
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const deltaSetsA = 0.01 * clamp(setsA_c - setsB_c, -2, 2);

  // 7) Delta total por equipo
  const deltaTeamA_raw = deltaBaseA + deltaSetsA;
  const deltaTeamB_raw = -deltaTeamA_raw;

  // 8) Cap “zona de confort” (por EQUIPO)
  const getTeamCap = (nTeam: number) => {
    if (nTeam >= 26 && nTeam <= 60) return 0.06;
    return 0.30;
  };

  const capTeamA = getTeamCap(nTeamA);
  const deltaTeamA = clamp(deltaTeamA_raw, -capTeamA, capTeamA);

  const capTeamB = getTeamCap(nTeamB);
  // deltaTeamB manteniene suma cero respecto a deltaTeamA antes de su propio cap, 
  // pero la regla dice: Para B: deltaTeamB = -deltaTeamA (mantener suma cero).
  // Así que usamos -deltaTeamA directamente.
  const deltaTeamB = -deltaTeamA;

  // 9) Reparto dentro de cada equipo PROPORCIONAL al rating
  const shareA1 = teamA[0].rating / (teamA[0].rating + teamA[1].rating);
  const shareA2 = teamA[1].rating / (teamA[0].rating + teamA[1].rating);
  const deltaA1_raw = deltaTeamA * shareA1;
  const deltaA2_raw = deltaTeamA * shareA2;

  const shareB1 = teamB[0].rating / (teamB[0].rating + teamB[1].rating);
  const shareB2 = teamB[1].rating / (teamB[0].rating + teamB[1].rating);
  const deltaB1_raw = deltaTeamB * shareB1;
  const deltaB2_raw = deltaTeamB * shareB2;

  // 10) Regla extra anti-frustración (por JUGADOR, primeros 10 partidos)
  const getPlayerCap = (n: number) => {
    if (n <= 10) return 0.18;
    return 0.30;
  };

  const deltaA1 = clamp(deltaA1_raw, -getPlayerCap(teamA[0].matchesPlayed), getPlayerCap(teamA[0].matchesPlayed));
  const deltaA2 = clamp(deltaA2_raw, -getPlayerCap(teamA[1].matchesPlayed), getPlayerCap(teamA[1].matchesPlayed));
  const deltaB1 = clamp(deltaB1_raw, -getPlayerCap(teamB[0].matchesPlayed), getPlayerCap(teamB[0].matchesPlayed));
  const deltaB2 = clamp(deltaB2_raw, -getPlayerCap(teamB[1].matchesPlayed), getPlayerCap(teamB[1].matchesPlayed));

  // 11) Rating final
  const calcNewRating = (oldRating: number, delta: number) => {
    const newRating = clamp(oldRating + delta, 1.00, 7.00);
    return Math.round(newRating * 100) / 100;
  };

  const resultA1: EloPlayerResult = {
    id: teamA[0].id,
    oldRating: teamA[0].rating,
    newRating: calcNewRating(teamA[0].rating, deltaA1),
    delta: Math.round(deltaA1 * 100) / 100,
    newMatchesPlayed: teamA[0].matchesPlayed + 1
  };

  const resultA2: EloPlayerResult = {
    id: teamA[1].id,
    oldRating: teamA[1].rating,
    newRating: calcNewRating(teamA[1].rating, deltaA2),
    delta: Math.round(deltaA2 * 100) / 100,
    newMatchesPlayed: teamA[1].matchesPlayed + 1
  };

  const resultB1: EloPlayerResult = {
    id: teamB[0].id,
    oldRating: teamB[0].rating,
    newRating: calcNewRating(teamB[0].rating, deltaB1),
    delta: Math.round(deltaB1 * 100) / 100,
    newMatchesPlayed: teamB[0].matchesPlayed + 1
  };

  const resultB2: EloPlayerResult = {
    id: teamB[1].id,
    oldRating: teamB[1].rating,
    newRating: calcNewRating(teamB[1].rating, deltaB2),
    delta: Math.round(deltaB2 * 100) / 100,
    newMatchesPlayed: teamB[1].matchesPlayed + 1
  };

  return {
    teamA: [resultA1, resultA2],
    teamB: [resultB1, resultB2],
    PA,
    K,
    deltaTeamA
  };
};
