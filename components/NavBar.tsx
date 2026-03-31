import React from 'react';
import { Trophy, Home, Users, UserCircle, Swords, Store } from 'lucide-react';

interface NavBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userAvatar?: string;
  accountType?: 'player' | 'club';
}

export const NavBar: React.FC<NavBarProps> = ({ currentTab, onTabChange, userAvatar, accountType = 'player' }) => {
  const tabs = accountType === 'club'
    ? [
        { id: 'club_dashboard', icon: Store, label: 'Club View' },
      ]
    : [
        { id: 'play', icon: Home, label: 'Inicio' },
        { id: 'clubs', icon: Users, label: 'Reservas' },
        { id: 'matches', icon: Swords, label: 'Competir' },
        { id: 'competition', icon: Trophy, label: 'Competición' },
        { id: 'profile', icon: UserCircle, label: 'Perfil' },
      ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-dark-900/95 backdrop-blur-lg border-t border-dark-700 pb-safe pt-2 px-2 z-50 h-[88px]">
      <div className="flex justify-between items-center max-w-md mx-auto h-full pb-4 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          if (tab.id === 'profile' && userAvatar) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 transition-colors duration-200 flex-1 min-w-0 ${
                  isActive ? 'text-padel-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-full overflow-hidden border ${isActive ? 'border-padel-400' : 'border-gray-600'}`}>
                  <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <span className="text-[9px] font-medium tracking-tight truncate w-full text-center">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 transition-colors duration-200 flex-1 min-w-0 ${
                isActive ? 'text-padel-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-medium tracking-tight truncate w-full text-center">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
