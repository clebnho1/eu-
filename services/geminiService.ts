
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
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        throw new Error(`Requisição bloqueada: ${blockReason}. ${blockReasonMessage || ''}`);
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
    
    throw new Error("Não foi possível gerar a imagem. Verifique se a foto está clara e tente novamente.");
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash-image';
const proModel = 'gemini-3-pro-preview';

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = `Você é um fotógrafo de moda profissional.
    
    OBJETIVO: Criar um AVATAR DE MODELO DE CORPO INTEIRO (FULL BODY) a partir da foto do usuário.
    
    INSTRUÇÕES CRÍTICAS DE ENQUADRAMENTO:
    1. CORPO INTEIRO OBRIGATÓRIO: A imagem gerada DEVE mostrar a pessoa da cabeça aos pés (head-to-toe). 
    2. SEM CORTES: Não corte o topo da cabeça, nem os braços, nem as pernas, nem os pés. Os pés devem estar totalmente visíveis no chão.
    3. IDENTIDADE: O rosto e as características físicas devem ser IDÊNTICOS aos da foto original.
    4. ESTÚDIO: Remova o fundo e coloque a pessoa em um estúdio limpo com fundo cinza neutro e iluminação suave.
    5. QUALIDADE: Melhore a nitidez e as texturas para parecer uma foto de catálogo profissional.
    
    RETORNE APENAS A IMAGEM DE CORPO INTEIRO.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (
    modelImageUrl: string, 
    garmentImage: File, 
    category: string = 'Vestuário',
    targetColor?: string
): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    
    let prompt = `Você é um motor avançado de Provador Virtual.
    
    TAREFA PRINCIPAL:
    1. EXTRAÇÃO: Isole a peça de roupa/calçado da foto enviada, ignorando o fundo (mãos, mesa, etc).
    2. VESTIR: Aplique no modelo mantendo RIGOROSAMENTE o enquadramento de CORPO INTEIRO (da cabeça aos pés).
    3. ENQUADRAMENTO: Garanta que o modelo completo esteja visível na imagem final, sem cortes em nenhuma parte do corpo.
    `;

    if (category === 'Calçados') {
        prompt += `\nINSTRUÇÃO ESPECÍFICA PARA CALÇADOS: 
        - Localize os pés do modelo. 
        - Remova qualquer calçado existente. 
        - "Calce" o novo item nos pés do modelo, respeitando a pose e a perspectiva.
        - Mantenha o resto da roupa e o rosto do modelo exatamente como estão.`;
    } else if (category === 'Acessórios') {
        prompt += `\nINSTRUÇÃO ESPECÍFICA PARA ACESSÓRIOS:
        - Adicione o acessório (chapéu, pulseira, cinto, etc) na posição anatômica correta.
        - Mantenha todas as roupas atuais do modelo.`;
    } else {
        prompt += `\nINSTRUÇÃO PARA VESTUÁRIO:
        - Substitua a peça correspondente no modelo pela nova peça extraída.
        - O tecido deve se moldar perfeitamente ao corpo e à iluminação do estúdio.`;
    }

    if (targetColor) {
        prompt += `\n\nIMPORTANTE: A cor do item deve ser ${targetColor}.`;
    }

    prompt += `\n\nRETORNE APENAS A IMAGEM FINAL DE CORPO INTEIRO.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `Você deve mudar a pose do modelo mas manter o look 100% IDÊNTICO.
    
    INSTRUÇÕES:
    - Mude a pose para: "${poseInstruction}".
    - MANTER CORPO INTEIRO: A imagem deve continuar mostrando o modelo da cabeça aos pés, sem cortes.
    - NÃO mude as roupas, sapatos ou acessórios. As cores, texturas e modelos das peças devem ser preservados exatamente como na imagem original.
    - O rosto deve continuar sendo o mesmo.
    - Fundo de estúdio sempre.
    
    RETORNE APENAS A IMAGEM DE CORPO INTEIRO.`;
    
    const response = await ai.models.generateContent({
        model,
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

export const extractProductInfoFromUrl = async (url: string): Promise<ExtractedProduct> => {
    const prompt = `Acesse este link de produto e extraia as informações detalhadas: ${url}. 
    
    Preciso dos seguintes campos:
    - title: Nome completo do produto.
    - description: Descrição resumida ressaltando material e estilo.
    - price: O preço atual formatado em R$ (ex: R$ 199,90).
    - imageUrl: A URL direta e pública da imagem principal do produto.
    
    Retorne estritamente um objeto JSON.`;

    const response = await ai.models.generateContent({
        model: proModel,
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
        throw new Error("Falha ao analisar os dados do produto. Tente inserir manualmente.");
    }
};
