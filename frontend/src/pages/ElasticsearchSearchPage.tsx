import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Input,
  Select,
  Tabs,
  List,
  Tag,
  Space,
  Typography,
  Empty,
  Spin,
  Pagination,
  Avatar,
  Button,
  Tooltip,
  Badge,
  Collapse,
  Image,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  PictureOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  TagOutlined,
  FolderOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useDebounce } from '../hooks/useDebounce';
import axios from 'axios';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface SearchResult {
  id: string;
  score: number;
  source: Record<string, unknown>;
  highlight?: Record<string, string[]>;
}

interface SearchResults {
  total: number;
  results: SearchResult[];
}

interface SearchState {
  query: string;
  index: string;
  size: number;
  from: number;
  loading: boolean;
  results: SearchResults | null;
  allResults: Record<string, SearchResults>;
}

const ElasticsearchSearchPage: React.FC = () => {
  const [state, setState] = useState<SearchState>({
    query: '',
    index: 'all',
    size: 20,
    from: 0,
    loading: false,
    results: null,
    allResults: {},
  });

  const debouncedQuery = useDebounce(state.query, 300);

  const search = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setState((prev) => ({ ...prev, results: null, allResults: {} }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const { data } = await axios.get(`${API_BASE_URL}/elasticsearch/search`, {
        params: {
          q: debouncedQuery,
          index: state.index,
          size: state.size,
          from: state.from,
          highlight: true,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (state.index === 'all') {
        setState((prev) => ({
          ...prev,
          loading: false,
          allResults: data.data,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          results: data.data,
        }));
      }
    } catch (error) {
      console.error('Search failed:', error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [debouncedQuery, state.index, state.size, state.from]);

  useEffect(() => {
    search();
  }, [search]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({ ...prev, query: e.target.value, from: 0 }));
  };

  const handleIndexChange = (index: string) => {
    setState((prev) => ({ ...prev, index, from: 0 }));
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setState((prev) => ({
      ...prev,
      from: (page - 1) * pageSize,
      size: pageSize,
    }));
  };

  const renderHighlightedText = (text: string, highlights?: string[]) => {
    if (highlights && highlights.length > 0) {
      return (
        <span
          dangerouslySetInnerHTML={{
            __html: highlights[0].replace(/<mark>/g, '<mark style="background: #ffc069; padding: 0 2px; border-radius: 2px;">'),
          }}
        />
      );
    }
    return text;
  };

  const getResultIcon = (index: string) => {
    const icons: Record<string, React.ReactNode> = {
      posts: <FileTextOutlined />,
      products: <ShoppingCartOutlined />,
      media: <PictureOutlined />,
      users: <UserOutlined />,
    };
    return icons[index] || <FileTextOutlined />;
  };

  const getResultColor = (index: string) => {
    const colors: Record<string, string> = {
      posts: '#1890ff',
      products: '#52c41a',
      media: '#722ed1',
      users: '#fa8c16',
    };
    return colors[index] || '#1890ff';
  };

  const renderPostResult = (result: SearchResult, indexName: string) => {
    const { source, highlight } = result;
    const title = (source.title as string) || 'Untitled';
    const excerpt = (source.excerpt as string) || '';
    const categories = (source.categories as string[]) || [];
    const tags = (source.tags as string[]) || [];
    const publishedAt = source.published_at as string;

    return (
      <List.Item
        key={result.id}
        actions={[
          <Tooltip key="view" title="View Post">
            <Button type="link" icon={<EyeOutlined />} href={`/admin/posts/${result.id}/edit`} />
          </Tooltip>,
        ]}
      >
        <List.Item.Meta
          avatar={
            <Avatar style={{ backgroundColor: getResultColor(indexName) }} icon={getResultIcon(indexName)} />
          }
          title={
            <Space>
              <a href={`/admin/posts/${result.id}/edit`}>
                {renderHighlightedText(title, highlight?.title)}
              </a>
              <Tag color="blue">Post</Tag>
              {source.featured && <Tag color="gold">Featured</Tag>}
            </Space>
          }
          description={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                {renderHighlightedText(excerpt, highlight?.excerpt || highlight?.content)}
              </Paragraph>
              <Space size={4} wrap>
                {categories.map((cat) => (
                  <Tag key={cat} icon={<FolderOutlined />} color="blue">
                    {cat}
                  </Tag>
                ))}
                {tags.slice(0, 3).map((tag) => (
                  <Tag key={tag} icon={<TagOutlined />}>
                    {tag}
                  </Tag>
                ))}
                {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
              </Space>
              {publishedAt && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ClockCircleOutlined /> {dayjs(publishedAt).format('DD.MM.YYYY')}
                </Text>
              )}
            </Space>
          }
        />
      </List.Item>
    );
  };

  const renderProductResult = (result: SearchResult, indexName: string) => {
    const { source, highlight } = result;
    const name = (source.name as string) || 'Unknown Product';
    const description = (source.description as string) || '';
    const price = source.price as number;
    const salePrice = source.sale_price as number | null;
    const categoryName = source.category_name as string;
    const inStock = source.in_stock as boolean;

    return (
      <List.Item
        key={result.id}
        actions={[
          <Tooltip key="view" title="View Product">
            <Button type="link" icon={<EyeOutlined />} href={`/admin/shop?product=${result.id}`} />
          </Tooltip>,
        ]}
      >
        <List.Item.Meta
          avatar={
            <Avatar style={{ backgroundColor: getResultColor(indexName) }} icon={getResultIcon(indexName)} />
          }
          title={
            <Space>
              <a href={`/admin/shop?product=${result.id}`}>
                {renderHighlightedText(name, highlight?.name)}
              </a>
              <Tag color="green">Product</Tag>
              {!inStock && <Tag color="red">Out of Stock</Tag>}
            </Space>
          }
          description={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                {renderHighlightedText(description, highlight?.description)}
              </Paragraph>
              <Space>
                {salePrice ? (
                  <>
                    <Text delete type="secondary">
                      €{price?.toFixed(2)}
                    </Text>
                    <Text strong style={{ color: '#52c41a' }}>
                      €{salePrice?.toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <Text strong>€{price?.toFixed(2)}</Text>
                )}
                {categoryName && <Tag color="blue">{categoryName}</Tag>}
              </Space>
            </Space>
          }
        />
      </List.Item>
    );
  };

  const renderMediaResult = (result: SearchResult, indexName: string) => {
    const { source } = result;
    const filename = (source.filename as string) || 'Unknown';
    const altText = (source.alt_text as string) || '';
    const mimeType = (source.mime_type as string) || '';
    const type = (source.type as string) || 'file';

    return (
      <List.Item
        key={result.id}
        actions={[
          <Tooltip key="view" title="View Media">
            <Button type="link" icon={<EyeOutlined />} href={`/admin/media?highlight=${result.id}`} />
          </Tooltip>,
        ]}
      >
        <List.Item.Meta
          avatar={
            <Avatar
              shape="square"
              size={48}
              style={{ backgroundColor: getResultColor(indexName) }}
              icon={getResultIcon(indexName)}
            />
          }
          title={
            <Space>
              <a href={`/admin/media?highlight=${result.id}`}>{filename}</a>
              <Tag color="purple">{type}</Tag>
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              {altText && <Text type="secondary">{altText}</Text>}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {mimeType}
              </Text>
            </Space>
          }
        />
      </List.Item>
    );
  };

  const renderUserResult = (result: SearchResult, indexName: string) => {
    const { source, highlight } = result;
    const name = (source.name as string) || 'Unknown';
    const email = (source.email as string) || '';
    const role = (source.role as string) || 'subscriber';
    const bio = (source.bio as string) || '';

    return (
      <List.Item
        key={result.id}
        actions={[
          <Tooltip key="view" title="View User">
            <Button type="link" icon={<EyeOutlined />} href={`/admin/users?highlight=${result.id}`} />
          </Tooltip>,
        ]}
      >
        <List.Item.Meta
          avatar={<Avatar icon={<UserOutlined />} />}
          title={
            <Space>
              <a href={`/admin/users?highlight=${result.id}`}>
                {renderHighlightedText(name, highlight?.name)}
              </a>
              <Tag color="orange">{role}</Tag>
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              <Text>{email}</Text>
              {bio && (
                <Paragraph ellipsis={{ rows: 1 }} style={{ marginBottom: 0, fontSize: 12 }}>
                  {renderHighlightedText(bio, highlight?.bio)}
                </Paragraph>
              )}
            </Space>
          }
        />
      </List.Item>
    );
  };

  const renderResult = (result: SearchResult, indexName: string) => {
    switch (indexName) {
      case 'posts':
        return renderPostResult(result, indexName);
      case 'products':
        return renderProductResult(result, indexName);
      case 'media':
        return renderMediaResult(result, indexName);
      case 'users':
        return renderUserResult(result, indexName);
      default:
        return null;
    }
  };

  const renderAllResults = () => {
    const indices = Object.keys(state.allResults);
    if (indices.length === 0) return null;

    return (
      <Collapse defaultActiveKey={indices}>
        {indices.map((indexName) => {
          const results = state.allResults[indexName];
          if (!results || results.results.length === 0) return null;

          return (
            <Panel
              header={
                <Space>
                  <Badge count={results.total} showZero style={{ backgroundColor: getResultColor(indexName) }} />
                  <span style={{ textTransform: 'capitalize' }}>{indexName}</span>
                </Space>
              }
              key={indexName}
            >
              <List
                itemLayout="vertical"
                dataSource={results.results}
                renderItem={(result) => renderResult(result, indexName)}
              />
            </Panel>
          );
        })}
      </Collapse>
    );
  };

  const renderSingleIndexResults = () => {
    if (!state.results) return null;

    return (
      <>
        <List
          itemLayout="vertical"
          dataSource={state.results.results}
          renderItem={(result) => renderResult(result, state.index)}
        />
        {state.results.total > state.size && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Pagination
              current={Math.floor(state.from / state.size) + 1}
              pageSize={state.size}
              total={state.results.total}
              onChange={handlePageChange}
              showSizeChanger
              showTotal={(total) => `${total} Ergebnisse`}
            />
          </div>
        )}
      </>
    );
  };

  const totalResults = state.index === 'all'
    ? Object.values(state.allResults).reduce((sum, r) => sum + r.total, 0)
    : state.results?.total || 0;

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <SearchOutlined /> Elasticsearch Suche
      </Title>
      <Paragraph type="secondary">
        Durchsuche alle Inhalte mit Elasticsearch Full-Text Search.
      </Paragraph>

      <Card style={{ marginBottom: 24 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Select
            value={state.index}
            onChange={handleIndexChange}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: 'Alle Indizes' },
              { value: 'posts', label: 'Posts' },
              { value: 'products', label: 'Produkte' },
              { value: 'media', label: 'Medien' },
              { value: 'users', label: 'Benutzer' },
            ]}
          />
          <Input
            placeholder="Suchbegriff eingeben..."
            prefix={<SearchOutlined />}
            value={state.query}
            onChange={handleQueryChange}
            size="large"
            allowClear
            suffix={
              state.loading ? (
                <Spin size="small" />
              ) : totalResults > 0 ? (
                <Badge count={totalResults} style={{ backgroundColor: '#52c41a' }} />
              ) : null
            }
          />
          <Button size="large" icon={<ReloadOutlined />} onClick={search} loading={state.loading}>
            Suche
          </Button>
        </Space.Compact>

        {debouncedQuery && debouncedQuery.length < 2 && (
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            Mindestens 2 Zeichen eingeben...
          </Text>
        )}
      </Card>

      {state.loading ? (
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
            Suche nach "{debouncedQuery}"...
          </Text>
        </div>
      ) : totalResults === 0 && debouncedQuery && debouncedQuery.length >= 2 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical">
              <Text>Keine Ergebnisse für "{debouncedQuery}"</Text>
              <Text type="secondary">Versuche einen anderen Suchbegriff</Text>
            </Space>
          }
        />
      ) : (
        <>
          {state.index === 'all' ? renderAllResults() : renderSingleIndexResults()}
        </>
      )}
    </div>
  );
};

export default ElasticsearchSearchPage;
