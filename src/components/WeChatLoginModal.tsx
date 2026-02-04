import { useState, useEffect } from 'react';
import { WeChatIcon } from './WeChatIcon';

// 微信登录模式类型
type WeChatLoginMode = 'normal' | 'demo' | 'configured';

interface WeChatLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: WeChatLoginMode;
  appId?: string;
}

export function WeChatLoginModal({ isOpen, onClose, onSuccess, mode = 'normal', appId }: WeChatLoginModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 获取真实的微信AppID
  const getAppId = (): string | null => {
    if (appId && appId !== 'your_app_id') {
      return appId;
    }
    // 从环境变量获取
    const envAppId = (import.meta as unknown as { env: { VITE_WECHAT_APP_ID?: string } }).env?.VITE_WECHAT_APP_ID;
    if (envAppId && envAppId !== 'your_app_id') {
      return envAppId;
    }
    return null;
  };

  // 处理微信登录
  const handleWeChatLogin = () => {
    const validAppId = getAppId();
    
    if (!validAppId) {
      // 没有配置AppID，显示演示模式
      setIsRedirecting(true);
      let count = 3;
      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(timer);
          setIsRedirecting(false);
          // 演示模式下模拟登录成功
          if (onSuccess) {
            onSuccess();
          }
        }
      }, 1000);
      return;
    }

    // 有真实AppID，跳转到微信授权页面
    const redirectUri = encodeURIComponent(
      window.location.origin + '/api/auth/wechat/callback'
    );
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('wechat_login_state', state);

    const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${validAppId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
    
    window.location.href = authUrl;
  };

  // 检查是否已配置
  const isConfigured = getAppId() !== null;

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      setIsRedirecting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        {/* 关闭按钮 */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#07C160] mb-4">
            <WeChatIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold">微信登录</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isConfigured ? '请使用微信扫码登录' : '演示模式'}
          </p>
        </div>

        {/* 状态显示 */}
        {isRedirecting ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-lg font-medium mb-2">尚未配置微信登录</p>
            <p className="text-sm text-gray-500 mb-4">
              请在后台配置有效的微信AppID
            </p>
            <div className="text-3xl font-bold text-[#07C160] mb-4">{countdown}</div>
            <p className="text-xs text-gray-400">秒后自动返回</p>
          </div>
        ) : isConfigured ? (
          <>
            {/* 二维码区域 */}
            <div className="flex justify-center mb-6">
              <div className="w-48 h-48 bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <WeChatIcon className="w-16 h-16 text-[#07C160] mb-2" />
                <p className="text-sm text-gray-500 text-center">
                  微信网页登录
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  二维码将在新窗口打开
                </p>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500">
                点击下方按钮跳转微信授权
              </p>
            </div>

            {/* 登录按钮 */}
            <button
              onClick={handleWeChatLogin}
              className="w-full py-3 px-4 rounded-xl bg-[#07C160] hover:bg-[#06AD56] text-white font-medium transition-all flex items-center justify-center gap-2 mb-4"
            >
              <WeChatIcon className="w-5 h-5" />
              <span>打开微信扫码登录</span>
            </button>
          </>
        ) : (
          <>
            {/* 未配置状态 */}
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                <WeChatIcon className="w-10 h-10 text-yellow-600" />
              </div>
              <h4 className="text-lg font-semibold mb-2">微信登录未配置</h4>
              <p className="text-sm text-gray-500 mb-6">
                要使用微信登录功能，需要先配置有效的AppID
              </p>

              {/* 配置说明 */}
              <div className="text-left bg-gray-50 rounded-xl p-4 mb-6">
                <h5 className="font-medium mb-2">📝 配置步骤：</h5>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li>1. 访问 <a href="https://open.weixin.qq.com" target="_blank" rel="noopener noreferrer" className="text-[#07C160] hover:underline">微信开放平台</a></li>
                  <li>2. 完成开发者资质认证</li>
                  <li>3. 创建网站应用获取AppID</li>
                  <li>4. 在环境变量中配置VITE_WECHAT_APP_ID</li>
                </ol>
              </div>

              {/* 测试邮箱登录 */}
              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl border border-border/50 hover:border-primary/50 transition-all text-gray-600"
              >
                使用邮箱登录
              </button>
            </div>
          </>
        )}

        {/* 底部提示 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            登录即表示同意
            <a href="#" className="text-[#07C160] hover:underline"> 服务条款</a>
            和
            <a href="#" className="text-[#07C160] hover:underline"> 隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default WeChatLoginModal;
