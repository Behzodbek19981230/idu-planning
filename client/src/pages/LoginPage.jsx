import { useState } from 'react';
import { Alert, Button, Card, Flex, Form, Input, Typography, theme } from 'antd';
import { CalendarOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../lib/auth.jsx';
import ThemeSwitch from '../components/ThemeSwitch.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const { token } = theme.useToken();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async ({ username, password }) => {
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <Flex
      justify="center"
      align="center"
      style={{
        minHeight: '100dvh',
        padding: 16,
        background: `radial-gradient(1200px 600px at 10% -10%, ${token.colorPrimaryBgHover}, transparent 60%),
                     radial-gradient(900px 500px at 110% 110%, ${token.purple2}, transparent 60%),
                     ${token.colorBgLayout}`,
      }}
    >
      <div style={{ position: 'fixed', top: 12, right: 12 }}>
        <ThemeSwitch />
      </div>

      <Flex vertical gap={24} style={{ width: '100%', maxWidth: 380 }}>
        <Flex vertical align="center" gap={8}>
          <Flex
            align="center"
            justify="center"
            style={{ width: 56, height: 56, borderRadius: 16, background: token.colorPrimary, color: '#fff', fontSize: 28, boxShadow: token.boxShadow }}
          >
            <CalendarOutlined />
          </Flex>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Dars jadvali
          </Typography.Title>
          <Typography.Text type="secondary">O'qituvchilar uchun shaxsiy jadval</Typography.Text>
        </Flex>

        <Card style={{ boxShadow: token.boxShadowSecondary }} styles={{ body: { padding: 24 } }}>
          <Form layout="vertical" size="large" onFinish={submit} requiredMark={false} autoComplete="on">
            <Form.Item name="username" label="Login" rules={[{ required: true, message: 'Loginni kiriting' }]}>
              <Input prefix={<UserOutlined />} autoComplete="username" autoCapitalize="none" autoCorrect="off" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="Parol" rules={[{ required: true, message: 'Parolni kiriting' }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            {error && <Alert type="error" showIcon title={error.message} style={{ marginBottom: 16 }} />}
            <Button type="primary" htmlType="submit" block loading={busy}>
              Kirish
            </Button>
          </Form>
          <Typography.Paragraph type="secondary" style={{ textAlign: 'center', margin: '16px 0 0', fontSize: 12 }}>
            Login va parolni administrator beradi.
          </Typography.Paragraph>
        </Card>
      </Flex>
    </Flex>
  );
}
