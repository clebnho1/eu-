
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon } from './icons';
import { Compare } from './ui/compare';
import { generateModelImage } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface StartScreenProps {
  onModelFinalized: (modelUrl: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized }) => {
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione um arquivo de imagem.');
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
            setError(getFriendlyErrorMessage(err, 'Falha ao processar foto'));
            setUserImageUrl(null);
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

  const reset = () => {
    setUserImageUrl(null);
    setGeneratedModelUrl(null);
    setIsGenerating(false);
    setError(null);
  };

  return (
    <AnimatePresence mode="wait">
      {!userImageUrl ? (
        <motion.div
          key="uploader"
          className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="lg:w-1/2 text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 leading-tight">
              Seu Provador Pessoal.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Envie uma foto sua e experimente qualquer look instantaneamente. Nossa IA preserva sua aparência enquanto troca suas roupas.
            </p>
            <div className="mt-8 flex flex-col gap-4">
                <label htmlFor="image-upload-start" className="flex items-center justify-center px-8 py-4 bg-gray-900 text-white rounded-2xl cursor-pointer hover:bg-black transition-all font-bold">
                  <UploadCloudIcon className="w-5 h-5 mr-3" />
                  Escolher Minha Foto
                </label>
                <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                <p className="text-gray-400 text-xs text-center lg:text-left">Use uma foto de corpo inteiro com fundo simples para melhores resultados.</p>
                {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex justify-center">
            <Compare
              firstImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon.jpg"
              secondImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon-model.png"
              className="w-full max-w-sm aspect-[2/3] rounded-3xl bg-gray-100 shadow-2xl"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="compare"
          className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="md:w-1/2 text-center md:text-left">
            <h2 className="text-4xl font-serif font-bold mb-4">Quase lá...</h2>
            {isGenerating ? (
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <Spinner />
                <span className="font-bold text-gray-600">Removendo o fundo da sua foto...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-600">Confira se o avatar está correto. Agora você pode ir para o provador e escolher as roupas.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={reset} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Trocar Foto</button>
                  <button onClick={() => onModelFinalized(generatedModelUrl || userImageUrl)} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-lg">Começar a Vestir &rarr;</button>
                </div>
              </div>
            )}
          </div>
          <div className="md:w-1/2">
            <Compare
              firstImage={userImageUrl}
              secondImage={generatedModelUrl || userImageUrl}
              className="w-[300px] h-[450px] md:w-[400px] md:h-[600px] rounded-3xl shadow-2xl bg-gray-100"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartScreen;
