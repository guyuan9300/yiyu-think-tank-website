export {};

declare global {
  interface Window {
    __YIYU_TONG_APP__?: {
      getState: () => {
        currentPage: string;
        currentUrl: string;
        selectedDetailId: string;
        selectedBookId: string;
        selectedCaseId: string;
      };
      openInternalUrl: (target: string) => void;
      navigate: (page: string, id?: string) => void;
    };
    PAGE_AGENT_EXT_VERSION?: string;
    PAGE_AGENT_EXT?: {
      version: string;
      execute: (
        task: string,
        config: {
          baseURL: string;
          model: string;
          apiKey?: string;
          includeInitialTab?: boolean;
          onStatusChange?: (status: 'idle' | 'running' | 'completed' | 'error') => void;
          onActivity?: (activity: {
            type: 'thinking' | 'executing' | 'executed' | 'retrying' | 'error';
            tool?: string;
            input?: unknown;
            output?: string;
            duration?: number;
            attempt?: number;
            maxAttempts?: number;
            message?: string;
          }) => void;
          onHistoryUpdate?: (history: unknown[]) => void;
        }
      ) => Promise<{ success: boolean; data: string; history: unknown[] }>;
      stop: () => void;
    };
  }
}
