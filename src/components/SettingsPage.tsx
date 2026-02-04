/**
 * 系统设置页面组件
 * 提供完整的系统配置功能
 */
import { useState, useEffect } from 'react';
import {
  Settings, Globe, Search, ToggleLeft, Database, Users, Save, 
  RotateCcw, Upload, Download, Trash2, CheckCircle, AlertTriangle,
  X, Plus, Image as ImageIcon, Mail, Phone, Tag, Info
} from 'lucide-react';
import {
  getSystemSettings,
  saveSystemSettings,
  resetSystemSettings,
  clearAllCache,
  exportAllData,
  importAllData,
  type SystemSettings,
  type TeamMember,
} from '../lib/dataService';

interface SettingsPageProps {
  onBack?: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'seo' | 'features' | 'about' | 'data'>('basic');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 基本信息表单
  const [siteName, setSiteName] = useState('');
  const [siteLogo, setSiteLogo] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // SEO设置表单
  const [seoTitle, setSeoTitle] = useState('');
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [seoDescription, setSeoDescription] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  // 功能开关表单
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [requireInvitation, setRequireInvitation] = useState(false);
  const [commentModeration, setCommentModeration] = useState(true);

  // 关于我们表单
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutContent, setAboutContent] = useState('');
  const [teamTitle, setTeamTitle] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // 加载系统设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const currentSettings = getSystemSettings();
    setSettings(currentSettings);

    // 填充表单
    setSiteName(currentSettings.siteName);
    setSiteLogo(currentSettings.siteLogo || '');
    setSiteDescription(currentSettings.siteDescription);
    setContactEmail(currentSettings.contactEmail);
    setContactPhone(currentSettings.contactPhone || '');

    setSeoTitle(currentSettings.seoTitle);
    setSeoKeywords(currentSettings.seoKeywords);
    setSeoDescription(currentSettings.seoDescription);

    setAllowRegistration(currentSettings.allowRegistration);
    setRequireInvitation(currentSettings.requireInvitation);
    setCommentModeration(currentSettings.commentModeration);

    setAboutTitle(currentSettings.aboutTitle);
    setAboutContent(currentSettings.aboutContent);
    setTeamTitle(currentSettings.teamTitle || '');
    setTeamMembers(currentSettings.teamMembers || []);
  };

  // 保存基本信息
  const handleSaveBasicInfo = () => {
    setIsSaving(true);
    try {
      saveSystemSettings({
        siteName,
        siteLogo: siteLogo || undefined,
        siteDescription,
        contactEmail,
        contactPhone: contactPhone || undefined,
        updatedBy: '管理员',
      });
      setMessage({ type: 'success', text: '基本信息已保存！' });
      loadSettings();
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setIsSaving(false);
    }
  };

  // 保存SEO设置
  const handleSaveSEO = () => {
    setIsSaving(true);
    try {
      saveSystemSettings({
        seoTitle,
        seoKeywords,
        seoDescription,
        updatedBy: '管理员',
      });
      setMessage({ type: 'success', text: 'SEO设置已保存！' });
      loadSettings();
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setIsSaving(false);
    }
  };

  // 保存功能开关
  const handleSaveFeatures = () => {
    setIsSaving(true);
    try {
      saveSystemSettings({
        allowRegistration,
        requireInvitation,
        commentModeration,
        updatedBy: '管理员',
      });
      setMessage({ type: 'success', text: '功能开关已保存！' });
      loadSettings();
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setIsSaving(false);
    }
  };

  // 保存关于我们
  const handleSaveAbout = () => {
    setIsSaving(true);
    try {
      saveSystemSettings({
        aboutTitle,
        aboutContent,
        teamTitle: teamTitle || undefined,
        teamMembers,
        updatedBy: '管理员',
      });
      setMessage({ type: 'success', text: '关于我们已保存！' });
      loadSettings();
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setIsSaving(false);
    }
  };

  // 添加关键词
  const handleAddKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !seoKeywords.includes(keyword)) {
      setSeoKeywords([...seoKeywords, keyword]);
      setKeywordInput('');
    }
  };

  // 删除关键词
  const handleRemoveKeyword = (keyword: string) => {
    setSeoKeywords(seoKeywords.filter(k => k !== keyword));
  };

  // 添加团队成员
  const handleAddTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      { name: '', role: '', bio: '', avatar: '' },
    ]);
  };

  // 更新团队成员
  const handleUpdateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setTeamMembers(updated);
  };

  // 删除团队成员
  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  // 重置设置
  const handleResetSettings = () => {
    if (window.confirm('确定要重置所有设置为默认值吗？此操作不可恢复。')) {
      resetSystemSettings();
      loadSettings();
      setMessage({ type: 'success', text: '设置已重置为默认值' });
    }
  };

  // 清除缓存
  const handleClearCache = () => {
    if (window.confirm('确定要清除所有缓存数据吗？此操作不可恢复。')) {
      if (clearAllCache()) {
        setMessage({ type: 'success', text: '缓存已清除' });
      } else {
        setMessage({ type: 'error', text: '清除缓存失败' });
      }
    }
  };

  // 导出数据
  const handleExportData = () => {
    try {
      const jsonData = exportAllData();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yiyu-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: '数据导出成功' });
    } catch (error) {
      setMessage({ type: 'error', text: '导出失败' });
    }
  };

  // 导入数据
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = event.target?.result as string;
          if (importAllData(jsonData)) {
            loadSettings();
            setMessage({ type: 'success', text: '数据导入成功' });
          } else {
            setMessage({ type: 'error', text: '导入失败，数据格式不正确' });
          }
        } catch (error) {
          setMessage({ type: 'error', text: '导入失败' });
        }
      };
      reader.readAsText(file);
    }
  };

  const tabs = [
    { id: 'basic', label: '基本信息', icon: <Info className="w-5 h-5" /> },
    { id: 'seo', label: 'SEO设置', icon: <Search className="w-5 h-5" /> },
    { id: 'features', label: '功能开关', icon: <ToggleLeft className="w-5 h-5" /> },
    { id: 'about', label: '关于我们', icon: <Users className="w-5 h-5" /> },
    { id: 'data', label: '数据管理', icon: <Database className="w-5 h-5" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                返回后台
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className={`p-4 rounded-xl flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-auto p-1 hover:bg-white/50 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧导航 */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 重置按钮 */}
            <button
              onClick={handleResetSettings}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              重置为默认
            </button>
          </div>

          {/* 右侧内容 */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {/* 基本信息 */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">基本信息设置</h2>
                    <p className="text-sm text-gray-500">配置网站的基本信息和联系方式</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        网站名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="请输入网站名称"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        网站Logo URL
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={siteLogo}
                          onChange={(e) => setSiteLogo(e.target.value)}
                          placeholder="请输入Logo图片URL"
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {siteLogo && (
                          <img src={siteLogo} alt="Logo预览" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        网站描述 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={siteDescription}
                        onChange={(e) => setSiteDescription(e.target.value)}
                        placeholder="请输入网站描述"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="w-4 h-4 inline mr-1" />
                        联系邮箱 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contact@example.com"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="w-4 h-4 inline mr-1" />
                        联系电话
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+86 400-123-4567"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveBasicInfo}
                      disabled={isSaving || !siteName || !siteDescription || !contactEmail}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
                      <Save className="w-5 h-5" />
                      {isSaving ? '保存中...' : '保存设置'}
                    </button>
                  </div>
                </div>
              )}

              {/* SEO设置 */}
              {activeTab === 'seo' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">SEO优化设置</h2>
                    <p className="text-sm text-gray-500">配置搜索引擎优化相关信息</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        首页标题 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder="网站首页SEO标题"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">建议长度：50-60个字符</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Tag className="w-4 h-4 inline mr-1" />
                        关键词
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                          placeholder="输入关键词后按回车"
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={handleAddKeyword}
                          className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {seoKeywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2"
                          >
                            {keyword}
                            <button
                              onClick={() => handleRemoveKeyword(keyword)}
                              className="hover:bg-purple-200 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        页面描述 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        placeholder="网站首页SEO描述"
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">建议长度：150-160个字符</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveSEO}
                      disabled={isSaving || !seoTitle || !seoDescription}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      {isSaving ? '保存中...' : '保存设置'}
                    </button>
                  </div>
                </div>
              )}

              {/* 功能开关 */}
              {activeTab === 'features' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">功能开关设置</h2>
                    <p className="text-sm text-gray-500">控制网站各项功能的启用状态</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">允许用户注册</h3>
                          <p className="text-sm text-gray-500">开启后，用户可以自由注册账号</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowRegistration}
                            onChange={(e) => setAllowRegistration(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">需要邀请码</h3>
                          <p className="text-sm text-gray-500">开启后，注册时需要输入邀请码</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={requireInvitation}
                            onChange={(e) => setRequireInvitation(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">评论审核</h3>
                          <p className="text-sm text-gray-500">开启后，用户评论需要管理员审核通过后才能显示</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={commentModeration}
                            onChange={(e) => setCommentModeration(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveFeatures}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      {isSaving ? '保存中...' : '保存设置'}
                    </button>
                  </div>
                </div>
              )}

              {/* 关于我们 */}
              {activeTab === 'about' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">关于我们设置</h2>
                    <p className="text-sm text-gray-500">配置"关于我们"页面的内容</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        页面标题 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={aboutTitle}
                        onChange={(e) => setAboutTitle(e.target.value)}
                        placeholder="关于我们"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        公司介绍 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={aboutContent}
                        onChange={(e) => setAboutContent(e.target.value)}
                        placeholder="请输入公司介绍内容"
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        团队标题
                      </label>
                      <input
                        type="text"
                        value={teamTitle}
                        onChange={(e) => setTeamTitle(e.target.value)}
                        placeholder="核心团队"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">团队成员</label>
                        <button
                          onClick={handleAddTeamMember}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          添加成员
                        </button>
                      </div>

                      <div className="space-y-3">
                        {teamMembers.map((member, index) => (
                          <div key={index} className="p-4 border border-gray-200 rounded-xl">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={member.name}
                                onChange={(e) => handleUpdateTeamMember(index, 'name', e.target.value)}
                                placeholder="姓名"
                                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                              />
                              <input
                                type="text"
                                value={member.role}
                                onChange={(e) => handleUpdateTeamMember(index, 'role', e.target.value)}
                                placeholder="职位"
                                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                              />
                              <input
                                type="text"
                                value={member.avatar || ''}
                                onChange={(e) => handleUpdateTeamMember(index, 'avatar', e.target.value)}
                                placeholder="头像URL（可选）"
                                className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                              />
                              <textarea
                                value={member.bio || ''}
                                onChange={(e) => handleUpdateTeamMember(index, 'bio', e.target.value)}
                                placeholder="个人简介（可选）"
                                rows={2}
                                className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                              />
                            </div>
                            <button
                              onClick={() => handleRemoveTeamMember(index)}
                              className="mt-2 text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              删除成员
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveAbout}
                      disabled={isSaving || !aboutTitle || !aboutContent}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      {isSaving ? '保存中...' : '保存设置'}
                    </button>
                  </div>
                </div>
              )}

              {/* 数据管理 */}
              {activeTab === 'data' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">数据管理</h2>
                    <p className="text-sm text-gray-500">管理系统数据、缓存和备份</p>
                  </div>

                  <div className="space-y-4">
                    {/* 清除缓存 */}
                    <div className="p-6 border border-gray-200 rounded-xl hover:border-red-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-600" />
                            清除缓存
                          </h3>
                          <p className="text-sm text-gray-500 mb-3">
                            清除浏览器缓存数据，但保留系统设置
                          </p>
                        </div>
                        <button
                          onClick={handleClearCache}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          清除缓存
                        </button>
                      </div>
                    </div>

                    {/* 导出数据 */}
                    <div className="p-6 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Download className="w-5 h-5 text-blue-600" />
                            导出数据
                          </h3>
                          <p className="text-sm text-gray-500 mb-3">
                            导出所有系统数据为JSON文件进行备份
                          </p>
                        </div>
                        <button
                          onClick={handleExportData}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          导出数据
                        </button>
                      </div>
                    </div>

                    {/* 导入数据 */}
                    <div className="p-6 border border-gray-200 rounded-xl hover:border-green-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Upload className="w-5 h-5 text-green-600" />
                            导入数据
                          </h3>
                          <p className="text-sm text-gray-500 mb-3">
                            从备份文件中恢复数据（将覆盖现有数据）
                          </p>
                        </div>
                        <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                          选择文件
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportData}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 更新信息 */}
                  {settings && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">
                        最后更新：{new Date(settings.updatedAt).toLocaleString('zh-CN')}
                      </p>
                      <p className="text-sm text-gray-600">
                        更新人：{settings.updatedBy}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
