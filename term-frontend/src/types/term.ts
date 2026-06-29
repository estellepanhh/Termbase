/** 术语记录（与数据库列对应） */
export interface Term {
  id: number
  /** 术语名称 */
  术语名称: string
  /** 术语层级（核心层/拓展层/本源层） */
  术语层级: string
  /** 文化分类 */
  文化分类: string
  /** 场景分类 */
  场景分类: string
  /** 筛选标签 */
  筛选标签: string
  /** 官方译法（英文） */
  '官方译法（英文）': string
  /** 官方译法（小语种） */
  '官方译法（小语种）': string
  /** 文化内涵 */
  文化内涵: string
  /** 来源 */
  来源: string
  /** 儿童解释（可选） */
  儿童解释?: string
}

/** 新增/编辑术语的表单数据 */
export interface TermFormData {
  术语名称: string
  术语层级: string
  文化分类: string
  场景分类: string
  筛选标签: string
  '官方译法（英文）': string
  '官方译法（小语种）': string
  文化内涵: string
  来源: string
}

/** 淮河人物 */
export interface HuaiheFigure {
  人物: string
  百度链接: string
  分类?: string
}

/** 淮河中药材 */
export interface HuaiheHerb {
  id: number
  /** 术语编号 */
  术语编号: string
  /** 中文品名 */
  中文品名: string
  /** 术语层级 */
  术语层级: string
  /** 文化分类 */
  文化分类: string
  /** 筛选标签 */
  筛选标签: string
  /** 海关 HS 编码 */
  '海关 HS 编码': string
  /** 法定拉丁名（海关 / 药典通用） */
  '法定拉丁名（海关 / 药典通用）': string
  /** 官方译法（英文） */
  '官方译法（英文）': string
  /** 法语译法 */
  法语译法: string
  /** 韩语译法（韩国药典标准） */
  '韩语译法（韩国药典标准）': string
  /** 越南语译法（东盟核心市场） */
  '越南语译法（东盟核心市场）': string
  /** 日语译法（日本药局方标准） */
  '日语译法（日本药局方标准）': string
  /** 泰语译法（东盟市场） */
  泰语译法: string
  /** 马来语译法（RCEP 市场） */
  '马来语译法（RCEP 市场）': string
  /** 印尼语译法（RCEP 核心市场） */
  '印尼语译法（RCEP 核心市场）': string
  /** 核心合规提示 */
  核心合规提示: string
  /** 翻译雷区 */
  翻译雷区: string
  /** 适用场景 */
  适用场景: string
}

/** API 通用响应 */
export interface ApiResponse<T = unknown> {
  code: number
  data?: T
  total?: number
  msg?: string
}
