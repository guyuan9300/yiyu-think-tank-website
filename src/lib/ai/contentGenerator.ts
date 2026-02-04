/**
 * 自然语言内容生成引擎
 * 基于AI的内容自动创作系统
 */

import { adapterManager } from '../ai/adapters';
import { auditLogService } from '../services/auditLog';
import { versionControlService } from '../services/versionControl';
import type { Content } from '../schemas/content';

/**
 * 内容生成请求
 */
export interface ContentGenerationRequest {
  type: 'report' | 'article' | 'insight';
  
  // 输入
  input: {
    topic: string;
    outline?: string;
    sourceData?: string[];
    existingContent?: string;
  };
  
  // 要求
  requirements: {
    length?: 'short' | 'medium' | 'long' | number;
    tone?: 'formal' | 'professional' | 'casual' | 'academic';
    audience?: string;
    structure?: string;
    keywords?: string[];
    language?: string;
    style?: string;
  };
  
  // AI配置
  model?: string;
  creativity?: number;
  enableResearch?: boolean;
  citationRequired?: boolean;
  
  // 发布配置
  publishAfterGenerate?: boolean;
  categories?: string[];
  tags?: string[];
}

/**
 * 生成进度
 */
export interface GenerationProgress {
  stage: 'planning' | 'researching' | 'writing' | 'editing' | 'finalizing';
  progress: number;
  currentSection?: string;
  estimatedTimeRemaining?: number;
}

/**
 * 生成结果
 */
export interface GenerationResult {
  success: boolean;
  content?: string;
  metadata?: {
    wordCount: number;
    sectionCount: number;
    generationModel: string;
    confidenceScore: number;
  };
  error?: string;
  contentId?: string;
}

/**
 * 内容计划
 */
interface ContentPlan {
  titles: string[];
  summary: string;
  sections: Array<{
    title: string;
    keyPoints: string[];
  }>;
  researchQuestions: string[];
  citations: string[];
}

/**
 * 内容生成服务类
 */
class ContentGenerator {
  private readonly stylePrompts: Record<string, string> = {
    'apple': '采用苹果官网的设计语言：简洁、精炼、重点突出。使用大量留白，段落简短有力，善用项目符号。避免冗长的解释，直接陈述事实。',
    'naoto-fukasawa': '采用深则直人的设计哲学：温暖、自然、真实。语言亲和但不失专业，强调人文关怀和用户体验。避免过度技术化的表达。',
    'formal': '采用正式、学术化的写作风格。语言严谨，论证充分，引用权威来源。适合专业读者和学术场合。',
    'casual': '采用轻松、对话式的写作风格。语言亲和易懂，善用比喻和例子，拉近与读者的距离。',
    'professional': '采用专业但易懂的写作风格。兼顾深度和可读性，适合商业读者。使用行业标准术语但保持解释。',
  };
  
  /**
   * 生成内容
   */
  async generate(request: ContentGenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Stage 1: 规划内容结构
      const plan = await this.planContent(request);
      
      // Stage 2: 研究（如果需要）
      let researchData: string[] = [];
      if (request.enableResearch) {
        researchData = await this.research(plan.researchQuestions);
      }
      
      // Stage 3: 生成正文
      const content = await this.writeContent(plan, researchData, request);
      
      // Stage 4: 编辑优化
      const editedContent = await this.editContent(content, request);
      
      // Stage 5: 最终处理
      const finalContent = await this.finalizeContent(editedContent, plan, request);
      
      // 计算统计信息
      const wordCount = this.countWords(finalContent);
      const confidenceScore = this.calculateConfidence(plan, request);
      
      // 记录审计日志
      await auditLogService.logOperation({
        agentId: 'content-generator',
        agentName: 'AI Content Generator',
        agentType: 'internal',
        operationType: 'generate',
        contentType: request.type,
        contentId: 'pending',
        contentTitle: plan.titles[0],
        aiModel: request.model,
        confidenceScore,
        processingTime: Date.now() - startTime,
        status: 'success',
      });
      
      return {
        success: true,
        content: finalContent,
        metadata: {
          wordCount,
          sectionCount: plan.sections.length,
          generationModel: request.model || 'gpt-4',
          confidenceScore,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 记录错误日志
      await auditLogService.logOperation({
        agentId: 'content-generator',
        agentName: 'AI Content Generator',
        agentType: 'internal',
        operationType: 'generate',
        contentType: request.type,
        contentId: 'failed',
        contentTitle: request.input.topic,
        status: 'failed',
        errorMessage,
        processingTime: Date.now() - startTime,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
  
  /**
   * 规划内容
   */
  private async planContent(request: ContentGenerationRequest): Promise<ContentPlan> {
    const adapter = adapterManager.getAdapter(request.model);
    
    const planningPrompt = `
      请为以下内容需求制定详细的大纲计划：
      
      类型: ${request.type}
      主题: ${request.input.topic}
      目标受众: ${request.requirements.audience || '通用'}
      期望风格: ${this.stylePrompts[request.requirements.style || 'professional'] || request.requirements.tone || '专业'}
      ${request.requirements.keywords?.length ? `必须包含关键词: ${request.requirements.keywords.join(', ')}` : ''}
      
      请生成（用JSON格式）：
      1. 标题方案（3个选项）
      2. 一句话摘要
      3. 主要章节结构（每章标题和2-3个要点）
      4. 需要研究的问题列表
      5. 推荐引用的数据来源
    `;
    
    const response = await adapter.generate({
      prompt: planningPrompt,
      model: request.model || 'gpt-4',
      parameters: { temperature: 0.7 },
    });
    
    // 解析JSON响应
    try {
      const plan = JSON.parse(response.content);
      return {
        titles: plan.titles || [request.input.topic],
        summary: plan.summary || '',
        sections: plan.sections || [],
        researchQuestions: plan.researchQuestions || [],
        citations: plan.citations || [],
      };
    } catch {
      // 如果解析失败，返回基本结构
      return {
        titles: [request.input.topic],
        summary: '',
        sections: [],
        researchQuestions: [],
        citations: [],
      };
    }
  }
  
  /**
   * 研究功能
   */
  private async research(questions: string[]): Promise<string[]> {
    if (questions.length === 0) {
      return [];
    }
    
    // 模拟研究功能（实际需要接入搜索引擎或知识库）
    const results: string[] = [];
    
    for (const question of questions.slice(0, 5)) { // 限制研究问题数量
      results.push(`研究问题: ${question}\n答案: 基于最新数据和分析，该问题涉及多个维度...`);
    }
    
    return results;
  }
  
  /**
   * 撰写正文
   */
  private async writeContent(
    plan: ContentPlan,
    researchData: string[],
    request: ContentGenerationRequest
  ): Promise<string> {
    const adapter = adapterManager.getAdapter(request.model);
    const sections: string[] = [];
    
    for (const section of plan.sections) {
      const sectionPrompt = `
        请撰写以下章节内容：
        
        章节标题: ${section.title}
        关键要点: ${section.keyPoints.join('\n')}
        ${researchData.length ? `参考研究:\n${researchData.join('\n\n')}` : ''}
        
        写作要求：
        - 风格: ${this.stylePrompts[request.requirements.style || 'professional']}
        - 语言: ${request.requirements.language || '中文'}
        - 字数: ${this.getSectionWordCount(request.requirements.length, plan.sections.length)}
        - 确保内容连贯、逻辑清晰
      `;
      
      const response = await adapter.generate({
        prompt: sectionPrompt,
        model: request.model || 'gpt-4',
        parameters: { 
          temperature: request.creativity || 0.7,
          maxTokens: 2000,
        },
      });
      
      sections.push(`## ${section.title}\n\n${response.content}`);
    }
    
    return sections.join('\n\n');
  }
  
  /**
   * 编辑内容
   */
  private async editContent(
    content: string,
    request: ContentGenerationRequest
  ): Promise<string> {
    const adapter = adapterManager.getAdapter(request.model);
    
    const editPrompt = `
      请优化以下内容：
      
      原文:
      ${content}
      
      优化要求：
      - 改进语法和表达
      - 提升可读性
      ${request.requirements.keywords?.length ? `确保包含关键词: ${request.requirements.keywords.join(', ')}` : ''}
      - 保持原意不变
      - 调整段落结构使其更流畅
      
      请直接返回优化后的内容，无需额外解释。
    `;
    
    const response = await adapter.generate({
      prompt: editPrompt,
      model: request.model || 'gpt-4',
      parameters: { temperature: 0.3 },
    });
    
    return response.content;
  }
  
  /**
   * 最终处理
   */
  private async finalizeContent(
    content: string,
    plan: ContentPlan,
    request: ContentGenerationRequest
  ): Promise<string> {
    const finalized = `
# ${plan.titles[0]}

${plan.summary}

${content}

---
*本文由益语智库AI系统生成*
*生成时间: ${new Date().toISOString()}*
${plan.citations.length ? `\n参考文献:\n${plan.citations.map((c, i) => `${i+1}. ${c}`).join('\n')}` : ''}
    `.trim();
    
    return finalized;
  }
  
  /**
   * 获取章节字数
   */
  private getSectionWordCount(
    length: 'short' | 'medium' | 'long' | number | undefined,
    sectionCount: number
  ): string {
    const totalWords = typeof length === 'number' 
      ? length 
      : { short: 500, medium: 1000, long: 2000 }[length || 'medium'];
    
    const wordsPerSection = Math.floor(totalWords / Math.max(sectionCount, 1));
    return `约${wordsPerSection}字`;
  }
  
  /**
   * 统计字数
   */
  private countWords(content: string): number {
    return content.replace(/[^\u4e00-\u9fa5]/g, '').length;
  }
  
  /**
   * 计算置信度
   */
  private calculateConfidence(plan: ContentPlan, request: ContentGenerationRequest): number {
    let score = 0.5; // 基础分数
    
    // 根据计划完整性加分
    if (plan.titles.length > 0) score += 0.1;
    if (plan.summary) score += 0.1;
    if (plan.sections.length > 0) score += 0.1;
    if (plan.researchQuestions.length > 0) score += 0.1;
    
    // 根据请求完整性加分
    if (request.requirements.keywords?.length) score += 0.05;
    if (request.requirements.audience) score += 0.05;
    
    return Math.min(score, 0.95); // 最高0.95
  }
  
  /**
   * 生成摘要
   */
  async generateSummary(
    content: string,
    length: 'short' | 'long' = 'short'
  ): Promise<string> {
    const adapter = adapterManager.getAdapter();
    
    const summaryLength = length === 'short' ? '100字' : '300字';
    
    const response = await adapter.generate({
      prompt: `请用${summaryLength}总结以下内容:\n\n${content}`,
      model: 'gpt-3.5-turbo',
      parameters: { temperature: 0.3 },
    });
    
    return response.content;
  }
  
  /**
   * 改写内容
   */
  async rewrite(
    content: string,
    style: 'simpler' | 'more-formal' | 'more-professional' = 'simpler'
  ): Promise<string> {
    const adapter = adapterManager.getAdapter();
    
    const styleInstructions = {
      simpler: '用更简单、易懂的语言改写，降低专业术语使用',
      'more-formal': '用更正式、学术化的语言改写',
      'more-professional': '用更专业、权威的语言改写',
    };
    
    const response = await adapter.generate({
      prompt: `请按照以下要求改写内容:\n\n${styleInstructions[style]}\n\n原文:\n${content}`,
      model: 'gpt-3.5-turbo',
      parameters: { temperature: 0.5 },
    });
    
    return response.content;
  }
}

// 导出单例
export const contentGenerator = new ContentGenerator();
