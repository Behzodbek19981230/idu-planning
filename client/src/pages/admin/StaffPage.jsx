import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { App, Button, Dropdown, Flex, Form, Grid, Input, Modal, Segmented, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, KeyOutlined, LockOutlined, MoreOutlined, PlusOutlined, UnlockOutlined } from '@ant-design/icons';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { ROLE_LABELS } from '../../lib/roles.js';
import { ErrorAlert, PageHeader } from '../../components/ui.jsx';
import { CredentialsModal } from './TeachersPage.jsx';

const { Text } = Typography;

const STAFF_ROLES = [
  { value: 'VICE_DEAN', label: ROLE_LABELS.VICE_DEAN },
  { value: 'DEAN', label: ROLE_LABELS.DEAN },
];

export default function StaffPage() {
  const { modal, message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { data, error, loading, reload } = useApi('/admin/staff');
  const [editing, setEditing] = useState(null); // null | {} (yangi) | user
  const [credentials, setCredentials] = useState(null);

  const run = async (fn, successText) => {
    try {
      await fn();
      if (successText) message.success(successText);
      reload();
    } catch (err) {
      message.error(err.message);
    }
  };

  const resetPassword = (u) =>
    modal.confirm({
      title: 'Parolni tiklash',
      content: `${u.fullName} uchun yangi parol yaratilsinmi? Eski parol ishlamay qoladi.`,
      okText: 'Yangi parol',
      cancelText: 'Bekor qilish',
      onOk: () =>
        run(async () => {
          const { password } = await api.post(`/admin/staff/${u.id}/reset-password`);
          setCredentials({ fullName: u.fullName, username: u.username, password });
        }),
    });

  const remove = (u) =>
    modal.confirm({
      title: "Xodimni o'chirish",
      content: `${u.fullName} o'chirilsinmi? Unga biriktirilgan guruhlar mas'ulsiz qoladi, yuborgan jadvallari saqlanadi.`,
      okText: "O'chirish",
      okButtonProps: { danger: true },
      cancelText: 'Bekor qilish',
      onOk: () => run(() => api.del(`/admin/staff/${u.id}`), "O'chirildi"),
    });

  const actions = (u) => [
    { key: 'edit', icon: <EditOutlined />, label: 'Tahrirlash', onClick: () => setEditing(u) },
    { key: 'reset', icon: <KeyOutlined />, label: 'Parolni tiklash', onClick: () => resetPassword(u) },
    {
      key: 'toggle',
      icon: u.isActive ? <LockOutlined /> : <UnlockOutlined />,
      label: u.isActive ? 'Bloklash' : 'Blokdan chiqarish',
      onClick: () => run(() => api.patch(`/admin/staff/${u.id}`, { isActive: !u.isActive }), u.isActive ? 'Bloklandi' : 'Blokdan chiqarildi'),
    },
    { key: 'delete', icon: <DeleteOutlined />, label: "O'chirish", danger: true, onClick: () => remove(u) },
  ];

  const columns = [
    {
      title: 'F.I.Sh.',
      key: 'name',
      render: (_, u) => (
        <Flex vertical gap={4}>
          <Flex wrap align="center" gap={6}>
            <Text strong>{u.fullName}</Text>
            <Tag color={u.role === 'DEAN' ? 'purple' : 'blue'}>{ROLE_LABELS[u.role]}</Tag>
            {!u.isActive && <Tag color="red">Bloklangan</Tag>}
          </Flex>
          {u.role === 'VICE_DEAN' && (
            <Flex wrap gap={4}>
              {u.groups.length ? (
                u.groups.map((g) => (
                  <Tag key={g.id} bordered={false} style={{ marginInlineEnd: 0 }}>
                    {g.name}
                  </Tag>
                ))
              ) : (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Guruh biriktirilmagan — <Link to="/groups">Guruhlar</Link> bo'limida biriktiring
                </Text>
              )}
            </Flex>
          )}
          {!screens.md && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              <Text code>{u.username}</Text>
              {u.password && (
                <>
                  {' '}
                  · <Text code copyable>{u.password}</Text>
                </>
              )}
            </Text>
          )}
        </Flex>
      ),
    },
    { title: 'Login', dataIndex: 'username', width: 140, responsive: ['md'], render: (v) => <Text code>{v}</Text> },
    {
      title: 'Parol',
      key: 'password',
      width: 160,
      responsive: ['md'],
      render: (_, u) =>
        u.password ? (
          <Text code copyable>
            {u.password}
          </Text>
        ) : (
          <Text type="secondary">{u.passwordStatus === 'changed' ? "O'zi o'zgartirgan" : '—'}</Text>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: screens.md ? 160 : 48,
      align: 'right',
      render: (_, u) =>
        screens.md ? (
          <Flex gap={4} justify="flex-end">
            {actions(u).map((a) => (
              <Tooltip key={a.key} title={a.label}>
                <Button size="small" icon={a.icon} danger={a.danger} onClick={a.onClick} aria-label={a.label} />
              </Tooltip>
            ))}
          </Flex>
        ) : (
          <Dropdown
            trigger={['click']}
            menu={{ items: actions(u).map(({ onClick: _onClick, ...a }) => a), onClick: ({ key }) => actions(u).find((a) => a.key === key)?.onClick() }}
          >
            <Button type="text" icon={<MoreOutlined />} aria-label="Amallar" />
          </Dropdown>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Xodimlar"
        subtitle="Dekan va zam dekanlar"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({})}>
            Qo'shish
          </Button>
        }
      />

      <ErrorAlert error={error} onRetry={reload} style={{ marginBottom: 16 }} />

      <Table
        rowKey="id"
        loading={loading && !data}
        dataSource={data?.staff ?? []}
        columns={columns}
        pagination={false}
        locale={{ emptyText: "Hali dekan yoki zam dekan qo'shilmagan" }}
        size={screens.md ? 'middle' : 'small'}
        style={{ overflow: 'hidden' }}
      />

      <StaffForm
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={(creds) => {
          setEditing(null);
          if (creds) setCredentials(creds);
          else message.success('Saqlandi');
          reload();
        }}
      />
      <CredentialsModal
        creds={credentials}
        onClose={() => setCredentials(null)}
        hint="Parol xodim uni o'zgartirmaguncha shu sahifada ko'rinib turadi."
      />
    </div>
  );
}

function StaffForm({ user, onClose, onSaved }) {
  const isNew = user && !user.id;
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setError(null);
    form.setFieldsValue({ fullName: user.fullName || '', role: user.role || 'VICE_DEAN', username: user.username || '', password: '' });
  }, [user, form]);

  const submit = async ({ password, ...values }) => {
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        const d = await api.post('/admin/staff', { ...values, password });
        onSaved({ fullName: d.user.fullName, username: d.user.username, password: d.password });
      } else {
        await api.patch(`/admin/staff/${user.id}`, values);
        onSaved(null);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(user)}
      title={isNew ? 'Yangi xodim' : 'Tahrirlash'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Saqlash"
      cancelText="Bekor qilish"
      confirmLoading={busy}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={submit} requiredMark="optional" style={{ marginTop: 16 }}>
        <Form.Item name="role" label="Lavozim" rules={[{ required: true }]}>
          <Segmented block options={STAFF_ROLES} />
        </Form.Item>
        <Form.Item name="fullName" label="F.I.Sh." rules={[{ required: true, whitespace: true, message: 'F.I.Sh. kiritilishi shart' }]}>
          <Input placeholder="Karimov Alisher Bahodirovich" autoFocus />
        </Form.Item>
        <Form.Item
          name="username"
          label="Login"
          rules={[
            { required: !isNew, message: 'Loginni kiriting' },
            { pattern: /^[a-zA-Z0-9._-]{3,32}$/, message: "3–32 ta lotin harf, raqam, '.', '_' yoki '-'" },
          ]}
        >
          <Input placeholder={isNew ? 'avtomatik yaratiladi' : ''} autoCapitalize="none" style={{ fontFamily: 'monospace' }} />
        </Form.Item>
        {isNew && (
          <Form.Item name="password" label="Parol">
            <Input placeholder="avtomatik yaratiladi" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        )}
        <ErrorAlert error={error} />
      </Form>
    </Modal>
  );
}
