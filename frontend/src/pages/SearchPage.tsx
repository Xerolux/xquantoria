import { useState, useEffect } from 'react';
import { Card, List, Tag, Typography, Space, Button, Row, Col, Statistic, Empty } from 'antd';
import { SearchOutlined, FireOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../services/api';
import type { Post } from '../types';

const { Text, Title, Paragraph } = Typography;

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const data = await searchService.getTrending();
      setTrending(data.trending || data || []);
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    }
  };

  const handleSearch = async () => {
    if (query.length < 2) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const data = await searchService.search(query);
      setResults(data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToPost = (postId: number) => {
    navigate(`/posts/${postId}/edit`);
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Title level={2}>Search</Title>
        <Row gutter={16}>
          <Col span={18}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for posts..."
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 16,
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
              }}
            />
          </Col>
          <Col span={6}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
              block
              size="large"
            >
              Search
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Trending Searches */}
      {!hasSearched && (
        <Card
          title={
            <Space>
              <FireOutlined />
              <span>Trending Searches</span>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Space wrap>
            {trending.map((item, index) => {
              const queryText = typeof item === 'string' ? item : (item.query_text || '');
              const count = typeof item === 'string' ? 0 : (item.count || 0);
              return (
                <Tag
                  key={index}
                  style={{
                    fontSize: 14,
                    padding: '8px 16px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setQuery(queryText);
                    handleSearch();
                  }}
                >
                  #{index + 1} {queryText} ({count})
                </Tag>
              );
            })}
          </Space>
        </Card>
      )}

      {/* Search Results */}
      {hasSearched && results && (
        <Row gutter={16}>
          {/* Posts */}
          <Col span={16}>
            <Card
              title={
                <Space>
                  <Text strong>Posts</Text>
                  <Tag color="blue">{results.posts.length}</Tag>
                </Space>
              }
            >
              {results.posts.length > 0 ? (
                <List
                  dataSource={results.posts}
                  renderItem={(post: Post) => (
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigateToPost(post.id)}
                    >
                      <List.Item.Meta
                        title={post.title}
                        description={
                          <Space direction="vertical" size="small">
                            <Paragraph
                              ellipsis={{ rows: 2 }}
                              style={{ marginBottom: 0 }}
                            >
                              {post.excerpt || post.content?.substring(0, 200)}...
                            </Paragraph>
                            <Space>
                              {post.categories?.map((cat) => (
                                <Tag key={cat.id} color="blue">
                                  {cat.name}
                                </Tag>
                              ))}
                              <Tag color={post.status === 'published' ? 'green' : 'default'}>
                                {post.status}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {post.view_count} views
                              </Text>
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="No posts found" />
              )}
            </Card>
          </Col>

          {/* Categories & Tags */}
          <Col span={8}>
            {/* Categories */}
            <Card title="Categories" style={{ marginBottom: 16 }}>
              {results.categories.length > 0 ? (
                <Space wrap>
                  {results.categories.map((cat: any) => (
                    <Tag
                      key={cat.id}
                      color="geekblue"
                      style={{ fontSize: 14, padding: '6px 12px' }}
                    >
                      {cat.name} ({cat.posts_count || 0})
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Empty description="No categories found" />
              )}
            </Card>

            {/* Tags */}
            <Card title="Tags">
              {results.tags.length > 0 ? (
                <Space wrap>
                  {results.tags.map((tag: any) => (
                    <Tag
                      key={tag.id}
                      color="purple"
                      style={{ fontSize: 14, padding: '6px 12px' }}
                    >
                      {tag.name}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Empty description="No tags found" />
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* No Results */}
      {hasSearched && results && results.posts.length === 0 && results.categories.length === 0 && results.tags.length === 0 && (
        <Card>
          <Empty
            description={
              <Space direction="vertical">
                <Text>No results found for &quot;{query}&quot;</Text>
                <Text type="secondary">
                  Try different keywords or check spelling
                </Text>
              </Space>
            }
          />
        </Card>
      )}
    </div>
  );
};

export default SearchPage;
