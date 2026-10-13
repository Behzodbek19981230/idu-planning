import { Alert, Button, Empty, Flex, Spin, Typography } from 'antd';

export function Loading({ fullScreen = false }) {
  return (
    <Flex justify="center" align="center" style={{ padding: 48, minHeight: fullScreen ? '100dvh' : undefined }}>
      <Spin size="large" />
    </Flex>
  );
}

export function ErrorAlert({ error, onRetry, style }) {
  if (!error) return null;
  return (
    <Alert
      type="error"
      showIcon
      title={error.message || String(error)}
      action={
        onRetry && (
          <Button size="small" onClick={onRetry}>
            Qayta urinish
          </Button>
        )
      }
      style={style}
    />
  );
}

export function EmptyState({ title, children }) {
  return (
    <Flex vertical align="center" style={{ padding: '32px 16px' }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Flex vertical gap={4}>
            <Typography.Text strong>{title}</Typography.Text>
            {children && <Typography.Text type="secondary">{children}</Typography.Text>}
          </Flex>
        }
      />
    </Flex>
  );
}

export function PageHeader({ title, subtitle, extra }) {
  return (
    <Flex wrap justify="space-between" align="flex-end" gap={12} style={{ marginBottom: 20 }}>
      <div style={{ minWidth: 0 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
      </div>
      {extra && (
        <Flex wrap gap={8}>
          {extra}
        </Flex>
      )}
    </Flex>
  );
}
