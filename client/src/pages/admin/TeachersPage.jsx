import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Descriptions, Dropdown, Flex, Form, Grid, Input, Modal, Table, Tag, Tooltip, Typography } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileExcelOutlined,
  KeyOutlined,
  LockOutlined,
  MoreOutlined,
  PlusOutlined,
  ScheduleOutlined,
  SearchOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { downloadCredentialsCsv } from '../../lib/credentials.js';
import { ErrorAlert, PageHeader } from '../../components/ui.jsx';

const { Text } = Typography;

export default function TeachersPage() {
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useApi(`/admin/teachers?q=${encodeURIComponent(q)}`);
  const [editing, setEditing] = useState(null); // null | {} (yangi) | teacher
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

  const resetPassword = (t) =>
    modal.confirm({
      title: 'Parolni tiklash',
      content: `${t.fullName} uchun yangi parol yaratilsinmi? Eski parol ishlamay qoladi.`,
      okText: 'Yangi parol',
      cancelText: 'Bekor qilish',
      onOk: () =>
        run(async () => {
          const { password } = await api.post(`/admin/teachers/${t.id}/reset-password`);
          setCredentials({ fullName: t.fullName, username: t.username, password });
        }),
    });

  const toggleActive = (t) =>
    run(() => api.patch(`/admin/teachers/${t.id}`, { isActive: !t.isActive }), t.isActive ? 'Bloklandi' : 'Blokdan chiqarildi');

  const remove = (t) =>
    modal.confirm({
      title: "O'qituvchini o'chirish",
      content: `${t.fullName} va uning barcha darslari o'chirilsinmi?`,
      okText: "O'chirish",
      okButtonProps: { danger: true },
      cancelText: 'Bekor qilish',
      onOk: () => run(() => api.del(`/admin/teachers/${t.id}`), "O'chirildi"),
    });

  const exportExcel = () =>
    run(() =>
      api.download(
        `/admin/teachers/export?site=${encodeURIComponent(window.location.origin)}`,
        `oqituvchilar-login-parol-${new Date().toISOString().slice(0, 10)}.xlsx`
      )
    );

  const regenerateMissing = () =>
    modal.confirm({
      title: 'Yangi parollar yaratish',
      content: `${data.missingPasswords} ta o'qituvchiga yangi parol yaratilsinmi? Ularga avval berilgan parollar ishlamay qoladi.`,
      okText: 'Yaratish',
      cancelText: 'Bekor qilish',
      onOk: () => run(() => api.post('/admin/teachers/regenerate-missing'), 'Yangi parollar yaratildi — endi Excel yuklab oling'),
    });

  const actions = (t) => [
    { key: 'schedule', icon: <ScheduleOutlined />, label: "Jadvalni ko'rish", onClick: () => navigate(`/admin/teachers/${t.id}`) },
    { key: 'edit', icon: <EditOutlined />, label: 'Tahrirlash', onClick: () => setEditing(t) },
    { key: 'reset', icon: <KeyOutlined />, label: 'Parolni tiklash', onClick: () => resetPassword(t) },
    {
      key: 'toggle',
      icon: t.isActive ? <LockOutlined /> : <UnlockOutlined />,
      label: t.isActive ? 'Bloklash' : 'Blokdan chiqarish',
      onClick: () => toggleActive(t),
    },
    { key: 'delete', icon: <DeleteOutlined />, label: "O'chirish", danger: true, onClick: () => remove(t) },
  ];

  const columns = [
    {
      title: "F.I.Sh.",
      key: 'name',
      render: (_, t) => (
        <Flex vertical gap={2}>
          <Flex wrap align="center" gap={6}>
            <Link to={`/admin/teachers/${t.id}`}>
              <Text strong>{t.fullName}</Text>
            </Link>
            {!t.isActive && <Tag color="red">Bloklangan</Tag>}
            {t.passwordStatus === 'changed' && <Tag color="green">Parolni o'zgartirgan</Tag>}
            {t.passwordStatus === 'unknown' && <Tag color="orange">Parol saqlanmagan</Tag>}
          </Flex>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {[t.position, t.scheduleName && t.scheduleName !== t.fullName && `Jadvalda: ${t.scheduleName}`].filter(Boolean).join(' · ')}
            {!screens.md && (
              <>
                {t.position ? ' · ' : ''}
                <Text code>{t.username}</Text> · {t.lessonsCount} ta dars
              </>
            )}
          </Text>
        </Flex>
      ),
    },
    { title: 'Login', dataIndex: 'username', responsive: ['md'], render: (v) => <Text code>{v}</Text> },
    { title: 'Darslar', dataIndex: 'lessonsCount', width: 90, responsive: ['md'], align: 'center' },
    {
      title: '',
      key: 'actions',
      width: screens.md ? 210 : 48,
      align: 'right',
      render: (_, t) =>
        screens.md ? (
          <Flex gap={4} justify="flex-end">
            {actions(t).map((a) => (
              <Tooltip key={a.key} title={a.label}>
                <Button size="small" icon={a.icon} danger={a.danger} onClick={a.onClick} aria-label={a.label} />
              </Tooltip>
            ))}
          </Flex>
        ) : (
          <Dropdown
            trigger={['click']}
            menu={{ items: actions(t).map(({ onClick: _onClick, ...a }) => a), onClick: ({ key }) => actions(t).find((a) => a.key === key)?.onClick() }}
          >
            <Button type="text" icon={<MoreOutlined />} aria-label="Amallar" />
          </Dropdown>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="O'qituvchilar"
        subtitle={data ? `${data.teachers.length} ta o'qituvchi` : undefined}
        extra={
          <>
            <Button icon={<FileExcelOutlined />} onClick={exportExcel} disabled={!data?.teachers.length}>
              Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({})}>
              Qo'shish
            </Button>
          </>
        }
      />

      {data?.missingPasswords > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${data.missingPasswords} ta o'qituvchining paroli saqlanmagan`}
          description="Ular Excel eksport funksiyasidan oldin yaratilgan. Excel'da ularning paroli chiqishi uchun yangi parol yarating."
          action={
            <Button size="small" type="primary" icon={<KeyOutlined />} onClick={regenerateMissing}>
              Yangi parol yaratish
            </Button>
          }
        />
      )}

      <Input
        allowClear
        size="large"
        prefix={<SearchOutlined />}
        placeholder="Ism yoki login bo'yicha qidirish"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <ErrorAlert error={error} onRetry={reload} style={{ marginBottom: 16 }} />

      <Table
        rowKey="id"
        loading={loading && !data}
        dataSource={data?.teachers ?? []}
        columns={columns}
        pagination={{ pageSize: 50, hideOnSinglePage: true, showSizeChanger: false }}
        locale={{ emptyText: q ? 'Hech narsa topilmadi' : "O'qituvchilar yo'q — Excel jadval yuklanganda avtomatik qo'shiladi" }}
        size={screens.md ? 'middle' : 'small'}
        style={{ overflow: 'hidden' }}
      />

      <TeacherForm
        teacher={editing}
        onClose={() => setEditing(null)}
        onSaved={(creds) => {
          setEditing(null);
          if (creds) setCredentials(creds);
          else message.success('Saqlandi');
          reload();
        }}
      />
      <CredentialsModal creds={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}

function TeacherForm({ teacher, onClose, onSaved }) {
  const isNew = teacher && !teacher.id;
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!teacher) return;
    setError(null);
    form.setFieldsValue({
      fullName: teacher.fullName || '',
      position: teacher.position || '',
      scheduleName: teacher.scheduleName || '',
      username: teacher.username || '',
      password: '',
    });
  }, [teacher, form]);

  const submit = async ({ password, ...values }) => {
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        const d = await api.post('/admin/teachers', { ...values, password });
        onSaved({ fullName: d.teacher.fullName, username: d.teacher.username, password: d.password });
      } else {
        await api.patch(`/admin/teachers/${teacher.id}`, values);
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
      open={Boolean(teacher)}
      title={isNew ? "Yangi o'qituvchi" : 'Tahrirlash'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Saqlash"
      cancelText="Bekor qilish"
      confirmLoading={busy}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={submit} requiredMark="optional" style={{ marginTop: 16 }}>
        <Form.Item name="fullName" label="F.I.Sh." rules={[{ required: true, whitespace: true, message: 'F.I.Sh. kiritilishi shart' }]}>
          <Input placeholder="Karimov Alisher Bahodirovich" autoFocus />
        </Form.Item>
        <Form.Item name="position" label="Unvon">
          <Input placeholder="kat.o'qit, PhD, dots." />
        </Form.Item>
        <Form.Item
          name="scheduleName"
          label="Jadvaldagi nomi"
          extra="Excel jadvalida qanday yozilgan bo'lsa, xuddi shunday kiriting — import darslarni shu nom bo'yicha biriktiradi."
        >
          <Input placeholder="R.Sobirov" />
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

function CredentialsModal({ creds, onClose }) {
  const { message } = App.useApp();
  if (!creds) return null;
  const text = `${creds.fullName}\nLogin: ${creds.username}\nParol: ${creds.password}\nManzil: ${window.location.origin}`;

  const copy = async () => {
    await navigator.clipboard?.writeText(text);
    message.success('Nusxa olindi');
  };

  return (
    <Modal
      open
      title="Kirish ma'lumotlari"
      onCancel={onClose}
      footer={[
        <Button key="csv" icon={<DownloadOutlined />} onClick={() => downloadCredentialsCsv([creds], `${creds.username}.csv`)}>
          CSV
        </Button>,
        <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={copy}>
          Nusxa olish
        </Button>,
      ]}
    >
      <Alert type="info" showIcon title="Parol keyinroq O'qituvchilar → Excel orqali ham yuklab olinadi." style={{ marginBottom: 16 }} />
      <Descriptions
        bordered
        column={1}
        size="small"
        items={[
          { key: 'n', label: "F.I.Sh.", children: creds.fullName },
          { key: 'l', label: 'Login', children: <Text code copyable>{creds.username}</Text> },
          { key: 'p', label: 'Parol', children: <Text code copyable>{creds.password}</Text> },
        ]}
      />
    </Modal>
  );
}
