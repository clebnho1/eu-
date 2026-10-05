
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
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import Footer from './components/Footer';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';

const POSE_INSTRUCTIONS = [
  "Vista frontal, mãos nos quadris",
  "Levemente virado, vista 3/4",
  "Perfil lateral",
  "Pulando no ar, em movimento",
  "Caminhando em direção à câmera",
  "Encostado na parede",
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
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Auth & Wardrobe State
  const [currentUser, setCurrentUser] = useState('Convidado');
  const [userWardrobe, setUserWardrobe] = useState<WardrobeItem[]>([]);

  // Load wardrobes
  useEffect(() => {
      setUserWardrobe(getUserWardrobe(currentUser));
  }, [currentUser]);

  const activeOutfitLayers = useMemo(() => outfitHistory.slice(0, currentOutfitIndex + 1), [outfitHistory, currentOutfitIndex]);
  const activeGarmentIds = useMemo(() => activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], [activeOutfitLayers]);
  
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
    setModelImageUrl(null); setOutfitHistory([]); setCurrentOutfitIndex(0);
    setIsLoading(false); setLoadingMessage(''); setError(null);
    setCurrentPoseIndex(0); setIsSheetCollapsed(false);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;
    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id && nextLayer.garment?.targetColor === garmentInfo.targetColor) {
        setCurrentOutfitIndex(prev => prev + 1); setCurrentPoseIndex(0); return;
    }
    setError(null); setIsLoading(true); setLoadingMessage(`Provando ${garmentInfo.name}...`);
    try {
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, garmentFile, garmentInfo.category, garmentInfo.targetColor);
      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      const newLayer: OutfitLayer = { garment: garmentInfo, poseImages: { [currentPoseInstruction]: newImageUrl } };
      setOutfitHistory(prev => [...prev.slice(0, currentOutfitIndex + 1), newLayer]);
      setCurrentOutfitIndex(prev => prev + 1);
    } catch (err) { setError(getFriendlyErrorMessage(err, 'Falha ao aplicar peça')); } finally { setIsLoading(false); }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex]);

  // User Handlers
  const handleAddUserItem = async (item: Omit<WardrobeItem, 'url' | 'id'>, file: File) => {
      setIsLoading(true); try { setUserWardrobe(await addUserItem(currentUser, item, file)); } finally { setIsLoading(false); }
  };
  const handleUpdateUserItem = async (id: string, updates: Partial<WardrobeItem>, file?: File) => {
      setIsLoading(true); try { setUserWardrobe(await updateUserItem(currentUser, id, updates, file)); } finally { setIsLoading(false); }
  };
  const handleRemoveUserItem = (id: string) => setUserWardrobe(removeUserItem(currentUser, id));

  const handleRemoveLastGarment = () => { if (currentOutfitIndex > 0) { setCurrentOutfitIndex(prev => prev - 1); setCurrentPoseIndex(0); } };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (currentLayer.poseImages[poseInstruction]) { setCurrentPoseIndex(newIndex); return; }
    
    const baseImage = Object.values(currentLayer.poseImages)[0] as string | undefined;
    if (!baseImage) return;
    setError(null); setIsLoading(true); setLoadingMessage(`Mudando pose...`);
    try {
      const newImageUrl = await generatePoseVariation(baseImage, poseInstruction);
      setOutfitHistory(prev => {
        const next = [...prev]; next[currentOutfitIndex].poseImages[poseInstruction] = newImageUrl; return next;
      });
      setCurrentPoseIndex(newIndex);
    } catch (err) { setError(getFriendlyErrorMessage(err, 'Falha ao mudar pose')); } finally { setIsLoading(false); }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex]);

  return (
    <div className="font-sans h-screen flex flex-col bg-white">
      {modelImageUrl && <Header currentUser={currentUser} onUserChange={setCurrentUser} isAdmin={false} onAdminToggle={() => {}} />}
      <AnimatePresence mode="wait">
        {!modelImageUrl ? (
          <motion.div key="start" className="flex-grow flex items-start sm:items-center justify-center p-4 bg-gray-50 pb-20 overflow-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StartScreen onModelFinalized={handleModelFinalized} />
          </motion.div>
        ) : (
          <motion.div key="app" className="relative flex-grow flex flex-col overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <main className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
              <div className="w-full h-full flex-grow flex items-center justify-center relative">
                <Canvas displayImageUrl={displayImageUrl} onStartOver={handleStartOver} isLoading={isLoading} loadingMessage={loadingMessage} onSelectPose={handlePoseSelect} poseInstructions={POSE_INSTRUCTIONS} currentPoseIndex={currentPoseIndex} availablePoseKeys={availablePoseKeys} onUndo={handleRemoveLastGarment} canUndo={currentOutfitIndex > 0} />
              </div>
              <aside className={`absolute md:relative bottom-0 right-0 h-[85vh] md:h-full w-full md:w-[420px] bg-white border-t md:border-t-0 md:border-l border-gray-100 flex flex-col z-30 transition-transform ${isSheetCollapsed ? 'translate-y-[calc(100%-4rem)]' : 'translate-y-0'} md:translate-y-0 shadow-2xl md:shadow-none`}>
                  <button onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} className="md:hidden w-full h-8 flex items-center justify-center bg-gray-50 border-b border-gray-100">{isSheetCollapsed ? <ChevronUpIcon className="w-6 h-6 text-gray-400" /> : <ChevronDownIcon className="w-6 h-6 text-gray-400" />}</button>
                  <div className="flex flex-col h-full overflow-hidden p-6">
                    {error && <div className="bg-red-50 text-red-600 p-4 mb-6 rounded-xl text-xs font-bold border border-red-100">{error}</div>}
                    <div className="flex-shrink-0 mb-6"><OutfitStack outfitHistory={activeOutfitLayers} onRemoveLastGarment={handleRemoveLastGarment} /></div>
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
