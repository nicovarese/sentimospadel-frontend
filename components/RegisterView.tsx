import React, { useState } from 'react';
import { Trophy, User, Mail, Lock, Phone, ChevronRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface RegisterViewProps {
  onBack: () => void;
  onRegister: (data: any) => void;
  onDetermineRating: (data: any) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onBack, onRegister, onDetermineRating }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
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
          <h1 className="text-2xl font-bold text-white ml-2">Crear Cuenta</h1>
        </div>

        <div className="bg-dark-800/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <User className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Nombre Completo" 
                className="w-full bg-dark-900/50 border border-dark-600 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

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
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta? <button onClick={onBack} className="text-white font-bold hover:underline">Inicia sesión</button>
        </p>
      </div>
    </div>
  );
};
