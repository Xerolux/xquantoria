import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Statistic,
  Row,
  Col,
  Typography,
  message,
  Popconfirm,
  Drawer,
  List,
  Empty,
  Timeline,
  Select,
  Divider,
  Descriptions,
  Avatar,
  Tooltip,
  Badge,
  Alert,
  Tabs,
  Spin,
  Switch,
} from 'antd';
import {
  HistoryOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DiffOutlined,
  RollbackOutlined,
  DeleteOutlined,
  EyeOutlined,
  SaveOutlined,
  FileTextOutlined,
  CodeOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { postService, postRevisionService } from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/de';

dayjs.extend(relativeTime);
dayjs.locale('de');

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Post {
  id: number;
  title: string;
  slug: string;
  status: string;
  author: { id: number; name: string };
  updated_at: string;
}

interface Revision {
  id: number;
  post_id: number;
  user_id: number;
  user?: { id: number; name: string; email: string };
  title: string;
  content: Record<string, unknown>;
  revision_reason: string;
  is_auto_save: boolean;
  edited_at: string;
  created_at: string;
  preview?: string;
}

interface RevisionStats {
  total: number;
  manual: number;
  auto_saves: number;
  oldest: string | null;
  newest: string | null;
  storage_size: string;
}

interface ComparisonResult {
  from_revision: Revision;
  to_revision: Revision;
  diff: {
    title: { old: string; new: string; changed: boolean };
    content: { old: string; new: string; changed: boolean };
    excerpt: { old: string; new: string; changed: boolean };
    meta_title: { old: string; new: string; changed: boolean };
    meta_description: { old: string; new: string; changed: boolean };
  };
}

const PostRevisionsPage: React.FC = () => {
  const [postsLoading, setPostsLoading] = useState(false);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [stats, setStats] = useState<RevisionStats | null>(null);
  const [includeAutoSaves, setIncludeAutoSaves] = useState(false);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [compareFrom, setCompareFrom] = useState<number | null>(null);
  const [compareTo, setCompareTo] = useState<number | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (selectedPost) {
      fetchRevisions();
    }
  }, [selectedPost, includeAutoSaves]);

  const fetchPosts = async () => {
    setPostsLoading(true);
    try {
      const response = await postService.getAll({ per_page: 100 });
      setPosts(response.data || []);
    } catch (error) {
      message.error('Beiträge konnten nicht geladen werden');
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchRevisions = async () => {
    if (!selectedPost) return;

    setRevisionsLoading(true);
    try {
      const [revisionsRes, statsRes] = await Promise.all([
        postRevisionService.getAll(selectedPost.id, { include_auto_saves: includeAutoSaves }),
        postRevisionService.getStats(selectedPost.id),
      ]);
      setRevisions(revisionsRes.revisions || []);
      setStats(statsRes);
    } catch (error) {
      message.error('Versionen konnten nicht geladen werden');
    } finally {
      setRevisionsLoading(false);
    }
  };

  const handleViewRevision = (revision: Revision) => {
    setSelectedRevision(revision);
    setDetailsDrawerVisible(true);
  };

  const handleRestoreRevision = async (revisionId: number) => {
    if (!selectedPost) return;

    try {
      await postRevisionService.restore(selectedPost.id, revisionId);
      message.success('Beitrag aus Version wiederhergestellt');
      fetchRevisions();
    } catch (error) {
      message.error('Wiederherstellung fehlgeschlagen');
    }
  };

  const handleDeleteRevision = async (revisionId: number) => {
    if (!selectedPost) return;

    try {
      await postRevisionService.delete(selectedPost.id, revisionId);
      message.success('Version gelöscht');
      fetchRevisions();
    } catch (error) {
      message.error('Löschen fehlgeschlagen');
    }
  };

  const handleCreateSnapshot = async () => {
    if (!selectedPost) return;

    try {
      await postRevisionService.create(selectedPost.id, { reason: 'Manuelles Snapshot' });
      message.success('Snapshot erstellt');
      fetchRevisions();
    } catch (error) {
      message.error('Snapshot konnte nicht erstellt werden');
    }
  };

  const handleCompare = async () => {
    if (!selectedPost || !compareFrom || !compareTo) {
      message.warning('Bitte wählen Sie zwei Versionen zum Vergleichen');
      return;
    }

    setCompareLoading(true);
    try {
      const result = await postRevisionService.compare(selectedPost.id, compareFrom, compareTo);
      setComparisonResult(result);
    } catch (error) {
      message.error('Vergleich fehlgeschlagen');
    } finally {
      setCompareLoading(false);
    }
  };

  const openCompareModal = () => {
    setCompareFrom(null);
    setCompareTo(null);
    setComparisonResult(null);
    setCompareModalVisible(true);
  };

  const renderDiffContent = (oldContent: string, newContent: string, changed: boolean, label: string) => {
    if (!changed) return null;

    return (
      <Card size="small" title={label} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text type="secondary">Alt:</Text>
            <Paragraph
              style={{
                backgroundColor: '#fff1f0',
                padding: 8,
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {oldContent || <Text type="secondary">Leer</Text>}
            </Paragraph>
          </Col>
          <Col span={12}>
            <Text type="secondary">Neu:</Text>
            <Paragraph
              style={{
                backgroundColor: '#f6ffed',
                padding: 8,
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {newContent || <Text type="secondary">Leer</Text>}
            </Paragraph>
          </Col>
        </Row>
      </Card>
    );
  };

  const columns = [
    {
      title: 'Zeitstempel',
      dataIndex: 'edited_at',
      key: 'edited_at',
      width: 180,
      render: (date: string, record: Revision) => (
        <Space>
          {record.is_auto_save ? (
            <Tooltip title="Auto-Save">
              <SaveOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          ) : (
            <Tooltip title="Manuell">
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
          <Tooltip title={dayjs(date).format('DD.MM.YYYY HH:mm:ss')}>
            <Text>{dayjs(date).fromNow()}</Text>
          </Tooltip>
        </Space>
      ),
      sorter: (a: Revision, b: Revision) => new Date(a.edited_at).getTime() - new Date(b.edited_at).getTime(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Benutzer',
      key: 'user',
      render: (_: unknown, record: Revision) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{record.user?.name || 'System'}</Text>
        </Space>
      ),
    },
    {
      title: 'Titel',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string) => <Text ellipsis={{ tooltip: title }}>{title}</Text>,
    },
    {
      title: 'Grund',
      dataIndex: 'revision_reason',
      key: 'revision_reason',
      ellipsis: true,
      render: (reason: string) => <Tag>{reason || 'Kein Grund'}</Tag>,
    },
    {
      title: 'Aktionen',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Revision, index: number) => (
        <Space>
          <Tooltip title="Anzeigen">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewRevision(record)}
            />
          </Tooltip>
          {index !== 0 && (
            <>
              <Popconfirm
                title="Wiederherstellen?"
                description="Möchten Sie den Beitrag auf diese Version zurücksetzen?"
                onConfirm={() => handleRestoreRevision(record.id)}
                okText="Ja"
                cancelText="Nein"
              >
                <Tooltip title="Wiederherstellen">
                  <Button type="text" icon={<RollbackOutlined />} />
                </Tooltip>
              </Popconfirm>
              <Popconfirm
                title="Löschen?"
                onConfirm={() => handleDeleteRevision(record.id)}
                okText="Ja"
                cancelText="Nein"
              >
                <Tooltip title="Löschen">
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <HistoryOutlined /> Versionsverlauf
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Space size="large" align="center">
              <Text strong>Beitrag auswählen:</Text>
              <Select
                style={{ width: 400 }}
                placeholder="Beitrag wählen..."
                loading={postsLoading}
                value={selectedPost?.id}
                onChange={(value) => {
                  const post = posts.find((p) => p.id === value);
                  setSelectedPost(post || null);
                }}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {posts.map((post) => (
                  <Option key={post.id} value={post.id}>
                    <Space>
                      <FileTextOutlined />
                      {post.title}
                      <Tag color={post.status === 'published' ? 'green' : 'default'}>{post.status}</Tag>
                    </Space>
                  </Option>
                ))}
              </Select>
              {selectedPost && (
                <>
                  <Switch
                    checked={includeAutoSaves}
                    onChange={setIncludeAutoSaves}
                    checkedChildren="Mit Auto-Saves"
                    unCheckedChildren="Ohne Auto-Saves"
                  />
                  <Button icon={<SaveOutlined />} onClick={handleCreateSnapshot}>
                    Snapshot erstellen
                  </Button>
                  <Button icon={<DiffOutlined />} onClick={openCompareModal}>
                    Vergleichen
                  </Button>
                </>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {selectedPost && stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Gesamt"
                value={stats.total}
                prefix={<HistoryOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Manuelle Versionen"
                value={stats.manual}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Auto-Saves"
                value={stats.auto_saves}
                prefix={<SaveOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Speicher"
                value={stats.storage_size || 'N/A'}
                prefix={<CodeOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {selectedPost && (
        <Card>
          <Table
            columns={columns}
            dataSource={revisions}
            rowKey="id"
            loading={revisionsLoading}
            locale={{ emptyText: 'Keine Versionen vorhanden' }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `${total} Versionen`,
            }}
          />
        </Card>
      )}

      {!selectedPost && (
        <Card>
          <Empty
            description="Wählen Sie einen Beitrag aus, um dessen Versionsverlauf anzuzeigen"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}

      <Drawer
        title="Versionsdetails"
        placement="right"
        width={720}
        onClose={() => setDetailsDrawerVisible(false)}
        open={detailsDrawerVisible}
      >
        {selectedRevision && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{selectedRevision.id}</Descriptions.Item>
              <Descriptions.Item label="Zeitstempel">
                {dayjs(selectedRevision.edited_at).format('DD.MM.YYYY HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="Benutzer">
                {selectedRevision.user?.name || 'System'}
              </Descriptions.Item>
              <Descriptions.Item label="Typ">
                <Tag color={selectedRevision.is_auto_save ? 'warning' : 'success'}>
                  {selectedRevision.is_auto_save ? 'Auto-Save' : 'Manuell'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Grund">{selectedRevision.revision_reason || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider>Titel</Divider>
            <Paragraph>{selectedRevision.content?.title || selectedRevision.title}</Paragraph>

            <Divider>Auszug</Divider>
            <Paragraph ellipsis={{ rows: 4, expandable: true }}>
              {selectedRevision.content?.excerpt || 'Kein Auszug'}
            </Paragraph>

            <Divider>Inhalt</Divider>
            <Paragraph
              ellipsis={{ rows: 8, expandable: true }}
              style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4 }}
            >
              <div dangerouslySetInnerHTML={{ __html: selectedRevision.content?.content || '' }} />
            </Paragraph>

            <Divider>SEO</Divider>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Meta-Titel">
                {selectedRevision.content?.meta_title || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Meta-Beschreibung">
                {selectedRevision.content?.meta_description || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Rohdaten</Divider>
            <Paragraph
              style={{
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                padding: 12,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 12,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <pre style={{ margin: 0 }}>{JSON.stringify(selectedRevision.content, null, 2)}</pre>
            </Paragraph>

            <Space style={{ marginTop: 16 }}>
              <Popconfirm
                title="Wiederherstellen?"
                onConfirm={() => {
                  handleRestoreRevision(selectedRevision.id);
                  setDetailsDrawerVisible(false);
                }}
              >
                <Button type="primary" icon={<RollbackOutlined />}>
                  Wiederherstellen
                </Button>
              </Popconfirm>
            </Space>
          </>
        )}
      </Drawer>

      <Modal
        title="Versionen vergleichen"
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setCompareModalVisible(false)}>
            Schließen
          </Button>,
          <Button key="compare" type="primary" onClick={handleCompare} loading={compareLoading}>
            Vergleichen
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>Von Version:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="Version wählen..."
                value={compareFrom}
                onChange={setCompareFrom}
              >
                {revisions.map((rev) => (
                  <Option key={rev.id} value={rev.id}>
                    #{rev.id} - {dayjs(rev.edited_at).format('DD.MM.YY HH:mm')}
                    {rev.is_auto_save && ' (Auto)'}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={12}>
              <Text strong>Bis Version:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="Version wählen..."
                value={compareTo}
                onChange={setCompareTo}
              >
                {revisions.map((rev) => (
                  <Option key={rev.id} value={rev.id}>
                    #{rev.id} - {dayjs(rev.edited_at).format('DD.MM.YY HH:mm')}
                    {rev.is_auto_save && ' (Auto)'}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>

          {comparisonResult && (
            <>
              <Divider>Unterschiede</Divider>
              {!comparisonResult.diff.title.changed &&
                !comparisonResult.diff.content.changed &&
                !comparisonResult.diff.excerpt.changed &&
                !comparisonResult.diff.meta_title.changed &&
                !comparisonResult.diff.meta_description.changed && (
                  <Alert
                    message="Keine Unterschiede gefunden"
                    description="Die beiden Versionen sind identisch."
                    type="info"
                    showIcon
                  />
                )}

              {renderDiffContent(
                comparisonResult.diff.title.old,
                comparisonResult.diff.title.new,
                comparisonResult.diff.title.changed,
                'Titel'
              )}
              {renderDiffContent(
                comparisonResult.diff.excerpt.old,
                comparisonResult.diff.excerpt.new,
                comparisonResult.diff.excerpt.changed,
                'Auszug'
              )}
              {renderDiffContent(
                comparisonResult.diff.meta_title.old,
                comparisonResult.diff.meta_title.new,
                comparisonResult.diff.meta_title.changed,
                'Meta-Titel'
              )}
              {renderDiffContent(
                comparisonResult.diff.meta_description.old,
                comparisonResult.diff.meta_description.new,
                comparisonResult.diff.meta_description.changed,
                'Meta-Beschreibung'
              )}
              {comparisonResult.diff.content.changed && (
                <Card size="small" title="Inhalt">
                  <Alert
                    message="Inhalt hat sich geändert"
                    description="Der Hauptinhalt wurde zwischen diesen Versionen geändert. Öffnen Sie die Versionen einzeln, um die vollständigen Inhalte zu vergleichen."
                    type="info"
                  />
                </Card>
              )}
            </>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default PostRevisionsPage;
