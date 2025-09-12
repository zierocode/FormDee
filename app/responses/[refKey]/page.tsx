'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  DownloadOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SearchOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  Card,
  Spin,
  Alert,
  DatePicker,
  Tooltip,
  Badge,
  Tag,
  Layout,
  Row,
  Col,
  notification,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { format } from 'date-fns'
import { useParams, useRouter } from 'next/navigation'
import { AdminKeyGate } from '@/components/AdminKeyGate'

interface Response {
  id: number
  refKey: string
  formData: Record<string, any>
  ip: string
  userAgent: string
  files: any[]
  submittedAt: string
  metadata: Record<string, any>
}

interface Form {
  refKey: string
  title: string
  fields: Array<{
    name: string
    label?: string
    type: string
    required?: boolean
    options?: Array<{ label: string; value: string }>
  }>
}

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Header: _Header, Content } = Layout

const ITEMS_PER_PAGE = 50

function ResponsesViewer() {
  const params = useParams()
  const router = useRouter()
  const refKey = params.refKey as string

  const [responses, setResponses] = useState<Response[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [showSystemColumns, setShowSystemColumns] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isFetching, setIsFetching] = useState(false)
  const lastFetchParams = useRef<string>('')
  const isManualRefresh = useRef(false)
  const lastFetchTime = useRef(0)

  // Date range filter
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)

  // Fetch form configuration on mount or refKey change
  useEffect(() => {
    if (!hasInitialized || form?.refKey !== refKey) {
      setHasInitialized(true)
      fetchForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey])

  // Fetch responses when form is loaded or filters change
  useEffect(() => {
    // Skip if we're doing a manual refresh or already fetching
    if (isManualRefresh.current || isFetching) {
      isManualRefresh.current = false
      return
    }

    if (form) {
      fetchResponses(true, false) // Reset responses, not a refresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, searchText, form?.refKey])

  const fetchForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms?refKey=${refKey}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to fetch form')
      }

      const result = await res.json()
      // Extract the form data from the response
      const formData = result.data || result

      // Normalize field structure - handle both 'key' and 'name' properties
      if (formData.fields) {
        formData.fields = formData.fields.map((field: any) => ({
          ...field,
          name: field.name || field.key, // Use 'name' if available, otherwise use 'key'
          label: field.label || field.name || field.key,
        }))
      }

      setForm(formData)
    } catch (err: any) {
      setError(err.message)
    }
  }, [refKey])

  const fetchResponses = useCallback(
    async (reset: boolean = false, isRefresh: boolean = false) => {
      // Prevent duplicate fetch calls
      if (isFetching) return

      // Build params first to check for duplicates
      const currentOffset = reset ? 0 : responses.length
      const params = new URLSearchParams({
        refKey,
        limit: String(ITEMS_PER_PAGE),
        offset: String(currentOffset),
      })

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append('startDate', dateRange[0])
        params.append('endDate', dateRange[1])
      }

      if (searchText.trim()) {
        params.append('search', searchText.trim())
      }

      const paramsString = params.toString()
      const now = Date.now()

      // Prevent duplicate requests within 100ms (to handle React StrictMode double-rendering)
      if (lastFetchParams.current === paramsString && now - lastFetchTime.current < 100) {
        return
      }

      lastFetchParams.current = paramsString
      lastFetchTime.current = now
      setIsFetching(true)

      if (reset) {
        if (isRefresh) {
          setTableLoading(true) // Only show table loading for refresh
        } else {
          setLoading(true) // Show full page loading for initial load
        }
        setResponses([])
        setHasMore(true)
      } else {
        setIsLoadingMore(true)
      }

      setError(null)

      try {
        const res = await fetch(`/api/responses?${paramsString}`, {
          credentials: 'include',
        })

        if (!res.ok) {
          throw new Error('Failed to fetch responses')
        }

        const data = await res.json()
        const newResponses = data.data || []

        if (reset) {
          setResponses(newResponses)
          setSelectedRowKeys([]) // Clear selections on reset
        } else {
          setResponses((prev) => [...prev, ...newResponses])
        }

        setTotalCount(data.pagination?.total || 0)
        setHasMore(newResponses.length === ITEMS_PER_PAGE)
      } catch (err: any) {
        setError(err.message)
        notification.error({
          message: 'Fetch Failed',
          description: `Failed to fetch responses: ${err.message}`,
          placement: 'bottomRight',
        })
      } finally {
        setLoading(false)
        setTableLoading(false)
        setIsLoadingMore(false)
        setIsFetching(false)
        // Reset manual refresh flag after completion
        if (isRefresh) {
          setTimeout(() => {
            isManualRefresh.current = false
          }, 100)
        }
      }
    },
    [refKey, dateRange, searchText, responses.length, isFetching]
  )

  // Dynamic column generation for Ant Design Table
  const columns: ColumnsType<Response> = useMemo(() => {
    const cols: ColumnsType<Response> = [
      {
        title: 'Submitted At',
        dataIndex: 'submittedAt',
        key: 'submittedAt',
        width: 140,
        sorter: true,
        defaultSortOrder: 'descend',
        render: (date: string) => (date ? format(new Date(date), 'MMM dd, yyyy HH:mm') : '-'),
      },
    ]

    // Add columns for each form field
    if (form?.fields && Array.isArray(form.fields)) {
      form.fields.forEach((field: any) => {
        cols.push({
          title: field.label || field.name,
          dataIndex: ['formData', field.name],
          key: `formData.${field.name}`,
          width: Math.max(100, Math.min(200, (field.label || field.name).length * 8 + 60)),
          ellipsis: {
            showTitle: false,
          },
          render: (value: any) => {
            if (value === null || value === undefined) return <Text type="secondary">-</Text>
            if (typeof value === 'boolean')
              return <Tag color={value ? 'success' : 'default'}>{value ? 'Yes' : 'No'}</Tag>
            if (Array.isArray(value)) return <Text>{value.join(', ')}</Text>
            if (field.type === 'file' && value) {
              const r2BaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''
              // Handle file URLs from R2 storage
              if (typeof value === 'string' && value.startsWith(r2BaseUrl)) {
                // Extract filename from URL pattern: {refKey}-{timestamp}-{filename}
                const urlParts = value.split('/')
                const fullFilename = urlParts[urlParts.length - 1]

                // Parse the filename: {refKey}-{timestamp}-{actualFilename}
                const filenameParts = fullFilename.split('-')
                // Skip the first part (refKey) and second part (timestamp)
                // Join the rest as the actual filename
                const actualFilename = filenameParts.slice(2).join('-')

                return (
                  <Tooltip title={`Click to view: ${actualFilename}`}>
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <Tag icon={<FileTextOutlined />} color="blue" style={{ cursor: 'pointer' }}>
                        {actualFilename || 'File'}
                      </Tag>
                    </a>
                  </Tooltip>
                )
              }
              // Handle array of file URLs (multiple files)
              if (Array.isArray(value)) {
                return (
                  <Space direction="vertical" size="small">
                    {value.map((fileUrl, index) => {
                      if (typeof fileUrl === 'string' && fileUrl.startsWith(r2BaseUrl)) {
                        const urlParts = fileUrl.split('/')
                        const fullFilename = urlParts[urlParts.length - 1]
                        const filenameParts = fullFilename.split('-')
                        const actualFilename = filenameParts.slice(2).join('-')

                        return (
                          <Tooltip key={index} title={`Click to view: ${actualFilename}`}>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none' }}
                            >
                              <Tag
                                icon={<FileTextOutlined />}
                                color="blue"
                                style={{ cursor: 'pointer' }}
                              >
                                {actualFilename || `File ${index + 1}`}
                              </Tag>
                            </a>
                          </Tooltip>
                        )
                      }
                      return <Tag key={index}>{fileUrl}</Tag>
                    })}
                  </Space>
                )
              }
              // Fallback for other formats
              return (
                <Tooltip title={typeof value === 'object' ? JSON.stringify(value) : value}>
                  <Tag icon={<FileTextOutlined />}>
                    {typeof value === 'object' ? value.name || 'File' : value}
                  </Tag>
                </Tooltip>
              )
            }
            return (
              <Tooltip title={String(value)}>
                <Text ellipsis>{String(value)}</Text>
              </Tooltip>
            )
          },
        })
      })
    }

    // Add system columns only if showSystemColumns is true
    if (showSystemColumns) {
      cols.push(
        {
          title: 'IP Address',
          dataIndex: 'ip',
          key: 'ip',
          width: 120,
          render: (ip: string) => <Text code>{ip}</Text>,
        },
        {
          title: 'User Agent',
          dataIndex: 'userAgent',
          key: 'userAgent',
          width: 300,
          ellipsis: {
            showTitle: false,
          },
          render: (userAgent: string) => (
            <Tooltip title={userAgent}>
              <Text ellipsis style={{ maxWidth: '280px' }}>
                {userAgent}
              </Text>
            </Tooltip>
          ),
        }
      )
    }

    return cols
  }, [form, showSystemColumns])

  // Infinite scroll functionality
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop !==
          document.documentElement.offsetHeight ||
        !hasMore ||
        isLoadingMore
      ) {
        return
      }

      fetchResponses(false) // Load more without reset
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoadingMore, responses.length, dateRange, searchText, fetchResponses])

  // Use responses directly (search is now handled server-side)
  const filteredResponses = responses

  // Table row selection
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
    fixed: true,
  }

  const exportToCSV = () => {
    const dataToExport =
      selectedRowKeys.length > 0
        ? filteredResponses.filter((response) => selectedRowKeys.includes(response.id))
        : filteredResponses

    if (dataToExport.length === 0) {
      notification.warning({
        message: 'No Data',
        description: 'No data to export',
        placement: 'bottomRight',
      })
      return
    }

    // Create headers from current columns
    const headers: string[] = []
    const columnKeys: string[] = []

    columns.forEach((col) => {
      if (col.title) {
        headers.push(String(col.title))
        columnKeys.push(String(col.key))
      }
    })

    // Extract data for each row
    const rows = dataToExport.map((response) => {
      return columnKeys.map((key) => {
        if (key === 'submittedAt') {
          return format(new Date(response.submittedAt), 'yyyy-MM-dd HH:mm:ss')
        }

        if (key.startsWith('formData.')) {
          const fieldName = key.replace('formData.', '')
          const value = response.formData[fieldName]

          if (value === null || value === undefined) return ''
          if (typeof value === 'boolean') return value ? 'Yes' : 'No'

          // Handle file URLs - extract just the filename for CSV
          const r2BaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''
          if (typeof value === 'string' && value.startsWith(r2BaseUrl)) {
            const urlParts = value.split('/')
            const fullFilename = urlParts[urlParts.length - 1]
            const filenameParts = fullFilename.split('-')
            const actualFilename = filenameParts.slice(2).join('-')
            return actualFilename || value
          }

          if (Array.isArray(value)) {
            // Check if it's an array of file URLs
            const processedValues = value.map((item) => {
              if (typeof item === 'string' && item.startsWith(r2BaseUrl)) {
                const urlParts = item.split('/')
                const fullFilename = urlParts[urlParts.length - 1]
                const filenameParts = fullFilename.split('-')
                const actualFilename = filenameParts.slice(2).join('-')
                return actualFilename || item
              }
              return item
            })
            return processedValues.join(', ')
          }

          if (typeof value === 'object') return JSON.stringify(value)
          return String(value)
        }

        if (key === 'ip') return response.ip || ''
        if (key === 'userAgent') return response.userAgent || ''

        return ''
      })
    })

    // Create CSV content
    const csv = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    // Create file with proper naming: {Form Title}-{datetime}.csv
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const formTitle = form?.title || 'responses'
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
    a.download = `${formTitle.replace(/[^a-z0-9]/gi, '_')}-${timestamp}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    notification.success({
      message: 'Export Complete',
      description: `Exported ${dataToExport.length} responses to CSV`,
      placement: 'bottomRight',
    })
  }

  if (loading && responses.length === 0) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading responses...</div>
          </div>
        </Content>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: 24,
          }}
        >
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Button
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/builder')}
          >
            Back to Builder
          </Button>
        </Content>
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content
        style={{
          padding: '24px',
          background: 'rgb(240, 242, 245)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          {/* Main Container */}
          <Card styles={{ body: { padding: 0 } }} style={{ background: '#fff' }}>
            {/* Header Section */}
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => router.push(`/builder/${refKey}`)}
                >
                  Back
                </Button>
                <BarChartOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <Title level={4} style={{ margin: 0 }}>
                  {form?.title || 'Form'} - Responses
                </Title>
                <Badge count={totalCount} style={{ backgroundColor: '#52c41a' }} />
              </div>

              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    if (!isFetching) {
                      isManualRefresh.current = true
                      fetchResponses(true, true)
                    }
                  }}
                  loading={tableLoading}
                  disabled={isFetching}
                >
                  Refresh
                </Button>
                <Button type="primary" icon={<DownloadOutlined />} onClick={exportToCSV}>
                  {selectedRowKeys.length > 0
                    ? `Export Selected (${selectedRowKeys.length})`
                    : 'Export All CSV'}
                </Button>
              </Space>
            </div>

            {/* Body Section */}
            <div style={{ padding: '24px' }}>
              {/* Filters */}
              <Card style={{ marginBottom: 24 }}>
                <Row gutter={16} align="middle">
                  <Col flex={1}>
                    <Input
                      placeholder="Search all columns..."
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onPressEnter={() => fetchResponses(true, false)}
                      allowClear
                    />
                  </Col>

                  <Col>
                    <RangePicker
                      placeholder={['Start Date', 'End Date']}
                      onChange={(dates) => {
                        if (dates) {
                          setDateRange([
                            dates[0]?.format('YYYY-MM-DD') || '',
                            dates[1]?.format('YYYY-MM-DD') || '',
                          ])
                        } else {
                          setDateRange(null)
                        }
                      }}
                    />
                  </Col>

                  <Col>
                    <Tooltip
                      title={showSystemColumns ? 'Hide system columns' : 'Show system columns'}
                    >
                      <Button
                        icon={showSystemColumns ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => setShowSystemColumns(!showSystemColumns)}
                        type={showSystemColumns ? 'primary' : 'default'}
                      >
                        {showSystemColumns ? 'Hide' : 'Show'} System Columns
                      </Button>
                    </Tooltip>
                  </Col>

                  {selectedRowKeys.length > 0 && (
                    <Col>
                      <Button onClick={() => setSelectedRowKeys([])}>
                        Clear Selection ({selectedRowKeys.length})
                      </Button>
                    </Col>
                  )}
                </Row>
              </Card>

              {/* Table */}
              <Card>
                <Table<Response>
                  columns={columns}
                  dataSource={filteredResponses}
                  rowKey="id"
                  rowSelection={rowSelection}
                  pagination={false}
                  loading={loading || tableLoading}
                  scroll={{ x: 1200 }}
                  size="small"
                  bordered
                  locale={{
                    emptyText:
                      responses.length === 0
                        ? 'No responses received yet'
                        : 'No responses match your search',
                  }}
                />

                {/* Infinite scroll loading indicator */}
                {isLoadingMore && (
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <Spin size="small" />
                    <span style={{ marginLeft: 8 }}>Loading more responses...</span>
                  </div>
                )}

                {!hasMore && responses.length > 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#999' }}>
                    All responses loaded ({totalCount} total)
                  </div>
                )}
              </Card>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  )
}

export default function ResponsesPage() {
  return (
    <AdminKeyGate>
      <ResponsesViewer />
    </AdminKeyGate>
  )
}
