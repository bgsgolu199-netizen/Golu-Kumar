
import React, { useState, useRef } from 'react';
import { User, ShieldCheck, ChevronRight, Camera, Upload, AlertCircle, Bot } from 'lucide-react';
import { STORAGE_KEY_USERNAME, STORAGE_KEY_AVATAR } from '../constants';
import { registerUser } from '../services/chatService';

interface AccountSetupProps {
  onSuccess: () => void;
}

const AccountSetup: React.FC<AccountSetupProps> = ({ onSuccess }) => {
  const [alias, setAlias] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError("Image too large. Max 2MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (alias.length < 3) {
        setError("Username too short.");
        return;
    }

    if (!isHumanVerified) {
        setError("Verification required.");
        return;
    }

    setIsAnimating(true);
    
    // Simulate network registration
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY_USERNAME, alias);
      if (avatarPreview) {
        localStorage.setItem(STORAGE_KEY_AVATAR, avatarPreview);
      }
      
      // Register in global chat directory
      registerUser(alias, avatarPreview);
      
      onSuccess();
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 items-center justify-center p-6 text-white overflow-y-auto no-scrollbar">
      <div className="w-full max-w-xs text-center">
        
        {/* Profile Pic Upload */}
        <div className="relative mx-auto w-28 h-28 mb-6 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className={`w-full h-full rounded-full border-2 flex items-center justify-center overflow-hidden
                ${error ? 'border-red-500 bg-red-900/20' : 'border-emerald-500/50 bg-emerald-900/20'}`}>
                {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <User className="text-emerald-500" size={48} />
                )}
            </div>
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={24} />
            </div>

            {/* Spinner */}
            {isAnimating && (
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
            )}
            
            <div className="absolute bottom-0 right-0 bg-emerald-600 rounded-full p-1.5 border border-gray-900 shadow-lg">
                <Upload size={14} className="text-white" />
            </div>
        </div>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
        />

        <h2 className="text-2xl font-bold mb-2">Create Identity</h2>
        <p className="text-gray-400 text-sm mb-6">
          Set your unique alias and profile image for the encrypted network.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ShieldCheck className="text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
            </div>
            <input
              type="text"
              value={alias}
              onChange={(e) => {
                  setAlias(e.target.value.replace(/\s/g, '_')); // Force no spaces
                  setError(null);
              }}
              placeholder="Username (Unique)"
              className={`w-full bg-gray-800 border text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 transition-all placeholder-gray-600
                ${error && alias.length < 3 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500'}`}
              autoFocus
            />
          </div>

          {/* Bot Protection / Human Verification */}
          <div 
             className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
             ${isHumanVerified 
                ? 'bg-emerald-900/20 border-emerald-500/50' 
                : 'bg-gray-800 border-gray-700 hover:bg-gray-750'}`}
             onClick={() => setIsHumanVerified(!isHumanVerified)}
          >
             <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                ${isHumanVerified ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'}`}>
                 {isHumanVerified && <User size={14} className="text-black" />}
             </div>
             <span className={`text-sm ${isHumanVerified ? 'text-emerald-400 font-medium' : 'text-gray-400'}`}>
                 I certify I am a human operator
             </span>
             {!isHumanVerified && <Bot size={16} className="ml-auto text-gray-600" />}
          </div>

          {error && (
              <div className="text-red-400 text-xs flex items-center justify-center animate-shake">
                  <AlertCircle size={12} className="mr-1" />
                  {error}
              </div>
          )}

          <button
            type="submit"
            disabled={alias.length < 3 || isAnimating || !isHumanVerified}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center transition-all
              ${alias.length < 3 || !isHumanVerified
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
              }`}
          >
            {isAnimating ? 'Verifying & Encrypting...' : (
              <>
                Initialize System <ChevronRight size={18} className="ml-2" />
              </>
            )}
          </button>
        </form>
        
        <p className="mt-6 text-xs text-gray-600">
          *Access restricted to verified personnel only.
        </p>
      </div>
    </div>
  );
};

export default AccountSetup;
