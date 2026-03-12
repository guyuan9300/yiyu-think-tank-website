import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react';

type LegalDocumentType = 'terms' | 'privacy';

interface LegalDocumentPageProps {
  documentType: LegalDocumentType;
  onNavigate?: (page: 'home' | 'login' | 'register') => void;
}

const termsSections = [
  {
    title: '1. 适用范围',
    paragraphs: [
      '本服务条款适用于益语智库官网及其提供的研究内容浏览、会员注册登录、报告与文章阅读、咨询申请、学习资料访问等服务。',
      '当你访问、注册、登录或使用益语智库服务时，即表示你已阅读、理解并同意遵守本条款。',
    ],
  },
  {
    title: '2. 账号注册与安全',
    paragraphs: [
      '你应提供真实、准确、完整的注册信息，并及时更新。你应妥善保管账号、密码及验证码，不得出借、出租、出售或以其他方式转让账号。',
      '因你保管不善、主动泄露或授权他人使用账号导致的风险和损失，由你自行承担；发现账号异常时，应及时联系我们处理。',
    ],
  },
  {
    title: '3. 服务内容与会员权益',
    paragraphs: [
      '益语智库围绕公益行业战略咨询、能力建设、研究报告、方法论、书籍资料及相关增值服务开展运营。具体可用功能会根据产品迭代、会员等级和项目合作情况调整。',
      '会员权益当前按访客、普通会员、付费会员、管理员等不同身份进行区分。不同身份对应的阅读、学习、后台访问和陪伴服务范围以页面展示及平台说明为准。',
    ],
  },
  {
    title: '4. 用户行为规范',
    paragraphs: [
      '你不得利用本平台从事违法违规活动，不得上传、发布、传播侵犯他人合法权益或违反公序良俗的内容，不得尝试攻击、干扰、绕过平台的安全与权限控制。',
      '未经书面许可，不得对平台内容进行批量抓取、镜像、转售、二次分发，或将报告、课程、方法论资料用于未经授权的商业传播。',
    ],
  },
  {
    title: '5. 知识产权',
    paragraphs: [
      '益语智库官网中的文字、图表、报告、方法论、页面设计、标识及相关内容，除依法属于第三方的部分外，均由益语智库或相关权利人依法享有权利。',
      '你可在平台允许范围内出于个人学习、机构内部研讨或双方约定的咨询场景合理使用相关内容，但不得删除权利声明或超出授权范围使用。',
    ],
  },
  {
    title: '6. 服务可用性与责任限制',
    paragraphs: [
      '我们将尽力保持服务稳定、安全和持续可用，但不对因系统维护、网络故障、第三方服务异常、不可抗力或监管要求导致的服务中断承担无限责任。',
      '平台提供的研究、分析与方法论内容主要用于参考和能力建设，不构成法律、财税、投资或其他专业领域的强制性结论，用户仍应结合自身场景独立判断。',
    ],
  },
  {
    title: '7. 违约处理',
    paragraphs: [
      '如你违反本条款、平台规则或法律法规，我们有权视情节采取提醒、限制功能、暂停服务、终止账号、保留证据并追究责任等措施。',
      '若你的行为给平台、合作方或其他用户造成损失，你应依法承担相应赔偿责任。',
    ],
  },
  {
    title: '8. 条款更新与联系我们',
    paragraphs: [
      '我们可能根据业务调整、功能升级、合规要求对本条款进行更新。更新后版本将在站内展示，并自发布之日起生效。',
      '如你对本条款有疑问，或需要行使相关权利，可通过站内公布的联系方式与我们联系。',
    ],
  },
];

const privacySections = [
  {
    title: '1. 我们收集的信息',
    paragraphs: [
      '为完成注册、登录、找回密码及账号安全校验，我们会收集你主动提供的手机号、邮箱、昵称、密码加密信息、验证码校验记录等账号信息。',
      '在你使用报告阅读、内容浏览、学习记录、咨询申请、评论互动等功能时，我们还可能收集访问日志、设备与浏览器信息、操作记录、会员状态以及你主动提交的资料。',
    ],
  },
  {
    title: '2. 信息使用目的',
    paragraphs: [
      '我们使用上述信息用于身份认证、账号安全、会员服务开通、内容访问控制、学习记录留存、服务优化、运营分析、客户支持和合规审计。',
      '在取得必要授权或符合法律规定的前提下，我们也可能使用相关信息向你发送与账号安全、服务进展、咨询项目或产品更新有关的通知。',
    ],
  },
  {
    title: '3. 验证码、登录与安全',
    paragraphs: [
      '当你注册或重置密码时，我们会为指定手机号或邮箱发送验证码，并记录请求时间、验证结果、失败次数及必要的安全日志，用于防止滥用、撞库和恶意攻击。',
      '你的密码不会以明文形式存储，我们会采取加密或散列等合理安全措施保护账号凭据。',
    ],
  },
  {
    title: '4. 信息共享与披露',
    paragraphs: [
      '除法律法规另有规定，或为实现你明确申请的服务所必需外，我们不会向无关第三方出售你的个人信息。',
      '在提供服务过程中，我们可能与云服务、邮件服务、短信服务、技术支持或支付服务提供方共享必要信息，但仅限于完成对应业务所必需的最小范围。',
    ],
  },
  {
    title: '5. 存储与保护',
    paragraphs: [
      '你的账号与业务数据将根据实际运营需要存储在受控的服务器与数据库环境中，并采取访问控制、日志审计、权限隔离、最小化授权等措施进行保护。',
      '尽管我们会尽力提升安全性，但互联网环境并非绝对安全。如发生可能影响你权益的安全事件，我们会按法律要求及时处置和通知。',
    ],
  },
  {
    title: '6. 你的权利',
    paragraphs: [
      '你有权查询、更正、补充与你账号相关的信息，并可在符合平台规则和法律要求的前提下申请注销账号或删除部分信息。',
      '如你希望撤回授权、变更联系方式、处理账号异常或咨询个人信息事宜，可通过站内联系方式联系我们。',
    ],
  },
  {
    title: '7. 未成年人保护',
    paragraphs: [
      '本平台主要面向具备完全民事行为能力的用户及机构使用。如你属于未成年人，应在监护人指导下使用本服务，并确保已取得必要同意。',
    ],
  },
  {
    title: '8. 政策更新',
    paragraphs: [
      '我们可能基于产品升级、监管要求或服务调整更新本隐私政策。更新后的版本会在站内展示，并在必要时通过适当方式提示你。',
    ],
  },
];

export function LegalDocumentPage({ documentType, onNavigate }: LegalDocumentPageProps) {
  const isTerms = documentType === 'terms';
  const title = isTerms ? '服务条款' : '隐私政策';
  const subtitle = isTerms
    ? '用于说明益语智库官网服务使用规则、账号责任与会员权益边界。'
    : '用于说明益语智库如何收集、使用、保存和保护你的个人信息。';
  const sections = isTerms ? termsSections : privacySections;
  const Icon = isTerms ? FileText : ShieldCheck;

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    onNavigate?.('home');
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回上一页
        </button>

        <div className="mt-6 rounded-[28px] border border-border/40 bg-white px-6 py-8 shadow-xl shadow-black/[0.04] sm:px-10">
          <div className="flex items-start gap-4 border-b border-border/50 pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">益语智库官网</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
              <p className="mt-3 text-xs text-muted-foreground/80">最新更新：2026年3月12日</p>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
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
