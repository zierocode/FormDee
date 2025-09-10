'use client'

import { useState, Suspense, useEffect } from 'react'
import { LockOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, Button, Card, Typography, Space, Spin, notification } from 'antd'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'

const { Title, Text } = Typography

// Zod schema for login validation
const loginSchema = z.object({
  adminKey: z
    .string({
      required_error: 'Please enter your admin key',
    })
    .min(1, 'Please enter your admin key'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/builder'
  const error = searchParams.get('error')

  const [isLoading, setIsLoading] = useState(false)

  // Show access denied message if redirected from protected page
  useEffect(() => {
    if (error === 'access_denied') {
      notification.error({
        message: 'Access Denied',
        description: 'Please log in to access this page.',
        placement: 'bottomRight',
        duration: 5,
      })
    }
  }, [error])

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: {
      adminKey: '',
    },
  })

  const onSubmit = async (values: LoginFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminKey: values.adminKey }),
      })

      const data = await response.json()

      if (response.ok) {
        notification.success({
          message: 'Login Successful',
          description: 'Welcome back! You have been logged in successfully.',
          placement: 'bottomRight',
        })
        router.push(returnUrl)
        router.refresh()
      } else {
        notification.error({
          message: 'Login Failed',
          description: data.error || 'Invalid admin key',
          placement: 'bottomRight',
        })
      }
    } catch (error) {
      notification.error({
        message: 'Login Error',
        description: 'An error occurred. Please try again.',
        placement: 'bottomRight',
      })
    } finally {
      setIsLoading(false)
    }
  }

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
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          borderRadius: 8,
        }}
        styles={{
          body: {
            padding: '32px 24px 24px',
          },
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Centered logo section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Image
              src="/FormDee-logo.png"
              alt="FormDee Logo"
              width={80}
              height={80}
              style={{ marginBottom: 12 }}
            />
            <Title level={2} style={{ margin: '0 0 2px 0', fontSize: 28 }}>
              FormDee
            </Title>
            <Text type="secondary" style={{ fontSize: 18 }}>
              ฟอร์มดี
            </Text>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 16 }}>
              <Controller
                name="adminKey"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    prefix={<LockOutlined />}
                    placeholder="Enter admin key"
                    autoComplete="current-password"
                    size="large"
                    status={errors.adminKey ? 'error' : undefined}
                    styles={{
                      input: {
                        textAlign: 'center',
                      },
                    }}
                  />
                )}
              />
              {errors.adminKey && (
                <div
                  style={{
                    color: '#ff4d4f',
                    fontSize: 14,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                >
                  {errors.adminKey.message}
                </div>
              )}
            </div>

            <div
              style={{
                marginBottom: 0,
                marginTop: 8,
              }}
            >
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                block
                size="large"
                style={{ height: 46 }}
              >
                {isLoading ? 'Logging in...' : 'Sign In'}
              </Button>
            </div>
          </form>
        </Space>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
