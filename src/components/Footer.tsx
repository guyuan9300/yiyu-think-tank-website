import { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { getSystemSettings, type SystemSettings } from '../lib/dataService';

interface FooterProps {
  onNavigate?: (page: 'about' | 'home' | 'insights' | 'learning' | 'strategy' | 'report-library' | 'article-center' | 'book-library' | 'methodology-library') => void;
}

/**
 * 统一底部信息栏（基于 HomePage 的 clean footer 结构统一版）
 * 视觉：黑底白字；层级：标语最大 / 栏目次大 / 条目更小 / 版权&备案最小。
 */
export function Footer({ onNavigate }: FooterProps) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const load = () => setSettings(getSystemSettings());
    load();
    const onData = () => load();
    window.addEventListener('yiyu_data_change', onData);
    return () => window.removeEventListener('yiyu_data_change', onData);
  }, []);

  const currentYear = new Date().getFullYear();

  const nav = (page: 'about' | 'home' | 'insights' | 'learning' | 'strategy' | 'report-library' | 'article-center' | 'book-library' | 'methodology-library') => {
    onNavigate?.(page);
  };

  return (
    <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black text-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand + Slogan (largest) */}
          <div className="md:col-span-1">
            <h4 className="font-semibold text-[18px] mb-3 text-white">
              {settings?.siteName || '益语智库'}
            </h4>
            <p className="text-[16px] text-white/90 leading-relaxed">
              助力企业持续增长的战略陪伴者
            </p>

            {/* Mobile Quick Links */}
            <div className="mt-5 flex flex-wrap gap-2 md:hidden">
              <button
                type="button"
                onClick={() => nav('insights')}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/80 hover:text-white hover:border-white/30 transition-colors"
              >
                前沿洞察
              </button>
              <button
                type="button"
                onClick={() => nav('learning')}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/80 hover:text-white hover:border-white/30 transition-colors"
              >
                学习中心
              </button>
              <button
                type="button"
                onClick={() => nav('strategy')}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/80 hover:text-white hover:border-white/30 transition-colors"
              >
                战略陪伴
              </button>
              <button
                type="button"
                onClick={() => nav('about')}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/80 hover:text-white hover:border-white/30 transition-colors"
              >
                关于我们
              </button>
            </div>
          </div>

          {/* Insights */}
          <div className="hidden md:block">
            <h4 className="font-medium text-[15px] mb-4 text-white">前沿洞察</h4>
            <ul className="space-y-2.5 text-[13px] text-white/70">
              <li>
                <button type="button" onClick={() => nav('report-library')} className="hover:text-white transition-colors">
                  报告库
                </button>
              </li>
              <li>
                <button type="button" onClick={() => nav('article-center')} className="hover:text-white transition-colors">
                  文章中心
                </button>
              </li>
            </ul>
          </div>

          {/* Learning */}
          <div className="hidden md:block">
            <h4 className="font-medium text-[15px] mb-4 text-white">学习中心</h4>
            <ul className="space-y-2.5 text-[13px] text-white/70">
              <li>
                <button type="button" onClick={() => nav('book-library')} className="hover:text-white transition-colors">
                  图书馆
                </button>
              </li>
              <li>
                <button type="button" onClick={() => nav('methodology-library')} className="hover:text-white transition-colors">
                  工具/方法论
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-medium text-[15px] mb-4 text-white">联系我们</h4>
            <ul className="space-y-2.5 text-[13px] text-white/70">
              {settings?.contactEmail ? (
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/60" />
                  <a href={`mailto:${settings.contactEmail}`} className="hover:text-white transition-colors break-all">
                    {settings.contactEmail}
                  </a>
                </li>
              ) : (
                <li className="text-white/60">邮箱：待补充</li>
              )}
              {settings?.contactPhone ? (
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/60" />
                  <a href={`tel:${settings.contactPhone}`} className="hover:text-white transition-colors">
                    {settings.contactPhone}
                  </a>
                </li>
              ) : (
                <li className="text-white/60">电话：待补充</li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom (smallest) */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[11px] text-white/55 text-center sm:text-left">
            © {currentYear} 益语智库 Yiyu Think Tank. All rights reserved.
          </p>
          <p className="text-[11px] text-white/55 text-center sm:text-right">
            ICP备案号：待提交
          </p>
        </div>
      </div>
    </footer>
  );
}
