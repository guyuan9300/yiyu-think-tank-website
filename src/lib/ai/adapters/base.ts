/**
 * AI Provider Adapter基类
 * 定义标准AI接口，支持OpenAI、Claude等多模型对接
 */

/**
 * AI模型信息
 */
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kTokens: {
    input: number;
    output: number;
  };
}

/**
 * 生成请求参数
 */
export interface GenerateRequest {
  prompt: string;
  model: string;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  };
  context?: ConversationContext;
}

/**
 * 生成响应
 */
export interface GenerateResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
  metadata?: Record<string, unknown>;
}

/**
 * 分析请求
 */
export interface AnalyzeRequest {
  content: string;
  analysisType: 'sentiment' | 'topics' | 'readability' | 'quality' | 'seo';
  options?: Record<string, unknown>;
}

/**
 * 分析响应
 */
export interface AnalyzeResponse {
  results: Record<string, unknown>;
  confidence: number;
  model: string;
}

/**
 * 流式生成块
 */
export interface StreamChunk {
  content: string;
  done: boolean;
}

/**
 * 上下文对话
 */
export interface ConversationContext {
  systemPrompt?: string;
  history: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

/**
 * 健康状态
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
}

/**
 * AI提供商配置
 */
export interface AIProviderConfig {
  apiKey: string;
  organization?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * AI适配器基类接口
 */
export interface AIBaseAdapter {
  providerName: string;
  providerVersion: string;
  
  initialize(config: AIProviderConfig): Promise<void>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  analyze(request: AnalyzeRequest): Promise<AnalyzeResponse>;
  streamGenerate(request: GenerateRequest): AsyncIterable<StreamChunk>;
  healthCheck(): Promise<HealthStatus>;
  listModels(): Promise<AIModel[]>;
}

/**
 * 适配器管理器
 */
export class AdapterManager {
  private adapters: Map<string, AIBaseAdapter> = new Map();
  private defaultAdapter: string = 'openai';
  
  /**
   * 注册适配器
   */
  registerAdapter(name: string, adapter: AIBaseAdapter): void {
    this.adapters.set(name, adapter);
  }
  
  /**
   * 获取适配器
   */
  getAdapter(name?: string): AIBaseAdapter {
    const adapterName = name || this.defaultAdapter;
    const adapter = this.adapters.get(adapterName);
    
    if (!adapter) {
      throw new Error(`AI adapter not found: ${adapterName}`);
    }
    
    return adapter;
  }
  
  /**
   * 获取所有可用模型
   */
  async getAllAvailableModels(): Promise<AIModel[]> {
    const allModels: AIModel[] = [];
    
    for (const adapter of this.adapters.values()) {
      try {
        const models = await adapter.listModels();
        allModels.push(...models);
      } catch (error) {
        console.error(`Failed to list models for ${adapter.providerName}:`, error);
      }
    }
    
    return allModels;
  }
  
  /**
   * 智能选择最佳模型
   */
  async selectBestModel(
    requirements: {
      taskType: string;
      preferredProvider?: string;
      maxCost?: number;
      requiredCapabilities?: string[];
    }
  ): Promise<AIModel | null> {
    const allModels = await this.getAllAvailableModels();
    
    // 过滤符合条件的模型
    const suitable = allModels.filter(model => {
      // 检查必需能力
      if (requirements.requiredCapabilities) {
        const hasAllCapabilities = requirements.requiredCapabilities.every(
          cap => model.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) return false;
      }
      
      // 检查成本限制
      if (requirements.maxCost) {
        const cost = model.costPer1kTokens.output;
        if (cost > requirements.maxCost) return false;
      }
      
      return true;
    });
    
    if (suitable.length === 0) {
      return null;
    }
    
    // 按成本排序，选择最经济的
    suitable.sort((a, b) => 
      a.costPer1kTokens.output - b.costPer1kTokens.output
    );
    
    return suitable[0];
  }
}

// 导出适配器管理器单例
export const adapterManager = new AdapterManager();
