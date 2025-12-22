/**
 * API Client for AI Foresight Platform Lambda Backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AgentExecutionRequest {
  agent_type: string;
  context: Record<string, any>;
}

export interface AgentExecutionResponse {
  execution_id: string;
  agent_type: string;
  model_used: string;
  output: any;
  cost_usd: number;
  execution_time: number;
  timestamp: string;
}

export interface ScenarioGenerationRequest {
  industry: string;
  region: string;
  horizon_years: number;
  signals?: any[];
  evidence?: any[];
  user_constraints?: Record<string, any>;
}

export interface ScenarioSet {
  scenario_set_id: string;
  industry: string;
  region: string;
  horizon_years: number;
  created_at: string;
  generation_time_seconds: number;
  themes: any[];
  drivers: any[];
  uncertainties: any[];
  scenarios: any[];
  action_plan: any;
  quality_report: any;
  models_used: Record<string, number>;
  total_cost_usd: number;
  status: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  service: string;
  bedrock_available: boolean;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 900000, // 15 minutes for long-running scenario generation
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Get available agents
   */
  async getAgents(): Promise<string[]> {
    const response = await this.client.get('/agents');
    return response.data.agents;
  }

  /**
   * Execute a single agent
   */
  async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    const response = await this.client.post('/execute', request);
    return response.data;
  }

  /**
   * Generate complete scenario set (full pipeline)
   */
  async generateScenarios(request: ScenarioGenerationRequest): Promise<ScenarioSet> {
    const response = await this.client.post('/generate-scenarios', request);
    return response.data;
  }

  /**
   * Get scenario by ID (future implementation)
   */
  async getScenario(scenarioId: string): Promise<ScenarioSet> {
    const response = await this.client.get(`/scenarios/${scenarioId}`);
    return response.data;
  }

  /**
   * List scenarios (future implementation)
   */
  async listScenarios(filters?: Record<string, any>): Promise<ScenarioSet[]> {
    const response = await this.client.get('/scenarios', { params: filters });
    return response.data.scenarios;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
