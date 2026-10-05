/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  category: string; // 'Vestuário' | 'Calçados' | 'Acessórios'
  subCategory?: string;
  targetColor?: string;
  description?: string;
  price?: string;
  installment?: string;
  brand?: string;
  composition?: string;
  tags?: string[];
  isNew?: boolean;
  isBestSeller?: boolean;
}

export interface OutfitLayer {
  garment: WardrobeItem | null; // null represents the base model layer
  poseImages: Record<string, string>; // Maps pose instruction to image URL
}
