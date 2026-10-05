
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REMIX_SUGGESTIONS = [
  "Ideia de Remix: Gere um lookbook compartilhável.",
  "Ideia de Remix: Integre uma API de e-commerce para encontrar itens similares.",
  "Ideia de Remix: Adicione acessórios como chapéus, óculos de sol ou bolsas.",
  "Ideia de Remix: Crie uma 'pontuação de estilo' para os looks.",
  "Ideia de Remix: Permita que usuários salvem seus looks favoritos.",
  "Ideia de Remix: Gere diferentes cores para as roupas.",
];

interface FooterProps {
  isOnDressingScreen?: boolean;
}

const Footer: React.FC<FooterProps> = ({ isOnDressingScreen = false }) => {
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prevIndex) => (prevIndex + 1) % REMIX_SUGGESTIONS.length);
    }, 4000); // Change suggestion every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <footer className={`fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200/60 p-3 z-50 ${isOnDressingScreen ? 'hidden sm:block' : ''}`}>
      <div className="mx-auto flex flex-col sm:flex-row items-center justify-center text-xs text-gray-600 max-w-7xl px-4">
        <div className="h-4 flex items-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={suggestionIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="text-center font-medium"
              >
                {REMIX_SUGGESTIONS[suggestionIndex]}
              </motion.p>
            </AnimatePresence>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
