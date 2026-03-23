import React, { useState } from 'react';
import { Trophy, ChevronRight, ChevronLeft, Sparkles, CheckCircle, MapPin, Info, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { QUESTIONS, computeInitialRating } from '../utils/ratingCalculator';
import { supabase } from '../utils/supabaseClient';

interface OnboardingSurveyProps {
  onComplete: (rating: number, category: string, categoryNumber: number) => void;
  onCancel: () => void;
}

export const OnboardingSurvey: React.FC<OnboardingSurveyProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'intro' | 'questions' | 'result' | 'verification'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(QUESTIONS.length).fill(-1));
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  // Mock clubs for verification
  const MOCK_CLUBS = [
    { id: 'c1', name: 'Top Padel', city: 'Montevideo' },
    { id: 'c2', name: 'World Padel', city: 'Montevideo' },
    { id: 'c3', name: 'Boss Padel', city: 'Montevideo' },
  ];

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      setStep('intro');
    }
  };

  const calculateAndSubmit = async () => {
    setLoading(true);
    const ratingResult = computeInitialRating(answers);
    setResult(ratingResult);

    try {
      // In a real app, we would call the RPC
      // await supabase.rpc('submit_onboarding_survey', {
      //   p_answers: answers,
      //   p_values: ratingResult.valuesEffective,
      //   p_weights: QUESTIONS.map(q => q.weight),
      //   p_score_s: ratingResult.scoreS,
      //   p_score_s40: ratingResult.scoreS40,
      //   p_initial_rating: ratingResult.rating,
      //   p_initial_category_number: ratingResult.categoryNumber,
      //   p_initial_category_name: ratingResult.categoryName
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStep('result');
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Error al guardar los resultados. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!selectedClub) return;
    setLoading(true);
    try {
      // await supabase.rpc('request_club_verification', { p_club_id: selectedClub });
      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete(result.rating, result.categoryName, result.categoryNumber);
    } catch (error) {
      console.error('Error requesting verification:', error);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'intro') {
    return (
      <div className="fixed inset-0 z-[150] bg-dark-900 flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1554068865-24131878f8ee?q=80&w=1000&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-10" 
            alt="Padel" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-900/80 to-dark-900"></div>
        </div>

        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-padel-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-padel-500/20 mx-auto mb-6 transform rotate-3">
            <Sparkles size={40} className="text-dark-900" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Rating Inicial</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            No hay respuestas buenas o malas. Esto define tu punto de partida; tu rating se ajusta con tus primeros partidos.
            <br /><br />
            <span className="text-padel-400 font-bold">Tiempo estimado: &lt; 90 segundos</span>
          </p>
          
          <div className="space-y-3">
            <Button fullWidth size="lg" onClick={() => setStep('questions')} className="font-bold text-lg">
              Comenzar Encuesta
            </Button>
            <button onClick={onCancel} className="text-gray-500 text-sm font-medium hover:text-white transition-colors">
              Omitir por ahora
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'questions') {
    const q = QUESTIONS[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;

    return (
      <div className="fixed inset-0 z-[150] bg-dark-900 flex flex-col animate-fade-in">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-dark-800">
          <div 
            className="h-full bg-padel-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex-1 flex flex-col p-6 max-w-sm mx-auto w-full">
          <div className="mt-8 mb-10">
            <span className="text-padel-400 text-xs font-black uppercase tracking-widest mb-2 block">
              Pregunta {currentQuestionIndex + 1} de {QUESTIONS.length}
            </span>
            <h3 className="text-2xl font-bold text-white leading-tight">
              {q.text}
            </h3>
          </div>

          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleAnswer(opt.value)}
                className={`w-full p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  answers[currentQuestionIndex] === opt.value
                    ? 'bg-padel-500 border-padel-500 text-dark-900 font-bold shadow-lg shadow-padel-500/20'
                    : 'bg-dark-800 border-dark-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.label}</span>
                  {answers[currentQuestionIndex] === opt.value && <CheckCircle size={18} />}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-8 flex items-center justify-between">
            <button 
              onClick={handlePrev}
              className="flex items-center gap-2 text-gray-500 font-bold text-sm hover:text-white transition-colors"
            >
              <ChevronLeft size={20} /> Anterior
            </button>
            
            {currentQuestionIndex === QUESTIONS.length - 1 && answers[currentQuestionIndex] !== -1 && (
              <Button 
                onClick={calculateAndSubmit} 
                loading={loading}
                className="font-bold px-8"
              >
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'result') {
    const isTopCategory = result.categoryNumber <= 2;

    return (
      <div className="fixed inset-0 z-[150] bg-dark-900 flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-sm text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-padel-400 to-blue-500 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-8 animate-bounce-subtle">
            <Trophy size={48} className="text-dark-900" />
          </div>
          
          <h2 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Tu Nivel Estimado</h2>
          <div className="text-6xl font-black text-white mb-2">{result.rating.toFixed(2)}</div>
          <div className="inline-block px-4 py-1.5 bg-padel-500/10 border border-padel-500/30 rounded-full text-padel-400 font-black text-lg mb-8">
            Categoría {result.categoryName}
          </div>

          <div className="bg-dark-800/50 border border-dark-700 rounded-3xl p-6 mb-8 text-left">
            <h4 className="text-white font-bold mb-2 flex items-center gap-2">
              <Info size={16} className="text-blue-400" /> ¿Qué significa esto?
            </h4>
            <p className="text-gray-400 text-xs leading-relaxed">
              Este es tu punto de partida en Sentimos Padel. Tu rating se actualizará automáticamente después de cada partido competitivo que juegues.
            </p>
            
            {isTopCategory && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                <AlertCircle size={18} className="text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-200/80 leading-tight">
                  <span className="font-bold text-amber-500">Verificación requerida:</span> Para que tu categoría sea visible públicamente como {result.categoryName}, un club debe verificar tu nivel. Mientras tanto, aparecerás como "Top (pendiente)".
                </p>
              </div>
            )}
          </div>

          <Button 
            fullWidth 
            size="lg" 
            onClick={() => isTopCategory ? setStep('verification') : onComplete(result.rating, result.categoryName, result.categoryNumber)}
            className="font-bold"
          >
            {isTopCategory ? 'Continuar a Verificación' : 'Empezar a Jugar'}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'verification') {
    return (
      <div className="fixed inset-0 z-[150] bg-dark-900 flex flex-col p-6 animate-fade-in">
        <div className="w-full max-w-sm mx-auto flex flex-col h-full">
          <div className="mt-8 mb-8">
            <h2 className="text-2xl font-black text-white mb-2">Verificación de Nivel</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Para validar tu nivel en <span className="text-white font-bold">{result.categoryName}</span>, selecciona un club donde suelas jugar para solicitar una verificación presencial.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {MOCK_CLUBS.map((club) => (
              <button
                key={club.id}
                onClick={() => setSelectedClub(club.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                  selectedClub === club.id
                    ? 'bg-padel-500/10 border-padel-500 ring-1 ring-padel-500'
                    : 'bg-dark-800 border-dark-700 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{club.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={10} /> {club.city}
                    </p>
                  </div>
                  {selectedClub === club.id && <CheckCircle size={20} className="text-padel-500" />}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-3">
            <Button 
              fullWidth 
              size="lg" 
              onClick={handleRequestVerification}
              disabled={!selectedClub}
              loading={loading}
              className="font-bold"
            >
              Solicitar Verificación
            </Button>
            <button 
              onClick={() => onComplete(result.rating, result.categoryName, result.categoryNumber)}
              className="w-full text-gray-500 text-sm font-medium py-3 hover:text-white transition-colors"
            >
              Hacerlo más tarde
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
