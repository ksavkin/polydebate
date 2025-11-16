// API client for PolyDebate backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Market Types
export interface MarketOutcome {
  name: string;
  slug?: string;
  price: number;
  shares?: string;
}

export interface Tag {
  id: string;
  label: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  updatedBy?: number;
  forceShow?: boolean;
}

export interface Market {
  id: string;
  question: string;
  description?: string;
  category: string;
  tag_id?: string | Tag;
  market_type?: 'binary' | 'categorical';
  outcomes: MarketOutcome[];
  volume: string;
  volume_24h?: string;
  liquidity?: string;
  end_date?: string;
  created_date?: string;
  image_url?: string;
  resolution_source?: string;
  price_change_24h?: number; // Price change percentage in last 24 hours
  sparkline?: number[]; // Historical price data for sparkline (24 data points)
}

export interface MarketsResponse {
  markets: Market[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  market_count?: number;
  icon_url?: string;
}

export interface CategoriesResponse {
  categories: Category[];
}

// Model Types
export interface ModelPricing {
  input: number;
  output: number;
  total_per_million: number;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: ModelPricing;
  is_free: boolean;
  context_length: number;
  max_output_tokens: number;
  supported: boolean;
}

export interface ModelsResponse {
  models: Model[];
  total_count: number;
  free_count: number;
  paid_count: number;
}

// Debate Types
export interface DebateStartRequest {
  market_id: string;
  model_ids: string[];
  rounds: number;
}

export interface DebateModel {
  model_id: string;
  model_name: string;
  provider?: string;
}

export interface DebateStartResponse {
  debate_id: string;
  status: 'initialized' | 'in_progress' | 'paused' | 'completed' | 'stopped';
  market: {
    id: string;
    question: string;
    outcomes: Array<{ name: string; price: number }>;
  };
  models: DebateModel[];
  rounds: number;
  total_messages_expected: number;
  created_at: string;
  stream_url: string;
}

export interface DebateStatus {
  debate_id: string;
  status: 'initialized' | 'in_progress' | 'paused' | 'completed' | 'stopped';
  market: {
    id: string;
    question: string;
    outcomes: Array<{ name: string; price: number }>;
  };
  models: DebateModel[];
  rounds: number;
  current_round?: number;
  messages_count?: number;
  created_at: string;
  paused?: boolean;
}

export interface DebateMessage {
  message_id: string;
  round: number;
  model_id: string;
  model_name: string;
  message_type: 'initial' | 'rebuttal' | 'final';
  text: string;
  predictions: Record<string, number>; // outcome name -> percentage (0-100)
  audio_url?: string;
  audio_duration?: number;
  timestamp: string;
}

export interface DebateResults {
  debate_id: string;
  status: 'completed';
  market: {
    id: string;
    question: string;
    outcomes: Array<{ name: string; price: number }>;
  };
  summary: {
    overall: string;
    agreements: string[];
    disagreements: Array<{
      topic: string;
      positions: Record<string, string>; // model_name -> position
    }>;
    consensus: string;
    model_rationales: Array<{
      model: string;
      final_prediction: Record<string, number>; // outcome -> percentage (0-100)
      rationale: string;
      key_arguments: string[];
    }>;
  };
  final_predictions: Record<string, {
    predictions: Record<string, number>; // outcome -> percentage (0-100)
    initial_predictions: Record<string, number>;
    change: string;
  }>;
  statistics: {
    average_prediction: Record<string, number>;
    median_prediction: Record<string, number>;
    prediction_variance: number;
    polymarket_odds: Record<string, number>;
    ai_vs_market_delta: string;
    total_messages: number;
    total_duration_seconds: number;
    models_count: number;
    rounds_completed: number;
  };
  completed_at: string;
}

export interface DebateListItem {
  debate_id: string;
  market_id: string;
  market_question: string;
  status: 'completed' | 'in_progress' | 'paused' | 'stopped';
  models_count: number;
  rounds: number;
  models: DebateModel[];
  average_prediction?: Record<string, number>;
  created_at: string;
  completed_at?: string;
  duration_seconds?: number;
}

export interface DebatesResponse {
  debates: DebateListItem[];
  total: number;
  offset: number;
  limit: number;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface SignupRequestData {
  email: string;
  name: string;
}

export interface SignupRequestResponse {
  success: boolean;
  message: string;
  expiry_minutes: number;
}

export interface SignupVerifyData {
  email: string;
  code: string;
}

export interface SignupVerifyResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface LoginRequestData {
  email: string;
}

export interface LoginRequestResponse {
  success: boolean;
  message: string;
  expiry_minutes: number;
}

export interface LoginVerifyData {
  email: string;
  code: string;
}

export interface LoginVerifyResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface MeResponse {
  success: boolean;
  data: {
    user: User;
  };
}

export interface UpdateUserData {
  name?: string;
}

export interface UpdateUserResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: string;
    remaining?: number;
  };
}

// Favorites Types
export interface Favorite {
  id: number;
  market_id: string;
  created_at: string;
}

export interface FavoritesResponse {
  success: boolean;
  data: {
    favorites: Favorite[];
    total: number;
  };
}

export interface AddFavoriteResponse {
  success: boolean;
  message: string;
  data: Favorite;
}

export interface RemoveFavoriteResponse {
  success: boolean;
  message: string;
}

export interface CheckFavoriteResponse {
  success: boolean;
  data: {
    is_favorited: boolean;
    authenticated: boolean;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private async fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAuthToken();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        try {
          const url = new URL(this.baseUrl);
          const port = url.port || (url.protocol === 'https:' ? '443' : '80');
          throw new Error(`Cannot connect to backend API at ${this.baseUrl}. Make sure the backend server is running on port ${port}.`);
        } catch {
          throw new Error(`Cannot connect to backend API at ${this.baseUrl}. Make sure the backend server is running.`);
        }
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    category?: string;
    tag_id?: string;
    closed?: boolean;
  }): Promise<MarketsResponse> {
    // Special categories use path-based endpoints: breaking, trending, new
    const pathBasedCategories = ['breaking', 'trending', 'new'];
    const usePathEndpoint = params?.category && pathBasedCategories.includes(params.category.toLowerCase());
    
    if (usePathEndpoint) {
      // Use path-based endpoint: /api/markets/breaking, /api/markets/trending, etc.
      const queryParams = new URLSearchParams();
      
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
      if (params?.closed !== undefined) queryParams.append('closed', params.closed.toString());

      const queryString = queryParams.toString();
      const endpoint = `/api/markets/${params.category}${queryString ? `?${queryString}` : ''}`;

      return this.fetchJson<MarketsResponse>(endpoint);
    }
    
    // Regular categories use query parameter
    const queryParams = new URLSearchParams();
    
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.tag_id) queryParams.append('tag_id', params.tag_id);
    if (params?.closed !== undefined) queryParams.append('closed', params.closed.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/markets${queryString ? `?${queryString}` : ''}`;

    return this.fetchJson<MarketsResponse>(endpoint);
  }

  async getMarket(marketId: string): Promise<Market> {
    return this.fetchJson<Market>(`/api/markets/${marketId}`);
  }

  async getCategories(): Promise<CategoriesResponse> {
    return this.fetchJson<CategoriesResponse>('/api/categories');
  }

  // Models endpoints
  async getModels(): Promise<ModelsResponse> {
    return this.fetchJson<ModelsResponse>('/api/models');
  }

  // Debate endpoints
  async startDebate(request: DebateStartRequest): Promise<DebateStartResponse> {
    return this.fetchJson<DebateStartResponse>('/api/debate/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getDebate(debateId: string): Promise<DebateStatus> {
    return this.fetchJson<DebateStatus>(`/api/debate/${debateId}`);
  }

  async pauseDebate(debateId: string): Promise<{ debate_id: string; status: string; current_round: number; paused_at: string }> {
    return this.fetchJson(`/api/debate/${debateId}/pause`, {
      method: 'POST',
    });
  }

  async resumeDebate(debateId: string): Promise<{ debate_id: string; status: string; current_round: number; resumed_at: string }> {
    return this.fetchJson(`/api/debate/${debateId}/resume`, {
      method: 'POST',
    });
  }

  async stopDebate(debateId: string): Promise<{ debate_id: string; status: string; completed_rounds: number; total_messages: number; stopped_at: string }> {
    return this.fetchJson(`/api/debate/${debateId}/stop`, {
      method: 'POST',
    });
  }

  async getDebateResults(debateId: string): Promise<DebateResults> {
    // Use the main debate endpoint - it returns all debate data including messages
    // We need to fetch the full debate object which includes messages, final_summary, etc.
    const debate = await this.fetchJson<any>(`/api/debate/${debateId}`);
    
    // Transform to DebateResults format
    // Note: summary and predictions will be added in Phase 5
    return {
      debate_id: debate.debate_id,
      status: debate.status as 'completed',
      market: {
        id: debate.market_id,
        question: debate.market_question,
        outcomes: debate.outcomes || []
      },
      summary: debate.final_summary || {
        overall: '',
        agreements: [],
        disagreements: [],
        consensus: '',
        model_rationales: []
      },
      final_predictions: debate.final_predictions || {},
      statistics: {
        average_prediction: {},
        median_prediction: {},
        prediction_variance: 0,
        polymarket_odds: debate.polymarket_odds || {},
        ai_vs_market_delta: '',
        total_messages: debate.messages?.length || 0,
        total_duration_seconds: 0,
        models_count: debate.selected_models?.length || 0,
        rounds_completed: debate.current_round || debate.rounds || 0
      },
      completed_at: debate.completed_at || new Date().toISOString()
    };
  }

  async getDebateTranscript(debateId: string): Promise<{ debate_id: string; messages: DebateMessage[] }> {
    return this.fetchJson(`/api/debate/${debateId}/transcript`);
  }

  async getDebates(params?: {
    limit?: number;
    offset?: number;
    status?: 'all' | 'completed' | 'in_progress';
    market_id?: string;
  }): Promise<DebatesResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.market_id) queryParams.append('market_id', params.market_id);

    const queryString = queryParams.toString();
    const endpoint = `/api/debates${queryString ? `?${queryString}` : ''}`;

    return this.fetchJson<DebatesResponse>(endpoint);
  }

  async getMarketDebates(marketId: string, params?: {
    limit?: number;
    offset?: number;
    status?: 'all' | 'completed' | 'in_progress';
  }): Promise<{ market: { id: string; question: string; current_odds: Record<string, number> }; debates: DebateListItem[] }> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    const endpoint = `/api/markets/${marketId}/debates${queryString ? `?${queryString}` : ''}`;

    return this.fetchJson(endpoint);
  }

  // SSE Stream helper
  createDebateStream(debateId: string, onEvent: (event: MessageEvent) => void): EventSource {
    const url = `${this.baseUrl}/api/debate/${debateId}/stream`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = onEvent;
    eventSource.onerror = (error) => {
      console.error('SSE stream error:', error);
      eventSource.close();
    };

    return eventSource;
  }

  // Audio URL helper
  getAudioUrl(messageId: string): string {
    return `${this.baseUrl}/api/audio/${messageId}.mp3`;
  }

  // Auth endpoints
  async signupRequestCode(data: SignupRequestData): Promise<SignupRequestResponse> {
    return this.fetchJson<SignupRequestResponse>('/api/auth/signup/request-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signupVerifyCode(data: SignupVerifyData): Promise<SignupVerifyResponse> {
    const response = await this.fetchJson<SignupVerifyResponse>('/api/auth/signup/verify-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store token in localStorage
    if (response.success && response.data.token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', response.data.token);
    }

    return response;
  }

  async loginRequestCode(data: LoginRequestData): Promise<LoginRequestResponse> {
    return this.fetchJson<LoginRequestResponse>('/api/auth/login/request-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async loginVerifyCode(data: LoginVerifyData): Promise<LoginVerifyResponse> {
    const response = await this.fetchJson<LoginVerifyResponse>('/api/auth/login/verify-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store token in localStorage
    if (response.success && response.data.token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', response.data.token);
    }

    return response;
  }

  async getCurrentUser(): Promise<MeResponse> {
    return this.fetchJson<MeResponse>('/api/auth/me');
  }

  async updateCurrentUser(data: UpdateUserData): Promise<UpdateUserResponse> {
    return this.fetchJson<UpdateUserResponse>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  isAuthenticated(): boolean {
    return this.getAuthToken() !== null;
  }

  // Favorites endpoints
  async getFavorites(): Promise<FavoritesResponse> {
    return this.fetchJson<FavoritesResponse>('/api/favorites');
  }

  async addFavorite(marketId: string): Promise<AddFavoriteResponse> {
    return this.fetchJson<AddFavoriteResponse>('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ market_id: marketId }),
    });
  }

  async removeFavorite(marketId: string): Promise<RemoveFavoriteResponse> {
    return this.fetchJson<RemoveFavoriteResponse>(`/api/favorites/${marketId}`, {
      method: 'DELETE',
    });
  }

  async checkFavorite(marketId: string): Promise<CheckFavoriteResponse> {
    return this.fetchJson<CheckFavoriteResponse>(`/api/favorites/check/${marketId}`);
  }
}

export const apiClient = new ApiClient();

