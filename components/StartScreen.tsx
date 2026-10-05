/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon, SparklesIcon, CheckCircleIcon, ShirtIcon } from './icons';
import { Compare } from './ui/compare';
import { generateModelImage } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface StartScreenProps {
  onModelFinalized: (modelUrl: string) => void;
}

// Preset demonstration models for instant 1-click testing
const PRESET_MODELS = [
  {
    id: 'preset-1',
    name: 'Modelo Casual Urbano',
    gender: 'Masculino',
    thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&auto=format&fit=crop&q=85',
  },
  {
    id: 'preset-2',
    name: 'Modelo Alfaiataria',
    gender: 'Masculino',
    thumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&auto=format&fit=crop&q=85',
  },
  {
    id: 'preset-3',
    name: 'Modelo Clássico',
    gender: 'Feminino',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    fullUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=85',
  }
];

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized }) => {
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione um arquivo de imagem válido (JPEG, PNG ou WEBP).');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setUserImageUrl(dataUrl);
        setIsGenerating(true);
        setGeneratedModelUrl(null);
        setError(null);
        try {
            const result = await generateModelImage(file);
            setGeneratedModelUrl(result);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Falha ao processar o avatar. Você pode tentar prosseguir com a foto original.'));
            // If background removal fails, allow user to continue with original photo
            setGeneratedModelUrl(dataUrl);
        } finally {
            setIsGenerating(false);
        }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSelectPreset = (url: string) => {
    setUserImageUrl(url);
    setGeneratedModelUrl(url);
    onModelFinalized(url);
  };

  const reset = () => {
    setUserImageUrl(null);
    setGeneratedModelUrl(null);
    setIsGenerating(false);
    setError(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
        {!userImageUrl ? (
          <motion.div
            key="uploader"
            className="flex flex-col lg:flex-row items-center justify-between gap-12"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {/* Left Column: Value Proposition & Upload Action */}
            <div className="lg:w-1/2 text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100 border border-brand-200 text-brand-900 text-xs font-bold uppercase tracking-widest">
                <SparklesIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>Atelier Virtual Enzo Milano</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-gray-900 leading-[1.1] tracking-tight">
                Experimente o caimento perfeito em <span className="italic font-normal">corpo inteiro</span>.
              </h1>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xl">
                Envie uma foto sua para criar um avatar fotorrealista. Experimente camisas de linho puro, blazers italianos, calçados e sapatênis com tecnologia que respeita as proporções exatas do seu biotipo.
              </p>

              {/* Upload Dropzone */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-6 transition-all duration-200 text-center flex flex-col items-center justify-center gap-3 bg-white ${
                  isDragOver 
                    ? 'border-gray-900 bg-gray-50 scale-[1.01]' 
                    : 'border-gray-300 hover:border-gray-900 hover:shadow-md'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 shadow-inner">
                  <UploadCloudIcon className="w-7 h-7" />
                </div>

                <div>
                  <label htmlFor="image-upload-main" className="cursor-pointer">
                    <span className="inline-block px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95">
                      Fazer Upload da Minha Foto
                    </span>
                    <input 
                      id="image-upload-main" 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                    />
                  </label>
                  <p className="text-gray-400 text-xs mt-2 font-medium">
                    Ou arraste e solte uma foto de corpo inteiro aqui (JPG ou PNG)
                  </p>
                </div>
              </div>

              {/* Guidelines Badges */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-left">
                <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Enquadramento</span>
                  <span className="text-xs font-bold text-gray-800">Cabeça aos Pés</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Inspeção</span>
                  <span className="text-xs font-bold text-gray-800">Lupa 6x de Tecido</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Coleção</span>
                  <span className="text-xs font-bold text-gray-800">+25 Peças Milano</span>
                </div>
              </div>

              {/* Instant Preset Models */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Ou teste agora com um modelo pronto:
                  </span>
                </div>
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  {PRESET_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => handleSelectPreset(model.fullUrl)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-gray-900 hover:shadow-sm transition-all text-left group"
                    >
                      <img 
                        src={model.thumbnail} 
                        alt={model.name} 
                        className="w-6 h-6 rounded-full object-cover border border-gray-200 group-hover:scale-105 transition-transform" 
                      />
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-black">
                        {model.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-bold">
                  {error}
                </div>
              )}
            </div>

            {/* Right Column: Hero Fashion Preview with Compare Slider */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="relative">
                <Compare
                  firstImage="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80"
                  secondImage="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80"
                  className="w-[320px] sm:w-[380px] h-[480px] sm:h-[560px] rounded-3xl bg-white shadow-2xl border-4 border-white object-cover"
                />
                
                {/* Floating Tag */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-bold shadow-xl border border-white/20 whitespace-nowrap">
                  <span>Arraste para comparar o visual</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="confirm-avatar"
            className="flex flex-col md:flex-row items-center justify-center gap-10"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Confirmation Controls */}
            <div className="md:w-1/2 space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Modelo Pronto para Prova</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 leading-tight">
                Seu avatar foi calibrado em corpo inteiro.
              </h2>

              {isGenerating ? (
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-lg flex flex-col items-center justify-center gap-3">
                  <Spinner />
                  <span className="font-bold text-gray-800 text-sm">
                    Removendo fundo e ajustando enquadramento de estúdio...
                  </span>
                  <span className="text-xs text-gray-400">
                    Garantindo que cabeça, braços, pernas e calçados fiquem 100% visíveis.
                  </span>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Confira a pré-visualização. Em seguida, acesse o catálogo completo da Enzo Milano para provar camisas, blazers, calças e calçados diretamente no seu corpo.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button 
                      onClick={reset} 
                      className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors"
                    >
                      Trocar Foto
                    </button>
                    <button 
                      onClick={() => onModelFinalized(generatedModelUrl || userImageUrl)} 
                      className="px-8 py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                      <ShirtIcon className="w-4 h-4" />
                      <span>Entrar no Provador &rarr;</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Preview */}
            <div className="md:w-1/2 flex justify-center">
              <div className="w-[300px] sm:w-[360px] h-[460px] sm:h-[540px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white relative">
                <img
                  src={generatedModelUrl || userImageUrl}
                  alt="Avatar calibrado"
                  className="w-full h-full object-contain p-2"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StartScreen;
