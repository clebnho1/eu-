
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import type { WardrobeItem } from '../types';
import { CheckCircleIcon, Trash2Icon, PlusIcon, UploadCloudIcon, ChevronRightIcon, ChevronLeftIcon, XIcon, ShirtIcon, PaletteIcon, ExternalLinkIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { extractProductInfoFromUrl } from '../services/geminiService';
import Spinner from './Spinner';

const urlToFile = async (url: string, filename: string): Promise<File> => {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type || 'image/png' });
    }
    try {
        const response = await fetch(url, { mode: 'no-cors' });
        // Fetch with no-cors might result in opaque blob, which isn't very useful for processing
        // Best effort: try normal fetch first
        const normalResponse = await fetch(url);
        const blob = await normalResponse.blob();
        return new File([blob], filename, { type: blob.type || 'image/png' });
    } catch (e) {
        throw new Error('Não foi possível baixar a imagem automaticamente devido a restrições do site. Por favor, faça o upload manual da foto.');
    }
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
    'Vestuário': ['Suéteres', 'Jaquetas', 'Casacos', 'Camisas', 'Camisetas', 'Polos', 'Blazers', 'Bermudas', 'Calças', 'Coletes', 'Trajes'],
    'Calçados': ['Sapatênis', 'Mocassim', 'Sapatos', 'Coturno', 'Dockside', 'Botas', 'Slipper', 'Tênis'],
    'Acessórios': ['Bonés', 'Cintos', 'Gorros', 'Mantas', 'Pulseiras', 'Cuecas', 'Colares']
};

const WardrobePanel: React.FC<WardrobePanelProps> = ({ 
    onGarmentSelect, activeGarmentIds, isLoading, defaultWardrobe, userWardrobe,
    onAddUserItem, onUpdateUserItem, onRemoveUserItem
}) => {
    const [activeTab, setActiveTab] = useState<'catalog' | 'user' | 'link'>('catalog');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
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

    const filteredItems = useMemo(() => {
        if (activeTab === 'user') return userWardrobe;
        let items = defaultWardrobe;
        if (selectedCategory) items = items.filter(i => i.category === selectedCategory);
        if (selectedSubCategory) items = items.filter(i => i.subCategory === selectedSubCategory);
        return items;
    }, [activeTab, userWardrobe, defaultWardrobe, selectedCategory, selectedSubCategory]);

    const handleGarmentClick = async (item: WardrobeItem) => {
        if (isLoading || activeGarmentIds.includes(item.id)) return;
        setError(null);
        try {
            const file = await urlToFile(item.url, `${item.id}.png`);
            onGarmentSelect(file, item);
        } catch (err) { setError(`Erro ao carregar peça.`); }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemFormName || !itemFormFile) { setError("Nome e foto são obrigatórios."); return; }
        if (!itemFormCategory || !itemFormSubCategory) { setError("Selecione Categoria e Subcategoria."); return; }
        
        try {
            await onAddUserItem({ 
                name: itemFormName, 
                category: itemFormCategory,
                subCategory: itemFormSubCategory,
                description: itemFormDescription,
                price: itemFormPrice
            }, itemFormFile);
            setIsFormOpen(false); resetForm();
        } catch (err) { setError("Erro ao salvar peça no armário."); }
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
            
            // Try to auto-download image, but don't fail if it's blocked by CORS
            try {
                const file = await urlToFile(data.imageUrl, 'link_item.png');
                setItemFormFile(file);
            } catch (e) {
                console.warn("Auto image download failed, user will need to provide it manually.");
                setError("Dados extraídos! Mas a imagem está protegida. Por favor, anexe uma foto manualmente.");
            }
            
            setIsFormOpen(true);
        } catch (err) {
            setError("Não conseguimos ler este link. Tente adicionar manualmente.");
        } finally {
            setIsExtracting(false);
        }
    };

  return (
    <div className="flex flex-col h-full relative">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-4">
            <button onClick={() => { setActiveTab('catalog'); setSelectedCategory(null); setSelectedSubCategory(null); }} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'catalog' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>CATÁLOGO</button>
            <button onClick={() => setActiveTab('user')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'user' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>MEU ARMÁRIO</button>
            <button onClick={() => { setActiveTab('link'); resetForm(); }} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>VIA LINK</button>
        </div>

        {activeTab === 'catalog' && (
            <div className="flex flex-col mb-4 gap-2">
                {!selectedCategory ? (
                    <div className="grid grid-cols-3 gap-2">
                        {mainCategories.map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className="flex flex-col items-center justify-center p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors gap-2">
                                <ShirtIcon className="w-5 h-5 text-gray-600" />
                                <span className="text-[10px] font-bold uppercase text-gray-800">{cat}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setSelectedCategory(null); setSelectedSubCategory(null); }} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"><ChevronLeftIcon className="w-4 h-4 text-gray-600"/></button>
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">{selectedCategory}</h3>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button onClick={() => setSelectedSubCategory(null)} className={`flex-shrink-0 px-4 py-1.5 text-[10px] font-bold rounded-full border transition-all ${!selectedSubCategory ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}>TUDO</button>
                            {(CATEGORY_MAP[selectedCategory] || []).map(sub => (
                                <button key={sub} onClick={() => setSelectedSubCategory(sub)} className={`flex-shrink-0 px-4 py-1.5 text-[10px] font-bold rounded-full border transition-all ${selectedSubCategory === sub ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}>{sub.toUpperCase()}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'link' && !isFormOpen && (
             <div className="flex flex-col gap-4 p-5 bg-gray-50 rounded-3xl border border-gray-100 mb-4 shadow-inner">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-900">Importar Produto</h3>
                    <p className="text-[10px] text-gray-400 leading-tight">Cole o link da loja para extrair título, foto, preço e descrição automaticamente.</p>
                </div>
                <div className="flex gap-2">
                    <input 
                        value={importUrl}
                        onChange={e => setImportUrl(e.target.value)}
                        placeholder="Cole a URL do produto aqui..."
                        className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs outline-none focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
                    />
                    <button 
                        onClick={handleExtract}
                        disabled={!importUrl || isExtracting}
                        className="p-4 bg-gray-900 text-white rounded-2xl disabled:opacity-50 hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                        {isExtracting ? <Spinner /> : <ExternalLinkIcon className="w-5 h-5" />}
                    </button>
                </div>
             </div>
        )}

        {activeTab === 'user' && !isFormOpen && (
            <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="w-full flex items-center justify-center gap-2 py-4 mb-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-all font-bold text-sm bg-gray-50/50">
                <PlusIcon className="w-5 h-5" /> Adicionar Manualmente
            </button>
        )}

        <AnimatePresence>
            {isFormOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 z-40 bg-white">
                    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center sticky top-0 bg-white z-10 py-2">
                            <h3 className="font-bold text-gray-900">{importUrl ? 'Salvar Importação' : 'Nova Peça'}</h3>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 bg-gray-100 rounded-full"><XIcon className="w-4 h-4 text-gray-500"/></button>
                        </div>
                        
                        <div className="space-y-4 pb-24">
                            <label className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-gray-900/20 transition-all shadow-sm">
                                {itemFormPreviewUrl ? (
                                    <div className="relative w-full h-full">
                                        <img src={itemFormPreviewUrl} className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-white text-xs font-bold">TROCAR FOTO</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-6">
                                        <UploadCloudIcon className="w-10 h-10 mx-auto text-gray-300 mb-2"/>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Anexar Foto da Peça</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) { setItemFormFile(e.target.files[0]); setItemFormPreviewUrl(URL.createObjectURL(e.target.files[0])); } }} />
                            </label>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Título do Produto</label>
                                    <input value={itemFormName} onChange={e => setItemFormName(e.target.value)} placeholder="Ex: Jaqueta Jeans Vintage" className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-gray-900/5 transition-all"/>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Categoria</label>
                                        <select 
                                            value={itemFormCategory} 
                                            onChange={e => { setItemFormCategory(e.target.value); setItemFormSubCategory(''); }}
                                            className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-3 py-3 text-xs outline-none appearance-none cursor-pointer"
                                        >
                                            {mainCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Subcategoria</label>
                                        <select 
                                            value={itemFormSubCategory} 
                                            onChange={e => setItemFormSubCategory(e.target.value)}
                                            className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-3 py-3 text-xs outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Escolha...</option>
                                            {(CATEGORY_MAP[itemFormCategory] || []).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Preço</label>
                                        <input value={itemFormPrice} onChange={e => setItemFormPrice(e.target.value)} placeholder="R$ 0,00" className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none"/>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Breve Descrição</label>
                                        <input value={itemFormDescription} onChange={e => setItemFormDescription(e.target.value)} placeholder="Ex: Algodão 100%, Lavagem escura..." className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-md border-t border-gray-50">
                            <button onClick={handleFormSubmit} className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98]">SALVAR NO ARMÁRIO</button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
            {filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 py-12">
                    <ShirtIcon className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Guarda-roupa Vazio</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {filteredItems.map(item => (
                        <div key={item.id} className="relative group bg-white border border-gray-100 rounded-3xl p-2.5 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                            <button onClick={() => handleGarmentClick(item)} disabled={isLoading || activeGarmentIds.includes(item.id)} className="w-full aspect-square rounded-2xl overflow-hidden mb-2.5 relative bg-gray-50">
                                <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                {activeGarmentIds.includes(item.id) && <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-[2px] flex items-center justify-center"><CheckCircleIcon className="w-10 h-10 text-white" /></div>}
                                {isLoading && !activeGarmentIds.includes(item.id) && <div className="absolute inset-0 bg-white/40 pointer-events-none" />}
                                {item.price && <div className="absolute bottom-2 right-2 bg-white/95 px-2 py-0.5 rounded-full text-[9px] font-black shadow-lg text-gray-900 border border-gray-100">{item.price}</div>}
                            </button>
                            <div className="px-1.5 space-y-0.5">
                                <p className="text-[10px] font-bold text-gray-900 truncate uppercase tracking-tight">{item.name}</p>
                                <p className="text-[9px] text-gray-400 uppercase font-medium">{item.subCategory || item.category}</p>
                            </div>
                            {(activeTab === 'user' || activeTab === 'link') && (
                                <button onClick={() => onRemoveUserItem(item.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 bg-white/90 rounded-xl text-red-500 shadow-xl transition-all hover:bg-red-50 active:scale-90"><Trash2Icon className="w-4 h-4"/></button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-bold text-center animate-pulse">{error}</div>}
    </div>
  );
};

export default WardrobePanel;
