'use client'

import { useState } from 'react'
import {
  CloudServerOutlined,
  FileOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Card, Statistic, Progress, Space, Typography, Spin, Alert, Button, Tooltip } from 'antd'
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

        {/* Plan Information */}
        <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <ThunderboltOutlined /> Plan
              </Text>
              <Text strong style={{ fontSize: 12, textTransform: 'capitalize' }}>
                {data.limits.plan}
              </Text>
            </Space>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Storage Limit
              </Text>
              <Text style={{ fontSize: 12 }}>{data.limits.maxStorage}</Text>
            </Space>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Operations/Month
              </Text>
              <Text style={{ fontSize: 12 }}>{data.limits.maxOperationsPerMonth}</Text>
            </Space>
          </Space>
        </Card>

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
