import React, { useState, useEffect, useCallback } from 'react'
import {
  Typography,
  Input,
  Button,
  Card,
  Tag,
  message,
  Modal,
  Form,
  Popconfirm,
  Select,
  Pagination,
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useChildMode } from '../context/ChildModeContext'
import {
  getTermList,
  searchTerm,
  filterTerms,
  addTerm,
  updateTerm,
  deleteTerm,
} from '../api/termApi'
import type { Term, TermFormData } from '../types/term'

const { Text } = Typography

const hotWords = [
  '人类命运共同体',
  '中国式现代化',
  '传统文化',
  '儒家思想',
  '生态文明',
]

const HomePage: React.FC = () => {
  const { t } = useTranslation()
  const { isChildMode } = useChildMode()
  const navigate = useNavigate()

  // ── 数据状态 ──
  const [termList, setTermList] = useState<Term[]>([])
  const [loading, setLoading] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [total, setTotal] = useState(0)

  // ── 筛选状态 ──
  const [filterCulture, setFilterCulture] = useState<string>('')
  const [filterScene, setFilterScene] = useState<string>('')
  const [filterLevel, setFilterLevel] = useState<string>('')

  // ── 详情弹窗 ──
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentInfo, setCurrentInfo] = useState<Term | null>(null)

  // ── 编辑弹窗 ──
  const [modalVisible, setModalVisible] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form] = Form.useForm<TermFormData>()

  // ── 获取数据 ──
  const fetchData = useCallback(
    async (page = currentPage, size = pageSize, resetFilters = false) => {
      setLoading(true)
      try {
        const hasFilter = filterCulture || filterScene || filterLevel
        let res: { code: number; data?: Term[]; total?: number; msg?: string }

        if (hasFilter && !resetFilters) {
          res = await filterTerms({
            culture: filterCulture,
            scene: filterScene,
            level: filterLevel,
            page,
            pageSize: size,
          })
        } else if (searchVal.trim() && !resetFilters) {
          res = await searchTerm(searchVal, page, size)
        } else {
          res = await getTermList(page, size)
        }

        if (res.code === 200) {
          setTermList(res.data || [])
          setTotal(res.total || 0)
        }
      } catch {
        // axios 拦截器已提示错误
      } finally {
        setLoading(false)
      }
    },
    [filterCulture, filterScene, filterLevel, searchVal, currentPage, pageSize],
  )

  // 初始加载（页面挂载时请求数据）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    fetchData(1, 30)
  }, [])

  // ── 搜索 & 筛选 ──
  const handleSearch = () => {
    setCurrentPage(1)
    fetchData(1, pageSize)
  }

  const resetFilters = () => {
    setFilterCulture('')
    setFilterScene('')
    setFilterLevel('')
    setSearchVal('')
    setCurrentPage(1)
    fetchData(1, pageSize, true)
  }

  const applyFilters = () => {
    setCurrentPage(1)
    fetchData(1, pageSize)
  }

  const clickHotWord = (word: string) => {
    setSearchVal(word)
    setFilterCulture('')
    setFilterScene('')
    setFilterLevel('')
    setCurrentPage(1)
    setTimeout(() => fetchData(1, pageSize), 100)
  }

  const onPageChange = (page: number, size?: number) => {
    const newSize = size || pageSize
    setCurrentPage(page)
    setPageSize(newSize)
    fetchData(page, newSize)
  }

  // ── 详情 ──
  const openDetail = (item: Term) => {
    setCurrentInfo(item)
    setDetailVisible(true)
  }

  // ── 新增/编辑弹窗 ──
  const openModal = (item?: Term) => {
    if (item) {
      setEditingId(item.id)
      form.setFieldsValue({
        术语名称: item.术语名称,
        术语层级: item.术语层级,
        文化分类: item.文化分类,
        场景分类: item.场景分类,
        筛选标签: item.筛选标签,
        '官方译法（英文）': item['官方译法（英文）'] || '',
        '官方译法（小语种）': item['官方译法（小语种）'] || '',
        文化内涵: item.文化内涵,
        来源: item.来源,
      })
    } else {
      setEditingId(null)
      form.resetFields()
    }
    setModalVisible(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setModalLoading(true)

      const payload: TermFormData = {
        术语名称: values.术语名称,
        术语层级: values.术语层级,
        文化分类: values.文化分类,
        场景分类: values.场景分类,
        筛选标签: values.筛选标签,
        '官方译法（英文）': values['官方译法（英文）'] || '',
        '官方译法（小语种）': values['官方译法（小语种）'] || '',
        文化内涵: values.文化内涵,
        来源: values.来源,
      }

      if (editingId !== null) {
        await updateTerm(editingId, payload)
      } else {
        await addTerm(payload)
      }

      message.success(editingId ? '保存成功' : '添加成功')
      setModalVisible(false)
      fetchData(currentPage, pageSize)
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'errorFields' in error
      ) {
        return // 表单验证未通过
      }
      // axios 拦截器已提示
    } finally {
      setModalLoading(false)
    }
  }

  const handleDelete = async (id: number, termName: string) => {
    try {
      await deleteTerm(id)
      message.success(`删除成功："${termName}"`)
      if (termList.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
        fetchData(currentPage - 1, pageSize)
      } else {
        fetchData(currentPage, pageSize)
      }
    } catch {
      // axios 拦截器已提示
    }
  }

  // ── 儿童模式文案 ──
  const getDisplayExplanation = (item: Term) => {
    if (isChildMode && item.儿童解释) {
      return item.儿童解释
    }
    return item.文化内涵 || '暂无介绍'
  }

  // ── 渲染 ──
  return (
    <div
      style={{
        padding: '60px 30px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1200 }}>
        {/* 头部 */}
        <div
          style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}
        >
          <div style={{ fontSize: 42, fontWeight: 'bold', color: '#1677ff' }}>
            中国特色话语多语术语库
          </div>
          <div
            style={{
              fontSize: 17,
              color: '#333',
              lineHeight: 1.6,
              marginTop: 10,
            }}
          >
            提供专业、全面、权威、快捷的
            <br />
            <span style={{ color: '#1677ff', fontWeight: 500 }}>
              知识检索服务
            </span>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
            style={{
              position: 'absolute',
              right: -10,
              top: -30,
              background: '#1677ff',
              borderColor: '#1677ff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {t('add_term')}
          </Button>
        </div>

        {/* 搜索栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <Input
            placeholder={t('search_placeholder')}
            allowClear
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onPressEnter={handleSearch}
            size="large"
            style={{
              width: 500,
              height: 50,
              fontSize: 16,
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            style={{
              width: 50,
              height: 50,
              background: '#1677ff',
              fontSize: 18,
            }}
          />
          <Button icon={<FilterOutlined />} onClick={applyFilters}>
            {t('filter')}
          </Button>
          <Button onClick={resetFilters}>{t('reset')}</Button>
        </div>

        {/* 筛选下拉框 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <Select
            placeholder={t('culture_category')}
            allowClear
            style={{ width: 180 }}
            value={filterCulture || undefined}
            onChange={setFilterCulture}
            options={[
              { label: t('socialist_culture'), value: '社会主义先进文化' },
              { label: t('revolutionary_culture'), value: '革命文化' },
              { label: t('traditional_culture'), value: '中华优秀传统文化' },
            ]}
          />
          <Select
            placeholder={t('scene_category')}
            allowClear
            style={{ width: 180 }}
            value={filterScene || undefined}
            onChange={setFilterScene}
            options={[
              { label: '学术研究', value: '学术研究' },
              { label: '政策传播', value: '政策传播' },
              { label: '国际交流', value: '国际交流' },
            ]}
          />
          <Select
            placeholder={t('term_level')}
            allowClear
            style={{ width: 150 }}
            value={filterLevel || undefined}
            onChange={setFilterLevel}
            options={[
              { label: t('core_level'), value: '核心层' },
              { label: t('extension_level'), value: '拓展层' },
              { label: t('origin_level'), value: '本源层' },
            ]}
          />
        </div>

        {/* 热搜词 + 淮河入口 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 40,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Text style={{ color: '#666', fontSize: 15 }}>
            {t('hot_search')}
          </Text>
          {hotWords.map((item) => (
            <Button
              key={item}
              size="small"
              type="text"
              style={{ color: '#1677ff' }}
              onClick={() => clickHotWord(item)}
            >
              {item}
            </Button>
          ))}
          <Button
            type="link"
            icon={<span style={{ fontSize: 18 }}>🌾</span>}
            onClick={() => navigate('/huaihe')}
            style={{
              marginLeft: 16,
              color: '#52c41a',
              fontWeight: 500,
              fontSize: 15,
            }}
          >
            淮河文化专区
          </Button>
        </div>

        {/* 卡片列表 */}
        <Card
          bordered={false}
          style={{
            borderRadius: 12,
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 4px 16px rgba(22,119,255,0.06)',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 18,
            }}
          >
            {loading ? (
              <div
                style={{
                  gridColumn: 'span 3',
                  textAlign: 'center',
                  padding: '40px 0',
                }}
              >
                <Text>{t('loading')}</Text>
              </div>
            ) : termList.length === 0 ? (
              <div
                style={{
                  gridColumn: 'span 3',
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#999',
                }}
              >
                {t('no_data')}
              </div>
            ) : (
              termList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #e8eef8',
                    borderRadius: 10,
                    padding: 16,
                    background: '#f9fbff',
                    position: 'relative',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    onClick={() => openDetail(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 500,
                        color: '#111',
                        marginBottom: 8,
                      }}
                    >
                      {item.术语名称}
                    </div>
                    <Tag color="#4096ff" style={{ marginBottom: 4 }}>
                      {item.术语层级}
                    </Tag>
                    <div
                      style={{
                        fontSize: 14,
                        color: '#555',
                        marginTop: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      {item['官方译法（英文）'] ||
                        t('english_translation')}
                    </div>
                    <div
                      style={{ fontSize: 13, color: '#888', marginTop: 6 }}
                    >
                      {t('category')}：{item.文化分类} / {item.场景分类}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#555',
                        marginTop: 8,
                        lineHeight: 1.5,
                      }}
                    >
                      {isChildMode && item.儿童解释
                        ? `🧒 ${item.儿童解释}`
                        : item.文化内涵
                          ? `📖 ${item.文化内涵}`
                          : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 8,
                      marginTop: 12,
                      borderTop: '1px solid #e8eef8',
                      paddingTop: 10,
                    }}
                  >
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openModal(item)}
                    >
                      {t('edit')}
                    </Button>
                    <Popconfirm
                      title={t('confirm_delete')}
                      description={t('delete_warning', {
                        name: item.术语名称,
                      })}
                      onConfirm={() =>
                        handleDelete(item.id, item.术语名称)
                      }
                      okText={t('delete_confirm')}
                      cancelText={t('cancel')}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      >
                        {t('delete')}
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 分页 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 32,
            }}
          >
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={[12, 24, 30, 48]}
              onChange={onPageChange}
              onShowSizeChange={onPageChange}
              showTotal={(tota) => t('total', { total: tota })}
            />
          </div>
        </Card>
      </div>

      {/* 详情弹窗 */}
      <Modal
        title={t('term_details')}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={720}
      >
        {currentInfo && (
          <div style={{ lineHeight: 2 }}>
            <p>
              <strong>{t('term_name')}：</strong>
              {currentInfo.术语名称}
            </p>
            <p>
              <strong>{t('term_level')}：</strong>
              {currentInfo.术语层级}
            </p>
            <p>
              <strong>{t('culture_category')}：</strong>
              {currentInfo.文化分类}
            </p>
            <p>
              <strong>{t('scene_category')}：</strong>
              {currentInfo.场景分类}
            </p>
            <p>
              <strong>{t('filter_tags')}：</strong>
              {currentInfo.筛选标签 || '无'}
            </p>
            <p>
              <strong>{t('official_en')}：</strong>
              {currentInfo['官方译法（英文）'] || '无'}
            </p>
            <p>
              <strong>{t('official_other')}：</strong>
              {currentInfo['官方译法（小语种）'] || '无'}
            </p>
            <p>
              <strong>{t('cultural_connotation')}：</strong>
              {getDisplayExplanation(currentInfo)}
            </p>
            <p>
              <strong>{t('source')}：</strong>
              {currentInfo.来源 || '未标注'}
            </p>
          </div>
        )}
      </Modal>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId !== null ? '编辑术语' : '新增术语'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            {t('cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={modalLoading}
            onClick={handleSave}
          >
            {t('save')}
          </Button>,
        ]}
        width={700}
      >
        <Form<TermFormData>
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="术语名称"
            label={t('term_name')}
            rules={[{ required: true, message: '请输入术语名称' }]}
          >
            <Input placeholder="例如：人类命运共同体" />
          </Form.Item>
          <Form.Item
            name="术语层级"
            label={t('term_level')}
            rules={[{ required: true, message: '请选择术语层级' }]}
          >
            <Select
              placeholder="请选择层级"
              options={[
                { label: t('core_level'), value: '核心层' },
                { label: t('extension_level'), value: '拓展层' },
                { label: t('origin_level'), value: '本源层' },
              ]}
              onChange={(value) => {
                const map: Record<string, string> = {
                  核心层: '社会主义先进文化',
                  拓展层: '革命文化',
                  本源层: '中华优秀传统文化',
                }
                if (map[value]) {
                  form.setFieldsValue({ 文化分类: map[value] })
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="文化分类"
            label={t('culture_category')}
          >
            <Input placeholder="根据层级自动填充，也可手动修改" />
          </Form.Item>
          <Form.Item
            name="场景分类"
            label={t('scene_category')}
          >
            <Input placeholder="学术研究 / 政策传播 / 国际交流" />
          </Form.Item>
          <Form.Item
            name="筛选标签"
            label={t('filter_tags')}
          >
            <Input placeholder="多个标签用逗号分隔" />
          </Form.Item>
          <Form.Item
            name="官方译法（英文）"
            label={t('official_en')}
          >
            <Input placeholder="a community with a shared future for humanity" />
          </Form.Item>
          <Form.Item
            name="官方译法（小语种）"
            label={t('official_other')}
          >
            <Input placeholder="其他语言译法（暂存）" />
          </Form.Item>
          <Form.Item
            name="文化内涵"
            label={t('cultural_connotation')}
          >
            <Input.TextArea
              rows={3}
              placeholder="解释术语的文化背景和深层含义"
            />
          </Form.Item>
          <Form.Item name="来源" label={t('source')}>
            <Input placeholder="出处或参考文献" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default HomePage
