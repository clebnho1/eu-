
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { ShirtIcon, UserIcon, LogOutIcon, XIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
    currentUser: string;
    onUserChange: (user: string) => void;
    isAdmin: boolean;
    onAdminToggle: (status: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onUserChange }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentUser);

  const handleNameSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (tempName.trim()) {
          onUserChange(tempName.trim());
          setIsEditingName(false);
      }
  };

  const handleLogout = () => {
      onUserChange('Convidado');
      setTempName('Convidado');
      setIsUserMenuOpen(false);
  };

  return (
    <header className="w-full py-4 px-4 md:px-8 bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 group">
              <div className="bg-gray-900 p-2 rounded-xl text-white group-hover:rotate-12 transition-transform">
                <ShirtIcon className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-serif tracking-[0.1em] text-gray-900 hidden sm:block font-bold">
                PROVADOR VIRTUAL
              </h1>
          </div>

          <div className="flex items-center gap-3 relative">
                {isEditingName ? (
                    <form onSubmit={handleNameSubmit} className="flex gap-2">
                        <input 
                            value={tempName} 
                            onChange={e => setTempName(e.target.value)} 
                            className="text-sm border border-gray-200 rounded-lg px-3 py-1 outline-none"
                            autoFocus
                        />
                        <button type="submit" className="text-xs bg-gray-900 text-white px-3 rounded-lg">OK</button>
                    </form>
                ) : (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">Visitante</span>
                        <span onClick={() => setIsEditingName(true)} className="text-sm font-bold text-gray-800 cursor-pointer hover:underline">{currentUser}</span>
                    </div>
                )}
                
                <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="p-2.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                >
                    <UserIcon className="w-5 h-5" />
                </button>

                <AnimatePresence>
                    {isUserMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden py-2"
                        >
                            <button 
                                onClick={() => { setIsEditingName(true); setIsUserMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <UserIcon className="w-4 h-4" />
                                Editar Perfil
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium border-t border-gray-50"
                            >
                                <LogOutIcon className="w-4 h-4" />
                                Sair
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
          </div>
      </div>
    </header>
  );
};

export default Header;
