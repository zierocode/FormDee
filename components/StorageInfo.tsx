'use client'

import { useState } from 'react'
import {
  CloudServerOutlined,
  FileOutlined,
  DatabaseOutlined,
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
import { useStorageStats } from '@/hooks/use-storage-stats'

const { Text, Title: _Title } = Typography

export function StorageInfo() {
  const { data, isLoading, error, refetch } = useStorageStats()
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
          <Spin tip="Loading storage information..." />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert
        message="Storage Information Unavailable"
        description="Unable to load storage statistics. Please try again later."
        type="warning"
        showIcon
      />
    )
  }

  if (!data) {
    return null
  }

  const usedPercentage = parseFloat(data.summary.usedPercentage)
  const progressStatus =
    usedPercentage > 90 ? 'exception' : usedPercentage > 70 ? 'normal' : 'success'

  const getHealthStatus = () => {
    if (usedPercentage > 90) return 'critical'
    if (usedPercentage > 70) return 'warning'
    return 'healthy'
  }

  const getHealthIcon = () => {
    const status = getHealthStatus()
    switch (status) {
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
    const status = getHealthStatus()
    switch (status) {
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
          <CloudServerOutlined />
          <Text strong>Storage Information</Text>
          <Tooltip title="Refresh storage stats">
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
          {getHealthStatus().toUpperCase()}
        </Tag>
      }
      styles={{ body: { padding: '12px' } }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Storage Usage Progress */}
        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text type="secondary">Storage Usage</Text>
            <Text type="secondary">{data.summary.usedPercentage} used</Text>
          </Space>
          <Progress
            percent={usedPercentage}
            status={progressStatus}
            strokeColor={progressStatus === 'exception' ? '#ff4d4f' : undefined}
            format={() => data.summary.totalSizeFormatted}
          />
          <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {data.summary.totalSizeFormatted} used
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {data.summary.maxStorageFormatted} total
            </Text>
          </Space>
        </div>

        {/* Statistics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Card size="small" bordered={false} style={{ background: '#f5f5f5' }}>
            <Statistic
              title={
                <Space size={4}>
                  <FileOutlined style={{ fontSize: 12 }} />
                  <span style={{ fontSize: 12 }}>Total Files</span>
                </Space>
              }
              value={data.summary.totalFiles}
              valueStyle={{ fontSize: 18 }}
            />
          </Card>

          <Card size="small" bordered={false} style={{ background: '#f5f5f5' }}>
            <Statistic
              title={
                <Space size={4}>
                  <DatabaseOutlined style={{ fontSize: 12 }} />
                  <span style={{ fontSize: 12 }}>Remaining</span>
                </Space>
              }
              value={data.summary.remainingStorageFormatted}
              valueStyle={{ fontSize: 18 }}
            />
          </Card>
        </div>

        {/* Warning if storage is getting full */}
        {usedPercentage > 80 && (
          <Alert
            message={usedPercentage > 90 ? 'Storage Almost Full' : 'Storage Warning'}
            description={`You have used ${data.summary.usedPercentage} of your storage. Consider upgrading your plan or removing old files.`}
            type={usedPercentage > 90 ? 'error' : 'warning'}
            showIcon
            banner
          />
        )}
      </Space>
    </Card>
  )
}
