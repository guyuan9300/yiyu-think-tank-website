/**
 * AI Adapters模块导出
 */

export { adapterManager } from './base';
export type { 
  AIBaseAdapter, 
  GenerateRequest, 
  GenerateResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  StreamChunk,
  AIModel,
  HealthStatus,
} from './base';

export { OpenAIAdapter } from './openai';
