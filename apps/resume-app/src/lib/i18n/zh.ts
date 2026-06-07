// Chinese (zh-CN) string dictionary.
//
// Keys are dot-separated namespaces. To add a new string:
//   1. Add it here.
//   2. Add the matching entry to `en.ts` (typecheck will complain if missing).
//   3. Reference it from a component via `useT()(key)`.

export const zh = {
  nav: {
    overview: "概述",
    content: "内容",
    customize: "定制",
    aiTools: "人工智能工具",
    resumeDropdown: "简历 1",
    download: "下载",
    more: "更多",
  },
  personal: {
    sectionTitle: "个人信息",
    placeholderName: "你的名字",
    placeholderEmail: "电子邮件",
    placeholderPhone: "电话",
    placeholderAddress: "地址",
    editAriaLabel: "编辑个人信息",
    panelTitle: "编辑个人信息",
    close: "关闭",
    fullName: "姓名",
    fullNamePlaceholder: "请填写您的姓名（含称谓）",
    professionalTitle: "职位",
    professionalTitlePlaceholder: "目标职位或当前角色",
    email: "邮箱",
    emailPlaceholder: "请填写邮箱",
    phone: "电话",
    phonePlaceholder: "请填写电话",
    location: "地址",
    locationPlaceholder: "城市，国家",
    photo: "头像",
    addDetails: "附加信息",
    extras: {
      linkedin: "LinkedIn",
      website: "网站",
      nationality: "国籍",
      dateOfBirth: "生日",
      visa: "签证",
      passportOrId: "护照/证件",
      availability: "入职时间",
    },
    showMore: "展开更多",
    done: "完成",
    validation: {
      fullNameRequired: "请填写姓名",
      emailInvalid: "邮箱格式不正确",
    },
  },
  editor: {
    addContent: "添加内容",
    previewPlaceholder: "预览（后续阶段）",
    loading: "加载中…",
    errorPrefix: "出错：",
    noResume: "未加载简历",
  },
  addContent: {
    title: "添加内容",
    quickStart: "快速入门：",
    importResume: "导入简历",
    closeAriaLabel: "关闭",
    emptyBodyHint: "（内容卡片将在后续阶段添加）",
    added: "已添加",
    descriptions: {
      summary: "请简要概述您的主要优势、经验和职业目标。",
      experience: "添加您的职业经历和工作经历，包括实习经历。",
      education: "请列出您的学位和毕业院校，并注明研究方向、荣誉或交换经历。",
      skills: "把您那些能在人群中脱颖而出的硬技能和软技能都加上去。",
    },
  },
  sections: {
    summary: "概述",
    experience: "经验",
    education: "教育",
    skills: "技能",
  },
  sectionCard: {
    expand: "展开",
    collapse: "收起",
    newEntry: "新条目",
    emptyHint: "暂无内容",
    edit: "编辑",
    delete: "删除",
  },
  common: {
    save: "保存",
    cancel: "取消",
  },
  summary: {
    contentLabel: "内容",
    contentPlaceholder: "请简要概述您的主要优势、经验和职业目标。",
  },
};
