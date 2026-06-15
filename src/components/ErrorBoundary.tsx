import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * 全站错误边界:任一组件渲染期抛错时,不再整站白屏,而是显示降级提示 + 刷新入口。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 仅记录到控制台,不上报第三方;避免泄露用户数据。
    console.error('[ErrorBoundary] 渲染异常:', error, info?.componentStack);
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#16265E',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 600 }}>页面出了点小问题</div>
        <div style={{ fontSize: '14px', color: '#6b7280', maxWidth: '420px' }}>
          抱歉，刚才加载这一部分时出错了。刷新通常即可恢复；若反复出现请联系我们。
        </div>
        <button
          type="button"
          onClick={this.handleReload}
          style={{
            marginTop: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            border: '1px solid #16265E',
            background: '#16265E',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          刷新页面
        </button>
      </div>
    );
  }
}
