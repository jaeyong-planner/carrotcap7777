export interface APIConfig {
  geminiApiKey: string;
  apiTimeout: number;
  enableFallbackMode: boolean;
  enableErrorLogging: boolean;
}

export const API_CONFIG: APIConfig = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  enableFallbackMode: import.meta.env.VITE_ENABLE_FALLBACK_MODE === 'true',
  enableErrorLogging: import.meta.env.VITE_ENABLE_ERROR_LOGGING === 'true',
};

export const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const validateAPIKey = (): boolean => {
  return API_CONFIG.geminiApiKey.length > 0;
};

export const getAPIKey = (): string => {
  if (!validateAPIKey()) {
    console.warn('Gemini API 키가 설정되지 않았습니다. 환경 변수 VITE_GEMINI_API_KEY를 확인하세요.');
  }
  return API_CONFIG.geminiApiKey;
};
