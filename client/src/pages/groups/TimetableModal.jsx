import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Flex, Grid, Input, Modal, Segmented, Select, Spin, Tag, Typography } from 'antd';
import { DownloadOutlined, SendOutlined } from '@ant-design/icons';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { EXPORT_FORMATS, generateTimetableFile, saveFile } from '../../lib/exportTimetable.jsx';
import ExportTimetable from '../../components/ExportTimetable.jsx';
import { ErrorAlert } from '../../components/ui.jsx';

const { Text } = Typography;

/**
 * Tanlangan guruhlarning dars jadvali (Excel'dagi ko'rinishda) —
 * PDF / Excel / rasm qilib yuklab olish yoki guruhlarga yuborish.
 */
export default function TimetableModal({ groupIds, groups, onClose, onSent }) {
  const screens = Grid.useBreakpoint();
  const [selected, setSelected] = useState([]);
  const [format, setFormat] = useState('pdf');
  const [title, setTitle] = useState('');
  const [separate, setSeparate] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // null | 'download' | 'send'

  useEffect(() => {
    if (!groupIds) return;
    setSelected(groupIds);
    setTitle('');
    setError(null);
  }, [groupIds]);

  // Ustunlar tartibi — ro'yxatdagidek (kurs, keyin nom bo'yicha)
  const ordered = groups.filter((g) => selected.includes(g.id));
  const ids = ordered.map((g) => g.id);
  const preview = useApi(ids.length ? `/groups/timetable?groupIds=${ids.join(',')}` : null);
  const grid = ids.length ? preview.data : null;
  const split = separate && ordered.length > 1;

  const courses = useMemo(() => {
    const map = new Map();
    for (const g of groups) {
      const key = g.course ?? 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(g);
    }
    return [...map].sort(([a], [b]) => (a || 99) - (b || 99));
  }, [groups]);

  const selectedCourses = [...new Set(ordered.map((g) => g.course).filter(Boolean))];
  const autoTitle =
    ordered.length === 1
      ? `${ordered[0].name} guruhi dars jadvali`
      : `${selectedCourses.length === 1 ? `${selectedCourses[0]}-kurs ` : ''}dars jadvali`;

  const toggleCourse = (list) => {
    const courseIds = list.map((g) => g.id);
    const all = courseIds.every((id) => selected.includes(id));
    setSelected(all ? selected.filter((id) => !courseIds.includes(id)) : [...new Set([...selected, ...courseIds])]);
  };

  /** [{ groupIds, file }] — umumiy bitta fayl yoki har guruhga alohida */
  const buildFiles = async () => {
    if (!split) {
      const t = title.trim() || autoTitle;
      return [{ groupIds: ids, file: await generateTimetableFile({ format, groupIds: ids, grid, title: t }) }];
    }
    const out = [];
    for (const g of ordered) {
      const own = format === 'xlsx' ? null : await api.get(`/groups/timetable?groupIds=${g.id}`);
      out.push({
        groupIds: [g.id],
        file: await generateTimetableFile({
          format,
          groupIds: [g.id],
          grid: own,
          title: title.trim() || `${g.name} guruhi dars jadvali`,
          name: `${g.name} dars jadvali`,
        }),
      });
    }
    return out;
  };

  const act = async (kind) => {
    const problem = !ids.length
      ? 'Kamida bitta guruhni tanlang'
      : !grid
        ? 'Jadval hali yuklanmadi'
        : grid.missing.length === grid.columns.length
          ? 'Tanlangan guruhlar uchun dars topilmadi'
          : null;
    if (problem) return setError(new Error(problem));
    setBusy(kind);
    setError(null);
    try {
      const items = await buildFiles();
      if (kind === 'download') {
        items.forEach((i) => saveFile(i.file));
      } else {
        for (const item of items) {
          const fd = new FormData();
          fd.append('file', item.file);
          fd.append('groupIds', item.groupIds.join(','));
          await api.post('/groups/files', fd);
        }
        onSent(ids.length);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={Boolean(groupIds)}
      title="Dars jadvali"
      onCancel={onClose}
      width={1100}
      destroyOnHidden
      footer={
        <Flex wrap gap={8} justify="flex-end" align="center">
          <Segmented options={EXPORT_FORMATS} value={format} onChange={setFormat} style={{ marginRight: 'auto' }} />
          <Button icon={<SendOutlined />} loading={busy === 'send'} disabled={Boolean(busy)} onClick={() => act('send')}>
            Guruhlarga yuborish
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} loading={busy === 'download'} disabled={Boolean(busy)} onClick={() => act('download')}>
            Yuklab olish
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap={16} style={{ marginTop: 16 }}>
        <div>
          <Flex wrap gap={6} style={{ marginBottom: 8 }}>
            {courses.map(([course, list]) => (
              <Tag.CheckableTag key={course} checked={list.every((g) => selected.includes(g.id))} onChange={() => toggleCourse(list)}>
                {course ? `${course}-kurs` : 'Kurssiz'} ({list.length})
              </Tag.CheckableTag>
            ))}
          </Flex>
          <Select
            mode="multiple"
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            placeholder="Guruhlarni tanlang"
            value={selected}
            onChange={setSelected}
            style={{ width: '100%' }}
            maxTagCount="responsive"
            options={courses.map(([course, list]) => ({
              label: course ? `${course}-kurs` : 'Kurssiz',
              options: list.map((g) => ({ value: g.id, label: g.name })),
            }))}
          />
        </div>

        <Flex wrap gap={12} align="center">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={split ? "Sarlavha (bo'sh bo'lsa — guruh nomi)" : autoTitle}
            maxLength={200}
            prefix={<Text type="secondary">Sarlavha:</Text>}
            style={{ flex: '1 1 260px' }}
          />
          {ordered.length > 1 && (
            <Checkbox checked={separate} onChange={(e) => setSeparate(e.target.checked)}>
              Har bir guruhga alohida fayl
            </Checkbox>
          )}
        </Flex>

        {grid?.missing.length > 0 && (
          <Alert
            type="warning"
            showIcon
            title="Ba'zi guruhlar uchun dars topilmadi"
            description={grid.missing
              .map((m) => `${m.name}${m.linked ? '' : " (jadvaldagi nomi ko'rsatilmagan — Guruhlar → Tahrirlash)"}`)
              .join(', ')}
          />
        )}

        <Preview
          grid={grid}
          loading={ids.length > 0 && preview.loading}
          error={preview.error}
          title={(split ? '' : title.trim()) || autoTitle}
          zoom={screens.md ? 0.8 : 0.55}
          empty={!ids.length}
        />
        <ErrorAlert error={error} />
      </Flex>
    </Modal>
  );
}

function Preview({ grid, loading, error, title, zoom, empty }) {
  const box = {
    maxHeight: '55vh',
    overflow: 'auto',
    border: '1px solid var(--ant-color-border-secondary, #d9d9d9)',
    borderRadius: 8,
    background: '#ffffff',
  };
  if (empty) return <Text type="secondary">Jadvalni ko'rish uchun guruhlarni tanlang</Text>;
  if (error) return <ErrorAlert error={error} />;
  if (loading || !grid) {
    return (
      <Flex justify="center" style={{ ...box, padding: 48 }}>
        <Spin />
      </Flex>
    );
  }
  return (
    <div style={box}>
      <div style={{ zoom }}>
        <ExportTimetable title={title} grid={grid} />
      </div>
    </div>
  );
}
