import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Col, Collapse, Flex, Radio, Result, Row, Statistic, Table, Tag, Typography, Upload, theme } from 'antd';
import { CheckCircleOutlined, DownloadOutlined, FileExcelOutlined, InboxOutlined, UserAddOutlined, WarningOutlined } from '@ant-design/icons';
import { api } from '../../lib/api.js';
import { downloadCredentialsCsv } from '../../lib/credentials.js';
import { ErrorAlert, PageHeader } from '../../components/ui.jsx';

const { Text, Paragraph } = Typography;

const MODES = [
  { value: 'replace', title: 'Almashtirish', desc: "Eski jadval to'liq o'chiriladi va yangisi yoziladi" },
  { value: 'append', title: "Qo'shish", desc: "Mavjud jadvalga yangi darslar qo'shiladi" },
];

export default function ImportPage() {
  const { token } = theme.useToken();
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('replace');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const send = async (dryRun) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mode', mode);
    fd.append('dryRun', String(dryRun));
    setBusy(true);
    setError(null);
    try {
      const data = await api.post('/admin/schedule/import', fd);
      if (dryRun) setPreview(data);
      else {
        setResult(data);
        setPreview(null);
        setFile(null);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <PageHeader
        title="Jadvalni import qilish"
        subtitle="Excel (.xlsx) faylidan dars jadvalini yuklang"
        extra={
          <Button icon={<DownloadOutlined />} onClick={() => api.download('/admin/schedule/template', 'dars-jadvali-shablon.xlsx').catch(setError)}>
            Shablon
          </Button>
        }
      />

      {result ? (
        <ImportResult result={result} onAgain={reset} />
      ) : (
        <Flex vertical gap={16}>
          <Upload.Dragger
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(f) => {
              if (!/\.xlsx$/i.test(f.name)) {
                setError(new Error('Faqat .xlsx formatidagi fayl qabul qilinadi'));
                return Upload.LIST_IGNORE;
              }
              setFile(f);
              setPreview(null);
              setError(null);
              return false; // avtomatik yuklamaymiz — avval tekshiramiz
            }}
            style={{ background: token.colorBgContainer }}
          >
            {file ? (
              <>
                <p className="ant-upload-drag-icon">
                  <FileExcelOutlined style={{ color: token.colorSuccess }} />
                </p>
                <p className="ant-upload-text" style={{ wordBreak: 'break-all' }}>
                  {file.name}
                </p>
                <p className="ant-upload-hint">{(file.size / 1024).toFixed(0)} KB · boshqa fayl tanlash uchun bosing</p>
              </>
            ) : (
              <>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Faylni tanlang yoki shu yerga tashlang</p>
                <p className="ant-upload-hint">Faqat .xlsx, 10 MB gacha</p>
              </>
            )}
          </Upload.Dragger>

          <Card size="small" title="Import rejimi">
            <Radio.Group
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setPreview(null);
              }}
              style={{ width: '100%' }}
            >
              <Row gutter={[8, 8]}>
                {MODES.map((m) => (
                  <Col key={m.value} xs={24} sm={12}>
                    <label
                      style={{
                        display: 'block',
                        height: '100%',
                        padding: 12,
                        cursor: 'pointer',
                        borderRadius: token.borderRadius,
                        border: `1px solid ${mode === m.value ? token.colorPrimary : token.colorBorderSecondary}`,
                        background: mode === m.value ? token.colorPrimaryBg : 'transparent',
                      }}
                    >
                      <Radio value={m.value}>
                        <Text strong>{m.title}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {m.desc}
                        </Text>
                      </Radio>
                    </label>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Card>

          <ErrorAlert error={error} />

          {preview && <PreviewSummary preview={preview} />}

          {!preview ? (
            <Button type="primary" size="large" block disabled={!file} loading={busy} onClick={() => send(true)}>
              Faylni tekshirish
            </Button>
          ) : (
            <Flex gap={8} wrap>
              <Button size="large" onClick={reset} disabled={busy}>
                Bekor qilish
              </Button>
              <Button type="primary" size="large" style={{ flex: 1 }} disabled={!preview.lessonsCount} loading={busy} onClick={() => send(false)}>
                Tasdiqlash va {preview.lessonsCount} ta darsni yuklash
              </Button>
            </Flex>
          )}

          <FormatHelp />
        </Flex>
      )}
    </div>
  );
}

function PreviewSummary({ preview }) {
  const { token } = theme.useToken();
  const sheets = Object.entries(preview.sheets || {});

  const panels = [];
  if (preview.newTeachers.length) {
    panels.push({
      key: 'new',
      label: (
        <>
          <UserAddOutlined /> Yangi o'qituvchilar uchun login/parol yaratiladi ({preview.newTeachers.length})
        </>
      ),
      children: (
        <Flex wrap gap={6}>
          {preview.newTeachers.map((n) => (
            <Tag key={n}>{n}</Tag>
          ))}
        </Flex>
      ),
    });
  }
  if (preview.errorsCount) {
    panels.push({
      key: 'errors',
      label: (
        <Text type="danger">
          <WarningOutlined /> {preview.errorsCount} ta qator o'tkazib yuboriladi
        </Text>
      ),
      children: (
        <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 260, overflowY: 'auto' }}>
          {preview.errors.map((e, i) => (
            <li key={i}>
              <Text strong>{e.where}:</Text> {e.message}
            </li>
          ))}
        </ul>
      ),
    });
  }

  return (
    <Card title="Tekshiruv natijasi">
      <Flex vertical gap={16}>
        <Row gutter={[12, 12]}>
          {[
            ['Darslar', preview.lessonsCount, token.colorSuccess],
            ["Mavjud o'qituvchi", preview.matchedTeachers, token.colorPrimary],
            ["Yangi o'qituvchi", preview.newTeachers.length, token.colorWarning],
          ].map(([title, value, color]) => (
            <Col key={title} xs={8}>
              <Statistic title={title} value={value} styles={{ content: { color } }} />
            </Col>
          ))}
        </Row>

        {sheets.length > 0 && (
          <div>
            <Text type="secondary">Varaqlar (kurslar):</Text>
            <Flex wrap gap={6} style={{ marginTop: 6 }}>
              {sheets.map(([name, count]) => (
                <Tag key={name} color="blue">
                  {name}: {count}
                </Tag>
              ))}
              {preview.skippedSheets?.map((name) => (
                <Tag key={name}>{name}: o'tkazildi</Tag>
              ))}
            </Flex>
          </div>
        )}

        {preview.mode === 'replace' && (
          <Alert type="warning" showIcon title="Tasdiqlansa, hozirgi jadvaldagi barcha darslar o'chirilib, yangi fayldagilar bilan almashtiriladi." />
        )}

        {panels.length > 0 && <Collapse items={panels} defaultActiveKey={preview.errorsCount ? ['errors'] : []} />}
      </Flex>
    </Card>
  );
}

function ImportResult({ result, onAgain }) {
  return (
    <Flex vertical gap={16}>
      <Card>
        <Result
          status="success"
          icon={<CheckCircleOutlined />}
          title="Jadval muvaffaqiyatli yuklandi"
          subTitle={`${result.lessonsCount} ta dars saqlandi${result.errorsCount ? `, ${result.errorsCount} ta qator o'tkazib yuborildi` : ''}.`}
          extra={[
            <Button key="again" onClick={onAgain}>
              Yana fayl yuklash
            </Button>,
            <Link key="view" to="/admin/schedule">
              <Button type="primary">Jadvalni ko'rish</Button>
            </Link>,
          ]}
          style={{ padding: '16px 0' }}
        />
      </Card>

      {result.credentials.length > 0 && (
        <Card
          title="Yangi o'qituvchilar login/parollari"
          extra={
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => downloadCredentialsCsv(result.credentials)}>
              CSV
            </Button>
          }
          styles={{ body: { padding: 0 } }}
        >
          <Alert
            type="info"
            showIcon
            banner
            title="Barcha login/parollarni keyinroq O'qituvchilar → Excel orqali ham yuklab olishingiz mumkin."
          />
          <Table
            rowKey="username"
            size="small"
            pagination={false}
            scroll={{ x: true }}
            dataSource={result.credentials}
            columns={[
              { title: "F.I.Sh.", dataIndex: 'fullName' },
              { title: 'Login', dataIndex: 'username', render: (v) => <Text code copyable>{v}</Text> },
              { title: 'Parol', dataIndex: 'password', render: (v) => <Text code copyable>{v}</Text> },
            ]}
          />
        </Card>
      )}
    </Flex>
  );
}

function FormatHelp() {
  return (
    <Collapse
      items={[
        {
          key: 'format',
          label: 'Excel fayl formati',
          children: (
            <Typography>
              <Paragraph strong style={{ marginBottom: 4 }}>
                1. Fakultet jadvali (to'r ko'rinishi)
              </Paragraph>
              <ul>
                <li>
                  Sarlavha qatori: <Text strong>Kun</Text> | <Text strong>Juftlik</Text> | <Text strong>Vaqti</Text> | guruhlar (Uz-11-26, Ru-1-26 ...).
                </li>
                <li>
                  Katak: <Text code>Fan nomi (A)</Text> / <Text code>kat.o'qit R.Sobirov</Text> / <Text code>Xona: 401</Text>. (M) — ma'ruza, (A) — amaliy,
                  (S) — seminar.
                </li>
                <li>Bir nechta guruh ustida birlashtirilgan katak — bitta dars, barcha guruhlar bilan.</li>
                <li>"MUSTAQIL TA'LIM" va bo'sh kataklar, "Xonalar bandligi" varag'i o'tkazib yuboriladi.</li>
              </ul>
              <Paragraph strong style={{ marginBottom: 4 }}>
                2. Ro'yxat ko'rinishi (shablon)
              </Paragraph>
              <ul>
                <li>
                  Har bir qator — bitta dars: <Text strong>O'qituvchi</Text>, <Text strong>Kun</Text>, <Text strong>Fan</Text>, Juftlik yoki vaqt, Guruh, Xona ...
                </li>
              </ul>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                O'qituvchi jadvaldagi nomi (masalan, <Text code>R.Sobirov</Text>) bo'yicha mavjud hisobga bog'lanadi; yangi nom uchun login/parol avtomatik
                yaratiladi.
              </Paragraph>
            </Typography>
          ),
        },
      ]}
    />
  );
}
