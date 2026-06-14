import { API_BASE_URL } from './config';

const FUNCTION_MAP: Record<string, string> = {
  'telegram-webapp-login': '/api/auth/tg-webapp',
  'telegram-oidc-exchange': '/api/auth/tg-oidc',
  'claim-daily-reward': '/api/user/claim-reward',
  'redeem-secret-code': '/api/user/redeem-code',
  'get-bonus-route': '/api/user/bonus-route',
  'get-bonus-route-points': '/api/user/bonus-route',
  'get-social-route': '/api/user/social-route',
  'get-social-route-points': '/api/user/social-route',
  'get-active-routes': '/api/user/active-routes',
  'send-order': '/api/orders/notify',
};

export async function callApiEndpoint(name: string, data: any, method: 'POST' | 'GET' = 'POST') {
  try {
    const apiPath = FUNCTION_MAP[name];
    if (!apiPath) {
      throw new Error(`Unknown API endpoint function: ${name}`);
    }
    
    let url = `${API_BASE_URL}${apiPath}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let body = method === 'POST' ? { ...data } : null;
    let token = data?.token;

    if (data?.routeId && method === 'GET') {
      if (name.endsWith('-points')) {
        url = `${url}/${data.routeId}/points`;
      } else {
        url = `${url}/${data.routeId}`;
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      if (body) delete (body as any).token;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let result;
    try {
      result = text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Error(`Invalid response from server (${response.status}): ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(result.message || result.error || `Error calling API ${name} (${response.status})`);
    }
    return result;
  } catch (error: any) {
    if (!name.includes('points')) {
      console.error(`[API] Error in callApiEndpoint(${name}):`, error);
    }
    throw error;
  }
}

export interface LegalDocumentSummary {
  type: 'terms' | 'privacy' | 'personal_data_consent' | string;
  documentId: string;
  version: string;
  title: string;
  url?: string;
  contentHash?: string;
}

export interface LegalDocumentsSignatureResponse {
  documentsSignature: string;
  activeDocuments: LegalDocumentSummary[];
}

export interface LegalDocumentResponse {
  documentId: string;
  revisionId: string;
  type: string;
  version: string;
  title: string;
  url: string;
  contentText: string;
  contentHash: string;
  isActive: boolean;
  status: string;
  createdAt?: string;
  activatedAt?: string;
}

export async function getLegalDocumentCurrent(type: string): Promise<LegalDocumentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/legal/documents/current/${type}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const text = await response.text();
    let errorMsg = `Ошибка при получении документа (${response.status})`;
    try {
      const errJson = JSON.parse(text);
      if (errJson.error) errorMsg = errJson.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function getLegalDocumentById(documentId: string): Promise<LegalDocumentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/legal/documents/${documentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const text = await response.text();
    let errorMsg = `Ошибка при получении документа (${response.status})`;
    try {
      const errJson = JSON.parse(text);
      if (errJson.error) errorMsg = errJson.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return response.json();
}

export interface UserConsentsStatusResponse {
  hasRequiredConsents: boolean;
  missingTypes: string[];
  activeDocuments: LegalDocumentSummary[];
}

import { auth } from '../services/firebase';

export async function getLegalDocumentsSignature(): Promise<LegalDocumentsSignatureResponse> {
  const response = await fetch(`${API_BASE_URL}/api/legal/documents/signature`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const text = await response.text();
    let errorMsg = `Ошибка при получении цифровой подписи документов (${response.status})`;
    try {
      const errJson = JSON.parse(text);
      if (errJson.error) errorMsg = errJson.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function getUserConsentsStatus(): Promise<UserConsentsStatusResponse> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('Пользователь не авторизован');
  }
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}/api/user/consents/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const text = await response.text();
    let errorMsg = `Ошибка при получении статуса согласий (${response.status})`;
    try {
      const errJson = JSON.parse(text);
      if (errJson.error) errorMsg = errJson.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function saveUserConsents(source: string): Promise<{ success: boolean; message?: string }> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('Пользователь не авторизован');
  }
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}/api/user/consents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ source })
  });
  if (!response.ok) {
    const text = await response.text();
    let errorMsg = `Ошибка при сохранении согласий (${response.status})`;
    try {
      const errJson = JSON.parse(text);
      if (errJson.error) errorMsg = errJson.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return response.json();
}

import { 
  HsbColor, 
  GameStateResponse, 
  SubmitGameAnswerResponse, 
  GameResultResponse, 
  GameLeaderboardResponse 
} from '../types';

export const gamesApi = {
  async getState(seasonId: string, token: string): Promise<GameStateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/games/seasons/${seasonId}/state`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `Ошибка при получении состояния игры (${response.status})`;
      try {
        const errJson = JSON.parse(text);
        if (errJson.message || errJson.error) errorMsg = errJson.message || errJson.error;
      } catch (_) {}
      throw new Error(errorMsg);
    }
    return response.json();
  },

  async submitAnswer(seasonId: string, questionId: string, submittedHsb: HsbColor, token: string): Promise<SubmitGameAnswerResponse> {
    const response = await fetch(`${API_BASE_URL}/api/games/seasons/${seasonId}/answers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ questionId, submittedHsb })
    });
    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `Ошибка при отправке ответа (${response.status})`;
      try {
        const errJson = JSON.parse(text);
        if (errJson.message || errJson.error) errorMsg = errJson.message || errJson.error;
      } catch (_) {}
      throw new Error(errorMsg);
    }
    return response.json();
  },

  async getResult(seasonId: string, token: string): Promise<GameResultResponse> {
    const response = await fetch(`${API_BASE_URL}/api/games/seasons/${seasonId}/result`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `Ошибка при получении результата игры (${response.status})`;
      try {
        const errJson = JSON.parse(text);
        if (errJson.message || errJson.error) errorMsg = errJson.message || errJson.error;
      } catch (_) {}
      throw new Error(errorMsg);
    }
    return response.json();
  },

  async getLeaderboard(seasonId: string, token: string): Promise<GameLeaderboardResponse> {
    const response = await fetch(`${API_BASE_URL}/api/games/seasons/${seasonId}/leaderboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `Ошибка при получении рейтинга (${response.status})`;
      try {
        const errJson = JSON.parse(text);
        if (errJson.message || errJson.error) errorMsg = errJson.message || errJson.error;
      } catch (_) {}
      throw new Error(errorMsg);
    }
    return response.json();
  },

  async restart(seasonId: string, token: string): Promise<GameStateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/games/seasons/${seasonId}/restart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `Ошибка при перезапуске игры (${response.status})`;
      try {
        const errJson = JSON.parse(text);
        if (errJson.message || errJson.error) errorMsg = errJson.message || errJson.error;
      } catch (_) {}
      throw new Error(errorMsg);
    }
    return response.json();
  }
};
