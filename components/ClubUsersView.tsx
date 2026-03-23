import React from 'react';
import { ArrowLeft, Users, UserPlus, UserMinus, Activity, DollarSign, Trophy } from 'lucide-react';

interface ClubUsersViewProps {
  onClose: () => void;
}

const MOCK_TOP_USERS = [
  { id: 1, name: 'Martín Gómez', matches: 15, avatar: 'https://picsum.photos/100/100?r=1' },
  { id: 2, name: 'Lucía Fernández', matches: 12, avatar: 'https://picsum.photos/100/100?r=2' },
  { id: 3, name: 'Diego Silva', matches: 11, avatar: 'https://picsum.photos/100/100?r=3' },
  { id: 4, name: 'Ana Martínez', matches: 10, avatar: 'https://picsum.photos/100/100?r=4' },
  { id: 5, name: 'Carlos Rodríguez', matches: 9, avatar: 'https://picsum.photos/100/100?r=5' },
  { id: 6, name: 'Sofía López', matches: 8, avatar: 'https://picsum.photos/100/100?r=6' },
  { id: 7, name: 'Juan Pérez', matches: 8, avatar: 'https://picsum.photos/100/100?r=7' },
  { id: 8, name: 'Valentina Castro', matches: 7, avatar: 'https://picsum.photos/100/100?r=8' },
  { id: 9, name: 'Mateo Díaz', matches: 6, avatar: 'https://picsum.photos/100/100?r=9' },
  { id: 10, name: 'Camila Sosa', matches: 5, avatar: 'https://picsum.photos/100/100?r=10' },
];

export const ClubUsersView: React.FC<ClubUsersViewProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-dark-900 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 p-4 flex items-center sticky top-0 z-10">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white leading-tight">Usuarios del Club</h2>
          <p className="text-xs text-gray-400 font-medium">Estadísticas e indicadores</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-500/20 p-1.5 rounded-lg">
                <Users size={16} className="text-blue-400" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Activos</p>
            </div>
            <h3 className="text-2xl font-black text-white">452</h3>
            <p className="text-xs text-gray-500 mt-1">Usuarios totales</p>
          </div>
          
          <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-500/20 p-1.5 rounded-lg">
                <UserPlus size={16} className="text-green-400" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Nuevos</p>
            </div>
            <h3 className="text-2xl font-black text-white">38</h3>
            <p className="text-xs text-gray-500 mt-1">Este mes</p>
          </div>

          <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-red-500/20 p-1.5 rounded-lg">
                <UserMinus size={16} className="text-red-400" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Inactivos</p>
            </div>
            <h3 className="text-2xl font-black text-white">85</h3>
            <p className="text-xs text-gray-500 mt-1">&gt; 2 meses sin jugar</p>
          </div>

          <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-amber-500/20 p-1.5 rounded-lg">
                <DollarSign size={16} className="text-amber-400" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Ingreso Prom.</p>
            </div>
            <h3 className="text-2xl font-black text-white">$2.450</h3>
            <p className="text-xs text-gray-500 mt-1">Por usuario/mes</p>
          </div>
        </div>

        {/* Matches Average */}
        <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-padel-500/20 p-2 rounded-lg">
              <Activity size={20} className="text-padel-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Promedio de Partidos</h3>
              <p className="text-xs text-gray-400">Jugados por usuario</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-dark-900 p-3 rounded-xl border border-dark-700 text-center">
              <p className="text-xs text-gray-500 mb-1">Este mes</p>
              <p className="text-xl font-black text-white">4.2</p>
            </div>
            <div className="bg-dark-900 p-3 rounded-xl border border-dark-700 text-center">
              <p className="text-xs text-gray-500 mb-1">Mes anterior</p>
              <p className="text-xl font-black text-gray-300">3.8</p>
            </div>
            <div className="bg-dark-900 p-3 rounded-xl border border-dark-700 text-center">
              <p className="text-xs text-gray-500 mb-1">Prom. anual</p>
              <p className="text-xl font-black text-gray-300">3.5</p>
            </div>
          </div>
        </div>

        {/* Top 10 Users */}
        <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-yellow-500/20 p-2 rounded-lg">
              <Trophy size={20} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-white font-bold">Top 10 Jugadores</h3>
              <p className="text-xs text-gray-400">Más partidos este mes</p>
            </div>
          </div>

          <div className="space-y-3">
            {MOCK_TOP_USERS.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-dark-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-6 text-center font-black ${index < 3 ? 'text-yellow-500' : 'text-gray-500'}`}>
                    {index + 1}
                  </div>
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-full border border-dark-600 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm font-bold text-white">{user.name}</span>
                </div>
                <div className="bg-dark-900 px-3 py-1 rounded-lg border border-dark-700">
                  <span className="text-padel-400 font-bold text-sm">{user.matches}</span>
                  <span className="text-xs text-gray-500 ml-1">partidos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
