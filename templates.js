/**
 * templates.js — 布局模板库
 * 每个模板是一个预定义的元素数组，与 createElement 输出形状完全一致。
 * 应用时通过 applyTemplate(id) 深拷贝并重新生成 id，避免 ID 冲突。
 */

window.TEMPLATES = [
  // ====================================================================
  // 1. 导航首页 — 品牌 header + 大图 + 卡片 + CTA
  // ====================================================================
  {
    id: 'tpl-landing',
    name: '导航首页',
    thumb: '🏠',
    desc: '品牌 Hero + 特色卡片 + CTA 按钮',
    elements: [
      // Logo / 导航栏
      {
        id: 'tpl_nav_logo', type: 'text',
        x: 40, y: 20, width: 300, height: 48, zIndex: 1,
        content: '<h2 style="margin:0;font-size:22px;color:#2563eb;">✨ Brand</h2>',
        bgColor: '#ffffff', color: '#2563eb', fontSize: 15, textAlign: 'left', padding: 8
      },
      {
        id: 'tpl_nav_links', type: 'text',
        x: 750, y: 20, width: 410, height: 48, zIndex: 1,
        content: '<p style="text-align:right;margin:0;font-size:14px;color:#6b7280;">首页 · 产品 · 关于 · 联系</p>',
        bgColor: '#ffffff', color: '#6b7280', fontSize: 14, textAlign: 'right', padding: 12
      },
      // Hero 大图
      {
        id: 'tpl_hero_img', type: 'image',
        x: 40, y: 80, width: 1120, height: 400, zIndex: 1,
        src: 'https://picsum.photos/seed/hero/1120/400', alt: 'Hero 图片', radius: 12,
        objectFit: 'cover'
      },
      // 卡片1
      {
        id: 'tpl_card_1', type: 'card',
        x: 40, y: 510, width: 350, height: 220, zIndex: 1,
        imageSrc: 'https://picsum.photos/seed/feature1/350/200', title: '核心功能',
        desc: '一键拖拽搭建，所见即所得。无需代码即可完成专业级页面设计。', bgColor: '#ffffff', radius: 10
      },
      // 卡片2
      {
        id: 'tpl_card_2', type: 'card',
        x: 425, y: 510, width: 350, height: 220, zIndex: 1,
        imageSrc: 'https://picsum.photos/seed/feature2/350/200', title: '快速部署',
        desc: '导出完整 HTML，支持 PC/平板/手机自适应，直接部署到任意静态托管。', bgColor: '#ffffff', radius: 10
      },
      // 卡片3
      {
        id: 'tpl_card_3', type: 'card',
        x: 810, y: 510, width: 350, height: 220, zIndex: 1,
        imageSrc: 'https://picsum.photos/seed/feature3/350/200', title: '自由扩展',
        desc: '支持多页面、按钮跳转、链接绑定，满足企业和个人多种场景需求。', bgColor: '#ffffff', radius: 10
      },
      // CTA 按钮
      {
        id: 'tpl_cta_btn', type: 'button',
        x: 470, y: 770, width: 260, height: 54, zIndex: 1,
        text: '免费开始使用 →',
        bgColor: '#2563eb', textColor: '#ffffff', fontSize: 16, radius: 10, bold: true,
        link: null
      },
      // 页脚
      {
        id: 'tpl_footer', type: 'text',
        x: 40, y: 860, width: 1120, height: 40, zIndex: 1,
        content: '<p style="text-align:center;color:#9ca3af;font-size:12px;">© 2026 Brand. All rights reserved.</p>',
        bgColor: '#ffffff', color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 8
      }
    ]
  },

  // ====================================================================
  // 2. 产品介绍 — 图文混排 + 功能列表
  // ====================================================================
  {
    id: 'tpl-product',
    name: '产品介绍',
    thumb: '📱',
    desc: '图文混排 + 功能列表 + 特性卡片',
    elements: [
      // 标题
      {
        id: 'tpl_prod_title', type: 'text',
        x: 40, y: 30, width: 500, height: 60, zIndex: 1,
        content: '<h1 style="margin:0;font-size:32px;">我们的产品</h1>',
        bgColor: '#ffffff', color: '#111827', fontSize: 15, textAlign: 'left', padding: 8
      },
      // 副标题
      {
        id: 'tpl_prod_sub', type: 'text',
        x: 40, y: 90, width: 500, height: 50, zIndex: 1,
        content: '<p style="margin:0;font-size:16px;color:#6b7280;">为现代团队打造的生产力工具</p>',
        bgColor: '#ffffff', color: '#6b7280', fontSize: 14, textAlign: 'left', padding: 8
      },
      // 产品大图
      {
        id: 'tpl_prod_img', type: 'image',
        x: 580, y: 30, width: 580, height: 340, zIndex: 1,
        src: 'https://picsum.photos/seed/product/600/400', alt: '产品截图', radius: 12,
        objectFit: 'cover'
      },
      // 特性1
      {
        id: 'tpl_feat_1', type: 'card',
        x: 40, y: 420, width: 360, height: 200, zIndex: 1,
        imageSrc: 'https://picsum.photos/seed/speed/360/160', title: '⚡ 极速体验',
        desc: '毫秒级响应，流畅操作。', bgColor: '#ffffff', radius: 10
      },
      // 特性2
      {
        id: 'tpl_feat_2', type: 'card',
        x: 420, y: 420, width: 360, height: 200, zIndex: 1,
        imageSrc: 'https://picsum.photos/seed/secure/360/160', title: '🔒 安全可靠',
        desc: '端到端加密，数据安全。', bgColor: '#ffffff', radius: 10
      },
      // 特性3
      {
        id: 'tpl_feat_3', type: 'card',
        x: 800, y: 420, width: 360, height: 200, zIndex: 1,
        imageSrc: 'https://picsum.photos/seed/scale/360/160', title: '📈 按需扩展',
        desc: '从小团队到企业级。', bgColor: '#ffffff', radius: 10
      }
    ]
  },

  // ====================================================================
  // 3. 营销落地页 — 大标题 + CTA + 卖点卡片
  // ====================================================================
  {
    id: 'tpl-marketing',
    name: '营销落地页',
    thumb: '📢',
    desc: '大标语 + 行动号召 + 三大卖点',
    elements: [
      // 大标题
      {
        id: 'tpl_mkt_hero', type: 'text',
        x: 60, y: 60, width: 1080, height: 140, zIndex: 1,
        content: '<h1 style="font-size:48px;text-align:center;margin:0;line-height:1.3;">让你的产品<br>被更多人看见</h1>',
        bgColor: '#f0f9ff', color: '#1e3a5f', fontSize: 15, textAlign: 'center', padding: 20
      },
      // 副标题
      {
        id: 'tpl_mkt_sub', type: 'text',
        x: 200, y: 210, width: 800, height: 50, zIndex: 1,
        content: '<p style="text-align:center;font-size:18px;color:#6b7280;">零代码搭建专业营销页面，3 分钟上线</p>',
        bgColor: '#f0f9ff', color: '#6b7280', fontSize: 15, textAlign: 'center', padding: 8
      },
      // CTA
      {
        id: 'tpl_mkt_cta', type: 'button',
        x: 480, y: 290, width: 240, height: 54, zIndex: 1,
        text: '立即体验',
        bgColor: '#dc2626', textColor: '#ffffff', fontSize: 17, radius: 27, bold: true,
        link: null
      },
      // 卖点1
      {
        id: 'tpl_mark_1', type: 'card',
        x: 60, y: 390, width: 340, height: 230, zIndex: 1,
        imageSrc: 'https://picsum.photos/seed/market1/350/160', title: '🎯 精准触达',
        desc: '基于大数据分析，精准定位目标用户群体。', bgColor: '#ffffff', radius: 10
      },
      // 卖点2
      {
        id: 'tpl_mark_2', type: 'card',
        x: 430, y: 390, width: 340, height: 230, zIndex: 1,
        imageSrc: 'https://picsum.photos/seed/market2/350/160', title: '📊 数据驱动',
        desc: '实时效果追踪，持续优化转化率。', bgColor: '#ffffff', radius: 10
      },
      // 卖点3
      {
        id: 'tpl_mark_3', type: 'card',
        x: 800, y: 390, width: 340, height: 230, zIndex: 1,
        imageSrc: 'https://picsum.photos/seed/market3/350/160', title: '🚀 快速上线',
        desc: '模板一键套用，3 分钟完成部署。', bgColor: '#ffffff', radius: 10
      }
    ]
  },

  // ====================================================================
  // 4. 图集 — 图片网格
  // ====================================================================
  {
    id: 'tpl-gallery',
    name: '图集页',
    thumb: '🖼️',
    desc: '3×2 图片网格展示',
    elements: [
      // 标题
      {
        id: 'tpl_gal_title', type: 'text',
        x: 40, y: 20, width: 1120, height: 60, zIndex: 1,
        content: '<h1 style="text-align:center;margin:0;font-size:28px;">作品集</h1>',
        bgColor: '#ffffff', color: '#111827', fontSize: 15, textAlign: 'center', padding: 8
      },
      // 图片 1-6 (3行 × 2列)
      { id: 'tpl_gal_1', type: 'image', x: 40, y: 100, width: 550, height: 300, zIndex: 1,
        src: 'https://picsum.photos/seed/g1/550/300', alt: '作品 1', radius: 8, objectFit: 'cover' },
      { id: 'tpl_gal_2', type: 'image', x: 610, y: 100, width: 550, height: 300, zIndex: 1,
        src: 'https://picsum.photos/seed/g2/550/300', alt: '作品 2', radius: 8, objectFit: 'cover' },
      { id: 'tpl_gal_3', type: 'image', x: 40, y: 420, width: 550, height: 300, zIndex: 1,
        src: 'https://picsum.photos/seed/g3/550/300', alt: '作品 3', radius: 8, objectFit: 'cover' },
      { id: 'tpl_gal_4', type: 'image', x: 610, y: 420, width: 550, height: 300, zIndex: 1,
        src: 'https://picsum.photos/seed/g4/550/300', alt: '作品 4', radius: 8, objectFit: 'cover' },
      { id: 'tpl_gal_5', type: 'image', x: 40, y: 740, width: 550, height: 300, zIndex: 1,
        src: 'https://picsum.photos/seed/g5/550/300', alt: '作品 5', radius: 8, objectFit: 'cover' },
      { id: 'tpl_gal_6', type: 'image', x: 610, y: 740, width: 550, height: 300, zIndex: 1,
        src: 'https://picsum.photos/seed/g6/550/300', alt: '作品 6', radius: 8, objectFit: 'cover' }
    ]
  },

  // ====================================================================
  // 5. 关于我们 — 团队介绍 + 联系方式
  // ====================================================================
  {
    id: 'tpl-about',
    name: '关于我们',
    thumb: '👥',
    desc: '团队介绍 + 联系方式 + 社交链接',
    elements: [
      // 标题
      {
        id: 'tpl_abt_title', type: 'text',
        x: 40, y: 30, width: 600, height: 60, zIndex: 1,
        content: '<h1 style="margin:0;font-size:30px;">关于我们</h1>',
        bgColor: '#ffffff', color: '#111827', fontSize: 15, textAlign: 'left', padding: 8
      },
      // 文字介绍
      {
        id: 'tpl_abt_text', type: 'text',
        x: 40, y: 100, width: 580, height: 240, zIndex: 1,
        content: '<h2>我们的故事</h2><p>我们是一支充满热情的团队，致力于用技术让每个人都能轻松创建自己的网页。</p><p>成立于 2024 年，已服务超过 10,000 名用户。</p><p>我们相信，好的工具应该让创造变得简单。</p>',
        bgColor: '#f9fafb', color: '#374151', fontSize: 15, textAlign: 'left', padding: 16
      },
      // 团队照片
      {
        id: 'tpl_abt_img', type: 'image',
        x: 660, y: 30, width: 500, height: 310, zIndex: 1,
        src: 'https://picsum.photos/seed/team/500/310', alt: '团队合照', radius: 12,
        objectFit: 'cover'
      },
      // 联系方式
      {
        id: 'tpl_abt_contact', type: 'text',
        x: 40, y: 380, width: 540, height: 120, zIndex: 1,
        content: '<h3>联系方式</h3><p>📧 hello@example.com</p><p>📱 +86 138-0000-0000</p><p>📍 北京市朝阳区</p>',
        bgColor: '#ffffff', color: '#374151', fontSize: 15, textAlign: 'left', padding: 12
      },
      // CTA 按钮
      {
        id: 'tpl_abt_btn', type: 'button',
        x: 40, y: 520, width: 200, height: 50, zIndex: 1,
        text: '联系我们',
        bgColor: '#2563eb', textColor: '#ffffff', fontSize: 15, radius: 8, bold: true,
        link: null
      },
      // 页脚
      {
        id: 'tpl_abt_footer', type: 'text',
        x: 40, y: 610, width: 1120, height: 40, zIndex: 1,
        content: '<p style="text-align:center;color:#9ca3af;font-size:12px;">© 2026 Team. All rights reserved.</p>',
        bgColor: '#ffffff', color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 8
      }
    ]
  }
];
