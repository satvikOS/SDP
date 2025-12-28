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
  company_name: string;
  industry: string;
  region: string;
  horizon_years: number;
  horizon_months?: number;
  horizon_weeks?: number;
  horizon_days?: number;
  strategic_context?: string;
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
   * Generate complete scenario set (async with polling)
   */
  async generateScenarios(request: ScenarioGenerationRequest): Promise<ScenarioSet> {
    // Start async generation
    const startResponse = await this.client.post('/scenarios/generate/async', request);
    const jobId = startResponse.data.job_id;

    // Poll for completion
    const pollInterval = 3000; // 3 seconds (reduce server load)
    const maxAttempts = 500; // 25 minutes max (500 * 3s = 1500s) - generous buffer for 4 comprehensive scenarios

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await this.client.get(`/scenarios/status/${jobId}`);

      if (statusResponse.status === 200) {
        // Completed successfully
        return statusResponse.data;
      } else if (statusResponse.status === 500) {
        // Failed
        throw new Error(statusResponse.data.error || 'Scenario generation failed');
      }
      // Status 202 means still processing, continue polling
    }

    throw new Error('Scenario generation timed out after 25 minutes');
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

  /**
   * Transform academic scenario to boardroom format
   */
  async transformToBoardroom(narrative: string, company_name: string, scenario_title: string): Promise<any> {
    const response = await this.client.post('/scenarios/transform/boardroom', {
      narrative,
      company_name,
      scenario_title
    });
    return response.data;
  }

  /**
   * Get analytics for scenario generation system
   */
  async getAnalytics(): Promise<any> {
    const response = await this.client.get('/analytics');
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
