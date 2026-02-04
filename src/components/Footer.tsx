/**
 * Footer 组件
 * 网站页脚，显示联系信息和导航链接
 */
import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import { getSystemSettings, type SystemSettings } from '../lib/dataService';

interface FooterProps {
  onNavigate?: (page: 'about' | 'home' | 'insights' | 'learning' | 'strategy') => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const loadSettings = () => {
      setSettings(getSystemSettings());
    };

    loadSettings();

    // 监听数据变化
    const handleDataChange = () => {
      loadSettings();
    };

    window.addEventListener('yiyu_data_change', handleDataChange);

    return () => {
      window.removeEventListener('yiyu_data_change', handleDataChange);
    };
  }, []);

  const handleNavClick = (page: 'about' | 'home' | 'insights' | 'learning' | 'strategy') => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 关于我们 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {settings?.siteName || '益语智库'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {settings?.siteDescription || '致力于为公益组织、社会企业提供专业的战略咨询和能力建设服务'}
            </p>
            <button
              onClick={() => handleNavClick('about')}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
            >
              了解更多 →
            </button>
          </div>

          {/* 快速导航 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">快速导航</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavClick('home')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  首页
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('insights')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  洞察
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('learning')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  学习中心
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('strategy')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  战略陪伴
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('about')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  关于我们
                </button>
              </li>
            </ul>
          </div>

          {/* 联系我们 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">联系我们</h3>
            <ul className="space-y-3">
              {settings?.contactEmail && (
                <li className="flex items-start gap-2 text-gray-400 text-sm">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="hover:text-white transition-colors break-all"
                  >
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {settings?.contactPhone && (
                <li className="flex items-start gap-2 text-gray-400 text-sm">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <a
                    href={`tel:${settings.contactPhone}`}
                    className="hover:text-white transition-colors"
                  >
                    {settings.contactPhone}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* 关注我们 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">关注我们</h3>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors"
                title="微信公众号"
              >
                <Globe className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors"
                title="微博"
              >
                <Globe className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors"
                title="LinkedIn"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* 底部版权信息 */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © {currentYear} {settings?.siteName || '益语智库'}. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                隐私政策
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                使用条款
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                网站地图
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
