import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Drawer,
  Dropdown,
  Flex,
  Form,
  Grid,
  Image,
  Input,
  List,
  Modal,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  LinkOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useAuth } from '../../lib/auth.jsx';
import {
  FILE_ICONS,
  fileKind,
  fileUrl,
  formatDate,
  formatSize,
} from '../../lib/files.jsx';
import { ErrorAlert, PageHeader } from '../../components/ui.jsx';
import TimetableModal from './TimetableModal.jsx';

const { Text } = Typography;

const NO_CURATOR = 'none';
const publicLink = (group) => `${window.location.origin}/jadval${group ? `?guruh=${encodeURIComponent(group.name)}` : ''}`;

export default function GroupsPage() {
  const { modal, message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { data, error, loading, reload } = useApi('/groups');
  const [q, setQ] = useState('');
  const [curator, setCurator] = useState(null);
  const [timetableFor, setTimetableFor] = useState(null); // null | [groupId, ...]
  const [history, setHistory] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} (yangi) | group

  const canManage = data?.canManage;
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.groups ?? []).filter(
      (g) =>
        (!needle || g.name.toLowerCase().includes(needle)) &&
        (!curator || (curator === NO_CURATOR ? !g.curator : g.curator?.id === curator))
    );
  }, [data, q, curator]);

  const copyLink = async (group) => {
    await navigator.clipboard?.writeText(publicLink(group));
    message.success('Havola nusxalandi — talabalarga yuboring');
  };

  const remove = (g) =>
    modal.confirm({
      title: "Guruhni o'chirish",
      content: `${g.name} guruhi va unga yuborilgan jadvallar o'chirilsinmi?`,
      okText: "O'chirish",
      okButtonProps: { danger: true },
      cancelText: 'Bekor qilish',
      onOk: async () => {
        try {
          await api.del(`/groups/${g.id}`);
          message.success("O'chirildi");
          reload();
        } catch (err) {
          message.error(err.message);
        }
      },
    });

  const actions = (g) => [
    { key: 'timetable', icon: <TableOutlined />, label: 'Dars jadvali', onClick: () => setTimetableFor([g.id]) },
    { key: 'history', icon: <HistoryOutlined />, label: `Yuborilganlar (${g.filesCount})`, onClick: () => setHistory(g) },
    { key: 'link', icon: <LinkOutlined />, label: 'Talabalar uchun havola', onClick: () => copyLink(g) },
    ...(canManage
      ? [
          { key: 'edit', icon: <EditOutlined />, label: 'Tahrirlash', onClick: () => setEditing(g) },
          { key: 'delete', icon: <DeleteOutlined />, label: "O'chirish", danger: true, onClick: () => remove(g) },
        ]
      : []),
  ];

  const columns = [
    {
      title: 'Guruh',
      key: 'name',
      render: (_, g) => (
        <Flex vertical gap={2}>
          <Flex wrap align="center" gap={6}>
            <Text strong>{g.name}</Text>
            {g.course && <Tag>{g.course}-kurs</Tag>}
            {canManage && !g.timetableName && (
              <Tooltip title="Tahrirlash orqali Excel jadvalidagi ustunni tanlang — shunda jadvalni avtomatik yaratish mumkin bo'ladi">
                <Tag color="orange">Jadvalga bog'lanmagan</Tag>
              </Tooltip>
            )}
          </Flex>
          {!screens.md && (
            <>
              {canManage && (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {g.curator?.fullName ?? 'Zam dekan biriktirilmagan'}
                </Text>
              )}
              <LatestFile file={g.latestFile} />
            </>
          )}
        </Flex>
      ),
    },
    ...(canManage
      ? [
          {
            title: 'Zam dekan',
            key: 'curator',
            responsive: ['md'],
            render: (_, g) => g.curator?.fullName ?? <Text type="secondary">—</Text>,
          },
        ]
      : []),
    { title: "So'nggi jadval", key: 'latest', responsive: ['md'], render: (_, g) => <LatestFile file={g.latestFile} /> },
    {
      title: '',
      key: 'actions',
      width: screens.md ? (canManage ? 190 : 120) : 48,
      align: 'right',
      render: (_, g) =>
        screens.md ? (
          <Flex gap={4} justify="flex-end">
            {actions(g).map((a) => (
              <Tooltip key={a.key} title={a.label}>
                <Button size="small" icon={a.icon} danger={a.danger} onClick={a.onClick} aria-label={a.label} />
              </Tooltip>
            ))}
          </Flex>
        ) : (
          <Dropdown
            trigger={['click']}
            menu={{ items: actions(g).map(({ onClick: _onClick, ...a }) => a), onClick: ({ key }) => actions(g).find((a) => a.key === key)?.onClick() }}
          >
            <Button type="text" icon={<MoreOutlined />} aria-label="Amallar" />
          </Dropdown>
        ),
    },
  ];

  const notSent = (data?.groups ?? []).filter((g) => !g.latestFile).length;

  return (
    <div>
      <PageHeader
        title={canManage === false ? 'Mening guruhlarim' : 'Guruhlar'}
        subtitle={data ? `${data.groups.length} ta guruh${notSent ? ` · ${notSent} tasiga jadval yuborilmagan` : ''}` : undefined}
        extra={
          <>
            <Button icon={<LinkOutlined />} onClick={() => copyLink(null)}>
              Talabalar sahifasi
            </Button>
            {canManage && (
              <Button icon={<PlusOutlined />} onClick={() => setEditing({})}>
                Guruh qo'shish
              </Button>
            )}
            <Button type="primary" icon={<TableOutlined />} onClick={() => setTimetableFor([])} disabled={!data?.groups.length}>
              Dars jadvali
            </Button>
          </>
        }
      />

      <Flex wrap gap={12} style={{ marginBottom: 16 }}>
        <Input
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          placeholder="Guruh nomi bo'yicha qidirish"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: '1 1 260px' }}
        />
        {canManage && (
          <Select
            allowClear
            size="large"
            placeholder="Barcha zam dekanlar"
            value={curator}
            onChange={setCurator}
            style={{ flex: '1 1 220px', maxWidth: screens.md ? 280 : undefined }}
            options={[
              ...data.curators.map((c) => ({ value: c.id, label: c.fullName })),
              { value: NO_CURATOR, label: 'Biriktirilmagan' },
            ]}
          />
        )}
      </Flex>

      <ErrorAlert error={error} onRetry={reload} style={{ marginBottom: 16 }} />

      {canManage === false && !loading && !data?.groups.length && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Sizga hali guruh biriktirilmagan — administrator yoki dekanga murojaat qiling." />
      )}

      <Table
        rowKey="id"
        loading={loading && !data}
        dataSource={groups}
        columns={columns}
        pagination={{ pageSize: 50, hideOnSinglePage: true, showSizeChanger: false }}
        locale={{ emptyText: q || curator ? 'Hech narsa topilmadi' : "Guruhlar yo'q" }}
        size={screens.md ? 'middle' : 'small'}
        style={{ overflow: 'hidden' }}
      />

      <TimetableModal
        groupIds={timetableFor}
        groups={data?.groups ?? []}
        onClose={() => setTimetableFor(null)}
        onSent={(count) => {
          setTimetableFor(null);
          message.success(`Jadval ${count} ta guruhga yuborildi`);
          reload();
        }}
      />
      <HistoryDrawer group={history} canManage={canManage} onClose={() => setHistory(null)} onChanged={reload} />
      {canManage && (
        <GroupForm
          group={editing}
          curators={data.curators}
          timetableColumns={data.timetableColumns}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            message.success('Saqlandi');
            reload();
          }}
        />
      )}
    </div>
  );
}

function LatestFile({ file }) {
  if (!file) return <Tag color="orange">Jadval yuborilmagan</Tag>;
  return (
    <Flex vertical gap={0} style={{ minWidth: 0 }}>
      <a href={fileUrl(file.id)} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 6, minWidth: 0 }}>
        {FILE_ICONS[fileKind(file.mimeType)]}
        <Text ellipsis style={{ color: 'inherit', maxWidth: 280 }}>
          {file.filename}
        </Text>
      </a>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {formatDate(file.createdAt)}
        {file.uploadedBy && ` · ${file.uploadedBy.fullName}`}
      </Text>
    </Flex>
  );
}

function HistoryDrawer({ group, canManage, onClose, onChanged }) {
  const { modal, message } = App.useApp();
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi(group ? `/groups/${group.id}/files` : null);

  const remove = (f) =>
    modal.confirm({
      title: "Faylni o'chirish",
      content:
        f.groups.length > 1
          ? `${f.filename} ${f.groups.length} ta guruhga yuborilgan — barchasidan o'chiriladi.`
          : `${f.filename} o'chirilsinmi?`,
      okText: "O'chirish",
      okButtonProps: { danger: true },
      cancelText: 'Bekor qilish',
      onOk: async () => {
        try {
          await api.del(`/groups/files/${f.id}`);
          message.success("O'chirildi");
          reload();
          onChanged();
        } catch (err) {
          message.error(err.message);
        }
      },
    });

  return (
    <Drawer open={Boolean(group)} title={group && `${group.name} — yuborilgan jadvallar`} onClose={onClose} size="large" destroyOnHidden>
      <ErrorAlert error={error} onRetry={reload} style={{ marginBottom: 16 }} />
      <List
        loading={loading}
        dataSource={data?.files ?? []}
        locale={{ emptyText: 'Bu guruhga hali jadval yuborilmagan' }}
        renderItem={(f, i) => {
          const kind = fileKind(f.mimeType);
          return (
            <List.Item
              actions={[
                <Tooltip key="open" title="Ochish">
                  <Button size="small" icon={<EyeOutlined />} href={fileUrl(f.id)} target="_blank" />
                </Tooltip>,
                <Tooltip key="dl" title="Yuklab olish">
                  <Button size="small" icon={<DownloadOutlined />} href={fileUrl(f.id, true)} />
                </Tooltip>,
                (canManage || f.uploadedBy?.id === user.id) && (
                  <Tooltip key="del" title="O'chirish">
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(f)} />
                  </Tooltip>
                ),
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={
                  kind === 'image' ? (
                    <Image src={fileUrl(f.id)} width={56} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <span style={{ fontSize: 40, lineHeight: 1 }}>{FILE_ICONS[kind]}</span>
                  )
                }
                title={
                  <Flex wrap align="center" gap={6}>
                    <Text ellipsis style={{ maxWidth: 260 }}>
                      {f.filename}
                    </Text>
                    {i === 0 && <Tag color="green">Joriy</Tag>}
                  </Flex>
                }
                description={
                  <Flex vertical gap={2}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(f.createdAt)} · {formatSize(f.size)}
                      {f.uploadedBy && ` · ${f.uploadedBy.fullName}`}
                    </Text>
                    {f.note && <Text>{f.note}</Text>}
                    {f.groups.length > 1 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Yana: {f.groups.filter((g) => g.id !== group.id).map((g) => g.name).join(', ')}
                      </Text>
                    )}
                  </Flex>
                }
              />
            </List.Item>
          );
        }}
      />
    </Drawer>
  );
}

function GroupForm({ group, curators, timetableColumns, onClose, onSaved }) {
  const isNew = group && !group.id;
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!group) return;
    setError(null);
    form.setFieldsValue({
      name: group.name || '',
      course: group.course ?? null,
      curatorId: group.curator?.id ?? null,
      timetableName: group.timetableName ?? null,
    });
  }, [group, form]);

  const submit = async (fields) => {
    // Tozalangan maydon undefined bo'ladi — serverga "olib tashlash" sifatida null yuboramiz
    const values = {
      ...fields,
      course: fields.course ?? null,
      curatorId: fields.curatorId ?? null,
      timetableName: fields.timetableName ?? null,
    };
    setBusy(true);
    setError(null);
    try {
      if (isNew) await api.post('/groups', values);
      else await api.patch(`/groups/${group.id}`, values);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(group)}
      title={isNew ? 'Yangi guruh' : 'Guruhni tahrirlash'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Saqlash"
      cancelText="Bekor qilish"
      confirmLoading={busy}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={submit} requiredMark="optional" style={{ marginTop: 16 }}>
        <Form.Item name="name" label="Guruh nomi" rules={[{ required: true, whitespace: true, message: 'Guruh nomini kiriting' }]}>
          <Input placeholder="Uz-5/26" autoFocus />
        </Form.Item>
        <Form.Item name="course" label="Kurs">
          <Select allowClear placeholder="Tanlang" options={[1, 2, 3, 4, 5, 6].map((c) => ({ value: c, label: `${c}-kurs` }))} />
        </Form.Item>
        <Form.Item
          name="timetableName"
          label="Jadvaldagi nomi"
          extra="Import qilingan Excel jadvalida bu guruh ustuni qanday nomlangan — jadval shu ustundagi darslardan yaratiladi."
        >
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            placeholder={timetableColumns.length ? 'Ustunni tanlang' : 'Avval Import orqali umumiy jadvalni yuklang'}
            options={[...new Set(timetableColumns.map((c) => c.sheet))].map((sheet) => ({
              label: sheet,
              options: timetableColumns.filter((c) => c.sheet === sheet).map((c) => ({ value: c.name, label: c.name })),
            }))}
          />
        </Form.Item>
        <Form.Item name="curatorId" label="Mas'ul zam dekan" extra="Faqat shu zam dekan guruhga jadval yubora oladi (dekan va admin — barcha guruhlarga).">
          <Select
            allowClear
            placeholder={curators.length ? 'Tanlang' : "Avval Xodimlar bo'limida zam dekan qo'shing"}
            options={curators.map((c) => ({ value: c.id, label: c.fullName + (c.isActive ? '' : ' (bloklangan)') }))}
          />
        </Form.Item>
        <ErrorAlert error={error} />
      </Form>
    </Modal>
  );
}
