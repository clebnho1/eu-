/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useCallback } from 'react';
import { 
  RotateCcwIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  UndoIcon, 
  SearchIcon, 
  DownloadIcon, 
  MaximizeIcon, 
  XIcon, 
  SparklesIcon 
} from './icons';
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
  const [isZoomEnabled, setIsZoomEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(3.5); // Default 3.5x
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);
  
  // High-precision zoom coordinate state
  const [zoomData, setZoomData] = useState<{
    xPerc: number;
    yPerc: number;
    lensX: number;
    lensY: number;
    show: boolean;
  }>({
    xPerc: 50,
    yPerc: 50,
    lensX: 0,
    lensY: 0,
    show: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Exact pixel-to-percentage mapping strictly based on the rendered image rect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isZoomEnabled || isLoading || !displayImageUrl || !imgRef.current || !containerRef.current) {
      return;
    }

    const img = imgRef.current;
    const container = containerRef.current;
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Check if pointer is strictly within image boundaries
    if (
      e.clientX < imgRect.left ||
      e.clientX > imgRect.right ||
      e.clientY < imgRect.top ||
      e.clientY > imgRect.bottom
    ) {
      setZoomData(prev => (prev.show ? { ...prev, show: false } : prev));
      return;
    }

    const mouseImgX = e.clientX - imgRect.left;
    const mouseImgY = e.clientY - imgRect.top;

    const xPerc = Math.max(0, Math.min(100, (mouseImgX / imgRect.width) * 100));
    const yPerc = Math.max(0, Math.min(100, (mouseImgY / imgRect.height) * 100));

    // Lens position relative to container
    const lensX = e.clientX - containerRect.left;
    const lensY = e.clientY - containerRect.top;

    setZoomData({
      xPerc,
      yPerc,
      lensX,
      lensY,
      show: true,
    });
  }, [isZoomEnabled, isLoading, displayImageUrl]);

  const handleMouseLeave = useCallback(() => {
    setZoomData(prev => ({ ...prev, show: false }));
  }, []);

  const handlePreviousPose = () => {
    if (isLoading || availablePoseKeys.length <= 1) return;

    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);
    
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

    if (currentIndexInAvailable === -1 || availablePoseKeys.length === 0) {
        onSelectPose((currentPoseIndex + 1) % poseInstructions.length);
        return;
    }
    
    const nextIndexInAvailable = currentIndexInAvailable + 1;
    if (nextIndexInAvailable < availablePoseKeys.length) {
        const nextPoseInstruction = availablePoseKeys[nextIndexInAvailable];
        const newGlobalPoseIndex = poseInstructions.indexOf(nextPoseInstruction);
        if (newGlobalPoseIndex !== -1) {
            onSelectPose(newGlobalPoseIndex);
        }
    } else {
        const newGlobalPoseIndex = (currentPoseIndex + 1) % poseInstructions.length;
        onSelectPose(newGlobalPoseIndex);
    }
  };

  // Download high-res look to device
  const handleDownload = () => {
    if (!displayImageUrl) return;
    const link = document.createElement('a');
    link.href = displayImageUrl;
    link.download = `meu-look-provador-virtual-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lensSize = 220;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center p-3 md:p-6 relative select-none overflow-hidden bg-gradient-to-b from-gray-50 via-gray-100/70 to-gray-50"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Left: Start Over & Brand Indicator */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <button 
          onClick={onStartOver}
          className="flex items-center gap-2 bg-white/90 border border-gray-200/80 text-gray-800 font-semibold py-2 px-4 rounded-full transition-all duration-200 hover:bg-white hover:border-gray-400 active:scale-95 text-xs shadow-sm backdrop-blur-md"
          title="Subir nova foto de modelo"
        >
          <RotateCcwIcon className="w-3.5 h-3.5" />
          <span>Trocar Modelo</span>
        </button>

        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 text-[10px] font-bold uppercase tracking-wider text-gray-600 border border-black/5">
          <SparklesIcon className="w-3 h-3 text-amber-500" />
          <span>Enquadramento Corpo Inteiro</span>
        </div>
      </div>

      {/* Top Right Controls: Undo, Zoom Toggle, Zoom Level, Fullscreen & Download */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2 flex-wrap justify-end">
        {canUndo && (
          <button 
            onClick={onUndo}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-white/90 border border-gray-200/80 text-gray-700 font-medium py-2 px-3.5 rounded-full transition-all duration-200 hover:bg-white hover:text-red-600 active:scale-95 text-xs shadow-sm backdrop-blur-md disabled:opacity-50"
            title="Desfazer última peça provada"
          >
            <UndoIcon className="w-3.5 h-3.5" />
            <span>Desfazer</span>
          </button>
        )}

        {/* Zoom Magnifier Toggle & Level */}
        {displayImageUrl && (
          <div className="flex items-center bg-white/90 border border-gray-200/80 rounded-full p-1 shadow-sm backdrop-blur-md">
            <button 
              onClick={() => setIsZoomEnabled(!isZoomEnabled)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                isZoomEnabled 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Ativar/desativar lupa inteligente"
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span>{isZoomEnabled ? 'Lupa Ativa' : 'Lupa'}</span>
            </button>

            {isZoomEnabled && (
              <div className="hidden sm:flex items-center gap-1 pl-1.5 pr-1 border-l border-gray-200 ml-1">
                {[2.5, 4, 6].map((level) => (
                  <button
                    key={level}
                    onClick={() => setZoomLevel(level)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors ${
                      zoomLevel === level 
                        ? 'bg-gray-200 text-gray-900' 
                        : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {level}x
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fullscreen Preview */}
        {displayImageUrl && (
          <button
            onClick={() => setIsFullModalOpen(true)}
            className="p-2 rounded-full bg-white/90 border border-gray-200/80 text-gray-700 hover:bg-white hover:text-gray-900 shadow-sm transition-all active:scale-95"
            title="Ver look em tela cheia"
          >
            <MaximizeIcon className="w-4 h-4" />
          </button>
        )}

        {/* Download Look */}
        {displayImageUrl && (
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-white/90 border border-gray-200/80 text-gray-700 hover:bg-white hover:text-gray-900 shadow-sm transition-all active:scale-95"
            title="Baixar imagem do look"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Full-Body Model Canvas */}
      <div className="relative w-full h-full flex items-center justify-center max-w-2xl max-h-[85vh]">
        {displayImageUrl ? (
          <div className="relative w-full h-full flex items-center justify-center p-2">
            <img
              ref={imgRef}
              key={displayImageUrl}
              src={displayImageUrl}
              alt="Avatar de provador virtual de corpo inteiro"
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-2xl transition-opacity duration-300 border border-white/60 bg-white"
              style={{
                filter: isLoading ? 'blur(2px)' : 'none',
              }}
            />

            {/* Precision Magnifier Lens (Floats exactly on top of mouse with image centered) */}
            <AnimatePresence>
              {zoomData.show && isZoomEnabled && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute pointer-events-none z-40 rounded-full border-4 border-white shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden"
                  style={{
                    width: lensSize,
                    height: lensSize,
                    left: zoomData.lensX - lensSize / 2,
                    top: zoomData.lensY - lensSize / 2,
                    backgroundImage: `url(${displayImageUrl})`,
                    backgroundPosition: `${zoomData.xPerc}% ${zoomData.yPerc}%`,
                    backgroundSize: `${zoomLevel * 100}%`,
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  {/* Subtle glass reflection & crosshair center */}
                  <div className="w-full h-full relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/30 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40">
                      <div className="w-full h-[1px] bg-white absolute top-1/2 left-0 -translate-y-1/2" />
                      <div className="h-full w-[1px] bg-white absolute left-1/2 top-0 -translate-x-1/2" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="w-[320px] sm:w-[400px] h-[520px] sm:h-[620px] bg-white border border-gray-200/80 rounded-3xl flex flex-col items-center justify-center shadow-lg p-6 text-center">
            <Spinner />
            <p className="text-lg font-serif text-gray-800 mt-4 font-bold">Processando Modelo...</p>
            <p className="text-xs text-gray-400 mt-2 max-w-xs">Garantindo proporções anatômicas de corpo inteiro da cabeça aos pés.</p>
          </div>
        )}
        
        {/* Loading Overlay with Luxury Styling */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 bg-white/85 backdrop-blur-md flex flex-col items-center justify-center z-40 rounded-3xl p-6 text-center shadow-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="relative p-6 bg-white rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center max-w-sm">
                <Spinner />
                <h4 className="text-xl font-serif font-bold text-gray-900 mt-4 tracking-wide">
                  Enzo Milano Atelier
                </h4>
                {loadingMessage && (
                  <p className="text-sm font-medium text-gray-600 mt-2 leading-relaxed">
                    {loadingMessage}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-gray-400 uppercase tracking-widest font-semibold">
                  <SparklesIcon className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span>Ajustando caimento de corpo inteiro</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Pose Navigation & Selector */}
      {displayImageUrl && !isLoading && (
        <div 
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30"
          onMouseEnter={() => setIsPoseMenuOpen(true)}
          onMouseLeave={() => setIsPoseMenuOpen(false)}
        >
          {/* Pose Selector Popover */}
          <AnimatePresence>
            {isPoseMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl p-2.5 border border-gray-200/80 shadow-2xl"
              >
                <div className="px-2 py-1 mb-1 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Poses de Estúdio</span>
                  <span className="text-[10px] text-gray-400 font-medium">Corpo Inteiro</span>
                </div>
                <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto pr-1">
                  {poseInstructions.map((pose, index) => {
                    const isSelected = index === currentPoseIndex;
                    const isGenerated = availablePoseKeys.includes(pose);
                    return (
                      <button
                        key={pose}
                        onClick={() => {
                          onSelectPose(index);
                          setIsPoseMenuOpen(false);
                        }}
                        disabled={isLoading || isSelected}
                        className={`w-full text-left text-xs font-semibold p-2.5 rounded-xl transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-gray-900 text-white shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="truncate pr-2">{pose}</span>
                        {isSelected ? (
                          <span className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />
                        ) : isGenerated ? (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold">Pronta</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Main Floating Pill Bar */}
          <div className="bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-xl rounded-full px-5 py-2.5 flex items-center gap-4 transition-all duration-300 hover:shadow-2xl">
            <button 
              onClick={handlePreviousPose}
              disabled={isLoading}
              className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-transform text-gray-700 disabled:opacity-30"
              aria-label="Pose anterior"
              title="Pose anterior"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            
            <div 
              onClick={() => setIsPoseMenuOpen(!isPoseMenuOpen)}
              className="flex flex-col items-center min-w-[130px] sm:min-w-[170px] cursor-pointer"
            >
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Ângulo & Pose
              </span>
              <span className="text-xs font-bold text-gray-900 truncate w-full text-center">
                {poseInstructions[currentPoseIndex]}
              </span>
            </div>

            <button 
              onClick={handleNextPose}
              disabled={isLoading}
              className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-transform text-gray-700 disabled:opacity-30"
              aria-label="Próxima pose"
              title="Próxima pose"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen High-Resolution Modal */}
      <AnimatePresence>
        {isFullModalOpen && displayImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsFullModalOpen(false)}
          >
            <div 
              className="relative max-w-4xl max-h-[92vh] flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setIsFullModalOpen(false)}
                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors bg-white/10 rounded-full"
              >
                <XIcon className="w-6 h-6" />
              </button>

              <img
                src={displayImageUrl}
                alt="Visualização ampliada do look"
                className="max-h-[85vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/20"
              />

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-full font-bold text-xs hover:bg-gray-100 transition-all shadow-lg active:scale-95"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Baixar Look em Alta Resolução</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Canvas;
