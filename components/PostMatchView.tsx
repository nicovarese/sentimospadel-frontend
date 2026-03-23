import React from 'react';
import { Trophy, ArrowUpRight, ArrowDownRight, CheckCircle, Info } from 'lucide-react';
import { Button } from './Button';

interface PostMatchViewProps {
  oldRating: number;
  newRating: number;
  delta: number;
  onContinue: () => void;
}

export const PostMatchView: React.FC<PostMatchViewProps> = ({ oldRating, newRating, delta, onContinue }) => {
  const isPositive = delta > 0;
  
  return (
    <div className="fixed inset-0 z-[150] bg-dark-900 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-sm text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-padel-400 to-blue-500 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-8 animate-bounce-subtle">
          <Trophy size={48} className="text-dark-900" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-2">¡Resultado Confirmado!</h2>
        <p className="text-gray-400 text-sm mb-8">Tu rating ha sido actualizado.</p>

        <div className="bg-dark-800 border border-dark-700 rounded-3xl p-6 mb-8 flex justify-center items-center gap-6">
          <div className="text-center">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Antes</p>
            <p className="text-2xl font-bold text-gray-300">{oldRating.toFixed(2)}</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {isPositive ? '+' : ''}{delta.toFixed(2)}
            </div>
          </div>

          <div className="text-center">
            <p className="text-padel-400 text-[10px] font-bold uppercase tracking-wider mb-1">Ahora</p>
            <p className="text-4xl font-black text-white">{newRating.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-4 mb-8 text-left">
          <h4 className="text-white font-bold text-xs mb-2 flex items-center gap-2">
            <Info size={14} className="text-padel-400" /> ¿Cómo se calcula?
          </h4>
          <p className="text-gray-400 text-[10px] leading-relaxed">
            El sistema estima quién era favorito según el rating de los equipos. Si ganás siendo underdog sumás más; si perdés siendo favorito restás más. Los sets suman un extra pequeño (0,01 por set). En tus primeros partidos el rating se ajusta más rápido.
          </p>
        </div>

        <Button 
          fullWidth 
          size="lg" 
          onClick={onContinue}
          className="font-bold shadow-xl shadow-padel-500/20"
        >
          <CheckCircle size={18} className="mr-2" /> Continuar
        </Button>
      </div>
    </div>
  );
};
