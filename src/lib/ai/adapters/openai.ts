/**
 * OpenAI适配器实现
 * 支持GPT-4、GPT-3.5等模型
 */

import type {
  AIBaseAdapter,
  GenerateRequest,
  GenerateResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  StreamChunk,
  HealthStatus,
  AIModel,
  AIProviderConfig,
} from './base';

/**
 * OpenAI客户端接口
 */
interface OpenAIClient {
  chat: {
    completions: {
      create: (params: unknown) => Promise<unknown>;
    };
  };
  models: {
    list: () => Promise<{ data: Array<{ id: string }> }>;
  };
}

/**
 * OpenAI适配器
 */
export class OpenAIAdapter implements AIBaseAdapter {
  providerName = 'openai';
  providerVersion = '2024-01';
  private client: OpenAIClient | null = null;
  
  /**
   * 初始化适配器
   */
  async initialize(config: AIProviderConfig): Promise<void> {
    // 注意：实际使用时需要安装openai包
    // import OpenAI from 'openai';
    
    try {
      // 模拟客户端初始化（实际代码需要uncomment下面行）
      /*
      this.client = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organization,
        baseURL: config.baseUrl,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      });
      */
      
      this.client = this.createMockClient();
      console.log('OpenAI adapter initialized');
    } catch (error) {
      console.error('Failed to initialize OpenAI adapter:', error);
      throw error;
    }
  }
  
  /**
   * 创建模拟客户端（用于演示）
   */
  private createMockClient(): OpenAIClient {
    return {
      chat: {
        completions: {
          create: async (params: unknown) => {
            const p = params as {
              messages?: Array<{ content: string }>;
              model?: string;
              temperature?: number;
              max_tokens?: number;
            };
            
            // 模拟响应
            return {
              choices: [{
                message: {
                  content: `这是AI生成的回复。\n\n模型: ${p.model || 'gpt-4'}\n温度: ${p.temperature || 0.7}\n\n根据您的请求，我生成了这段内容。实际使用时将调用真实的OpenAI API。`,
                },
                finish_reason: 'stop',
              }],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 50,
                total_tokens: 60,
              },
              model: p.model || 'gpt-4',
            };
          },
        },
      },
      models: {
        list: async () => ({
          data: [
            { id: 'gpt-4' },
            { id: 'gpt-4-turbo' },
            { id: 'gpt-3.5-turbo' },
          ],
        }),
      },
    };
  }
  
  /**
   * 生成内容
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    if (!this.client) {
      throw new Error('OpenAI adapter not initialized');
    }
    
    try {
      const messages = this.buildMessages(request);
      
      const completion = await this.client.chat.completions.create({
        model: request.model,
        messages,
        temperature: request.parameters?.temperature,
        max_tokens: request.parameters?.maxTokens,
        top_p: request.parameters?.topP,
        frequency_penalty: request.parameters?.frequencyPenalty,
        presence_penalty: request.parameters?.presencePenalty,
        stop: request.parameters?.stop,
      } as unknown);
      
      return this.parseResponse(completion as unknown as { choices: Array<{ message: { content: string } }>; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; model: string });
    } catch (error) {
      console.error('OpenAI generation failed:', error);
      throw error;
    }
  }
  
  /**
   * 构建消息
   */
  private buildMessages(request: GenerateRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];
    
    if (request.context?.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.context.systemPrompt,
      });
    }
    
    if (request.context?.history) {
      for (const msg of request.context.history) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }
    
    messages.push({
      role: 'user',
      content: request.prompt,
    });
    
    return messages;
  }
  
  /**
   * 解析响应
   */
  private parseResponse(completion: { 
    choices: Array<{ message: { content: string } }>; 
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; 
    model: string 
  }): GenerateResponse {
    const choice = completion.choices[0];
    
    return {
      content: choice.message.content,
      usage: {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      },
      model: completion.model,
      finishReason: 'stop',
    };
  }
  
  /**
   * 分析内容
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const systemPrompts: Record<string, string> = {
      sentiment: '分析以下内容的情感倾向，返回JSON格式：{positive: number, neutral: number, negative: number}',
      topics: '提取以下内容的主要主题和关键词，返回JSON格式：{topics: string[], keywords: string[]}',
      readability: '分析以下内容的可读性，返回JSON格式：{score: number, grade: string, suggestions: string[]}',
      quality: '评估以下内容的质量，返回JSON格式：{score: number, aspects: {clarity: number, accuracy: number, completeness: number}}',
      seo: '分析以下内容的SEO优化情况，返回JSON格式：{score: number, keywords: string[], suggestions: string[]}',
    };
    
    const response = await this.generate({
      prompt: `${systemPrompts[request.analysisType]}\n\n内容:\n${request.content}`,
      model: 'gpt-4',
      parameters: { temperature: 0.3 },
    });
    
    try {
      const results = JSON.parse(response.content);
      
      return {
        results,
        confidence: 0.85,
        model: 'gpt-4',
      };
    } catch {
      return {
        results: { raw: response.content },
        confidence: 0.7,
        model: 'gpt-4',
      };
    }
  }
  
  /**
   * 流式生成
   */
  async *streamGenerate(request: GenerateRequest): AsyncIterable<StreamChunk> {
    if (!this.client) {
      throw new Error('OpenAI adapter not initialized');
    }
    
    const messages = this.buildMessages(request);
    
    // 模拟流式输出
    const response = await this.generate(request);
    const words = response.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield {
        content: words[i] + (i < words.length - 1 ? ' ' : ''),
        done: i === words.length - 1,
      };
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      
      // 模拟API调用
      await this.client?.models.list();
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * 列出可用模型
   */
  async listModels(): Promise<AIModel[]> {
    if (!this.client) {
      throw new Error('OpenAI adapter not initialized');
    }
    
    try {
      const response = await this.client.models.list();
      
      return response.data
        .filter(m => m.id.startsWith('gpt'))
        .map(m => this.mapModel(m.id));
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }
  
  /**
   * 映射模型信息
   */
  private mapModel(modelId: string): AIModel {
    const models: Record<string, AIModel> = {
      'gpt-4': {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        capabilities: ['text', 'reasoning', 'code', 'analysis'],
        contextWindow: 8192,
        maxOutputTokens: 4096,
        costPer1kTokens: { input: 0.03, output: 0.06 },
      },
      'gpt-4-turbo': {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        capabilities: ['text', 'reasoning', 'code', 'analysis', 'vision'],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1kTokens: { input: 0.01, output: 0.03 },
      },
      'gpt-3.5-turbo': {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        capabilities: ['text', 'code', 'simple-analysis'],
        contextWindow: 16385,
        maxOutputTokens: 4096,
        costPer1kTokens: { input: 0.0005, output: 0.0015 },
      },
    };
    
    return models[modelId] || {
      id: modelId,
      name: modelId,
      provider: 'openai',
      capabilities: ['text'],
      contextWindow: 4096,
      maxOutputTokens: 1024,
      costPer1kTokens: { input: 0.001, output: 0.002 },
    };
  }
}

// 注册适配器
import { adapterManager } from './base';
adapterManager.registerAdapter('openai', new OpenAIAdapter());
