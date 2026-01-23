import { useState, useEffect } from 'react';
import {
  Card,
  List,
  Tag,
  Typography,
  Space,
  Button,
  Row,
  Col,
  Empty,
  Input,
  Select,
  DatePicker,
  Checkbox,
  Modal,
  AutoComplete,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  FireOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { searchService, categoryService, tagService, userService } from '../services/api';
import type { Post, Category, Tag as TagType } from '../types';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    posts: Post[];
    categories: Category[];
    tags: TagType[];
  } | null>(null);
  const [trending, setTrending] = useState<Array<{ query_text?: string; count?: number } | string>>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [advancedModalVisible, setAdvancedModalVisible] = useState(false);

  // Filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [authors, setAuthors] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<number[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'views'>('relevance');

  const navigate = useNavigate();

  useEffect(() => {
    fetchTrending();
    fetchCategories();
    fetchTags();
    fetchAuthors();
  }, []);

  const fetchTrending = async () => {
    try {
      const data = await searchService.getTrending();
      setTrending(data.trending || data || []);
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await tagService.getAll();
      setTags(data.data || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const fetchAuthors = async () => {
    try {
      const data = await userService.getAll();
      setAuthors(data.data || []);
    } catch (error) {
      console.error('Failed to fetch authors:', error);
    }
  };

  const fetchSuggestions = async (searchText: string) => {
    if (searchText.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const data = await searchService.getSuggestions(searchText);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleSearch = async (advanced = false) => {
    if (!advanced && query.length < 2) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const params: Record<string, unknown> = {};
      if (advanced || selectedCategories.length > 0 || selectedTags.length > 0 ||
          selectedAuthors.length > 0 || selectedStatus.length > 0 || dateRange) {
        // Advanced search
        params.categories = selectedCategories;
        params.tags = selectedTags;
        params.authors = selectedAuthors;
        params.status = selectedStatus;
        params.sort_by = sortBy;
        if (dateRange) {
          params.date_from = dateRange[0].format('YYYY-MM-DD');
          params.date_to = dateRange[1].format('YYYY-MM-DD');
        }
      }

      const data = await searchService.advancedSearch({ q: query, ...params });
      setResults(data);
      setAdvancedModalVisible(false);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToPost = (postId: number) => {
    navigate(`/posts/${postId}/edit`);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedTags([]);
    setSelectedAuthors([]);
    setSelectedStatus([]);
    setDateRange(null);
    setSortBy('relevance');
  };

  const getActiveFilterCount = () => {
    return selectedCategories.length + selectedTags.length + selectedAuthors.length +
           selectedStatus.length + (dateRange ? 1 : 0);
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Title level={2}>Advanced Search</Title>
        <Row gutter={16}>
          <Col span={14}>
            <AutoComplete
              style={{ width: '100%' }}
              options={suggestions.map((s) => ({ value: s }))}
              onSearch={fetchSuggestions}
              onSelect={(value) => {
                setQuery(value);
                handleSearch();
              }}
              value={query}
              onChange={(value) => setQuery(value)}
            >
              <Input
                size="large"
                placeholder="Search for posts..."
                onPressEnter={() => handleSearch()}
                suffix={<SearchOutlined style={{ color: '#ccc' }} />}
              />
            </AutoComplete>
          </Col>
          <Col span={5}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => handleSearch()}
              loading={loading}
              block
              size="large"
            >
              Search
            </Button>
          </Col>
          <Col span={5}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setAdvancedModalVisible(true)}
              block
              size="large"
            >
              Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
            </Button>
          </Col>
        </Row>

        {/* Active Filters */}
        {getActiveFilterCount() > 0 && (
          <div style={{ marginTop: 16 }}>
            <Space wrap>
              <Text strong>Active Filters:</Text>
              {selectedCategories.map((catId) => {
                const cat = categories.find((c) => c.id === catId);
                return (
                  <Tag
                    key={catId}
                    closable
                    onClose={() => setSelectedCategories(selectedCategories.filter((id) => id !== catId))}
                    color="blue"
                  >
                    Category: {cat?.name}
                  </Tag>
                );
              })}
              {selectedTags.map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                return (
                  <Tag
                    key={tagId}
                    closable
                    onClose={() => setSelectedTags(selectedTags.filter((id) => id !== tagId))}
                    color="purple"
                  >
                    Tag: {tag?.name}
                  </Tag>
                );
              })}
              {selectedAuthors.map((authorId) => {
                const author = authors.find((a) => a.id === authorId);
                return (
                  <Tag
                    key={authorId}
                    closable
                    onClose={() => setSelectedAuthors(selectedAuthors.filter((id) => id !== authorId))}
                    color="green"
                  >
                    Author: {author?.name}
                  </Tag>
                );
              })}
              {selectedStatus.map((status) => (
                <Tag
                  key={status}
                  closable
                  onClose={() => setSelectedStatus(selectedStatus.filter((s) => s !== status))}
                  color="orange"
                >
                  Status: {status}
                </Tag>
              ))}
              {dateRange && (
                <Tag
                  closable
                  onClose={() => setDateRange(null)}
                  color="cyan"
                >
                  Date: {dateRange[0].format('YYYY-MM-DD')} - {dateRange[1].format('YYYY-MM-DD')}
                </Tag>
              )}
              <Button type="link" size="small" onClick={clearFilters}>
                Clear All
              </Button>
            </Space>
          </div>
        )}
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
                  <Tag color="blue">{results.posts?.length || 0}</Tag>
                  <Select
                    value={sortBy}
                    onChange={setSortBy}
                    style={{ width: 150 }}
                    size="small"
                  >
                    <Option value="relevance">Relevance</Option>
                    <Option value="date">Date</Option>
                    <Option value="views">Views</Option>
                  </Select>
                </Space>
              }
              extra={
                <Button type="link" onClick={() => handleSearch(true)}>
                  Apply Sort
                </Button>
              }
            >
              {results.posts?.length > 0 ? (
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
                            <Space wrap>
                              {post.categories?.map((cat) => (
                                <Tag key={cat.id} color="blue">
                                  {cat.name}
                                </Tag>
                              ))}
                              {post.tags?.map((tag) => (
                                <Tag key={tag.id} color="purple">
                                  {tag.name}
                                </Tag>
                              ))}
                              <Tag color={post.status === 'published' ? 'green' : 'default'}>
                                {post.status}
                              </Tag>
                              <Space split={<Divider type="vertical" />}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  <EyeOutlined /> {post.view_count} views
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  <ClockCircleOutlined /> {dayjs(post.created_at).fromNow()}
                                </Text>
                              </Space>
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
              {results.categories?.length > 0 ? (
                <Space wrap>
                  {results.categories.map((cat: Category & { posts_count?: number }) => (
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
              {results.tags?.length > 0 ? (
                <Space wrap>
                  {results.tags.map((tag: TagType) => (
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
      {hasSearched && results && results.posts?.length === 0 && results.categories?.length === 0 && results.tags?.length === 0 && (
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

      {/* Advanced Search Modal */}
      <Modal
        title="Advanced Search Filters"
        open={advancedModalVisible}
        onOk={() => handleSearch(true)}
        onCancel={() => setAdvancedModalVisible(false)}
        width={700}
        okText="Apply Filters"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Categories */}
          <div>
            <Text strong>Categories</Text>
            <Select
              mode="multiple"
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Select categories"
              value={selectedCategories}
              onChange={setSelectedCategories}
            >
              {categories.map((cat) => (
                <Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Text strong>Tags</Text>
            <Select
              mode="multiple"
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Select tags"
              value={selectedTags}
              onChange={setSelectedTags}
            >
              {tags.map((tag) => (
                <Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Option>
              ))}
            </Select>
          </div>

          {/* Authors */}
          <div>
            <Text strong>Authors</Text>
            <Select
              mode="multiple"
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Select authors"
              value={selectedAuthors}
              onChange={setSelectedAuthors}
            >
              {authors.map((author) => (
                <Option key={author.id} value={author.id}>
                  {author.name}
                </Option>
              ))}
            </Select>
          </div>

          {/* Status */}
          <div>
            <Text strong>Status</Text>
            <Checkbox.Group
              style={{ width: '100%', marginTop: 8, display: 'flex', flexDirection: 'column' }}
              value={selectedStatus}
              onChange={(values) => setSelectedStatus(values as string[])}
            >
              <Checkbox value="draft">Draft</Checkbox>
              <Checkbox value="published">Published</Checkbox>
              <Checkbox value="scheduled">Scheduled</Checkbox>
              <Checkbox value="pending_review">Pending Review</Checkbox>
              <Checkbox value="approved">Approved</Checkbox>
              <Checkbox value="changes_requested">Changes Requested</Checkbox>
            </Checkbox.Group>
          </div>

          {/* Date Range */}
          <div>
            <Text strong>Date Range</Text>
            <RangePicker
              style={{ width: '100%', marginTop: 8 }}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            />
          </div>

          {/* Sort By */}
          <div>
            <Text strong>Sort By</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={sortBy}
              onChange={setSortBy}
            >
              <Option value="relevance">Relevance</Option>
              <Option value="date">Date (Newest First)</Option>
              <Option value="views">View Count</Option>
            </Select>
          </div>

          <Divider />

          <Button onClick={clearFilters} block>
            Clear All Filters
          </Button>
        </Space>
      </Modal>
    </div>
  );
};

export default SearchPage;
