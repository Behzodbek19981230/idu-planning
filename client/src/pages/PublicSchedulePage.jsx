import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Flex, Grid, Image, Select, Typography, theme } from 'antd';
import { CalendarOutlined, DownloadOutlined, ExportOutlined, LoginOutlined } from '@ant-design/icons';
import { useApi } from '../lib/useApi.js';
import { FILE_ICONS, fileKind, fileUrl, formatDate, formatSize } from '../lib/files.jsx';
import { EmptyState, ErrorAlert, Loading } from '../components/ui.jsx';
import ThemeSwitch from '../components/ThemeSwitch.jsx';

const { Text, Title } = Typography;
const STORAGE_KEY = 'idu_group';

const remembered = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

/** Talabalar uchun: guruhni tanlab, zam dekan yuborgan dars jadvalini ko'rish (login talab qilinmaydi) */
export default function PublicSchedulePage() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const { data, error, loading, reload } = useApi('/public/groups');
  const [params, setParams] = useSearchParams();
  const selectedName = params.get('guruh') || remembered();

  const group = data?.groups.find((g) => g.name === selectedName) ?? null;

  const options = useMemo(() => {
    const map = new Map();
    for (const g of data?.groups ?? []) {
      const key = g.course ?? 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ value: g.name, label: g.name });
    }
    return [...map]
      .sort(([a], [b]) => (a || 99) - (b || 99))
      .map(([course, list]) => ({ label: course ? `${course}-kurs` : 'Boshqa', options: list }));
  }, [data]);

  const select = (name) => {
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // brauzer saqlashga ruxsat bermasa — faqat URL'da qoladi
    }
    setParams({ guruh: name }, { replace: true });
  };

  return (
    <div style={{ minHeight: '100dvh', background: token.colorBgLayout }}>
      <Flex
        align="center"
        gap={12}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 56,
          paddingInline: 16,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Flex align="center" gap={8} style={{ color: token.colorPrimary, fontWeight: 700, fontSize: 17 }}>
          <CalendarOutlined style={{ fontSize: 22 }} />
          Guruh jadvali
        </Flex>
        <Flex align="center" gap={4} style={{ marginLeft: 'auto' }}>
          <ThemeSwitch />
          <Link to="/">
            <Button type="text" icon={<LoginOutlined />}>
              {screens.sm && 'Xodimlar uchun'}
            </Button>
          </Link>
        </Flex>
      </Flex>

      <Flex vertical gap={16} style={{ maxWidth: 1000, margin: '0 auto', padding: screens.md ? '28px 24px 40px' : 16 }}>
        <Select
          size="large"
          showSearch={{ optionFilterProp: 'label' }}
          placeholder="Guruhingizni tanlang"
          value={group?.name}
          onChange={select}
          options={options}
          loading={loading}
          style={{ width: '100%' }}
        />

        <ErrorAlert error={error} onRetry={reload} />
        {loading && !data && <Loading />}

        {data && !group && <EmptyState title="Guruhni tanlang">Dars jadvali shu yerda ko'rinadi</EmptyState>}
        {group && !group.latestFile && (
          <Card>
            <EmptyState title={`${group.name} uchun jadval hali yuborilmagan`}>Keyinroq qayta tekshiring</EmptyState>
          </Card>
        )}
        {group?.latestFile && <ScheduleView group={group} file={group.latestFile} />}
      </Flex>
    </div>
  );
}

function ScheduleView({ group, file }) {
  const screens = Grid.useBreakpoint();
  const kind = fileKind(file.mimeType);

  return (
    <Card
      title={
        <Flex vertical style={{ padding: '12px 0' }}>
          <Title level={4} style={{ margin: 0 }}>
            {group.name}
          </Title>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
            Yangilangan: {formatDate(file.createdAt)}
          </Text>
        </Flex>
      }
      extra={
        <Flex gap={8}>
          {kind !== 'excel' && (
            <Button icon={<ExportOutlined />} href={fileUrl(file.id)} target="_blank">
              {screens.sm && 'Ochish'}
            </Button>
          )}
          <Button type="primary" icon={<DownloadOutlined />} href={fileUrl(file.id, true)}>
            {screens.sm && 'Yuklab olish'}
          </Button>
        </Flex>
      }
      styles={{ body: { padding: kind === 'excel' ? 24 : 0 } }}
    >
      {file.note && <Text style={{ display: 'block', padding: kind === 'excel' ? '0 0 16px' : '16px 24px 0' }}>{file.note}</Text>}

      {kind === 'image' && <Image src={fileUrl(file.id)} alt={`${group.name} dars jadvali`} style={{ width: '100%', display: 'block' }} />}

      {/* Telefon brauzerlari PDF'ni iframe ichida ko'pincha ko'rsatmaydi — u yerda "Ochish" tugmasi bor */}
      {kind === 'pdf' &&
        (screens.md ? (
          <iframe title={`${group.name} dars jadvali`} src={fileUrl(file.id)} style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }} />
        ) : (
          <FileRow file={file} kind={kind} />
        ))}

      {kind === 'excel' && <FileRow file={file} kind={kind} />}
    </Card>
  );
}

function FileRow({ file, kind }) {
  return (
    <Flex align="center" gap={12} style={{ padding: kind === 'excel' ? 0 : 24 }}>
      <span style={{ fontSize: 40, lineHeight: 1 }}>{FILE_ICONS[kind]}</span>
      <Flex vertical style={{ minWidth: 0 }}>
        <Text strong ellipsis>
          {file.filename}
        </Text>
        <Text type="secondary">{formatSize(file.size)}</Text>
      </Flex>
    </Flex>
  );
}
