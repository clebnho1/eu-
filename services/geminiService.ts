/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("URL de dados inválida");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Não foi possível identificar o formato da imagem");
    return { mimeType: mimeMatch[1], data: arr[1] };
};

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        throw new Error(`Requisição bloqueada pelo filtro de segurança: ${blockReason}. ${blockReasonMessage || ''}`);
    }

    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        throw new Error(`A geração foi interrompida: ${finishReason}`);
    }
    
    throw new Error("Não foi possível gerar a imagem. Verifique se a foto está nítida e tente novamente.");
};

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
        headers: {
            'User-Agent': 'aistudio-build',
        }
    }
});

const imageModel = 'gemini-2.5-flash-image';
const textModel = 'gemini-3.8-flash';

/**
 * Generates a full-body studio avatar preserving the user's physique and facial identity.
 */
export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = `Você é um fotógrafo e diretor de arte de moda de alta-costura internacional.
    
    OBJETIVO: Criar um AVATAR DE MODELO DE CORPO INTEIRO (FULL BODY HEAD-TO-TOE) a partir da foto do usuário.
    
    REGRAS CRÍTICAS DE ENQUADRAMENTO E IDENTIDADE:
    1. CORPO INTEIRO OBRIGATÓRIO (FULL BODY):
       - A foto final DEVE exibir a pessoa COMPLETA, da cabeça aos pés.
       - NUNCA corte o topo da cabeça, nem os ombros, nem as pernas, nem os tornozelos, nem os pés/calçados.
       - Os pés DEVEM estar visíveis e apoiados firmemente no chão do estúdio.
       - Mantenha uma margem de respiro harmônica acima da cabeça e abaixo dos sapatos.
    
    2. PRESERVAÇÃO RIGOROSA DO FÍSICO E DO ROSTO:
       - O rosto, cabelo, expressão, tom de pele e traços faciais devem ser IDÊNTICOS aos da foto enviada.
       - O biotipo corporal (altura relativa, porte físico, ombros, silhueta) deve ser fiel à anatomia real do usuário.
    
    3. CENÁRIO DE ESTÚDIO BOUTIQUE:
       - Fundo infinito limpo em cinza neutro ou bege suave de estúdio fotográfico profissional.
       - Iluminação difusa e suave de softbox, criando sombras naturais no chão sob os pés.
       - Postura elegante, natural e ereta de catálogo de moda masculina/feminina.
    
    4. QUALIDADE:
       - Nitidez cristalina, texturas realistas e padrão de editorial de moda.
    
    RETORNE APENAS A IMAGEM DE CORPO INTEIRO.`;

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

/**
 * Applies a selected garment or footwear onto the avatar while strictly preserving full-body framing.
 */
export const generateVirtualTryOnImage = async (
    modelImageUrl: string, 
    garmentImage: File, 
    category: string = 'Vestuário',
    targetColor?: string
): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    
    let prompt = `Você é um motor de IA especialista em Provador Virtual de Alta Precisão (Virtual Try-On).
    
    TAREFA OBRIGATÓRIA:
    1. MANTER O ENQUADRAMENTO DE CORPO INTEIRO (FULL BODY):
       - A imagem gerada DEVE manter RIGOROSAMENTE o mesmo enquadramento de corpo inteiro (da cabeça aos pés).
       - NÃO dê zoom no peito, no abdômen ou na cintura. A pessoa inteira (cabeça, braços, pernas e pés com calçados) deve permanecer 100% visível na imagem final.
    
    2. EXTRAÇÃO DA PEÇA:
       - Extraia e modele com precisão a peça de roupa/calçado/acessório fornecida na segunda imagem.
       - Preserve a textura original, cor, estampas, botões, costuras, bolsos e caimento do tecido.
    
    3. VESTIMENTA E BIOTIPO:
       - Ajuste a peça perfeitamente às proporções anatômicas do corpo do modelo.
       - O tecido deve responder à postura do corpo, gerando dobras, luzes e sombras realistas de acordo com o porte físico da pessoa.
       - Mantenha o rosto, cabelo, tom de pele e demais partes inalteradas.
    `;

    if (category === 'Calçados') {
        prompt += `
        DIRETRIZES PARA CALÇADOS:
        - Localize os pés do modelo na parte inferior da foto.
        - Substitua o calçado atual pelo novo modelo extraído da imagem de referência.
        - Mantenha as calças, camisa, braços, cabeça e o corpo inteiro exatamente como estão.
        - Pés firmes no chão com sombra realista.`;
    } else if (category === 'Acessórios') {
        prompt += `
        DIRETRIZES PARA ACESSÓRIOS:
        - Aplique o acessório (cinto, óculos, relógio, bolsa ou boné) na posição anatômica correta.
        - Preserve todas as outras roupas e mantenha a composição de corpo inteiro da cabeça aos pés.`;
    } else {
        prompt += `
        DIRETRIZES PARA VESTUÁRIO (CAMISAS, BLAZERS, CALÇAS, POLOS, ETC.):
        - Substitua a peça correspondente no modelo pela nova peça de roupa selecionada.
        - Se for camisa ou polo, modele no tronco com caimento perfeito no pescoço e ombros.
        - Se for calça ou bermuda, modele nas pernas mantendo a visão dos calçados nos pés.
        - Se for blazer ou jaqueta, vista sobre a peça interna criando sobreposição realista de camadas.
        - GARANTA QUE A IMAGEM FINAL CONTINUE SENDO DE CORPO INTEIRO DOS PÉS À CABEÇA.`;
    }

    if (targetColor) {
        prompt += `\n- COR DO ITEM: Ajuste o tom da peça para ${targetColor}.`;
    }

    prompt += `\n\nRETORNE APENAS A IMAGEM FINAL DE CORPO INTEIRO (HEAD-TO-TOE).`;

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

/**
 * Changes the avatar pose while maintaining 100% garment and physical identity.
 */
export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `Você é um fotógrafo de moda profissional.
    
    INSTRUÇÕES PARA MUDANÇA DE POSE:
    1. NOVA POSE: Ajuste a pose do modelo para "${poseInstruction}".
    2. ENQUADRAMENTO DE CORPO INTEIRO (FULL BODY):
       - A imagem DEVE continuar mostrando o modelo da cabeça aos pés, sem cortes no topo da cabeça ou nos sapatos.
    3. CONSISTÊNCIA ABSOLUTA DO LOOK:
       - Mantenha TODAS as roupas, sapatos e acessórios 100% IDÊNTICOS à imagem de referência.
       - Cores, tecidos, texturas, estampas e estilo devem ser mantidos sem alterações.
    4. IDENTIDADE:
       - O rosto, porte físico e biotipo devem ser exatamente os mesmos do modelo original.
    5. ESTÚDIO:
       - Fundo neutro de estúdio fotográfico de moda com iluminação suave.
    
    RETORNE APENAS A IMAGEM FINAL DE CORPO INTEIRO.`;
    
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export interface ExtractedProduct {
    title: string;
    description: string;
    price: string;
    imageUrl: string;
}

/**
 * Uses Gemini text model with search grounding to extract structured product information from a URL.
 */
export const extractProductInfoFromUrl = async (url: string): Promise<ExtractedProduct> => {
    const prompt = `Acesse o link do produto a seguir e extraia as informações de e-commerce com máxima precisão: ${url}.
    
    Retorne os dados estruturados:
    - title: Nome completo e atraente do produto (ex: "Camisa Linho Milano Slim").
    - description: Descrição refinada ressaltando tecido, corte e ocasião de uso.
    - price: O preço atual formatado em moeda brasileira (ex: "R$ 489,00").
    - imageUrl: A URL direta e pública da foto principal do produto em alta resolução.
    
    Retorne estritamente um objeto JSON.`;

    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    price: { type: Type.STRING },
                    imageUrl: { type: Type.STRING },
                },
                required: ["title", "description", "price", "imageUrl"],
            }
        },
    });

    try {
        const text = response.text || '{}';
        return JSON.parse(text) as ExtractedProduct;
    } catch (e) {
        throw new Error("Não foi possível analisar os dados do link. Você pode cadastrar a peça manualmente em poucos segundos.");
    }
};
