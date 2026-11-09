import { apiClient, ApiError } from './apiClient';

export interface AIReference {
  title: string;
  source?: string;
  snippet?: string;
  type?: string;
  relevance?: string;
}

export interface AIRequestPayload {
  prompt: string;
  session_id?: string | null;
  id_proyek?: number | null;
  page_context?: string | null;
}

export interface AIGenerateResponse {
  success: boolean;
  session_id: string;
  id_proyek: number | null;
  page_context: string | null;
  provider: string;
  model: string;
  confidence: number;
  summary: string;
  answer: string;
  references: AIReference[];
  limitations?: string;
  database_grounded?: boolean;
  message?: string;
}

export interface AIConversationSummary {
  session_id: string;
  title: string;
  latest_prompt: string;
  latest_summary: string;
  id_proyek: number | null;
  proyek?: {
    id_proyek: number;
    nama_proyek: string;
    kode_proyek: string;
  } | null;
  page_context: string | null;
  message_count: number;
  created_at: string;
}

export interface AIMessageDetail {
  id_ai_history: number;
  session_id: string;
  prompt: string;
  summary: string;
  answer: string;
  references: AIReference[];
  limitations?: string;
  confidence: number;
  source?: string;
  provider?: string;
  page_context?: string | null;
  created_at: string;
}

export interface AIHealthResponse {
  success: boolean;
  status: string;
  provider?: string;
  model?: string;
  reply?: string;
  message?: string;
}

export interface AITestResponse {
  success: boolean;
  provider: string;
  model: string;
  status: string;
  database?: string;
}

export const aiAssistantService = {
  /**
   * Mengirim pertanyaan ke endpoint AI generate (Controlled RAG).
   */
  async generate(payload: AIRequestPayload): Promise<AIGenerateResponse> {
    try {
      const response = await apiClient.post<AIGenerateResponse>('/ai/generate', {
        prompt: payload.prompt,
        session_id: payload.session_id || undefined,
        id_proyek: payload.id_proyek || undefined,
        page_context: payload.page_context || undefined,
      });
      return response;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw new Error(err.data?.message || err.message || 'Gagal berkomunikasi dengan AI Assistant.');
      }
      throw new Error(err?.message || 'Terjadi kesalahan jaringan.');
    }
  },

  /**
   * Mengambil daftar seluruh riwayat percakapan pengguna yang sedang login.
   */
  async getConversations(): Promise<AIConversationSummary[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: AIConversationSummary[] }>('/ai/conversations');
      return response.data || [];
    } catch (err: any) {
      console.warn('Gagal memuat daftar riwayat percakapan:', err);
      return [];
    }
  },

  /**
   * Mengambil detail seluruh pesan dalam satu sesi percakapan.
   */
  async getConversationMessages(sessionId: string): Promise<AIMessageDetail[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        session_id: string;
        data: AIMessageDetail[];
      }>(`/ai/conversations/${encodeURIComponent(sessionId)}`);
      return response.data || [];
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw new Error(err.data?.message || err.message || 'Gagal memuat percakapan.');
      }
      throw err;
    }
  },

  /**
   * Menghapus seluruh percakapan dalam satu sesi.
   */
  async deleteConversation(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.delete<{ success: boolean; message: string }>(
        `/ai/conversations/${encodeURIComponent(sessionId)}`
      );
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw new Error(err.data?.message || err.message || 'Gagal menghapus percakapan.');
      }
      throw err;
    }
  },

  /**
   * Mengecek kesehatan koneksi langsung ke provider Google Gemini API.
   */
  async checkHealth(): Promise<AIHealthResponse> {
    try {
      return await apiClient.get<AIHealthResponse>('/ai/health');
    } catch (err: any) {
      return {
        success: false,
        status: 'error',
        message: err.data?.message || err.message || 'Koneksi ke server AI gagal.',
      };
    }
  },

  /**
   * Uji konfigurasi AI & koneksi database tafauzi.
   */
  async test(): Promise<AITestResponse> {
    return await apiClient.get<AITestResponse>('/ai/test');
  },
};

export default aiAssistantService;
