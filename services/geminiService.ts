import { GoogleGenAI } from "@google/genai";
import { Match, User } from '../types';

let aiClient: GoogleGenAI | null | undefined;

const readGeminiApiKey = (): string => {
  return (
    import.meta.env.VITE_GEMINI_API_KEY
    || process.env.GEMINI_API_KEY
    || process.env.API_KEY
    || ''
  ).trim();
};

const getGeminiClient = (): GoogleGenAI | null => {
  if (aiClient !== undefined) {
    return aiClient;
  }

  const apiKey = readGeminiApiKey();
  aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;
  return aiClient;
};

// Gemini is optional. These helpers must never block app startup.
const matchFitFallback = "El asistente de IA no está configurado en este entorno.";
const tacticalTipFallback = "Visualiza tu próximo golpe.";

// Analyze if a match is good for the player based on ELO/Level/Reputation
export const analyzeMatchFit = async (user: User, match: Match, otherPlayers: User[]): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) {
    return matchFitFallback;
  }

  const model = 'gemini-3-flash-preview';

  const prompt = `
    Act as a professional Padel Coach and Matchmaking Algorithm.
    
    Context:
    User Level: ${user.level}
    User Reputation: ${user.reputation}%
    
    Match Details:
    Type: ${match.type}
    Level Range: ${match.levelRange[0]} - ${match.levelRange[1]}
    
    Current Players in Match:
    ${otherPlayers.map(p => `- ${p.name} (Level: ${p.level})`).join('\n')}
    
    Task:
    Provide a concise (max 2 sentences) analysis of whether this user should join this match. 
    Focus on competitive balance and skill gap. 
    If it's a perfect match, encourage them highly.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Análisis no disponible en este momento.";
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return "No pudimos conectar con el asistente de IA.";
  }
};

// Generate a quick tactical tip based on recent performance (mocked concept)
export const getTacticalTip = async (level: number): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) {
    return tacticalTipFallback;
  }

  const model = 'gemini-3-flash-preview';
  const prompt = `
    Dame un consejo táctico avanzado de Padel para un jugador de nivel ${level} (Escala 1-7).
    Mantenlo corto, motivador y técnico. Máximo 20 palabras. En Español.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Mantén la posición en la red.";
  } catch (error) {
    return tacticalTipFallback;
  }
};
