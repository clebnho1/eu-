
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef } from 'react';
import { RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon, UndoIcon, SearchIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  availablePoseKeys: string[];
  onUndo: () => void;
  canUndo: boolean;
}

const Canvas: React.FC<CanvasProps> = ({ 
  displayImageUrl, 
  onStartOver, 
  isLoading, 
  loadingMessage, 
  onSelectPose, 
  poseInstructions, 
  currentPoseIndex, 
  availablePoseKeys,
  onUndo,
  canUndo
}) => {
  const [isPoseMenuOpen, setIsPoseMenuOpen] = useState(false);
  const [zoomData, setZoomData] = useState({ x: 0, y: 0, mouseX: 0, mouseY: 0, show: false });
  const [isZoomEnabled, setIsZoomEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isZoomEnabled || isLoading || !displayImageUrl || !containerRef.current) return;
    
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    
    // Calculate percentage for background position
    const xPerc = (x / width) * 100;
    const yPerc = (y / height) * 100;
    
    setZoomData({ x: xPerc, y: yPerc, mouseX: x, mouseY: y, show: true });
  };

  const handlePreviousPose = () => {
    if (isLoading || availablePoseKeys.length <= 1) return;

    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);
    
    // Fallback if current pose not in available list (shouldn't happen)
    if (currentIndexInAvailable === -1) {
        onSelectPose((currentPoseIndex - 1 + poseInstructions.length) % poseInstructions.length);
        return;
    }

    const prevIndexInAvailable = (currentIndexInAvailable - 1 + availablePoseKeys.length) % availablePoseKeys.length;
    const prevPoseInstruction = availablePoseKeys[prevIndexInAvailable];
    const newGlobalPoseIndex = poseInstructions.indexOf(prevPoseInstruction);
    
    if (newGlobalPoseIndex !== -1) {
        onSelectPose(newGlobalPoseIndex);
    }
  };

  const handleNextPose = () => {
    if (isLoading) return;

    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);

    // Fallback or if there are no generated poses yet
    if (currentIndexInAvailable === -1 || availablePoseKeys.length === 0) {
        onSelectPose((currentPoseIndex + 1) % poseInstructions.length);
        return;
    }
    
    const nextIndexInAvailable = currentIndexInAvailable + 1;
    if (nextIndexInAvailable < availablePoseKeys.length) {
        // There is another generated pose, navigate to it
        const nextPoseInstruction = availablePoseKeys[nextIndexInAvailable];
        const newGlobalPoseIndex = poseInstructions.indexOf(nextPoseInstruction);
        if (newGlobalPoseIndex !== -1) {
            onSelectPose(newGlobalPoseIndex);
        }
    } else {
        // At the end of generated poses, generate the next one from the master list
        const newGlobalPoseIndex = (currentPoseIndex + 1) % poseInstructions.length;
        onSelectPose(newGlobalPoseIndex);
    }
  };
  
  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative animate-zoom-in group">
      {/* Start Over Button */}
      <button 
          onClick={onStartOver}
          className="absolute top-4 left-4 z-30 flex items-center justify-center text-center bg-white/60 border border-gray-300/80 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white hover:border-gray-400 active:scale-95 text-sm backdrop-blur-sm"
      >
          <RotateCcwIcon className="w-4 h-4 mr-2" />
          Recomeçar
      </button>

      {/* Undo Button */}
      {canUndo && (
          <button 
              onClick={onUndo}
              disabled={isLoading}
              className="absolute top-4 right-4 z-30 flex items-center justify-center text-center bg-white/60 border border-gray-300/80 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white hover:border-gray-400 active:scale-95 text-sm backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
              <UndoIcon className="w-4 h-4 mr-2" />
              Desfazer
          </button>
      )}

      {/* Zoom Toggle Button */}
      {displayImageUrl && (
          <button 
              onClick={() => setIsZoomEnabled(!isZoomEnabled)}
              className={`absolute top-16 right-4 z-30 flex items-center justify-center text-center border font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out active:scale-95 text-sm backdrop-blur-sm ${
                isZoomEnabled 
                ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700' 
                : 'bg-white/60 border-gray-300/80 text-gray-700 hover:bg-white hover:border-gray-400'
              }`}
              title={isZoomEnabled ? "Desativar Zoom" : "Ativar Zoom"}
          >
              <SearchIcon className="w-4 h-4 mr-2" />
              {isZoomEnabled ? 'Zoom Ativo' : 'Ativar Zoom'}
          </button>
      )}

      {/* Image Display or Placeholder */}
      <div 
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center cursor-crosshair overflow-hidden rounded-lg"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setZoomData(prev => ({ ...prev, show: true }))}
        onMouseLeave={() => setZoomData(prev => ({ ...prev, show: false }))}
      >
        {displayImageUrl ? (
          <>
            <img
              key={displayImageUrl} // Use key to force re-render and trigger animation on image change
              src={displayImageUrl}
              alt="Modelo de provador virtual"
              className="max-w-full max-h-full object-contain transition-opacity duration-500 animate-fade-in"
            />
            
            {/* Magnifier Lens */}
            <AnimatePresence>
              {zoomData.show && isZoomEnabled && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute pointer-events-none z-40 border-4 border-white shadow-2xl rounded-full overflow-hidden"
                  style={{
                    width: 220,
                    height: 220,
                    left: zoomData.mouseX - 110,
                    top: zoomData.mouseY - 110,
                    backgroundImage: `url(${displayImageUrl})`,
                    backgroundPosition: `${zoomData.x}% ${zoomData.y}%`,
                    backgroundSize: '600%', // Zoom level
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              )}
            </AnimatePresence>
          </>
        ) : (
            <div className="w-[400px] h-[600px] bg-gray-100 border border-gray-200 rounded-lg flex flex-col items-center justify-center">
              <Spinner />
              <p className="text-md font-serif text-gray-600 mt-4">Carregando Modelo...</p>
            </div>
        )}
        
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <Spinner />
                  {loadingMessage && (
                      <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                  )}
              </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pose Controls */}
      {displayImageUrl && !isLoading && (
        <div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onMouseEnter={() => setIsPoseMenuOpen(true)}
          onMouseLeave={() => setIsPoseMenuOpen(false)}
        >
          {/* Pose popover menu */}
          <AnimatePresence>
              {isPoseMenuOpen && (
                  <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute bottom-full mb-3 w-64 bg-white/80 backdrop-blur-lg rounded-xl p-2 border border-gray-200/80"
                  >
                      <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
                          {poseInstructions.map((pose, index) => (
                              <button
                                  key={pose}
                                  onClick={() => onSelectPose(index)}
                                  disabled={isLoading || index === currentPoseIndex}
                                  className={`w-full text-left text-sm font-medium p-2 rounded-md transition-colors flex items-center justify-between ${
                                      index === currentPoseIndex 
                                      ? 'bg-gray-100 text-gray-900' 
                                      : 'text-gray-600 hover:bg-gray-100/50 hover:text-gray-900'
                                  }`}
                              >
                                  <span className="truncate mr-2">{pose}</span>
                                  {index === currentPoseIndex && (
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                                  )}
                              </button>
                          ))}
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
          
          {/* Floating Control Bar */}
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl rounded-full px-6 py-3 flex items-center gap-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer">
               <button 
                   onClick={handlePreviousPose}
                   disabled={isLoading}
                   className="p-1 rounded-full hover:bg-gray-100 active:scale-90 transition-transform text-gray-600 disabled:opacity-30"
                   aria-label="Pose anterior"
               >
                    <ChevronLeftIcon className="w-5 h-5" />
               </button>
               
               <div className="flex flex-col items-center w-32">
                   <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">Pose</span>
                   <span className="text-sm font-semibold text-gray-800 truncate w-full text-center">
                       {poseInstructions[currentPoseIndex]}
                   </span>
               </div>

               <button 
                   onClick={handleNextPose}
                   disabled={isLoading}
                   className="p-1 rounded-full hover:bg-gray-100 active:scale-90 transition-transform text-gray-600 disabled:opacity-30"
                   aria-label="Próxima pose"
               >
                    <ChevronRightIcon className="w-5 h-5" />
               </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
