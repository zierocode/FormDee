'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  EditOutlined,
  CopyOutlined,
  ExportOutlined,
  SearchOutlined,
  CheckOutlined,
  ReloadOutlined,
  CopyFilled,
  ClockCircleOutlined,
  BarChartOutlined,
  LinkOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import {
  List,
  Button,
  Input,
  Space,
  Typography,
  Badge,
  Card,
  Spin,
  Empty,
  notification,
  Tooltip,
  Divider,
  Popconfirm,
} from 'antd'
import { useForms } from '@/hooks/use-forms'
import { useResponseStats } from '@/hooks/use-responses'

const { Text, Title } = Typography
const { Search } = Input

// Format date for display
function formatDate(dateString?: string | null) {
  if (!dateString) return 'Unknown'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Unknown'

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  } catch {
    return 'Unknown'
  }
}

// Component to display response statistics for a form
function FormResponseStats({
  refKey,
  display = 'full',
}: {
  refKey: string
  display?: 'full' | 'count-only' | 'last-only'
}) {
  const { data: stats, isLoading } = useResponseStats(refKey)

  if (isLoading) {
    return <Spin size="small" />
  }

  const { count = 0, lastResponseDate } = stats || {}

  if (display === 'count-only') {
    return (
      <Space size="small">
        <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
        <Text type="secondary">responses</Text>
      </Space>
    )
  }

  if (display === 'last-only') {
    return (
      <Space size="small">
        <BarChartOutlined />
        <Text type="secondary">
          {lastResponseDate ? `Last response ${formatDate(lastResponseDate)}` : 'No response'}
        </Text>
      </Space>
    )
  }

  return (
    <Space size="small">
      <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
      <Text type="secondary">responses</Text>
      {lastResponseDate && (
        <>
          <Divider type="vertical" />
          <Text type="secondary">Last: {formatDate(lastResponseDate)}</Text>
        </>
      )}
    </Space>
  )
}

// Component for View Responses button with count
function ViewResponsesButton({ refKey }: { refKey: string }) {
  const { data: stats, isLoading } = useResponseStats(refKey)

  const count = stats?.count || 0

  return (
    <Tooltip title="View responses">
      <Button
        icon={<BarChartOutlined />}
        href={`/responses/${encodeURIComponent(refKey)}`}
        target="_blank"
        loading={isLoading}
      >
        View Responses ({count})
      </Button>
    </Tooltip>
  )
}

export function FormsList() {
  // TanStack Query hooks
  const { data: allItems = [], isLoading: loading, error: queryError, refetch } = useForms()

  const [displayedItems, setDisplayedItems] = useState<
    { refKey: string; title: string; description?: string; updatedAt?: string | null }[]
  >([])
  const [copiedRefKey, setCopiedRefKey] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)
  const [loadingDuplicate, setLoadingDuplicate] = useState<string | null>(null)
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const ITEMS_PER_PAGE = 5

  // Transform error for display
  const error = queryError ? (queryError as Error).message : null

  // Transform and sort the forms data
  const formattedItems = useMemo(() => {
    if (!allItems) return []
    return allItems
      .map((item) => ({
        refKey: item.refKey,
        title: item.title || '',
        description: item.description || '',
        updatedAt: item.updatedAt || item.createdAt || null,
      }))
      .sort((a, b) => a.title.localeCompare(b.title) || a.refKey.localeCompare(b.refKey))
  }, [allItems])

  // Filter items based on search query
  const filteredItems = useMemo(
    () =>
      formattedItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.refKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [formattedItems, searchQuery]
  )

  // Paginate filtered items
  useEffect(() => {
    const startIndex = 0
    const endIndex = currentPage * ITEMS_PER_PAGE
    setDisplayedItems(filteredItems.slice(startIndex, endIndex))
  }, [filteredItems, currentPage])

  // Load more items for infinite scroll
  const loadMore = useCallback(() => {
    if (isLoadingMore || displayedItems.length >= filteredItems.length) return

    setIsLoadingMore(true)
    setTimeout(() => {
      setCurrentPage((prev) => prev + 1)
      setIsLoadingMore(false)
    }, 500)
  }, [isLoadingMore, displayedItems.length, filteredItems.length])

  // Handle search input
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // Copy form URL to clipboard
  async function copyFormUrl(refKey: string) {
    try {
      const formUrl = `${window.location.origin}/f/${encodeURIComponent(refKey)}`
      await navigator.clipboard.writeText(formUrl)
      setCopiedRefKey(refKey)
      notification.success({
        message: 'Success',
        description: 'Form URL copied to clipboard!',
        placement: 'bottomRight',
      })
      setTimeout(() => setCopiedRefKey(null), 2000)
    } catch (error) {
      notification.error({
        message: 'Copy Failed',
        description: 'Failed to copy URL',
        placement: 'bottomRight',
      })
    }
  }

  // Handle edit button click with loading animation
  function handleEditClick(refKey: string) {
    setLoadingEdit(refKey)
    setTimeout(() => {
      window.location.href = `/builder/${encodeURIComponent(refKey)}`
    }, 100)
  }

  // Handle duplicate button click with loading animation
  async function handleDuplicateClick(refKey: string) {
    setLoadingDuplicate(refKey)

    try {
      // Find the form in the cached data
      const formData = allItems?.find((form) => form.refKey === refKey)
      if (formData) {
        sessionStorage.setItem(`duplicate_${refKey}`, JSON.stringify(formData))
        window.location.href = `/builder?duplicate=${encodeURIComponent(refKey)}`
      } else {
        notification.error({
          message: 'Form Not Found',
          description: 'Failed to load form data: Form not found',
          placement: 'bottomRight',
        })
        setLoadingDuplicate(null)
      }
    } catch (error: any) {
      notification.error({
        message: 'Load Failed',
        description: `Failed to load form data: ${error.message}`,
        placement: 'bottomRight',
      })
      setLoadingDuplicate(null)
    }
  }

  // Handle delete button click with loading animation
  async function handleDeleteClick(refKey: string) {
    setLoadingDelete(refKey)

    try {
      const response = await fetch(`/api/forms?refKey=${encodeURIComponent(refKey)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.ok) {
        notification.success({
          message: 'Form Deleted',
          description: `Form "${refKey}" deleted successfully`,
          placement: 'bottomRight',
        })
        // Refetch the forms list to update UI
        refetch()
      } else {
        throw new Error(result.error?.message || 'Failed to delete form')
      }
    } catch (error: any) {
      notification.error({
        message: 'Delete Failed',
        description: `Failed to delete form: ${error.message}`,
        placement: 'bottomRight',
      })
    } finally {
      setLoadingDelete(null)
    }
  }

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop !==
        document.documentElement.offsetHeight
      )
        return
      loadMore()
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [displayedItems.length, filteredItems.length, isLoadingMore, loadMore])

  if (loading) {
    return (
      <Card>
        <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="danger">{error}</Text>
          <Button onClick={() => refetch()} icon={<ReloadOutlined />}>
            Retry
          </Button>
        </Space>
      </Card>
    )
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="center">
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Existing Forms
          </Title>
          {!loading && (
            <Badge count={filteredItems.length} style={{ backgroundColor: '#1890ff' }} showZero />
          )}
        </Space>

        <Search
          placeholder="Search forms..."
          allowClear
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 400 }}
          prefix={<SearchOutlined />}
        />
      </Space>

      {filteredItems.length === 0 ? (
        <Card>
          <Empty
            description={
              searchQuery
                ? `No forms match "${searchQuery}"`
                : 'No forms yet. Create your first form above!'
            }
          >
            {searchQuery && <Button onClick={() => handleSearch('')}>Clear search</Button>}
          </Empty>
        </Card>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={displayedItems}
          loading={loading}
          renderItem={(item) => (
            <Card style={{ marginBottom: 8 }}>
              <List.Item
                extra={
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 8,
                    }}
                  >
                    <Space size="small">
                      <Tooltip title="Edit form">
                        <Button
                          type="primary"
                          icon={<EditOutlined />}
                          loading={loadingEdit === item.refKey}
                          onClick={() => handleEditClick(item.refKey)}
                        >
                          Edit
                        </Button>
                      </Tooltip>
                      <Tooltip title="Duplicate form">
                        <Button
                          icon={<CopyFilled />}
                          loading={loadingDuplicate === item.refKey}
                          onClick={() => handleDuplicateClick(item.refKey)}
                        >
                          Duplicate
                        </Button>
                      </Tooltip>
                      <Popconfirm
                        title="Delete this form?"
                        description={
                          <div>
                            <p>This action will permanently delete:</p>
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                              <li>The form configuration</li>
                              <li>All form responses</li>
                              <li>All uploaded files from storage</li>
                            </ul>
                            <p style={{ color: '#ff4d4f', fontWeight: 'bold', margin: 0 }}>
                              This cannot be undone!
                            </p>
                          </div>
                        }
                        placement="topRight"
                        okText="Delete"
                        okType="danger"
                        cancelText="Cancel"
                        onConfirm={() => handleDeleteClick(item.refKey)}
                      >
                        <Tooltip title="Delete form and all data">
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            loading={loadingDelete === item.refKey}
                          >
                            Delete
                          </Button>
                        </Tooltip>
                      </Popconfirm>
                    </Space>
                    <Space size="small">
                      <ViewResponsesButton refKey={item.refKey} />
                      <Tooltip title="Copy form URL">
                        <Button
                          icon={copiedRefKey === item.refKey ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => copyFormUrl(item.refKey)}
                          type={copiedRefKey === item.refKey ? 'primary' : 'default'}
                        >
                          {copiedRefKey === item.refKey ? 'Copied!' : 'Copy URL'}
                        </Button>
                      </Tooltip>
                      <Tooltip title="Open form">
                        <Button
                          icon={<ExportOutlined />}
                          href={`/f/${encodeURIComponent(item.refKey)}`}
                          target="_blank"
                        >
                          Open Form
                        </Button>
                      </Tooltip>
                    </Space>
                  </div>
                }
              >
                <List.Item.Meta
                  title={
                    <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                      {item.title}
                    </Title>
                  }
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space split={<Divider type="vertical" />}>
                        <Space>
                          <ClockCircleOutlined />
                          <Text type="secondary">Modified {formatDate(item.updatedAt)}</Text>
                        </Space>
                        <FormResponseStats refKey={item.refKey} display="last-only" />
                      </Space>

                      <Space>
                        <LinkOutlined />
                        <Text type="secondary" code>
                          {`${window.location.origin}/f/${item.refKey}`}
                        </Text>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            </Card>
          )}
        />
      )}

      {displayedItems.length < filteredItems.length && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={loadMore} loading={isLoadingMore}>
            Load More
          </Button>
        </div>
      )}
    </Space>
  )
}
