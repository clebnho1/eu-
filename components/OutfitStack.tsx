/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { OutfitLayer } from '../types';
import { Trash2Icon, ShirtIcon } from './icons';

interface OutfitStackProps {
  outfitHistory: OutfitLayer[];
  onRemoveLastGarment: () => void;
}

const OutfitStack: React.FC<OutfitStackProps> = ({ outfitHistory, onRemoveLastGarment }) => {
  const garmentLayers = outfitHistory.filter(layer => layer.garment !== null);

  return (
    <div className="flex flex-col bg-gray-50/70 border border-gray-200/80 rounded-2xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/60">
        <div className="flex items-center gap-1.5">
          <ShirtIcon className="w-3.5 h-3.5 text-gray-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
            Look em Composição ({garmentLayers.length} {garmentLayers.length === 1 ? 'peça' : 'peças'})
          </h3>
        </div>
        {garmentLayers.length > 0 && (
          <button
            onClick={onRemoveLastGarment}
            className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
            title="Desfazer última peça"
          >
            <Trash2Icon className="w-3 h-3" />
            <span>Remover Última</span>
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {outfitHistory.map((layer, index) => {
          const isBase = layer.garment === null;
          const isLatest = index === outfitHistory.length - 1 && !isBase;

          return (
            <div
              key={layer.garment?.id || 'base-avatar'}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                isLatest 
                  ? 'bg-white border-gray-300 shadow-sm' 
                  : isBase 
                    ? 'bg-gray-100/60 border-transparent text-gray-500' 
                    : 'bg-white/80 border-gray-200/70'
              }`}
            >
              <div className="flex items-center overflow-hidden gap-2.5">
                <span className={`flex-shrink-0 flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full ${
                  isBase ? 'bg-gray-200 text-gray-600' : 'bg-gray-900 text-white'
                }`}>
                  {index === 0 ? '0' : index}
                </span>

                {layer.garment ? (
                  <img 
                    src={layer.garment.url} 
                    alt={layer.garment.name} 
                    className="w-8 h-8 object-cover rounded-lg border border-gray-100 flex-shrink-0" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0 text-[10px] font-bold">
                    IA
                  </div>
                )}

                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-gray-900 truncate">
                    {layer.garment ? layer.garment.name : 'Avatar Base'}
                  </span>
                  {layer.garment && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      {layer.garment.subCategory || layer.garment.category} • {layer.garment.price || ''}
                    </span>
                  )}
                </div>
              </div>

              {isLatest && (
                <button
                  onClick={onRemoveLastGarment}
                  className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  aria-label="Remover peça"
                >
                  <Trash2Icon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {garmentLayers.length === 0 && (
          <p className="text-center text-[11px] text-gray-400 py-1 font-medium">
            Selecione camisas, blazers ou calçados abaixo para vestir o avatar.
          </p>
        )}
      </div>
    </div>
  );
};

export default OutfitStack;
