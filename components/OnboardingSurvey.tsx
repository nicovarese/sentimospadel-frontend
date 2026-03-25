import React, { useState } from 'react';
import { Trophy, ChevronLeft, Sparkles, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { QUESTIONS } from '../utils/ratingCalculator';
import { backendApi, type AnswerOption } from '../services/backendApi';
import { categoryToDisplay } from '../services/authOnboardingSession';

interface OnboardingSurveyProps {
  onComplete: (rating: number, category: string, categoryNumber: number) => void;
  onCancel: () => void;
}

interface SurveyResultViewModel {
  rating: number;
  categoryName: string;
  categoryNumber: number;
}

const ANSWER_OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];

const mapAnswersToRequest = (answers: number[]) => ({
  q1: ANSWER_OPTIONS[answers[0]],
  q2: ANSWER_OPTIONS[answers[1]],
  q3: ANSWER_OPTIONS[answers[2]],
  q4: ANSWER_OPTIONS[answers[3]],
  q5: ANSWER_OPTIONS[answers[4]],
  q6: ANSWER_OPTIONS[answers[5]],
  q7: ANSWER_OPTIONS[answers[6]],
  q8: ANSWER_OPTIONS[answers[7]],
  q9: ANSWER_OPTIONS[answers[8]],
  q10: ANSWER_OPTIONS[answers[9]],
});

export const OnboardingSurvey: React.FC<OnboardingSurveyProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'intro' | 'questions' | 'result'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(QUESTIONS.length).fill(-1));
  const [result, setResult] = useState<SurveyResultViewModel | null>(null);
  const [loading, setLoading] = useState(false);

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

    try {
      const response = await backendApi.submitInitialSurvey(mapAnswersToRequest(answers));
      const categoryDisplay = categoryToDisplay(response.estimatedCategory);

      setResult({
        rating: Number(response.initialRating),
        categoryName: categoryDisplay.categoryName || 'Sin categoría',
        categoryNumber: categoryDisplay.categoryNumber || 7,
      });
      setStep('result');
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Error al guardar los resultados. Por favor intenta de nuevo.');
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
                disabled={loading}
                className="font-bold px-8"
              >
                {loading ? 'Guardando...' : 'Finalizar'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'result' && result) {
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
                  <span className="font-bold text-amber-500">Verificación requerida:</span> Si quedas en {result.categoryName}, tu rating y tu categoría siguen visibles. Más adelante un club podrá confirmar oficialmente ese nivel.
                </p>
              </div>
            )}
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={() => onComplete(result.rating, result.categoryName, result.categoryNumber)}
            className="font-bold"
          >
            Empezar a Jugar
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
