
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFriendlyErrorMessage(error: unknown, context: string): string {
    let rawMessage = 'Ocorreu um erro inesperado.';
    
    if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'string') {
        rawMessage = error;
    } else if (error) {
        try {
            rawMessage = JSON.stringify(error);
        } catch {
            rawMessage = String(error);
        }
    }

    // Erro de Cota Excedida (429 RESOURCE_EXHAUSTED)
    if (rawMessage.includes("429") || rawMessage.includes("RESOURCE_EXHAUSTED") || rawMessage.includes("quota exceeded")) {
        return "Ops! O limite de uso gratuito foi atingido. Aguarde um minuto e tente novamente.";
    }

    // Erro de Formato de Arquivo
    if (rawMessage.includes("Unsupported MIME type")) {
        return "Formato de imagem não suportado. Tente usar PNG ou JPG.";
    }

    // Erro de Segurança/Bloqueio
    if (rawMessage.includes("SAFETY")) {
        return "A imagem foi sinalizada pelos filtros de segurança. Tente uma foto mais neutra.";
    }
    
    return `${context}: ${rawMessage.substring(0, 100)}...`;
}