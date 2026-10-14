import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Flex, Grid, Input, Modal, Segmented, Select, Spin, Tag, Typography, Upload } from 'antd';
import { DownloadOutlined, InboxOutlined, SendOutlined } from '@ant-design/icons';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { FILE_ICONS, SCHEDULE_FILE_ACCEPT, SCHEDULE_FILE_MAX_MB, fileKind, formatSize } from '../../lib/files.jsx';
import { EXPORT_FORMATS, generateTimetableFile, saveFile } from '../../lib/exportTimetable.jsx';
import ExportTimetable from '../../components/ExportTimetable.jsx';
import { ErrorAlert } from '../../components/ui.jsx';

const { Text } = Typography;

const MODES = [
  { value: 'generate', label: 'Jadvaldan yaratish' },
  { value: 'upload', label: 'Fayl yuklash' },
];

/**
 * Guruh(lar)ga dars jadvalini yuborish: import qilingan umumiy jadvaldan
 * Excel ko'rinishida PDF / Excel / rasm yaratib, yoki tayyor faylni yuklab.
 */
export default function SendModal({ groupIds, groups, onClose, onSent }) {
  const screens = Grid.useBreakpoint();
  const [mode, setMode] = useState('generate');
  const [selected, setSelected] = useState([]);
  const [format, setFormat] = useState('pdf');
  const [title, setTitle] = useState('');
  const [separate, setSeparate] = useState(false);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // null | 'download' | 'send'

  useEffect(() => {
    if (!groupIds) return;
    setSelected(groupIds);
    setTitle('');
    setFile(null);
    setNote('');
    setError(null);
  }, [groupIds]);

  // Ustunlar tartibi — ro'yxatdagidek (kurs, keyin nom bo'yicha)
  const ordered = groups.filter((g) => selected.includes(g.id));
  const ids = ordered.map((g) => g.id);
  const generating = mode === 'generate' && ids.length > 0;
  const preview = useApi(generating ? `/groups/timetable?groupIds=${ids.join(',')}` : null);
  const grid = generating ? preview.data : null;

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
    if (!separate || ordered.length === 1) {
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

  const validate = () => {
    if (!ids.length) return 'Kamida bitta guruhni tanlang';
    if (mode === 'upload') return file ? null : 'Faylni tanlang';
    if (!grid) return 'Jadval hali yuklanmadi';
    if (grid.missing.length === grid.columns.length) return 'Tanlangan guruhlar uchun umumiy jadvalda dars topilmadi';
    return null;
  };

  const act = async (kind) => {
    const problem = validate();
    if (problem) return setError(new Error(problem));
    setBusy(kind);
    setError(null);
    try {
      const items = mode === 'upload' ? [{ groupIds: ids, file }] : await buildFiles();
      if (kind === 'download') {
        items.forEach((i) => saveFile(i.file));
      } else {
        for (const item of items) {
          const fd = new FormData();
          fd.append('file', item.file);
          fd.append('groupIds', item.groupIds.join(','));
          fd.append('note', note);
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
      title="Dars jadvalini yuborish"
      onCancel={onClose}
      width={mode === 'generate' ? 1100 : 560}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          Bekor qilish
        </Button>,
        mode === 'generate' && (
          <Button key="dl" icon={<DownloadOutlined />} loading={busy === 'download'} disabled={Boolean(busy)} onClick={() => act('download')}>
            Yuklab olish
          </Button>
        ),
        <Button key="send" type="primary" icon={<SendOutlined />} loading={busy === 'send'} disabled={Boolean(busy)} onClick={() => act('send')}>
          Yuborish
        </Button>,
      ].filter(Boolean)}
    >
      <Flex vertical gap={16} style={{ marginTop: 16 }}>
        <Segmented block options={MODES} value={mode} onChange={setMode} />

        <div>
          <Text strong>Kurs va guruhlar</Text>
          <Flex wrap gap={6} style={{ margin: '8px 0' }}>
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

        {mode === 'generate' ? (
          <>
            <Flex wrap gap={12} align="center">
              <Segmented options={EXPORT_FORMATS} value={format} onChange={setFormat} />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={separate && ordered.length > 1 ? "Sarlavha (bo'sh bo'lsa — guruh nomi)" : autoTitle}
                maxLength={200}
                style={{ flex: '1 1 260px' }}
                prefix={<Text type="secondary">Sarlavha:</Text>}
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
                title="Ba'zi guruhlar uchun umumiy jadvalda dars topilmadi"
                description={grid.missing
                  .map((m) => `${m.name}${m.linked ? '' : " (jadvaldagi nomi ko'rsatilmagan — Guruhlar → Tahrirlash)"}`)
                  .join(', ')}
              />
            )}

            <Preview grid={grid} loading={generating && preview.loading} error={preview.error} title={(separate && ordered.length > 1 ? '' : title.trim()) || autoTitle} zoom={screens.md ? 0.8 : 0.55} empty={!ids.length} />
          </>
        ) : (
          <FilePicker file={file} onFile={setFile} onError={setError} />
        )}

        <Input.TextArea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Izoh (ixtiyoriy): masalan, 2-semestr, 20-oktabrdan"
          maxLength={300}
          autoSize={{ minRows: 1, maxRows: 3 }}
        />
        <ErrorAlert error={error} />
      </Flex>
    </Modal>
  );
}

function Preview({ grid, loading, error, title, zoom, empty }) {
  const box = {
    maxHeight: '50vh',
    overflow: 'auto',
    border: '1px solid var(--ant-color-border-secondary, #d9d9d9)',
    borderRadius: 8,
    background: '#ffffff',
  };
  if (empty) return <Text type="secondary">Ko'rish uchun guruhlarni tanlang</Text>;
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

function FilePicker({ file, onFile, onError }) {
  return (
    <Upload.Dragger
      accept={SCHEDULE_FILE_ACCEPT}
      maxCount={1}
      showUploadList={false}
      beforeUpload={(f) => {
        if (f.size > SCHEDULE_FILE_MAX_MB * 1024 * 1024) {
          onError(new Error(`Fayl hajmi ${SCHEDULE_FILE_MAX_MB} MB dan oshmasligi kerak`));
        } else {
          onFile(f);
          onError(null);
        }
        return false;
      }}
    >
      {file ? (
        <Flex vertical align="center" gap={4} style={{ padding: '0 12px' }}>
          <span style={{ fontSize: 32 }}>{FILE_ICONS[fileKind(file.type || '')]}</span>
          <Text strong>{file.name}</Text>
          <Text type="secondary">{formatSize(file.size)} · boshqasini tanlash uchun bosing</Text>
        </Flex>
      ) : (
        <>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Faylni shu yerga tashlang yoki tanlang</p>
          <p className="ant-upload-hint">Rasm (PNG, JPG), PDF yoki Excel · {SCHEDULE_FILE_MAX_MB} MB gacha</p>
        </>
      )}
    </Upload.Dragger>
  );
}
