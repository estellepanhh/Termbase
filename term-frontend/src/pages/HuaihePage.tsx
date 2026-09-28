import React, { useState, useEffect } from 'react'
import { Input, Button, Pagination, Spin, Modal } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import ThoughtMap from '../components/ThoughtMap'
import { useChildMode } from '../context/ChildModeContext'
import { getHuaiheTerms, searchHuaiheTerms, searchHuaiheHerbs } from '../api/termApi'
import type { Term, HuaiheHerb } from '../types/term'

const PAGE_SIZE = 6

/** 将中药材记录转为 Term 兼容格式用于卡片展示 */
function herbToTermDisplay(h: HuaiheHerb): Term {
  return {
    id: h.id,
    术语名称: h.中文品名,
    术语层级: h.术语层级,
    文化分类: h.文化分类,
    场景分类: '中药材',
    筛选标签: h.筛选标签,
    '官方译法（英文）': h['官方译法（英文）'],
    '官方译法（小语种）': '',
    文化内涵: h.核心合规提示 || h.翻译雷区 || '',
    来源: h['法定拉丁名（海关 / 药典通用）'] || '',
    儿童解释: '',
  }
}

/** 扩展 Term，附加原始 herb 数据用于详情弹窗 */
interface DisplayTerm extends Term {
  _herb?: HuaiheHerb
}

const HuaihePage: React.FC = () => {
  const { isChildMode } = useChildMode()

  const [termList, setTermList] = useState<DisplayTerm[]>([])
  const [loading, setLoading] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [detailVisible, setDetailVisible] = useState(false)
  const [currentTerm, setCurrentTerm] = useState<DisplayTerm | null>(null)

  const fetchTerms = async (page = currentPage, keyword = searchVal) => {
    setLoading(true)
    try {
      if (keyword.trim()) {
        // 搜索时同时查术语和中药材
        const [termsRes, herbsRes] = await Promise.all([
          searchHuaiheTerms(keyword, page, PAGE_SIZE),
          searchHuaiheHerbs(keyword, page, PAGE_SIZE),
        ])
        const terms: DisplayTerm[] = (termsRes.data || []).map((t: Term) => ({ ...t }))
        const herbTerms: DisplayTerm[] = (herbsRes.data || []).map((h: HuaiheHerb) => ({
          ...herbToTermDisplay(h),
          _herb: h,
        }))
        const merged = [...terms, ...herbTerms]
        setTermList(merged)
        // 总数简单相加（实际应用中可优化）
        setTotal((termsRes.total || 0) + (herbsRes.total || 0))
      } else {
        // 无关键词时只展示术语列表
        const res = await getHuaiheTerms(page, PAGE_SIZE)
        if (res.code === 200) {
          setTermList(res.data || [])
          setTotal(res.total || 0)
        }
      }
    } catch {
      // axios 拦截器已提示
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchTerms(1, searchVal)
  }

  const onPageChange = (page: number) => {
    setCurrentPage(page)
    fetchTerms(page, searchVal)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTerms(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openDetail = (item: DisplayTerm) => {
    setCurrentTerm(item)
    setDetailVisible(true)
  }

  const getCardExplanation = (item: DisplayTerm) => {
    if (isChildMode && item.儿童解释) {
      return item.儿童解释
    }
    return item.文化内涵
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 140px)',
        background: 'linear-gradient(135deg, #fef9e6 0%, #e8f0f2 100%)',
        padding: '60px 30px',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        {/* 左侧主内容 */}
        <div
          style={{
            flex: 1,
            maxWidth: 'calc(100% - 420px)',
            marginRight: '20px',
            marginLeft: '50px',
          }}
        >
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div
              style={{
                fontSize: 48,
                fontWeight: 600,
                color: '#2c5f2d',
                fontFamily:
                  "'Noto Serif SC', 'Times New Roman', serif",
                letterSpacing: 4,
                textShadow: '2px 2px 4px rgba(0,0,0,0.05)',
                position: 'relative',
                display: 'inline-block',
                paddingBottom: 16,
              }}
            >
              淮河文化专区
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '25%',
                  width: '50%',
                  height: 3,
                  background:
                    'linear-gradient(90deg, #c9b16b, #6a9c78, #c9b16b)',
                  borderRadius: 2,
                }}
              />
            </div>
            <div
              style={{
                fontSize: 18,
                color: '#5a6e5a',
                marginTop: 20,
                fontStyle: 'italic',
              }}
            >
              千里淮河 · 文脉悠长
            </div>
          </div>

          {/* 搜索 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 40,
            }}
          >
            <Input
              placeholder="搜索术语、文化内涵…"
              allowClear
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onPressEnter={handleSearch}
              size="large"
              style={{
                width: 500,
                borderRadius: 40,
                border: '1px solid #d9d9d9',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: 'rgba(255,255,255,0.8)',
              }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              style={{
                marginLeft: 16,
                borderRadius: 40,
                background: '#6a9c78',
                border: 'none',
                boxShadow: '0 2px 8px rgba(106,156,120,0.3)',
              }}
            >
              探寻
            </Button>
          </div>

          {/* 卡片列表 */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Spin size="large" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {termList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openDetail(item)}
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(2px)',
                    borderRadius: 24,
                    boxShadow: '0 12px 24px -12px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow =
                      '0 20px 28px -12px rgba(0,0,0,0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow =
                      '0 12px 24px -12px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ padding: 24 }}>
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 500,
                        color: '#2c5f2d',
                      }}
                    >
                      {item.术语名称}
                    </span>
                    {item.文化内涵 && (
                      <div
                        style={{
                          marginTop: 16,
                          color: '#4a5b4a',
                          fontSize: 15,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.文化内涵}
                      </div>
                    )}
                    {getCardExplanation(item) && (
                      <div
                        style={{
                          marginTop: 12,
                          color: '#7d8f7d',
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {getCardExplanation(item)}
                      </div>
                    )}
                    <div
                      style={{ marginTop: 20, textAlign: 'right' }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: item._herb ? '#6a9c78' : '#b3a56b',
                          background: item._herb
                            ? 'rgba(106,156,120,0.15)'
                            : 'rgba(201,177,107,0.15)',
                          padding: '4px 12px',
                          borderRadius: 20,
                        }}
                      >
                        {item._herb ? '淮河中药材' : '淮河文化'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && termList.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                color: '#8a9a8a',
              }}
            >
              🌾 没有找到相关词条，试试其他关键词吧
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 48,
            }}
          >
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={onPageChange}
              showTotal={(tota) => `共 ${tota} 项`}
            />
          </div>
        </div>

        {/* 右侧思想图谱 */}
        <div style={{ width: '280px', marginTop: '120px' }}>
          <ThoughtMap />
        </div>
      </div>

      {/* 详情弹窗 */}
      <Modal
        title="术语详细信息"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={720}
      >
        {currentTerm && !currentTerm._herb && (
          <div style={{ lineHeight: 2 }}>
            <p>
              <strong>术语名称：</strong>
              {currentTerm.术语名称}
            </p>
            <p>
              <strong>术语层级：</strong>
              {currentTerm.术语层级 || '无'}
            </p>
            <p>
              <strong>文化分类：</strong>
              {currentTerm.文化分类 || '无'}
            </p>
            <p>
              <strong>场景分类：</strong>
              {currentTerm.场景分类 || '无'}
            </p>
            <p>
              <strong>筛选标签：</strong>
              {currentTerm.筛选标签 || '无'}
            </p>
            <p>
              <strong>官方译法（英文）：</strong>
              {currentTerm['官方译法（英文）'] || '无'}
            </p>
            <p>
              <strong>官方译法（小语种）：</strong>
              {currentTerm['官方译法（小语种）'] || '无'}
            </p>
            <p>
              <strong>文化内涵：</strong>
              {currentTerm.文化内涵 || '无'}
            </p>
            <p>
              <strong>来源：</strong>
              {currentTerm.来源 || '无'}
            </p>
            {currentTerm.儿童解释 && (
              <p>
                <strong>儿童解释：</strong>
                {currentTerm.儿童解释}
              </p>
            )}
          </div>
        )}
        {currentTerm?._herb && (() => {
          const h = currentTerm._herb
          return (
            <div style={{ lineHeight: 2 }}>
              <p><strong>术语编号：</strong>{h.术语编号 || '无'}</p>
              <p><strong>中文品名：</strong>{h.中文品名 || '无'}</p>
              <p><strong>术语层级：</strong>{h.术语层级 || '无'}</p>
              <p><strong>文化分类：</strong>{h.文化分类 || '无'}</p>
              <p><strong>筛选标签：</strong>{h.筛选标签 || '无'}</p>
              <p><strong>海关 HS 编码：</strong>{h['海关 HS 编码'] || '无'}</p>
              <p><strong>法定拉丁名：</strong>{h['法定拉丁名（海关 / 药典通用）'] || '无'}</p>
              <p><strong>官方译法（英文）：</strong>{h['官方译法（英文）'] || '无'}</p>
              <p><strong>法语译法：</strong>{h.法语译法 || '无'}</p>
              <p><strong>韩语译法：</strong>{h['韩语译法（韩国药典标准）'] || '无'}</p>
              <p><strong>越南语译法：</strong>{h['越南语译法（东盟核心市场）'] || '无'}</p>
              <p><strong>日语译法：</strong>{h['日语译法（日本药局方标准）'] || '无'}</p>
              <p><strong>泰语译法：</strong>{h.泰语译法 || '无'}</p>
              <p><strong>马来语译法：</strong>{h['马来语译法（RCEP 市场）'] || '无'}</p>
              <p><strong>印尼语译法：</strong>{h['印尼语译法（RCEP 核心市场）'] || '无'}</p>
              <p><strong>核心合规提示：</strong>{h.核心合规提示 || '无'}</p>
              <p><strong>翻译雷区：</strong>{h.翻译雷区 || '无'}</p>
              <p><strong>适用场景：</strong>{h.适用场景 || '无'}</p>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

export default HuaihePage
