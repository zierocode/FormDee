import type { ThemeConfig } from 'antd'

export const antdTheme: ThemeConfig = {
  token: {
    // Primary colors
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',

    // Border radius
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,

    // Font
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
    fontSize: 14,

    // Layout
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,

    // Animation
    motionDurationMid: '0.2s',
    motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  },
  components: {
    Button: {
      colorPrimary: '#1890ff',
      algorithm: true,
    },
    Input: {
      activeBorderColor: '#1890ff',
      hoverBorderColor: '#40a9ff',
    },
    Form: {
      labelColor: 'rgba(0, 0, 0, 0.85)',
      marginLG: 24,
    },
    Card: {
      borderRadiusLG: 8,
      boxShadowTertiary:
        '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    },
    Message: {
      contentPadding: '10px 16px',
    },
    Modal: {
      borderRadiusLG: 8,
    },
    Select: {
      controlHeight: 40,
    },
    DatePicker: {
      controlHeight: 40,
    },
    Table: {
      borderRadiusLG: 8,
    },
  },
}

// Export color tokens for use in custom CSS or inline styles
export const colors = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1890ff',
  textPrimary: 'rgba(0, 0, 0, 0.85)',
  textSecondary: 'rgba(0, 0, 0, 0.45)',
  border: '#d9d9d9',
  background: '#f5f5f5',
  backgroundLight: '#fafafa',
}

// Export animation tokens
export const animation = {
  duration: {
    fast: '0.1s',
    normal: '0.2s',
    slow: '0.3s',
  },
  easing: {
    easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    easeOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  },
}
