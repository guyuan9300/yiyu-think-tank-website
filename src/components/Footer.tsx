import { Mail, Phone } from 'lucide-react';
import { SITE_CONTACT_EMAIL, SITE_CONTACT_PHONE, SITE_ICP_NUMBER, SITE_ICP_URL, SITE_NAME } from '../lib/siteMeta';

interface FooterProps {
  onNavigate?: (page: 'about' | 'home' | 'insights' | 'learning' | 'strategy' | 'report-library' | 'article-center' | 'book-library' | 'methodology-library') => void;
}

/**
 * 统一底部信息栏（基于 HomePage 的 clean footer 结构统一版）
 * 视觉：黑底白字；层级：标语最大 / 栏目次大 / 条目更小 / 版权&备案最小。
 */
export function Footer({ onNavigate }: FooterProps) {
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
              {SITE_NAME}
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
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/60" />
                <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="hover:text-white transition-colors break-all">
                  {SITE_CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/60" />
                <a href={`tel:${SITE_CONTACT_PHONE}`} className="hover:text-white transition-colors">
                  {SITE_CONTACT_PHONE}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom (smallest) */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[11px] text-white/55 text-center sm:text-left">
            © {currentYear} 益语智库 Yiyu Think Tank. All rights reserved.
          </p>
          <a
            href={SITE_ICP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-white/55 text-center sm:text-right hover:text-white/80 transition-colors"
          >
            {SITE_ICP_NUMBER}
          </a>
        </div>
      </div>
    </footer>
  );
}
