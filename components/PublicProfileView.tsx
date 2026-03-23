import React from 'react';
import { User } from '../types';
import { ChevronLeft, MapPin, Trophy, Star, Activity, ShieldCheck } from 'lucide-react';

interface PublicProfileViewProps {
    user: User;
    onClose: () => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({ user, onClose }) => {
    return (
        <div className="fixed inset-0 bg-dark-900 z-50 overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 bg-dark-900/80 backdrop-blur-md border-b border-dark-800 px-4 py-4 flex items-center gap-3 z-10">
                <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-white">Perfil de Jugador</h1>
            </div>

            <div className="p-4 max-w-lg mx-auto">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-8 mt-4">
                    <div className="relative mb-4">
                        <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-24 h-24 rounded-full border-4 border-dark-800 object-cover shadow-xl"
                        />
                        {user.verificationStatus === 'verified' && (
                            <div className="absolute bottom-0 right-0 bg-blue-500 p-1.5 rounded-full border-2 border-dark-900" title="Identidad Verificada">
                                <ShieldCheck size={14} className="text-white" />
                            </div>
                        )}
                    </div>
                    <h2 className="text-2xl font-black text-white mb-1">{user.name}</h2>
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                        <MapPin size={14} />
                        <span>{user.location || 'Montevideo, UY'}</span>
                    </div>
                    
                    <div className="inline-flex items-center gap-2 bg-dark-800 border border-dark-700 px-4 py-2 rounded-full">
                        <Trophy size={16} className="text-amber-500" />
                        <span className="text-white font-bold">Nivel {user.level.toFixed(2)}</span>
                        {user.categoryNumber && (
                            <>
                                <span className="text-dark-600">|</span>
                                <span className="text-padel-400 font-bold">{user.categoryNumber}ª Categoría</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700 text-center">
                        <div className="flex justify-center mb-2">
                            <Activity size={20} className="text-blue-400" />
                        </div>
                        <p className="text-3xl font-black text-white mb-1">{user.matchesPlayed}</p>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Partidos</p>
                    </div>
                    <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700 text-center">
                        <div className="flex justify-center mb-2">
                            <Star size={20} className="text-amber-400" />
                        </div>
                        <p className="text-3xl font-black text-white mb-1">{user.reliability}%</p>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Fiabilidad</p>
                    </div>
                </div>

                {/* About Section */}
                {user.bio && (
                    <div className="bg-dark-800 p-5 rounded-2xl border border-dark-700 mb-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Sobre mí</h3>
                        <p className="text-gray-200 leading-relaxed text-sm">{user.bio}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
