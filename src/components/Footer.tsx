import { Mail, Phone } from 'lucide-react';
import { SITE_CONTACT_EMAIL, SITE_CONTACT_PHONE, SITE_ICP_NUMBER, SITE_ICP_URL, SITE_NAME } from '../lib/siteMeta';

interface FooterProps {
  // 接受任意 page 字符串以兼容旧页面 (LibraryPage 等被砍页将在物理清理时一并删除).
  // 新版只对外暴露 4 项导航 + consult-apply, 实际调用见 nav() 内部.
  onNavigate?: (page: string) => void;
}

/**
 * 统一底部信息栏 — 配合 2026-05-28 4 项导航统一架构.
 * 视觉：黑底白字；层级：标语最大 / 栏目次大 / 条目更小 / 版权&备案最小.
 */
export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const nav = (page: 'home' | 'articles' | 'reports' | 'about' | 'consult-apply') => {
    // Footer 自身只 emit 4 项导航 + consult-apply, 接口宽松仅为兼容旧调用方.
    onNavigate?.(page);
  };

  return (
    <footer
      data-yiyu-section="shared-footer"
      data-yiyu-section-type="footer"
      data-yiyu-section-title="底部栏"
      data-yiyu-section-order="999"
      data-yiyu-section-enterable="true"
      className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black text-white"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand + Slogan */}
          <div className="md:col-span-1">
            <h4 className="font-semibold text-[18px] mb-3 text-white">{SITE_NAME}</h4>
            <p className="text-[16px] text-white/90 leading-relaxed">
              把战略思想做成 AI 工具的组织陪伴公司
            </p>

            {/* Mobile Quick Links */}
            <div className="mt-5 flex flex-wrap gap-2 md:hidden">
              <button
                type="button"
                onClick={() => nav('articles')}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/80 hover:text-white hover:border-white/30 transition-colors"
              >
                文章
              </button>
              <button
                type="button"
                onClick={() => nav('reports')}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/80 hover:text-white hover:border-white/30 transition-colors"
              >
                报告
              </button>
              <button
                type="button"
                onClick={() => nav('about')}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/80 hover:text-white hover:border-white/30 transition-colors"
              >
                关于我们
              </button>
              <button
                type="button"
                onClick={() => nav('consult-apply')}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/80 hover:text-white hover:border-white/30 transition-colors"
              >
                申请咨询
              </button>
            </div>
          </div>

          {/* 内容栏 */}
          <div className="hidden md:block">
            <h4 className="font-medium text-[15px] mb-4 text-white">内容</h4>
            <ul className="space-y-2.5 text-[13px] text-white/70">
              <li>
                <button type="button" onClick={() => nav('articles')} className="hover:text-white transition-colors">
                  文章
                </button>
              </li>
              <li>
                <button type="button" onClick={() => nav('reports')} className="hover:text-white transition-colors">
                  报告
                </button>
              </li>
            </ul>
          </div>

          {/* 合作 / 服务 */}
          <div className="hidden md:block">
            <h4 className="font-medium text-[15px] mb-4 text-white">合作</h4>
            <ul className="space-y-2.5 text-[13px] text-white/70">
              <li>
                <button type="button" onClick={() => nav('consult-apply')} className="hover:text-white transition-colors">
                  申请战略陪伴
                </button>
              </li>
              <li>
                <button type="button" onClick={() => nav('about')} className="hover:text-white transition-colors">
                  关于益语智库
                </button>
              </li>
              <li>
                <a
                  href="https://github.com/guyuan9300-max/yiyu-thinktank-workbench"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  开源工作台 GitHub
                </a>
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

        {/* Bottom */}
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
