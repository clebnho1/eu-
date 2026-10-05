
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { WardrobeItem } from '../types';

const STORAGE_PREFIX = 'vto_wardrobe_';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const getUserWardrobe = (username: string): WardrobeItem[] => {
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${username}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveUserWardrobe = (username: string, items: WardrobeItem[]) => {
  localStorage.setItem(`${STORAGE_PREFIX}${username}`, JSON.stringify(items));
};

export const addUserItem = async (username: string, item: Omit<WardrobeItem, 'url' | 'id'>, file: File): Promise<WardrobeItem[]> => {
  const currentItems = getUserWardrobe(username);
  const base64Url = await fileToBase64(file);
  const newItem: WardrobeItem = {
    ...item,
    url: base64Url,
    id: `user-${Date.now()}`
  };
  const newItems = [...currentItems, newItem];
  saveUserWardrobe(username, newItems);
  return newItems;
};

export const updateUserItem = async (username: string, itemId: string, updates: Partial<WardrobeItem>, file?: File): Promise<WardrobeItem[]> => {
    const currentItems = getUserWardrobe(username);
    const itemIndex = currentItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return currentItems;
    let updatedUrl = currentItems[itemIndex].url;
    if (file) updatedUrl = await fileToBase64(file);
    const newItems = [...currentItems];
    newItems[itemIndex] = { ...currentItems[itemIndex], ...updates, url: updatedUrl };
    saveUserWardrobe(username, newItems);
    return newItems;
};

export const removeUserItem = (username: string, itemId: string): WardrobeItem[] => {
  const newItems = getUserWardrobe(username).filter(item => item.id !== itemId);
  saveUserWardrobe(username, newItems);
  return newItems;
};

export const getCategories = (): string[] => ['roupas', 'acessórios', 'user'];
export const saveCategories = (categories: string[]) => {};
