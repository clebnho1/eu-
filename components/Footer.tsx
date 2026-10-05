/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparklesIcon, ShirtIcon } from './icons';

interface FooterProps {
  isOnDressingScreen?: boolean;
}

const Footer: React.FC<FooterProps> = ({ isOnDressingScreen = false }) => {
  return (
    <footer className={`bg-white border-t border-gray-200/80 py-3 px-4 z-40 ${isOnDressingScreen ? 'hidden md:block' : ''}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
        <div className="flex items-center gap-2">
          <ShirtIcon className="w-3.5 h-3.5 text-gray-700" />
          <span className="font-semibold text-gray-800">
            Provador Virtual • Enzo Milano Experience
          </span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span className="hidden sm:inline text-gray-400">
            Alfaiataria Masculina & Moda Contemporânea
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-gray-500 font-medium">
          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-semibold">
            <SparklesIcon className="w-3 h-3 text-emerald-500" />
            <span>Corpo Inteiro (Head-to-Toe)</span>
          </div>
          <span className="hidden sm:inline">Lupa de Alta Resolução Ativa</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
