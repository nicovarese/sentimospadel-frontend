import React, { useState } from 'react';
import { Trophy, User, Mail, Lock, Phone, ChevronRight, ArrowLeft, Sparkles, Store } from 'lucide-react';
import { Button } from './Button';

type AuthAccountMode = 'player' | 'club';

interface RegisterViewProps {
  onBack: () => void;
  onRegister: (data: any) => void;
  onDetermineRating: (data: any) => void;
  accountMode: AuthAccountMode;
  onAccountModeChange: (mode: AuthAccountMode) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onBack, onRegister, onDetermineRating, accountMode, onAccountModeChange }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    clubCity: '',
    clubAddress: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister(formData);
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center p-6 overflow-y-auto bg-dark-900">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1554068865-24131878f8ee?q=80&w=1000&auto=format&fit=crop" 
          className="w-full h-full object-cover object-center opacity-20" 
          alt="Padel Background" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-900/80 to-dark-900"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col pt-4">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-white/5 text-gray-400 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white ml-2">
            {accountMode === 'club' ? 'Crear Cuenta Club' : 'Crear Cuenta'}
          </h1>
        </div>

        <div className="bg-dark-800/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl animate-fade-in-up">
          <div className="grid grid-cols-2 gap-2 mb-4 bg-dark-900/50 border border-dark-700 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => onAccountModeChange('player')}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                accountMode === 'player' ? 'bg-padel-500 text-dark-900' : 'text-gray-400'
              }`}
            >
              Persona
            </button>
            <button
              type="button"
              onClick={() => onAccountModeChange('club')}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                accountMode === 'club' ? 'bg-padel-500 text-dark-900' : 'text-gray-400'
              }`}
            >
              Club
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              {accountMode === 'club' ? (
                <Store className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
              ) : (
                <User className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
              )}
              <input 
                type="text" 
                placeholder={accountMode === 'club' ? 'Nombre del Club' : 'Nombre Completo'} 
                className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {accountMode === 'club' && (
              <>
                <div className="relative group">
                  <MapPinProxy className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Ciudad" 
                    className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
                    value={formData.clubCity}
                    onChange={(e) => setFormData({ ...formData, clubCity: e.target.value })}
                    required
                  />
                </div>

                <div className="relative group">
                  <MapPinProxy className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Dirección (Opcional)" 
                    className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
                    value={formData.clubAddress}
                    onChange={(e) => setFormData({ ...formData, clubAddress: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="relative group">
              <Mail className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="Correo Electrónico" 
                className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {accountMode === 'player' && (
              <div className="relative group">
                <Phone className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
                <input 
                  type="tel" 
                  placeholder="Teléfono (Opcional)" 
                  className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            )}

            <div className="relative group">
              <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="Contraseña" 
                className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <Button type="submit" fullWidth className="mt-4 font-bold text-lg shadow-xl shadow-padel-500/10">
              Registrarse
            </Button>
          </form>

          {accountMode === 'player' && (
            <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-4">Opciones Adicionales</p>
            
            <button 
              onClick={() => onDetermineRating(formData)}
              className="w-full bg-gradient-to-r from-padel-500/10 to-blue-500/10 border border-padel-500/30 p-4 rounded-2xl flex items-center justify-between group hover:border-padel-500/60 transition-all active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="bg-padel-500 rounded-xl p-2 shadow-lg shadow-padel-500/20">
                  <Sparkles size={20} className="text-dark-900" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-bold">Determinar rating inicial de juego</p>
                  <p className="text-gray-400 text-[10px]">Calcula tu nivel automáticamente</p>
                </div>
              </div>
                <ChevronRight size={18} className="text-padel-400 group-hover:translate-x-1 transition-transform" />
            </button>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta? <button onClick={onBack} className="text-white font-bold hover:underline">Inicia sesión</button>
        </p>
      </div>
    </div>
  );
};

const MapPinProxy = ({ className, size }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size ?? 20}
    height={size ?? 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 1 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
