'use client'

import { Card, Typography, Alert, Space } from 'antd'
import Image from 'next/image'

const { Title, Text } = Typography

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ant Design-inspired background pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(24, 144, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(24, 144, 255, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(24, 144, 255, 0.05) 0%, transparent 50%)
        `,
          pointerEvents: 'none',
        }}
      />

      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          borderRadius: 8,
        }}
        styles={{
          body: {
            padding: '28px 32px 24px',
          },
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Logo and branding */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <Image
              src="/FormDee-logo.png"
              alt="FormDee Logo"
              width={72}
              height={72}
              style={{ marginBottom: 10 }}
            />
            <Title level={2} style={{ margin: '0 0 2px 0', fontSize: 26 }}>
              FormDee
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              ฟอร์มดี
            </Text>
          </div>

          {/* Bilingual Message */}
          <div style={{ textAlign: 'center' }}>
            <Title level={4} style={{ margin: '0 0 6px 0', fontSize: 18 }}>
              No Form Specified • ไม่พบฟอร์ม
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
              To view a form, use a URL like:
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              หากต้องการดูฟอร์ม ให้ใช้ URL ในรูปแบบ:
            </Text>
            <div style={{ marginTop: 10 }}>
              <Text code style={{ fontSize: 14, padding: '6px 12px' }}>
                /f/your-form-id
              </Text>
            </div>
          </div>

          {/* Bilingual Info alert */}
          <Alert
            message={<span>How to access forms • วิธีเข้าถึงฟอร์ม</span>}
            description={
              <div>
                <div>Ask your form administrator for the direct link</div>
                <div>ติดต่อผู้ดูแลระบบเพื่อขอลิงก์ฟอร์มโดยตรง</div>
              </div>
            }
            type="info"
            showIcon
            style={{ textAlign: 'left' }}
          />
        </Space>
      </Card>
    </div>
  )
}
