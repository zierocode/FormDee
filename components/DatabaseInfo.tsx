'use client'

import { useState } from 'react'
import {
  DatabaseOutlined,
  TableOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import {
  Card,
  Statistic,
  Progress,
  Space,
  Typography,
  Spin,
  Alert,
  Button,
  Tooltip,
  Tag,
} from 'antd'
import { useDatabaseStats } from '@/hooks/use-database-stats'

const { Text } = Typography

export function DatabaseInfo() {
  const { data, isLoading, error, refetch } = useDatabaseStats()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  if (isLoading) {
    return (
      <Card size="small">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip="Loading database information..." />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert
        message="Database Information Unavailable"
        description="Unable to load database statistics. Please try again later."
        type="warning"
        showIcon
      />
    )
  }

  if (!data) {
    return null
  }

  const usedPercentage = parseFloat(data.database.usagePercentage)
  const progressStatus =
    usedPercentage > 90 ? 'exception' : usedPercentage > 70 ? 'normal' : 'success'

  const getHealthIcon = () => {
    switch (data.health.status) {
      case 'healthy':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />
      case 'critical':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <WarningOutlined style={{ color: '#8c8c8c' }} />
    }
  }

  const getHealthColor = () => {
    switch (data.health.status) {
      case 'healthy':
        return 'success'
      case 'warning':
        return 'warning'
      case 'critical':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <DatabaseOutlined />
          <Text strong>Database Information</Text>
          <Tooltip title="Refresh database stats">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined spin={isRefreshing} />}
              onClick={handleRefresh}
              loading={isRefreshing}
            />
          </Tooltip>
        </Space>
      }
      extra={
        <Tag icon={getHealthIcon()} color={getHealthColor()}>
          {data.health.status.toUpperCase()}
        </Tag>
      }
      styles={{ body: { padding: '12px' } }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Database Usage Progress */}
        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text type="secondary">Database Usage</Text>
            <Text type="secondary">{data.database.usagePercentage}% used</Text>
          </Space>
          <Progress
            percent={usedPercentage}
            status={progressStatus}
            strokeColor={progressStatus === 'exception' ? '#ff4d4f' : undefined}
            format={() => data.database.sizeFormatted}
          />
          <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {data.database.sizeFormatted} used
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {data.database.limitFormatted} total
            </Text>
          </Space>
        </div>

        {/* Table Statistics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Card size="small" bordered={false} style={{ background: '#f5f5f5' }}>
            <Statistic
              title={
                <Space size={4}>
                  <TableOutlined style={{ fontSize: 12 }} />
                  <span style={{ fontSize: 12 }}>Forms</span>
                </Space>
              }
              value={data.tables.forms.count}
              suffix={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({data.tables.forms.sizeFormatted})
                </Text>
              }
              valueStyle={{ fontSize: 18 }}
            />
          </Card>

          <Card size="small" bordered={false} style={{ background: '#f5f5f5' }}>
            <Statistic
              title={
                <Space size={4}>
                  <TableOutlined style={{ fontSize: 12 }} />
                  <span style={{ fontSize: 12 }}>Responses</span>
                </Space>
              }
              value={data.tables.responses.count}
              suffix={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({data.tables.responses.sizeFormatted})
                </Text>
              }
              valueStyle={{ fontSize: 18 }}
            />
          </Card>

          <Card size="small" bordered={false} style={{ background: '#f5f5f5' }}>
            <Statistic
              title={
                <Space size={4}>
                  <TableOutlined style={{ fontSize: 12 }} />
                  <span style={{ fontSize: 12 }}>Google Auth</span>
                </Space>
              }
              value={data.tables.googleAuth.count}
              suffix={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({data.tables.googleAuth.sizeFormatted})
                </Text>
              }
              valueStyle={{ fontSize: 18 }}
            />
          </Card>

          <Card size="small" bordered={false} style={{ background: '#f5f5f5' }}>
            <Statistic
              title={
                <Space size={4}>
                  <TableOutlined style={{ fontSize: 12 }} />
                  <span style={{ fontSize: 12 }}>API Logs</span>
                </Space>
              }
              value={data.tables.apiKeyLogs.count}
              suffix={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({data.tables.apiKeyLogs.sizeFormatted})
                </Text>
              }
              valueStyle={{ fontSize: 18 }}
            />
          </Card>
        </div>

        {/* Health Status Message */}
        {data.health.status !== 'healthy' && (
          <Alert
            message={data.health.message}
            type={data.health.status === 'critical' ? 'error' : 'warning'}
            showIcon
            banner
          />
        )}

        {/* Error Message if partial data */}
        {data.error && (
          <Alert
            message={data.error.message}
            description={data.error.details}
            type="info"
            showIcon
            closable
          />
        )}
      </Space>
    </Card>
  )
}
