import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, MapPin, Save, Store, User, FileText, Trash2 } from 'lucide-react';
import { Button } from './Button';
import type { Club, User as FrontendUser } from '../types';
import type { PreferredSide, UpdatePlayerProfileRequest } from '../services/backendApi';
import { resolveProfileAvatar } from '../services/profileInsightsIntegration';

const PREFERRED_SIDE_OPTIONS: Array<{ value: PreferredSide; label: string }> = [
  { value: 'LEFT', label: 'Reves' },
  { value: 'RIGHT', label: 'Drive' },
  { value: 'BOTH', label: 'Ambos lados' },
];

interface PlayerProfileEditViewProps {
  currentUser: FrontendUser;
  clubs?: Club[];
  saving?: boolean;
  onClose: () => void;
  onSave: (request: UpdatePlayerProfileRequest, photoFile: File | null) => Promise<void>;
}

export const PlayerProfileEditView: React.FC<PlayerProfileEditViewProps> = ({
  currentUser,
  clubs = [],
  saving = false,
  onClose,
  onSave,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    fullName: currentUser.name ?? '',
    photoUrl: currentUser.photoUrl ?? '',
    preferredSide: currentUser.preferredSide ?? 'RIGHT',
    city: currentUser.city ?? '',
    representedClubId: currentUser.representedClubId != null ? String(currentUser.representedClubId) : '',
    bio: currentUser.bio ?? '',
  });
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPhotoFile) {
      setSelectedPhotoPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedPhotoFile);
    setSelectedPhotoPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPhotoFile]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave({
      fullName: formData.fullName.trim(),
      photoUrl: formData.photoUrl.trim() || null,
      preferredSide: formData.preferredSide,
      city: formData.city.trim(),
      representedClubId: formData.representedClubId ? Number(formData.representedClubId) : null,
      bio: formData.bio.trim() || null,
    }, selectedPhotoFile);
  };

  const avatarPreview = selectedPhotoPreviewUrl
    ? selectedPhotoPreviewUrl
    : resolveProfileAvatar(formData.fullName || currentUser.name, formData.photoUrl || currentUser.photoUrl || currentUser.avatar);

  return (
    <div className="fixed inset-0 bg-dark-900 z-50 overflow-y-auto animate-fade-in">
      <div className="sticky top-0 bg-dark-900/80 backdrop-blur-md border-b border-dark-800 px-4 py-4 flex items-center gap-3 z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Editar Perfil</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4 flex items-center gap-4">
            <img
              src={avatarPreview}
              alt={formData.fullName || currentUser.name}
              className="w-20 h-20 rounded-full object-cover border border-dark-600"
            />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                >
                  <Camera size={14} />
                  {selectedPhotoFile ? 'Cambiar foto' : 'Subir foto'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPhotoFile(null);
                    setFormData(previous => ({ ...previous, photoUrl: '' }));
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={saving}
                >
                  <Trash2 size={14} />
                  Quitar
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                JPG, PNG o WEBP. Maximo 5 MB.
              </p>
              {selectedPhotoFile && (
                <p className="text-xs text-padel-300 truncate">{selectedPhotoFile.name}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setSelectedPhotoFile(nextFile);
                }}
              />
            </div>
          </div>

          <div className="relative group">
            <User className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Nombre completo"
              className="w-full bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
              value={formData.fullName}
              onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
              required
            />
          </div>

          <div className="relative group">
            <User className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
            <select
              className="w-full appearance-none bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
              value={formData.preferredSide}
              onChange={(event) => setFormData({ ...formData, preferredSide: event.target.value as PreferredSide })}
              required
            >
              {PREFERRED_SIDE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <MapPin className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Ciudad"
              className="w-full bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
              value={formData.city}
              onChange={(event) => setFormData({ ...formData, city: event.target.value })}
              required
            />
          </div>

          <div className="relative group">
            <Store className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
            <select
              className="w-full appearance-none bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all"
              value={formData.representedClubId}
              onChange={(event) => setFormData({ ...formData, representedClubId: event.target.value })}
            >
              <option value="">Club al que representas (opcional)</option>
              {clubs.map(club => {
                const backendClubId = club.id.startsWith('backend-club-')
                  ? club.id.replace('backend-club-', '')
                  : '';

                return (
                  <option key={club.id} value={backendClubId}>
                    {club.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="relative group">
            <FileText className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-padel-400 transition-colors" size={20} />
            <textarea
              placeholder="Bio (opcional)"
              className="w-full min-h-28 bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-padel-500 transition-all resize-none"
              value={formData.bio}
              onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
              maxLength={1000}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={saving}>
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
