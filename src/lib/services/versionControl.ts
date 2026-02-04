/**
 * 版本控制服务
 * 实现Git集成的内容版本管理和变更追踪
 */

import type { Content } from '../schemas/content';

/**
 * 版本信息
 */
export interface VersionInfo {
  version: number;
  commitHash: string;
  branch: string;
  author: string;
  timestamp: string;
  message: string;
  parentVersion?: number;
  changes: VersionChange[];
}

/**
 * 版本变更摘要
 */
export interface VersionChange {
  contentType: string;
  contentId: string;
  contentTitle: string;
  changeType: 'added' | 'modified' | 'deleted';
  filesChanged: string[];
}

/**
 * 版本差异对比
 */
export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  contentId: string;
  added: string[];
  removed: string[];
  modified: string[];
  summary: string;
}

/**
 * 分支信息
 */
export interface BranchInfo {
  name: string;
  isDefault: boolean;
  lastCommit: string;
  lastCommitHash: string;
  createdAt: string;
  createdBy: string;
}

/**
 * 合并结果
 */
export interface MergeResult {
  success: boolean;
  commitHash?: string;
  conflicts?: string[];
  mergeStrategy: 'squash' | 'rebase' | 'merge';
}

/**
 * 版本控制服务类
 */
class VersionControlService {
  private storageKey = 'content_versions';
  private branchesKey = 'content_branches';
  private currentBranch: string = 'main';
  private versions: VersionInfo[] = [];
  private branches: Map<string, BranchInfo> = new Map();
  
  constructor() {
    this.loadFromStorage();
    this.initializeDefaultBranch();
  }
  
  /**
   * 从存储加载数据
   */
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const versionsStored = localStorage.getItem(this.storageKey);
        const branchesStored = localStorage.getItem(this.branchesKey);
        
        if (versionsStored) {
          this.versions = JSON.parse(versionsStored);
        }
        if (branchesStored) {
          const branchesData = JSON.parse(branchesStored);
          this.branches = new Map(Object.entries(branchesData));
        }
      } catch (error) {
        console.error('Failed to load version data:', error);
        this.versions = [];
        this.branches = new Map();
      }
    }
  }
  
  /**
   * 保存数据到存储
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.versions));
        localStorage.setItem(
          this.branchesKey,
          JSON.stringify(Object.fromEntries(this.branches))
        );
      } catch (error) {
        console.error('Failed to save version data:', error);
      }
    }
  }
  
  /**
   * 初始化默认分支
   */
  private initializeDefaultBranch(): void {
    if (!this.branches.has('main')) {
      this.branches.set('main', {
        name: 'main',
        isDefault: true,
        lastCommit: '',
        lastCommitHash: '',
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      });
      this.saveToStorage();
    }
  }
  
  /**
   * 生成提交哈希
   */
  private generateCommitHash(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `v${timestamp}${random}`;
  }
  
  /**
   * 获取下一个版本号
   */
  async getNextVersion(): Promise<number> {
    const branchVersions = this.versions.filter(
      v => v.branch === this.currentBranch
    );
    
    if (branchVersions.length === 0) {
      return 1;
    }
    
    return Math.max(...branchVersions.map(v => v.version)) + 1;
  }
  
  /**
   * 创建版本
   */
  async createVersion(
    changes: Array<{
      contentId: string;
      contentType: string;
      contentTitle: string;
      changeType: 'added' | 'modified' | 'deleted';
      files?: string[];
    }>,
    author: string,
    message: string
  ): Promise<VersionInfo> {
    const version = await this.getNextVersion();
    const commitHash = this.generateCommitHash();
    const timestamp = new Date().toISOString();
    
    const versionInfo: VersionInfo = {
      version,
      commitHash,
      branch: this.currentBranch,
      author,
      timestamp,
      message,
      changes: changes.map(c => ({
        contentType: c.contentType,
        contentId: c.contentId,
        contentTitle: c.contentTitle,
        changeType: c.changeType,
        filesChanged: c.files || [],
      })),
    };
    
    this.versions.push(versionInfo);
    this.saveToStorage();
    
    // 更新分支信息
    const branch = this.branches.get(this.currentBranch);
    if (branch) {
      branch.lastCommit = message;
      branch.lastCommitHash = commitHash;
      this.saveToStorage();
    }
    
    return versionInfo;
  }
  
  /**
   * 获取版本历史
   */
  async getVersionHistory(
    contentId?: string,
    branch?: string
  ): Promise<VersionInfo[]> {
    let results = [...this.versions];
    
    if (contentId) {
      results = results.filter(v =>
        v.changes.some(c => c.contentId === contentId)
      );
    }
    
    if (branch) {
      results = results.filter(v => v.branch === branch);
    }
    
    return results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  /**
   * 比较两个版本
   */
  async compareVersions(
    contentId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<VersionDiff | null> {
    const fromLog = this.versions.find(
      v => v.version === fromVersion && v.changes.some(c => c.contentId === contentId)
    );
    const toLog = this.versions.find(
      v => v.version === toVersion && v.changes.some(c => c.contentId === contentId)
    );
    
    if (!fromLog || !toLog) {
      return null;
    }
    
    const fromChanges = fromLog.changes.find(c => c.contentId === contentId);
    const toChanges = toLog.changes.find(c => c.contentId === contentId);
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    
    if (toChanges && !fromChanges) {
      added.push(contentId);
    } else if (!toChanges && fromChanges) {
      removed.push(contentId);
    } else if (fromChanges && toChanges && fromChanges.changeType !== toChanges.changeType) {
      modified.push(contentId);
    }
    
    return {
      fromVersion,
      toVersion,
      contentId,
      added,
      removed,
      modified,
      summary: `Added: ${added.length}, Removed: ${removed.length}, Modified: ${modified.length}`,
    };
  }
  
  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(
    contentId: string,
    targetVersion: number,
    operator: string
  ): Promise<VersionInfo | null> {
    const targetLog = this.versions.find(v => v.version === targetVersion);
    
    if (!targetLog) {
      return null;
    }
    
    const rollbackVersion = await this.createVersion(
      [{
        contentId,
        contentType: 'rollback',
        contentTitle: `Rollback to version ${targetVersion}`,
        changeType: 'modified',
      }],
      operator,
      `Rollback ${contentId} to version ${targetVersion}`
    );
    
    return rollbackVersion;
  }
  
  /**
   * 创建AI操作分支
   */
  async createAIBranch(
    agentId: string,
    taskId: string
  ): Promise<string> {
    const branchName = `ai/${agentId}/${taskId}`;
    const timestamp = new Date().toISOString();
    
    this.branches.set(branchName, {
      name: branchName,
      isDefault: false,
      lastCommit: '',
      lastCommitHash: '',
      createdAt: timestamp,
      createdBy: agentId,
    });
    
    this.saveToStorage();
    
    return branchName;
  }
  
  /**
   * 切换分支
   */
  async checkoutBranch(branchName: string): Promise<boolean> {
    if (!this.branches.has(branchName)) {
      return false;
    }
    
    this.currentBranch = branchName;
    return true;
  }
  
  /**
   * 获取当前分支
   */
  getCurrentBranch(): string {
    return this.currentBranch;
  }
  
  /**
   * 列出所有分支
   */
  listBranches(): BranchInfo[] {
    return Array.from(this.branches.values());
  }
  
  /**
   * 删除分支
   */
  deleteBranch(branchName: string): boolean {
    if (branchName === 'main') {
      return false;
    }
    
    const deleted = this.branches.delete(branchName);
    
    if (deleted && this.currentBranch === branchName) {
      this.currentBranch = 'main';
    }
    
    this.saveToStorage();
    return deleted;
  }
  
  /**
   * 合并分支
   */
  async mergeBranch(
    sourceBranch: string,
    targetBranch: string,
    mergeStrategy: 'squash' | 'rebase' | 'merge',
    author: string
  ): Promise<MergeResult> {
    const sourceVersions = this.versions.filter(v => v.branch === sourceBranch);
    
    if (sourceVersions.length === 0) {
      return {
        success: false,
        conflicts: [],
        mergeStrategy,
      };
    }
    
    if (mergeStrategy === 'squash') {
      const combinedChanges = sourceVersions.flatMap(v => v.changes);
      const message = `Squash merge ${sourceBranch} into ${targetBranch}`;
      
      await this.createVersion(combinedChanges, author, message);
    } else if (mergeStrategy === 'rebase') {
      for (const version of sourceVersions) {
        const newChanges = version.changes.map(c => ({
          ...c,
          changeType: 'modified' as const,
        }));
        
        await this.createVersion(newChanges, author, `Rebase: ${version.message}`);
      }
    } else {
      const latestSourceVersion = sourceVersions[sourceVersions.length - 1];
      
      await this.createVersion(
        latestSourceVersion.changes,
        author,
        `Merge ${sourceBranch} into ${targetBranch}`
      );
    }
    
    this.deleteBranch(sourceBranch);
    
    return {
      success: true,
      commitHash: this.generateCommitHash(),
      mergeStrategy,
    };
  }
  
  /**
   * 获取版本详情
   */
  async getVersionDetails(version: number): Promise<VersionInfo | null> {
    return this.versions.find(v => v.version === version) || null;
  }
  
  /**
   * 获取内容的所有版本
   */
  async getContentVersions(contentId: string): Promise<VersionInfo[]> {
    return this.versions
      .filter(v => v.changes.some(c => c.contentId === contentId))
      .sort((a, b) => b.version - a.version);
  }
  
  /**
   * 搜索版本
   */
  async searchVersions(query: {
    author?: string;
    message?: string;
    startDate?: string;
    endDate?: string;
    changeType?: string;
  }): Promise<VersionInfo[]> {
    let results = [...this.versions];
    
    if (query.author) {
      results = results.filter(v => v.author.includes(query.author as string));
    }
    if (query.message) {
      results = results.filter(v => v.message.includes(query.message as string));
    }
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      results = results.filter(v => new Date(v.timestamp) >= startDate);
    }
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      results = results.filter(v => new Date(v.timestamp) <= endDate);
    }
    if (query.changeType) {
      results = results.filter(v =>
        v.changes.some(c => c.changeType === (query.changeType as 'added' | 'modified' | 'deleted'))
      );
    }
    
    return results;
  }
  
  /**
   * 导出版本历史
   */
  async exportVersionHistory(
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const history = await this.getVersionHistory();
    
    if (format === 'json') {
      return JSON.stringify(history, null, 2);
    }
    
    const headers = ['Version', 'CommitHash', 'Branch', 'Author', 'Timestamp', 'Message'];
    const rows = history.map(v => [
      v.version,
      v.commitHash,
      v.branch,
      v.author,
      v.timestamp,
      `"${v.message.replace(/"/g, '""')}"`,
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

// 导出单例
export const versionControlService = new VersionControlService();
