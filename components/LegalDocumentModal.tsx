import React from 'react';
import { X } from 'lucide-react';
import type { LegalDocumentResponse } from '../services/backendApi';

interface LegalDocumentModalProps {
  document: LegalDocumentResponse;
  onClose: () => void;
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({ document, onClose }) => {
  return (
    <div className="fixed inset-0 z-[120] bg-dark-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-dark-800 border border-dark-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-dark-700 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white text-xl font-bold">{document.title}</h2>
            <p className="text-gray-400 text-xs mt-1">Versión {document.version}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-dark-700 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-200 font-sans">
            {document.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
