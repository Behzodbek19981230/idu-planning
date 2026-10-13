import { useState } from 'react';
import { App, Button, Card, Descriptions, Flex, Form, Grid, Input, Typography } from 'antd';
import { BgColorsOutlined, KeyOutlined, LogoutOutlined } from '@ant-design/icons';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { PageHeader } from '../components/ui.jsx';
import { ThemeSegmented } from '../components/ThemeSwitch.jsx';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const screens = Grid.useBreakpoint();

  const submit = async ({ currentPassword, newPassword }) => {
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      message.success("Parol muvaffaqiyatli o'zgartirildi");
      form.resetFields();
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <PageHeader title="Profil" />
      <Flex vertical gap={16}>
        <Card>
          <Descriptions
            column={1}
            size="small"
            items={[
              { key: 'name', label: "F.I.Sh.", children: <Typography.Text strong>{user.fullName}</Typography.Text> },
              { key: 'login', label: 'Login', children: <Typography.Text code>{user.username}</Typography.Text> },
              { key: 'role', label: 'Rol', children: user.role === 'ADMIN' ? 'Administrator' : "O'qituvchi" },
            ]}
          />
        </Card>

        <Card title={<><BgColorsOutlined /> Ko'rinish</>}>
          <ThemeSegmented />
        </Card>

        <Card title={<><KeyOutlined /> Parolni o'zgartirish</>}>
          <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
            <Form.Item name="currentPassword" label="Joriy parol" rules={[{ required: true, message: 'Joriy parolni kiriting' }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="Yangi parol"
              rules={[
                { required: true, message: 'Yangi parolni kiriting' },
                { min: 6, message: "Kamida 6 ta belgi bo'lishi kerak" },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirm"
              label="Yangi parolni takrorlang"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Parolni takrorlang' },
                ({ getFieldValue }) => ({
                  validator: (_, v) =>
                    !v || v === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('Parollar mos kelmadi')),
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={busy} block={!screens.sm}>
              Saqlash
            </Button>
          </Form>
        </Card>

        {!screens.md && (
          <Button danger block size="large" icon={<LogoutOutlined />} onClick={logout}>
            Chiqish
          </Button>
        )}
      </Flex>
    </div>
  );
}
