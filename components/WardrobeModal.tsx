/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import type { WardrobeItem } from '../types';
import { 
  CheckCircleIcon, 
  Trash2Icon, 
  PlusIcon, 
  UploadCloudIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  XIcon, 
  ShirtIcon, 
  ExternalLinkIcon,
  SearchIcon,
  TagIcon,
  SparklesIcon
} from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { extractProductInfoFromUrl } from '../services/geminiService';
import Spinner from './Spinner';

// Bulletproof helper to convert image URL to a File object, with canvas and SVG fallback
const urlToFile = async (url: string, filename: string): Promise<File> => {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type || 'image/png' });
    }

    try {
        const response = await fetch(url);
        if (response.ok) {
            const blob = await response.blob();
            return new File([blob], filename, { type: blob.type || 'image/png' });
        }
    } catch (err) {
        // Fallback to Image element with Canvas export
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || 600;
                canvas.height = img.naturalHeight || 800;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas indisponível'));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], filename, { type: 'image/png' }));
                    } else {
                        reject(new Error('Falha ao extrair imagem do item.'));
                    }
                }, 'image/png');
            } catch (canvasErr) {
                reject(canvasErr);
            }
        };
        img.onerror = () => {
            reject(new Error('Não foi possível carregar a imagem da peça. Tente fazer o upload manual.'));
        };
        img.src = url;
    });
};

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  defaultWardrobe: WardrobeItem[];
  userWardrobe: WardrobeItem[];
  currentUser: string;
  isAdmin: boolean;
  onAddUserItem: (item: Omit<WardrobeItem, 'url' | 'id'>, file: File) => Promise<void>;
  onUpdateUserItem: (itemId: string, updates: Partial<WardrobeItem>, file?: File) => Promise<void>;
  onRemoveUserItem: (itemId: string) => void;
}

const CATEGORY_MAP: Record<string, string[]> = {
    'Vestuário': ['Camisas', 'Blazers', 'Polos', 'Jaquetas', 'Suéteres', 'Camisetas', 'Calças', 'Bermudas', 'Coletes'],
    'Calçados': ['Sapatênis', 'Mocassim', 'Botas', 'Sapatos', 'Tênis'],
    'Acessórios': ['Cintos', 'Óculos', 'Carteiras', 'Bonés', 'Mochilas', 'Pulseiras']
};

const WardrobePanel: React.FC<WardrobePanelProps> = ({ 
    onGarmentSelect, 
    activeGarmentIds, 
    isLoading, 
    defaultWardrobe, 
    userWardrobe,
    onAddUserItem, 
    onRemoveUserItem
}) => {
    const [activeTab, setActiveTab] = useState<'catalog' | 'user' | 'link'>('catalog');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'high'>('all');
    
    // Modal states
    const [selectedDetailItem, setSelectedDetailItem] = useState<WardrobeItem | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Form States
    const [itemFormName, setItemFormName] = useState('');
    const [itemFormDescription, setItemFormDescription] = useState('');
    const [itemFormPrice, setItemFormPrice] = useState('');
    const [itemFormCategory, setItemFormCategory] = useState('Vestuário');
    const [itemFormSubCategory, setItemFormSubCategory] = useState('');
    const [itemFormFile, setItemFormFile] = useState<File | null>(null);
    const [itemFormPreviewUrl, setItemFormPreviewUrl] = useState<string | null>(null);

    // Link States
    const [importUrl, setImportUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);

    const mainCategories = useMemo(() => Object.keys(CATEGORY_MAP), []);

    // Filtered items logic
    const filteredItems = useMemo(() => {
        let items = activeTab === 'user' ? userWardrobe : defaultWardrobe;

        if (activeTab === 'catalog') {
            if (selectedCategory) {
                items = items.filter(i => i.category === selectedCategory);
            }
            if (selectedSubCategory) {
                items = items.filter(i => i.subCategory === selectedSubCategory);
            }
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            items = items.filter(i => 
                i.name.toLowerCase().includes(query) ||
                (i.description && i.description.toLowerCase().includes(query)) ||
                (i.subCategory && i.subCategory.toLowerCase().includes(query)) ||
                (i.composition && i.composition.toLowerCase().includes(query))
            );
        }

        if (priceFilter === 'low') {
            return [...items].sort((a, b) => {
                const pA = parseFloat((a.price || '0').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                const pB = parseFloat((b.price || '0').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                return pA - pB;
            });
        }

        if (priceFilter === 'high') {
            return [...items].sort((a, b) => {
                const pA = parseFloat((a.price || '0').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                const pB = parseFloat((b.price || '0').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                return pB - pA;
            });
        }

        return items;
    }, [activeTab, userWardrobe, defaultWardrobe, selectedCategory, selectedSubCategory, searchQuery, priceFilter]);

    const handleGarmentClick = async (item: WardrobeItem) => {
        if (isLoading || activeGarmentIds.includes(item.id)) return;
        setError(null);
        try {
            const file = await urlToFile(item.url, `${item.id}.png`);
            onGarmentSelect(file, item);
            if (selectedDetailItem) {
                setSelectedDetailItem(null);
            }
        } catch (err: any) { 
            setError(err.message || 'Erro ao carregar a peça para o provador.'); 
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemFormName || !itemFormFile) { 
            setError("Por favor, preencha o nome e selecione uma foto."); 
            return; 
        }
        
        try {
            await onAddUserItem({ 
                name: itemFormName, 
                category: itemFormCategory,
                subCategory: itemFormSubCategory || itemFormCategory,
                description: itemFormDescription,
                price: itemFormPrice || 'Personalizado',
                brand: 'Meu Guarda-Roupa'
            }, itemFormFile);
            setIsFormOpen(false); 
            resetForm();
        } catch (err) { 
            setError("Erro ao salvar a peça no seu armário."); 
        }
    };

    const resetForm = () => {
        setItemFormName('');
        setItemFormDescription('');
        setItemFormPrice('');
        setItemFormCategory('Vestuário');
        setItemFormSubCategory('');
        setItemFormFile(null);
        setItemFormPreviewUrl(null);
        setImportUrl('');
        setError(null);
    };

    const handleExtract = async () => {
        if (!importUrl) return;
        setIsExtracting(true);
        setError(null);
        try {
            const data = await extractProductInfoFromUrl(importUrl);
            setItemFormName(data.title);
            setItemFormDescription(data.description);
            setItemFormPrice(data.price);
            setItemFormPreviewUrl(data.imageUrl);
            
            try {
                const file = await urlToFile(data.imageUrl, 'link_item.png');
                setItemFormFile(file);
            } catch (e) {
                setError("Dados extraídos com sucesso! Por favor, confirme a foto abaixo ou anexe outra.");
            }
            
            setIsFormOpen(true);
        } catch (err: any) {
            setError(err.message || "Não conseguimos ler este link. Tente cadastrar manualmente.");
        } finally {
            setIsExtracting(false);
        }
    };

  return (
    <div className="flex flex-col h-full relative font-sans">
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-2xl mb-3 shadow-inner">
            <button 
                onClick={() => { setActiveTab('catalog'); setSelectedCategory(null); setSelectedSubCategory(null); }} 
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    activeTab === 'catalog' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-800'
                }`}
            >
                <ShirtIcon className="w-3.5 h-3.5" />
                <span>Enzo Milano</span>
            </button>
            
            <button 
                onClick={() => setActiveTab('user')} 
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    activeTab === 'user' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-800'
                }`}
            >
                <TagIcon className="w-3.5 h-3.5" />
                <span>Meu Armário ({userWardrobe.length})</span>
            </button>

            <button 
                onClick={() => { setActiveTab('link'); resetForm(); }} 
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    activeTab === 'link' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-800'
                }`}
            >
                <ExternalLinkIcon className="w-3.5 h-3.5" />
                <span>Via Link</span>
            </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
                <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por peça, tecido, modelo..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-gray-900/10 transition-all placeholder:text-gray-400 font-medium"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                        <XIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <select
                value={priceFilter}
                onChange={e => setPriceFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-700 outline-none cursor-pointer focus:bg-white transition-all"
            >
                <option value="all">Preço: Padrão</option>
                <option value="low">Menor Preço</option>
                <option value="high">Maior Preço</option>
            </select>
        </div>

        {/* Catalog Categories & Subcategories */}
        {activeTab === 'catalog' && (
            <div className="flex flex-col mb-3 gap-2">
                {!selectedCategory ? (
                    <div className="grid grid-cols-3 gap-2">
                        {mainCategories.map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setSelectedCategory(cat)} 
                                className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200/90 rounded-2xl hover:border-gray-900 hover:shadow-sm transition-all gap-1.5 group text-center"
                            >
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-900 group-hover:text-black">
                                    {cat}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {CATEGORY_MAP[cat]?.length || 0} modelos
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => { setSelectedCategory(null); setSelectedSubCategory(null); }} 
                                    className="p-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700"
                                    title="Voltar às categorias principais"
                                >
                                    <ChevronLeftIcon className="w-4 h-4"/>
                                </button>
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                                    {selectedCategory}
                                </h3>
                            </div>
                            <span className="text-[10px] font-semibold text-gray-400">
                                {filteredItems.length} peças encontradas
                            </span>
                        </div>

                        {/* Horizontal Subcategory Chips */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            <button 
                                onClick={() => setSelectedSubCategory(null)} 
                                className={`flex-shrink-0 px-3 py-1 text-[11px] font-bold rounded-full border transition-all ${
                                    !selectedSubCategory 
                                        ? 'bg-gray-900 border-gray-900 text-white shadow-sm' 
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                                }`}
                            >
                                Todos
                            </button>
                            {(CATEGORY_MAP[selectedCategory] || []).map(sub => (
                                <button 
                                    key={sub} 
                                    onClick={() => setSelectedSubCategory(sub)} 
                                    className={`flex-shrink-0 px-3 py-1 text-[11px] font-bold rounded-full border transition-all ${
                                        selectedSubCategory === sub 
                                            ? 'bg-gray-900 border-gray-900 text-white shadow-sm' 
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                                    }`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Link Importer View */}
        {activeTab === 'link' && !isFormOpen && (
             <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200/80 mb-3 shadow-inner">
                <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span>Importador Inteligente de Produtos</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 leading-snug">
                        Cole o link de qualquer loja para nossa IA extrair foto, título, descrição e preço automaticamente.
                    </p>
                </div>
                <div className="flex gap-2">
                    <input 
                        value={importUrl}
                        onChange={e => setImportUrl(e.target.value)}
                        placeholder="https://exemplo.com/produto-camisa..."
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                    />
                    <button 
                        onClick={handleExtract}
                        disabled={!importUrl || isExtracting}
                        className="px-4 py-2 bg-gray-900 text-white rounded-xl disabled:opacity-50 hover:bg-black transition-all shadow-sm font-semibold text-xs flex items-center gap-1.5 active:scale-95"
                    >
                        {isExtracting ? <Spinner /> : <span>Extrair</span>}
                    </button>
                </div>
             </div>
        )}

        {/* User Custom Add Button */}
        {activeTab === 'user' && !isFormOpen && (
            <button 
                onClick={() => { resetForm(); setIsFormOpen(true); }} 
                className="w-full flex items-center justify-center gap-2 py-3 mb-3 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-all font-bold text-xs bg-white shadow-sm"
            >
                <PlusIcon className="w-4 h-4" /> 
                <span>Adicionar Nova Peça ao Armário</span>
            </button>
        )}

        {/* Modal: New Garment Creation Form */}
        <AnimatePresence>
            {isFormOpen && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.96 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.96 }} 
                    className="absolute inset-0 z-40 bg-white flex flex-col rounded-2xl"
                >
                    <div className="flex justify-between items-center p-3 border-b border-gray-100">
                        <h3 className="font-bold text-sm text-gray-900">
                            {importUrl ? 'Salvar Peça Importada' : 'Adicionar Nova Peça'}
                        </h3>
                        <button onClick={() => setIsFormOpen(false)} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200">
                            <XIcon className="w-4 h-4 text-gray-600"/>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <label className="w-full aspect-[4/3] bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-gray-900 transition-all">
                            {itemFormPreviewUrl ? (
                                <div className="relative w-full h-full">
                                    <img src={itemFormPreviewUrl} className="w-full h-full object-contain p-2" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs font-bold">TROCAR FOTO</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <UploadCloudIcon className="w-8 h-8 mx-auto text-gray-400 mb-1.5"/>
                                    <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wider">Clique para anexar foto da roupa</p>
                                </div>
                            )}
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={e => { 
                                    if (e.target.files?.[0]) { 
                                        setItemFormFile(e.target.files[0]); 
                                        setItemFormPreviewUrl(URL.createObjectURL(e.target.files[0])); 
                                    } 
                                }} 
                            />
                        </label>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Nome da Peça</label>
                            <input 
                                value={itemFormName} 
                                onChange={e => setItemFormName(e.target.value)} 
                                placeholder="Ex: Camisa Linho Branco Slim" 
                                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-gray-900/10 font-semibold"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Categoria</label>
                                <select 
                                    value={itemFormCategory} 
                                    onChange={e => { 
                                        setItemFormCategory(e.target.value); 
                                        setItemFormSubCategory(CATEGORY_MAP[e.target.value]?.[0] || ''); 
                                    }}
                                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-2.5 py-2 text-xs outline-none cursor-pointer font-medium"
                                >
                                    {mainCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Subcategoria</label>
                                <select 
                                    value={itemFormSubCategory} 
                                    onChange={e => setItemFormSubCategory(e.target.value)}
                                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-2.5 py-2 text-xs outline-none cursor-pointer font-medium"
                                >
                                    {(CATEGORY_MAP[itemFormCategory] || []).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Preço</label>
                                <input 
                                    value={itemFormPrice} 
                                    onChange={e => setItemFormPrice(e.target.value)} 
                                    placeholder="R$ 489,00" 
                                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none font-semibold"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Descrição / Tecido</label>
                                <input 
                                    value={itemFormDescription} 
                                    onChange={e => setItemFormDescription(e.target.value)} 
                                    placeholder="Ex: 100% Linho com botões madrepérola" 
                                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex gap-2">
                        <button 
                            type="button"
                            onClick={() => setIsFormOpen(false)} 
                            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            onClick={handleFormSubmit} 
                            className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                        >
                            Salvar no Armário
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
            {filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12 text-center">
                    <ShirtIcon className="w-12 h-12 mb-3 text-gray-300 stroke-[1.5]" />
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Nenhuma peça encontrada</p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                        Tente ajustar os filtros ou adicione uma nova peça ao seu armário.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 pb-6">
                    {filteredItems.map(item => {
                        const isBeingWorn = activeGarmentIds.includes(item.id);
                        return (
                            <div 
                                key={item.id} 
                                className={`relative group bg-white border rounded-2xl p-2.5 transition-all duration-300 flex flex-col ${
                                    isBeingWorn 
                                        ? 'border-gray-900 shadow-md ring-2 ring-gray-900/10' 
                                        : 'border-gray-200/80 hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5'
                                }`}
                            >
                                {/* Thumbnail Container */}
                                <div 
                                    onClick={() => handleGarmentClick(item)}
                                    className="w-full aspect-[4/5] rounded-xl overflow-hidden mb-2 relative bg-gray-50 cursor-pointer"
                                >
                                    <img 
                                        src={item.url} 
                                        alt={item.name} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                    />
                                    
                                    {/* Wearing Overlay */}
                                    {isBeingWorn && (
                                        <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2">
                                            <CheckCircleIcon className="w-8 h-8 mb-1 text-emerald-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Vestindo</span>
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                                        {item.isBestSeller && (
                                            <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow uppercase tracking-wider">
                                                Best-Seller
                                            </span>
                                        )}
                                        {item.isNew && (
                                            <span className="bg-gray-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow uppercase tracking-wider">
                                                Novo
                                            </span>
                                        )}
                                    </div>

                                    {/* Price Tag */}
                                    {item.price && (
                                        <div className="absolute bottom-2 right-2 bg-white/95 px-2 py-0.5 rounded-md text-[10px] font-black shadow-sm text-gray-900 border border-gray-100">
                                            {item.price}
                                        </div>
                                    )}
                                </div>

                                {/* Text Info */}
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-900 line-clamp-1 group-hover:text-black">
                                            {item.name}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-medium">
                                            {item.subCategory || item.category}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-1.5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDetailItem(item);
                                            }}
                                            className="text-[10px] font-bold text-gray-500 hover:text-gray-900 underline underline-offset-2"
                                        >
                                            Ver Detalhes
                                        </button>

                                        <button
                                            onClick={() => handleGarmentClick(item)}
                                            disabled={isLoading || isBeingWorn}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                                isBeingWorn
                                                    ? 'bg-gray-100 text-gray-400 cursor-default'
                                                    : 'bg-gray-900 text-white hover:bg-black active:scale-95 shadow-sm'
                                            }`}
                                        >
                                            {isBeingWorn ? 'Vestido' : 'Provar'}
                                        </button>
                                    </div>
                                </div>

                                {/* Remove Button for user items */}
                                {activeTab === 'user' && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveUserItem(item.id);
                                        }} 
                                        className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-lg text-red-500 shadow-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                        title="Remover peça do armário"
                                    >
                                        <Trash2Icon className="w-3.5 h-3.5"/>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Product Quick-View Detail Modal */}
        <AnimatePresence>
            {selectedDetailItem && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedDetailItem(null)}
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.95, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 10 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col"
                    >
                        <div className="relative aspect-[16/10] bg-gray-50 flex items-center justify-center overflow-hidden">
                            <img 
                                src={selectedDetailItem.url} 
                                alt={selectedDetailItem.name} 
                                className="w-full h-full object-cover"
                            />
                            <button 
                                onClick={() => setSelectedDetailItem(null)}
                                className="absolute top-4 right-4 p-2 bg-white/90 rounded-full text-gray-600 hover:bg-white hover:text-black shadow-md transition-all"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-3 left-4 bg-gray-900/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider">
                                {selectedDetailItem.brand || 'Enzo Milano'}
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-serif font-bold text-gray-900 leading-tight">
                                            {selectedDetailItem.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                                            {selectedDetailItem.category} • {selectedDetailItem.subCategory}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-lg font-bold text-gray-900">
                                            {selectedDetailItem.price || 'Sob Consulta'}
                                        </p>
                                        {selectedDetailItem.installment && (
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                {selectedDetailItem.installment}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedDetailItem.composition && (
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                                        Composição Nobre
                                    </span>
                                    <p className="text-xs font-semibold text-gray-800">
                                        {selectedDetailItem.composition}
                                    </p>
                                </div>
                            )}

                            {selectedDetailItem.description && (
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                        Sobre a Peça
                                    </span>
                                    <p className="text-xs text-gray-600 leading-relaxed font-normal">
                                        {selectedDetailItem.description}
                                    </p>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={() => handleGarmentClick(selectedDetailItem)}
                                    disabled={isLoading || activeGarmentIds.includes(selectedDetailItem.id)}
                                    className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
                                        activeGarmentIds.includes(selectedDetailItem.id)
                                            ? 'bg-gray-100 text-gray-400 cursor-default'
                                            : 'bg-gray-900 text-white hover:bg-black active:scale-95'
                                    }`}
                                >
                                    <SparklesIcon className="w-4 h-4 text-amber-400" />
                                    <span>
                                        {activeGarmentIds.includes(selectedDetailItem.id) 
                                            ? 'Peça Já Aplicada no Avatar' 
                                            : 'Provar Esta Peça no Meu Avatar'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {error && (
            <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold text-center animate-fade-in flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="p-1 hover:text-red-800">
                    <XIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        )}
    </div>
  );
};

export default WardrobePanel;
