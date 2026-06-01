import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { useLang, type Bilingual } from '../lib/i18n';

type LegalDocumentType = 'terms' | 'privacy';

interface LegalDocumentPageProps {
  documentType: LegalDocumentType;
  onNavigate?: (page: 'home' | 'login' | 'register') => void;
}

interface LegalSection {
  title: Bilingual;
  paragraphs: Bilingual[];
}

const termsSections: LegalSection[] = [
  {
    title: { zh: '1. 适用范围', en: '1. Scope' },
    paragraphs: [
      { zh: '本服务条款适用于益语智库官网及其提供的研究内容浏览、会员注册登录、报告与文章阅读、咨询申请、学习资料访问等服务。', en: 'These Terms apply to the Yiyu Institute website and the services it offers, including browsing research, registering and signing in, reading reports and articles, applying for consultations, and accessing learning materials.' },
      { zh: '当你访问、注册、登录或使用益语智库服务时，即表示你已阅读、理解并同意遵守本条款。', en: 'By visiting, registering, signing in, or using Yiyu Institute services, you confirm that you have read, understood, and agree to be bound by these Terms.' },
    ],
  },
  {
    title: { zh: '2. 账号注册与安全', en: '2. Account Registration and Security' },
    paragraphs: [
      { zh: '你应提供真实、准确、完整的注册信息，并及时更新。你应妥善保管账号、密码及验证码，不得出借、出租、出售或以其他方式转让账号。', en: 'You must provide accurate, truthful, and complete registration information and keep it up to date. You must safeguard your account, password, and verification codes, and must not lend, rent, sell, or otherwise transfer your account.' },
      { zh: '因你保管不善、主动泄露或授权他人使用账号导致的风险和损失，由你自行承担；发现账号异常时，应及时联系我们处理。', en: 'You bear any risk and loss arising from poor safekeeping, voluntary disclosure, or authorizing others to use your account. If you notice any account anomaly, please contact us promptly.' },
    ],
  },
  {
    title: { zh: '3. 服务内容与会员权益', en: '3. Services and Membership Benefits' },
    paragraphs: [
      { zh: '益语智库围绕公益行业战略咨询、能力建设、研究报告、方法论、书籍资料及相关增值服务开展运营。具体可用功能会根据产品迭代、会员等级和项目合作情况调整。', en: 'Yiyu Institute operates around strategic consulting, capacity building, research reports, methodologies, books, and related value-added services for the nonprofit sector. Available features may change with product iterations, membership tiers, and project partnerships.' },
      { zh: '会员权益当前按访客、普通会员、付费会员、管理员等不同身份进行区分。不同身份对应的阅读、学习、后台访问和陪伴服务范围以页面展示及平台说明为准。', en: 'Membership benefits are currently differentiated by role—guest, basic member, paid member, administrator, and so on. The reading, learning, back-office access, and companionship scope for each role is governed by what is shown on the pages and platform notices.' },
    ],
  },
  {
    title: { zh: '4. 用户行为规范', en: '4. User Conduct' },
    paragraphs: [
      { zh: '你不得利用本平台从事违法违规活动，不得上传、发布、传播侵犯他人合法权益或违反公序良俗的内容，不得尝试攻击、干扰、绕过平台的安全与权限控制。', en: 'You must not use the platform for unlawful activities, upload or spread content that infringes others’ rights or violates public morals, or attempt to attack, disrupt, or bypass the platform’s security and access controls.' },
      { zh: '未经书面许可，不得对平台内容进行批量抓取、镜像、转售、二次分发，或将报告、课程、方法论资料用于未经授权的商业传播。', en: 'Without written permission, you must not bulk-scrape, mirror, resell, or redistribute platform content, or use reports, courses, or methodology materials for unauthorized commercial distribution.' },
    ],
  },
  {
    title: { zh: '5. 知识产权', en: '5. Intellectual Property' },
    paragraphs: [
      { zh: '益语智库官网中的文字、图表、报告、方法论、页面设计、标识及相关内容，除依法属于第三方的部分外，均由益语智库或相关权利人依法享有权利。', en: 'Except for parts that legally belong to third parties, the text, charts, reports, methodologies, page design, logos, and related content on the Yiyu Institute website are owned by Yiyu Institute or the respective rights holders.' },
      { zh: '你可在平台允许范围内出于个人学习、机构内部研讨或双方约定的咨询场景合理使用相关内容，但不得删除权利声明或超出授权范围使用。', en: 'Within what the platform permits, you may make reasonable use of the content for personal study, internal organizational discussion, or agreed consulting contexts, but you must not remove rights notices or use the content beyond the scope authorized.' },
    ],
  },
  {
    title: { zh: '6. 服务可用性与责任限制', en: '6. Service Availability and Limitation of Liability' },
    paragraphs: [
      { zh: '我们将尽力保持服务稳定、安全和持续可用，但不对因系统维护、网络故障、第三方服务异常、不可抗力或监管要求导致的服务中断承担无限责任。', en: 'We strive to keep the service stable, secure, and continuously available, but we assume no unlimited liability for interruptions caused by maintenance, network failures, third-party service issues, force majeure, or regulatory requirements.' },
      { zh: '平台提供的研究、分析与方法论内容主要用于参考和能力建设，不构成法律、财税、投资或其他专业领域的强制性结论，用户仍应结合自身场景独立判断。', en: 'The research, analysis, and methodology content is primarily for reference and capacity building. It does not constitute binding legal, tax, investment, or other professional conclusions; you should still exercise independent judgment for your own situation.' },
    ],
  },
  {
    title: { zh: '7. 违约处理', en: '7. Handling of Breaches' },
    paragraphs: [
      { zh: '如你违反本条款、平台规则或法律法规，我们有权视情节采取提醒、限制功能、暂停服务、终止账号、保留证据并追究责任等措施。', en: 'If you breach these Terms, platform rules, or applicable law, we may—depending on severity—issue warnings, limit features, suspend the service, terminate the account, preserve evidence, and pursue liability.' },
      { zh: '若你的行为给平台、合作方或其他用户造成损失，你应依法承担相应赔偿责任。', en: 'If your conduct causes loss to the platform, partners, or other users, you shall bear the corresponding liability for compensation under the law.' },
    ],
  },
  {
    title: { zh: '8. 条款更新与联系我们', en: '8. Updates and Contact' },
    paragraphs: [
      { zh: '我们可能根据业务调整、功能升级、合规要求对本条款进行更新。更新后版本将在站内展示，并自发布之日起生效。', en: 'We may update these Terms in response to business changes, feature upgrades, or compliance requirements. Updated versions will be posted on the site and take effect from the date of publication.' },
      { zh: '如你对本条款有疑问，或需要行使相关权利，可通过站内公布的联系方式与我们联系。', en: 'If you have questions about these Terms or wish to exercise your rights, please contact us using the methods published on the site.' },
    ],
  },
];

const privacySections: LegalSection[] = [
  {
    title: { zh: '1. 我们收集的信息', en: '1. Information We Collect' },
    paragraphs: [
      { zh: '为完成注册、登录、找回密码及账号安全校验，我们会收集你主动提供的手机号、邮箱、昵称、密码加密信息、验证码校验记录等账号信息。', en: 'To handle registration, sign-in, password recovery, and account security checks, we collect account information you provide, such as phone number, email, nickname, encrypted password data, and verification-code records.' },
      { zh: '在你使用报告阅读、内容浏览、学习记录、咨询申请、评论互动等功能时，我们还可能收集访问日志、设备与浏览器信息、操作记录、会员状态以及你主动提交的资料。', en: 'When you use features such as reading reports, browsing content, learning records, consultation requests, and comments, we may also collect access logs, device and browser information, activity records, membership status, and materials you submit.' },
    ],
  },
  {
    title: { zh: '2. 信息使用目的', en: '2. How We Use Information' },
    paragraphs: [
      { zh: '我们使用上述信息用于身份认证、账号安全、会员服务开通、内容访问控制、学习记录留存、服务优化、运营分析、客户支持和合规审计。', en: 'We use this information for identity verification, account security, enabling membership services, content access control, retaining learning records, service improvement, operational analysis, customer support, and compliance auditing.' },
      { zh: '在取得必要授权或符合法律规定的前提下，我们也可能使用相关信息向你发送与账号安全、服务进展、咨询项目或产品更新有关的通知。', en: 'With the necessary authorization or where permitted by law, we may also use this information to send you notices about account security, service progress, consulting projects, or product updates.' },
    ],
  },
  {
    title: { zh: '3. 验证码、登录与安全', en: '3. Verification Codes, Sign-In, and Security' },
    paragraphs: [
      { zh: '当你注册或重置密码时，我们会为指定手机号或邮箱发送验证码，并记录请求时间、验证结果、失败次数及必要的安全日志，用于防止滥用、撞库和恶意攻击。', en: 'When you register or reset your password, we send a verification code to the specified phone or email and record the request time, result, failure count, and necessary security logs to prevent abuse, credential stuffing, and malicious attacks.' },
      { zh: '你的密码不会以明文形式存储，我们会采取加密或散列等合理安全措施保护账号凭据。', en: 'Your password is never stored in plain text; we protect account credentials with reasonable security measures such as encryption or hashing.' },
    ],
  },
  {
    title: { zh: '4. 信息共享与披露', en: '4. Information Sharing and Disclosure' },
    paragraphs: [
      { zh: '除法律法规另有规定，或为实现你明确申请的服务所必需外，我们不会向无关第三方出售你的个人信息。', en: 'Except as required by law or as necessary to deliver a service you explicitly requested, we do not sell your personal information to unrelated third parties.' },
      { zh: '在提供服务过程中，我们可能与云服务、邮件服务、短信服务、技术支持或支付服务提供方共享必要信息，但仅限于完成对应业务所必需的最小范围。', en: 'While providing services, we may share necessary information with cloud, email, SMS, technical-support, or payment providers, but only to the minimum extent required to complete the relevant task.' },
    ],
  },
  {
    title: { zh: '5. 存储与保护', en: '5. Storage and Protection' },
    paragraphs: [
      { zh: '你的账号与业务数据将根据实际运营需要存储在受控的服务器与数据库环境中，并采取访问控制、日志审计、权限隔离、最小化授权等措施进行保护。', en: 'Your account and business data are stored, as operationally needed, in controlled server and database environments, protected by access controls, log auditing, permission isolation, and least-privilege authorization.' },
      { zh: '尽管我们会尽力提升安全性，但互联网环境并非绝对安全。如发生可能影响你权益的安全事件，我们会按法律要求及时处置和通知。', en: 'Although we work hard to improve security, the internet is never absolutely safe. If a security incident occurs that may affect your rights, we will respond and notify you promptly as required by law.' },
    ],
  },
  {
    title: { zh: '6. 你的权利', en: '6. Your Rights' },
    paragraphs: [
      { zh: '你有权查询、更正、补充与你账号相关的信息，并可在符合平台规则和法律要求的前提下申请注销账号或删除部分信息。', en: 'You have the right to access, correct, and supplement information related to your account, and—subject to platform rules and legal requirements—to request account deletion or removal of certain information.' },
      { zh: '如你希望撤回授权、变更联系方式、处理账号异常或咨询个人信息事宜，可通过站内联系方式联系我们。', en: 'If you wish to withdraw consent, change contact details, address account anomalies, or ask about your personal information, please contact us using the methods on the site.' },
    ],
  },
  {
    title: { zh: '7. 未成年人保护', en: '7. Protection of Minors' },
    paragraphs: [
      { zh: '本平台主要面向具备完全民事行为能力的用户及机构使用。如你属于未成年人，应在监护人指导下使用本服务，并确保已取得必要同意。', en: 'This platform is intended primarily for users and organizations with full legal capacity. If you are a minor, you should use the service under the guidance of a guardian and ensure the necessary consent has been obtained.' },
    ],
  },
  {
    title: { zh: '8. 政策更新', en: '8. Policy Updates' },
    paragraphs: [
      { zh: '我们可能基于产品升级、监管要求或服务调整更新本隐私政策。更新后的版本会在站内展示，并在必要时通过适当方式提示你。', en: 'We may update this Privacy Policy in response to product upgrades, regulatory requirements, or service changes. Updated versions will be posted on the site and, where necessary, brought to your attention by appropriate means.' },
    ],
  },
];

export function LegalDocumentPage({ documentType, onNavigate }: LegalDocumentPageProps) {
  const { t } = useLang();
  const isTerms = documentType === 'terms';
  const title = isTerms ? t({ zh: '服务条款', en: 'Terms of Service' }) : t({ zh: '隐私政策', en: 'Privacy Policy' });
  const sections = isTerms ? termsSections : privacySections;
  const Icon = isTerms ? FileText : ShieldCheck;
  const pageId = isTerms ? 'terms-of-service' : 'privacy-policy';
  const documentSectionId = isTerms ? 'terms-document' : 'privacy-document';

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    onNavigate?.('home');
  };

  return (
    <div {...getYiyuPageAttrs(pageId)} className="min-h-screen bg-[#f7f8fa] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t({ zh: '返回上一页', en: 'Go Back' })}
        </button>

        <div
          {...getYiyuSectionAttrs(pageId, documentSectionId)}
          className="mt-6 rounded-[28px] border border-border/40 bg-white px-6 py-8 shadow-xl shadow-black/[0.04] sm:px-10"
        >
          <div className="flex items-start gap-4 border-b border-border/50 pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">{t({ zh: '益语智库官网', en: 'Yiyu Institute' })}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-3 text-xs text-muted-foreground/80">{t({ zh: '最新更新：2026年3月12日', en: 'Last updated: March 12, 2026' })}</p>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title.zh}>
                <h2 className="text-lg font-semibold text-foreground">{t(section.title)}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.zh}>{t(paragraph)}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LegalDocumentPage;
