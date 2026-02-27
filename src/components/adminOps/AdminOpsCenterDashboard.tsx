import React, { useMemo, useState } from 'react';
import { Bell, RefreshCw, Search, Calendar, Download, Plus, Home, UserCircle2 } from 'lucide-react';
import { SectionCard, type SectionState } from './components/SectionCard';
import { QuietCard } from './components/QuietCard';
import { QuietList } from './components/QuietList';

function GhostIconButton({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="h-9 w-9 rounded-[12px] border border-[#E9ECF2] bg-white hover:bg-slate-50 transition-colors inline-flex items-center justify-center"
    >
      {children}
    </button>
  );
}

export default function AdminOpsCenterDashboard() {
  const [demoState, setDemoState] = useState<SectionState>('ready');

  const today = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }, []);

  return (
    <div className="min-h-0">
      {/* Command Bar */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-[#F7F8FB]/85 backdrop-blur border-b border-[#E9ECF2]">
        <div className="max-w-[1320px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[22px] font-semibold text-[#0F172A] leading-tight">数据概览</div>
            <div className="mt-1 text-[12px] text-[#64748B]">运营中枢 · 今天是 {today}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="h-9 px-3 rounded-[12px] border border-[#E9ECF2] bg-white text-[13px] text-[#0F172A] hover:bg-slate-50 inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              近 7 天
            </button>

            <div className="h-9 w-[260px] max-w-full rounded-[12px] border border-[#E9ECF2] bg-white px-3 inline-flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="w-full text-[13px] outline-none placeholder:text-slate-400"
                placeholder="搜索用户 / 内容 / 订单 / 机构…"
              />
            </div>

            <button type="button" className="h-9 px-3 rounded-[12px] bg-indigo-600 text-white text-[13px] hover:bg-indigo-700 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              + 新建
            </button>

            <GhostIconButton title="导出">
              <Download className="w-4 h-4 text-slate-500" />
            </GhostIconButton>
            <GhostIconButton title="刷新">
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </GhostIconButton>
            <GhostIconButton title="通知">
              <Bell className="w-4 h-4 text-slate-500" />
            </GhostIconButton>

            <button type="button" className="h-9 px-3 rounded-[12px] border border-[#E9ECF2] bg-white text-[13px] text-[#0F172A] hover:bg-slate-50 inline-flex items-center gap-2">
              <Home className="w-4 h-4 text-slate-500" />
              回到首页
            </button>

            <div className="hidden sm:flex items-center gap-2 ml-1 pl-2 border-l border-[#E9ECF2]">
              <UserCircle2 className="w-6 h-6 text-slate-500" />
              <div className="text-[12px] leading-tight">
                <div className="text-[#0F172A] font-medium">管理员</div>
                <div className="text-[#94A3B8]">超级管理员</div>
              </div>
            </div>

            {/* demo state (temporary) */}
            <select
              value={demoState}
              onChange={(e) => setDemoState(e.target.value as any)}
              className="h-9 px-3 rounded-[12px] border border-[#E9ECF2] bg-white text-[13px] text-[#0F172A]"
              title="仅用于静态验收：切换 loading/empty/error"
            >
              <option value="ready">Demo: ready</option>
              <option value="loading">Demo: loading</option>
              <option value="empty">Demo: empty</option>
              <option value="error">Demo: error</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-[1320px] mx-auto">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <QuietCard label="注册用户总数" value="—" hint="vs 上周期 —" tone="info" />
          <QuietCard label="活跃用户（近 7 天）" value="—" hint="vs 上周期 —" tone="neutral" />
          <QuietCard label="付费会员（active）" value="—" hint="续费风险 —" tone="warn" />
          <QuietCard label="会员转化率" value="—" hint="Paywall 触发 —" tone="info" />
          <QuietCard label="本月收入" value="建设中" hint="无支付不造数" tone="neutral" />
          <QuietCard label="战略陪伴机构数" value="—" hint="本周同步 —" tone="success" />
        </div>

        {/* Funnel */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SectionCard
              title="转化漏斗"
              subtitle="从浏览到付费，从付费到战略陪伴"
              state={demoState}
            >
              <div className="space-y-4">
                <div className="h-12 rounded-[14px] bg-slate-50 border border-[#EEF2F7] overflow-hidden flex">
                  {['Guest', 'User', 'Member', 'Companion'].map((t) => (
                    <div key={t} className="flex-1 px-4 py-3 text-[12px] text-[#64748B] border-r border-[#EEF2F7] last:border-r-0">
                      <div className="text-[#0F172A] font-medium">{t}</div>
                      <div className="mt-0.5">人数 — · 转化率 —%</div>
                    </div>
                  ))}
                </div>
                <div className="text-[12px] text-[#94A3B8]">（静态占位：点击/联动下一阶段接）</div>
              </div>
            </SectionCard>
          </div>
          <SectionCard title="关键影响因素" subtitle="哪些环节影响转化" state={demoState}>
            <QuietList
              items={[
                { title: 'Paywall 触发次数', subtitle: '—', badge: '—', tone: 'info' },
                { title: '支付成功率', subtitle: '—', badge: '—', tone: 'neutral' },
                { title: '到期流失', subtitle: '—', badge: '—', tone: 'warn' },
              ]}
            />
          </SectionCard>
        </div>

        {/* Production + Health */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="内容生产" subtitle="本周新增与状态分布" state={demoState}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: '新增文章', s: '草稿 — · 待发布 — · 已发布 —' },
                { t: '新增报告', s: '草稿 — · 待发布 — · 已发布 —' },
                { t: '上架书籍', s: '草稿 — · 待发布 — · 已发布 —' },
                { t: '新增方法论', s: '草稿 — · 待发布 — · 已发布 —' },
              ].map((x) => (
                <div key={x.t} className="bg-slate-50 border border-[#EEF2F7] rounded-[16px] p-4">
                  <div className="text-[12px] text-[#64748B]">{x.t}</div>
                  <div className="mt-2 text-[24px] font-semibold text-[#0F172A]">—</div>
                  <div className="mt-2 text-[12px] text-[#94A3B8]">{x.s}</div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="内容健康" subtitle="需要修复的质量问题" state={demoState}>
            <QuietList
              items={[
                { title: '缺封面', subtitle: '去修复', badge: '—', tone: 'warn' },
                { title: '缺标签', subtitle: '去修复', badge: '—', tone: 'warn' },
                { title: '摘要过短/无标点', subtitle: '去修复', badge: '—', tone: 'neutral' },
                { title: '排版风险', subtitle: '去修复', badge: '—', tone: 'neutral' },
                { title: '下载链接失效', subtitle: '去修复', badge: '—', tone: 'danger' },
              ]}
            />
          </SectionCard>
        </div>

        {/* Strategy companion ops */}
        <div className="mt-6">
          <SectionCard title="战略陪伴" subtitle="客户与机构的陪伴进度、更新与缺口" state={demoState}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-[#EEF2F7] rounded-[16px] p-4">
                    <div className="text-[12px] text-[#64748B]">机构数</div>
                    <div className="mt-2 text-[20px] font-semibold text-[#0F172A]">—</div>
                  </div>
                  <div className="bg-slate-50 border border-[#EEF2F7] rounded-[16px] p-4">
                    <div className="text-[12px] text-[#64748B]">活跃客户数</div>
                    <div className="mt-2 text-[20px] font-semibold text-[#0F172A]">—</div>
                  </div>
                  <div className="bg-slate-50 border border-[#EEF2F7] rounded-[16px] p-4">
                    <div className="text-[12px] text-[#64748B]">本周同步次数</div>
                    <div className="mt-2 text-[20px] font-semibold text-[#0F172A]">—</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-[12px] text-[#64748B] mb-2">最近更新</div>
                  <QuietList
                    items={[
                      { title: '客户 A', subtitle: '方向画布 · —', badge: '进入客户', tone: 'info' },
                      { title: '客户 B', subtitle: '季度目标 · —', badge: '进入客户', tone: 'info' },
                      { title: '客户 C', subtitle: '会议记录 · —', badge: '进入客户', tone: 'info' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <div className="text-[12px] text-[#64748B] mb-2">待补齐提醒</div>
                <QuietList
                  items={[
                    { title: '客户 A', subtitle: '北极星未填写', badge: '去补齐', tone: 'warn' },
                    { title: '客户 B', subtitle: '会议记录为空', badge: '去补齐', tone: 'warn' },
                    { title: '客户 C', subtitle: '赋能推荐不足', badge: '去补齐', tone: 'warn' },
                  ]}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Bottom grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
          <SectionCard title="P0 待处理" subtitle="需要优先处理的事项" state={demoState}>
            <QuietList
              items={[
                { title: '会员即将到期（7天内）', subtitle: '—', badge: '去处理', tone: 'warn' },
                { title: '支付异常订单', subtitle: '—', badge: '去处理', tone: 'danger' },
                { title: '评论待处理', subtitle: '—', badge: '去处理', tone: 'info' },
                { title: '上传失败/资源缺失', subtitle: '—', badge: '去处理', tone: 'warn' },
              ]}
            />
          </SectionCard>
          <SectionCard title="快捷操作" subtitle="高频动作入口" state={demoState}>
            <div className="grid grid-cols-2 gap-3">
              {['新建文章', '上传报告', '上架书籍', '生成邀请码', '添加机构', '添加战略客户'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className="p-4 rounded-[16px] bg-slate-50 border border-[#EEF2F7] text-left hover:bg-white transition-colors"
                >
                  <div className="text-[14px] font-medium text-[#0F172A]">{t}</div>
                  <div className="mt-1 text-[12px] text-[#94A3B8]">静态占位</div>
                </button>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="最近活动" subtitle="让页面看起来在运转" state={demoState}>
            <QuietList
              items={[
                { title: '发布文章：XXX', subtitle: '—', tone: 'neutral' },
                { title: '上传报告：XXX', subtitle: '—', tone: 'neutral' },
                { title: '上架书籍：XXX', subtitle: '—', tone: 'neutral' },
                { title: '生成邀请码：XXX', subtitle: '—', tone: 'neutral' },
                { title: '回复评论：XXX', subtitle: '—', tone: 'neutral' },
                { title: '更新客户：XXX', subtitle: '—', tone: 'neutral' },
              ]}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
