/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { ShirtIcon, UserIcon, LogOutIcon, SparklesIcon } from './icons';
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
    <header className="w-full py-3.5 px-4 md:px-8 bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200/70 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
              <div className="bg-gray-900 text-white p-2 rounded-xl shadow-sm">
                <ShirtIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-serif font-bold tracking-[0.15em] text-gray-900 leading-none">
                    ENZO MILANO
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">
                    Provador 3D
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mt-0.5 hidden xs:block">
                  Atelier Virtual de Corpo Inteiro
                </span>
              </div>
          </div>

          {/* User Profile & Badges */}
          <div className="flex items-center gap-3 relative">
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                  <SparklesIcon className="w-3 h-3 text-emerald-600" />
                  <span>Enquadramento Head-to-Toe</span>
                </div>

                {isEditingName ? (
                    <form onSubmit={handleNameSubmit} className="flex gap-1.5">
                        <input 
                            value={tempName} 
                            onChange={e => setTempName(e.target.value)} 
                            className="text-xs font-semibold border border-gray-300 rounded-xl px-3 py-1.5 outline-none focus:border-gray-900 bg-gray-50"
                            autoFocus
                            placeholder="Seu nome"
                        />
                        <button type="submit" className="text-xs font-bold bg-gray-900 text-white px-3 py-1.5 rounded-xl hover:bg-black">
                          Salvar
                        </button>
                    </form>
                ) : (
                    <div 
                      onClick={() => setIsEditingName(true)}
                      className="flex flex-col items-end cursor-pointer group"
                      title="Clique para editar seu nome"
                    >
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Cliente</span>
                        <span className="text-xs font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                          {currentUser}
                        </span>
                    </div>
                )}
                
                <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-black transition-all"
                    aria-label="Menu do usuário"
                >
                    <UserIcon className="w-4 h-4" />
                </button>

                <AnimatePresence>
                    {isUserMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden py-1.5 z-50"
                        >
                            <button 
                                onClick={() => { setIsEditingName(true); setIsUserMenuOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                            >
                                <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                                <span>Alterar Nome</span>
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors font-semibold border-t border-gray-100"
                            >
                                <LogOutIcon className="w-3.5 h-3.5 text-red-500" />
                                <span>Redefinir Sessão</span>
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
