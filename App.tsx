/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import Header from './components/Header';
import { generateVirtualTryOnImage, generatePoseVariation } from './services/geminiService';
import { getUserWardrobe, addUserItem, removeUserItem, updateUserItem } from './services/storage';
import { defaultWardrobe } from './wardrobe';
import { OutfitLayer, WardrobeItem } from './types';
import { ChevronDownIcon, ChevronUpIcon, ShirtIcon } from './components/icons';
import Footer from './components/Footer';
import { getFriendlyErrorMessage } from './lib/utils';

const POSE_INSTRUCTIONS = [
  "Vista frontal clássica, postura ereta de estúdio",
  "Levemente virado, vista 3/4 elegante",
  "Perfil lateral de moda",
  "Caminhando em direção à câmera",
  "Encostado na parede de estúdio",
  "Vista frontal com braços cruzados",
];

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);
  return matches;
};

const App: React.FC = () => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);

  // Auth & Wardrobe State
  const [currentUser, setCurrentUser] = useState('Convidado VIP');
  const [userWardrobe, setUserWardrobe] = useState<WardrobeItem[]>([]);

  // Load user wardrobes
  useEffect(() => {
    setUserWardrobe(getUserWardrobe(currentUser));
  }, [currentUser]);

  // When switching to mobile, collapse sheet by default so avatar is visible
  useEffect(() => {
    if (isMobile) {
      setIsSheetCollapsed(true);
    } else {
      setIsSheetCollapsed(false);
    }
  }, [isMobile]);

  const activeOutfitLayers = useMemo(() => {
    return outfitHistory.slice(0, currentOutfitIndex + 1);
  }, [outfitHistory, currentOutfitIndex]);

  const activeGarmentIds = useMemo(() => {
    return activeOutfitLayers
      .map(layer => layer.garment?.id)
      .filter(Boolean) as string[];
  }, [activeOutfitLayers]);
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;
    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    if (outfitHistory.length === 0) return [];
    const currentLayer = outfitHistory[currentOutfitIndex];
    return currentLayer ? Object.keys(currentLayer.poseImages) : [];
  }, [outfitHistory, currentOutfitIndex]);

  const handleModelFinalized = (url: string) => {
    setModelImageUrl(url);
    setOutfitHistory([{ garment: null, poseImages: { [POSE_INSTRUCTIONS[0]]: url } }]);
    setCurrentOutfitIndex(0);
  };

  const handleStartOver = () => {
    setModelImageUrl(null); 
    setOutfitHistory([]); 
    setCurrentOutfitIndex(0);
    setIsLoading(false); 
    setLoadingMessage(''); 
    setError(null);
    setCurrentPoseIndex(0); 
    setIsSheetCollapsed(false);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;
    
    // Check if next layer already matches
    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id && nextLayer.garment?.targetColor === garmentInfo.targetColor) {
        setCurrentOutfitIndex(prev => prev + 1); 
        setCurrentPoseIndex(0); 
        return;
    }

    setError(null); 
    setIsLoading(true); 
    setLoadingMessage(`Vestindo ${garmentInfo.name} no avatar de corpo inteiro...`);
    
    try {
      const newImageUrl = await generateVirtualTryOnImage(
        displayImageUrl, 
        garmentFile, 
        garmentInfo.category, 
        garmentInfo.targetColor
      );
      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        poseImages: { [currentPoseInstruction]: newImageUrl } 
      };
      
      setOutfitHistory(prev => [...prev.slice(0, currentOutfitIndex + 1), newLayer]);
      setCurrentOutfitIndex(prev => prev + 1);
    } catch (err) { 
      setError(getFriendlyErrorMessage(err, 'Falha ao aplicar peça ao modelo. Verifique a conexão e tente novamente.')); 
    } finally { 
      setIsLoading(false); 
    }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex]);

  // User Handlers
  const handleAddUserItem = async (item: Omit<WardrobeItem, 'url' | 'id'>, file: File) => {
      setIsLoading(true); 
      try { 
        setUserWardrobe(await addUserItem(currentUser, item, file)); 
      } finally { 
        setIsLoading(false); 
      }
  };

  const handleUpdateUserItem = async (id: string, updates: Partial<WardrobeItem>, file?: File) => {
      setIsLoading(true); 
      try { 
        setUserWardrobe(await updateUserItem(currentUser, id, updates, file)); 
      } finally { 
        setIsLoading(false); 
      }
  };

  const handleRemoveUserItem = (id: string) => {
    setUserWardrobe(removeUserItem(currentUser, id));
  };

  const handleRemoveLastGarment = () => { 
    if (currentOutfitIndex > 0) { 
      setCurrentOutfitIndex(prev => prev - 1); 
      setCurrentPoseIndex(0); 
    } 
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (currentLayer.poseImages[poseInstruction]) { 
      setCurrentPoseIndex(newIndex); 
      return; 
    }
    
    const baseImage = Object.values(currentLayer.poseImages)[0] as string | undefined;
    if (!baseImage) return;

    setError(null); 
    setIsLoading(true); 
    setLoadingMessage(`Gerando nova pose de estúdio em corpo inteiro...`);

    try {
      const newImageUrl = await generatePoseVariation(baseImage, poseInstruction);
      setOutfitHistory(prev => {
        const next = [...prev]; 
        next[currentOutfitIndex].poseImages[poseInstruction] = newImageUrl; 
        return next;
      });
      setCurrentPoseIndex(newIndex);
    } catch (err) { 
      setError(getFriendlyErrorMessage(err, 'Falha ao mudar pose do modelo')); 
    } finally { 
      setIsLoading(false); 
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex]);

  return (
    <div className="font-sans h-screen flex flex-col bg-white overflow-hidden">
      {modelImageUrl && (
        <Header 
          currentUser={currentUser} 
          onUserChange={setCurrentUser} 
          isAdmin={false} 
          onAdminToggle={() => {}} 
        />
      )}

      <AnimatePresence mode="wait">
        {!modelImageUrl ? (
          <motion.div 
            key="start" 
            className="flex-grow flex items-center justify-center p-4 bg-gradient-to-b from-gray-50 via-gray-100/50 to-gray-50 overflow-auto" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
          >
            <StartScreen onModelFinalized={handleModelFinalized} />
          </motion.div>
        ) : (
          <motion.div 
            key="app" 
            className="relative flex-grow flex flex-col overflow-hidden" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
          >
            <main className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
              {/* Full-Body Avatar Canvas View */}
              <div className="w-full h-full flex-grow flex items-center justify-center relative overflow-hidden">
                <Canvas 
                  displayImageUrl={displayImageUrl} 
                  onStartOver={handleStartOver} 
                  isLoading={isLoading} 
                  loadingMessage={loadingMessage} 
                  onSelectPose={handlePoseSelect} 
                  poseInstructions={POSE_INSTRUCTIONS} 
                  currentPoseIndex={currentPoseIndex} 
                  availablePoseKeys={availablePoseKeys} 
                  onUndo={handleRemoveLastGarment} 
                  canUndo={currentOutfitIndex > 0} 
                />
              </div>

              {/* Mobile Floating Toggle for Wardrobe */}
              {isMobile && isSheetCollapsed && (
                <button
                  onClick={() => setIsSheetCollapsed(false)}
                  className="absolute bottom-5 right-5 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-gray-900 text-white font-bold text-xs shadow-2xl active:scale-95 border border-white/20"
                >
                  <ShirtIcon className="w-4 h-4" />
                  <span>Abrir Guarda-Roupa</span>
                </button>
              )}

              {/* Side Panel: Wardrobe & Outfit Stack */}
              <aside 
                className={`absolute md:relative bottom-0 right-0 h-[80vh] md:h-full w-full md:w-[440px] bg-white border-t md:border-t-0 md:border-l border-gray-200/80 flex flex-col z-30 transition-transform duration-300 ease-in-out ${
                  isSheetCollapsed ? 'translate-y-[calc(100%-3rem)]' : 'translate-y-0'
                } md:translate-y-0 shadow-2xl md:shadow-none`}
              >
                  {/* Mobile Drag Bar */}
                  <button 
                    onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                    className="md:hidden w-full h-12 flex items-center justify-between px-5 bg-white border-b border-gray-100 font-bold text-xs text-gray-800"
                  >
                    <span className="flex items-center gap-2">
                      <ShirtIcon className="w-4 h-4 text-gray-600" />
                      <span>Coleção Enzo Milano</span>
                    </span>
                    {isSheetCollapsed ? (
                      <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                    )}
                  </button>

                  <div className="flex flex-col h-full overflow-hidden p-4 sm:p-5">
                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 mb-4 rounded-2xl text-xs font-bold border border-red-200/80 flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 ml-2">✕</button>
                      </div>
                    )}
                    
                    {/* Active Layers Stack */}
                    <div className="flex-shrink-0 mb-4">
                      <OutfitStack 
                        outfitHistory={activeOutfitLayers} 
                        onRemoveLastGarment={handleRemoveLastGarment} 
                      />
                    </div>

                    {/* Wardrobe Catalog Tabs */}
                    <div className="flex-grow overflow-hidden flex flex-col">
                        <WardrobePanel 
                            onGarmentSelect={handleGarmentSelect} 
                            activeGarmentIds={activeGarmentIds} 
                            isLoading={isLoading} 
                            defaultWardrobe={defaultWardrobe} 
                            userWardrobe={userWardrobe} 
                            currentUser={currentUser} 
                            isAdmin={false}
                            onAddUserItem={handleAddUserItem} 
                            onUpdateUserItem={handleUpdateUserItem} 
                            onRemoveUserItem={handleRemoveUserItem}
                        />
                    </div>
                  </div>
              </aside>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer isOnDressingScreen={!!modelImageUrl} />
    </div>
  );
};

export default App;
