import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Zap, Bell, Percent, Tag, X, Check } from 'lucide-react';

interface ClubAgendaViewProps {
  onClose: () => void;
}

type CourtStatus = 'available' | 'reserved' | 'blocked';

interface CourtSlot {
  id: string;
  time: string;
  status: CourtStatus;
  user?: string;
}

interface Court {
  id: number;
  name: string;
  slots: CourtSlot[];
}

const generateMockSlots = (): CourtSlot[] => {
  const times = ['16:00', '17:30', '19:00', '20:30', '22:00'];
  return times.map((time, index) => {
    const rand = Math.random();
    let status: CourtStatus = 'available';
    let user;
    
    if (rand > 0.7) {
      status = 'blocked';
    } else if (rand > 0.3) {
      status = 'reserved';
      user = ['Martín G.', 'Lucía F.', 'Diego S.', 'Ana M.'][Math.floor(Math.random() * 4)];
    }
    
    return {
      id: `slot-${index}`,
      time,
      status,
      user
    };
  });
};

const INITIAL_COURTS: Court[] = [
  { id: 1, name: 'Cancha 1 (Cristal)', slots: generateMockSlots() },
  { id: 2, name: 'Cancha 2 (Cristal)', slots: generateMockSlots() },
  { id: 3, name: 'Cancha 3 (Muro)', slots: generateMockSlots() },
];

export const ClubAgendaView: React.FC<ClubAgendaViewProps> = ({ onClose }) => {
  const [courts, setCourts] = useState<Court[]>(INITIAL_COURTS);
  const [selectedDate, setSelectedDate] = useState<string>('Hoy');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSlotAction = (courtId: number, slotId: string, action: 'reserve' | 'block' | 'free') => {
    setCourts(prevCourts => prevCourts.map(court => {
      if (court.id === courtId) {
        return {
          ...court,
          slots: court.slots.map(slot => {
            if (slot.id === slotId) {
              if (action === 'reserve') return { ...slot, status: 'reserved', user: 'Reserva Manual' };
              if (action === 'block') return { ...slot, status: 'blocked', user: undefined };
              if (action === 'free') return { ...slot, status: 'available', user: undefined };
            }
            return slot;
          })
        };
      }
      return court;
    }));
    
    const actionText = action === 'reserve' ? 'reservada' : action === 'block' ? 'bloqueada' : 'liberada';
    showNotification(`Cancha ${actionText} exitosamente`);
  };

  const handleQuickAction = (action: string) => {
    showNotification(`Acción ejecutada: ${action}`);
  };

  const getStatusColor = (status: CourtStatus) => {
    switch (status) {
      case 'available': return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'reserved': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      case 'blocked': return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-dark-900 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 p-4 flex items-center sticky top-0 z-20">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white leading-tight">Agenda del Club</h2>
          <p className="text-xs text-gray-400 font-medium">Gestión de reservas y canchas</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Date Selector */}
        <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide border-b border-dark-800">
          {['Ayer', 'Hoy', 'Mañana', 'Jueves', 'Viernes', 'Sábado'].map(date => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                selectedDate === date 
                  ? 'bg-padel-500 text-white' 
                  : 'bg-dark-800 text-gray-400 border border-dark-700'
              }`}
            >
              {date}
            </button>
          ))}
        </div>

        {/* Quick Actions Panel */}
        <div className="p-4 bg-dark-800/50 border-b border-dark-800">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-yellow-500" />
            <h3 className="text-white font-bold text-sm">Acción Rápida</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => handleQuickAction('Notificación enviada')}
              className="bg-dark-800 hover:bg-dark-700 p-3 rounded-xl border border-dark-700 flex flex-col items-center gap-2 transition-colors"
            >
              <Bell size={18} className="text-blue-400" />
              <span className="text-[10px] font-bold text-gray-300 text-center leading-tight">Notificar<br/>Usuarios</span>
            </button>
            <button 
              onClick={() => handleQuickAction('Promoción activada')}
              className="bg-dark-800 hover:bg-dark-700 p-3 rounded-xl border border-dark-700 flex flex-col items-center gap-2 transition-colors"
            >
              <Tag size={18} className="text-padel-400" />
              <span className="text-[10px] font-bold text-gray-300 text-center leading-tight">Promo en<br/>Reserva</span>
            </button>
            <button 
              onClick={() => handleQuickAction('Descuento 50% activado')}
              className="bg-dark-800 hover:bg-dark-700 p-3 rounded-xl border border-dark-700 flex flex-col items-center gap-2 transition-colors"
            >
              <Percent size={18} className="text-red-400" />
              <span className="text-[10px] font-bold text-gray-300 text-center leading-tight">50% OFF<br/>Prox 30m</span>
            </button>
          </div>
        </div>

        {/* Courts Grid */}
        <div className="p-4 space-y-6">
          {/* Legend */}
          <div className="flex gap-4 justify-center mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500/50 border border-green-500"></div>
              <span className="text-[10px] text-gray-400 uppercase font-bold">Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500/50 border border-blue-500"></div>
              <span className="text-[10px] text-gray-400 uppercase font-bold">Reservada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500/50 border border-orange-500"></div>
              <span className="text-[10px] text-gray-400 uppercase font-bold">Bloqueada</span>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
            {courts.map(court => (
              <div key={court.id} className="min-w-[280px] snap-center bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden flex flex-col">
                <div className="bg-dark-900/50 p-3 border-b border-dark-700 text-center">
                  <h3 className="text-white font-bold">{court.name}</h3>
                </div>
                <div className="p-2 space-y-2 flex-1">
                  {court.slots.map(slot => (
                    <div key={slot.id} className={`p-3 rounded-xl border ${getStatusColor(slot.status)} transition-colors`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Clock size={14} />
                          <span>{slot.time}</span>
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-wider">
                          {slot.status === 'available' ? 'Libre' : slot.status === 'reserved' ? 'Reservada' : 'Bloqueada'}
                        </span>
                      </div>
                      
                      {slot.user && (
                        <div className="text-sm font-medium mb-3 text-white">
                          {slot.user}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-1.5 mt-2">
                        {slot.status === 'available' && (
                          <>
                            <button 
                              onClick={() => handleSlotAction(court.id, slot.id, 'reserve')}
                              className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                              Reservar
                            </button>
                            <button 
                              onClick={() => handleSlotAction(court.id, slot.id, 'block')}
                              className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                              Bloquear
                            </button>
                          </>
                        )}
                        {(slot.status === 'reserved' || slot.status === 'blocked') && (
                          <button 
                            onClick={() => handleSlotAction(court.id, slot.id, 'free')}
                            className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <Check size={14} /> Liberar Cancha
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-20 left-4 right-4 bg-padel-500 text-white p-4 rounded-2xl shadow-lg shadow-padel-500/20 flex items-center justify-between animate-slide-up z-50">
          <span className="font-bold text-sm">{notification}</span>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
