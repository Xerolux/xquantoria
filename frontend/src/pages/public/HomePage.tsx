import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Input,
  Button,
  List,
  Avatar,
  Divider,
  Skeleton,
  Image,
  Pagination,
  Empty,
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  TagOutlined,
  FolderOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  HeartOutlined,
  MessageOutlined,
  RightOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { publicService } from '../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/de';

dayjs.extend(relativeTime);
dayjs.locale('de');

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  published_at: string;
  views_count: number;
  reading_time?: number;
  author: { id: number; name: string; display_name: string };
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  featured_image?: { url: string; alt_text: string };
}

interface Settings {
  site_name: string;
  site_description: string;
  site_logo: string;
  posts_per_page: number;
  social_facebook?: string;
  social_twitter?: string;
  social_instagram?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  posts_count: number;
}

interface TagItem {
  id: number;
  name: string;
  slug: string;
  posts_count: number;
}

const HomePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularTags, setPopularTags] = useState<TagItem[]>([]);
  const [menuPages, setMenuPages] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await publicService.homepage();
      setSettings(response.settings);
      setFeaturedPosts(response.featured_posts || []);
      setLatestPosts(response.latest_posts || []);
      setCategories(response.categories || []);
      setPopularTags(response.popular_tags || []);
      setMenuPages(response.menu_pages || []);
    } catch (error) {
      console.error('Failed to load homepage:', error);
    } finally {
      setLoading(false);
    }
  };

  const PostCard: React.FC<{ post: Post; featured?: boolean }> = ({ post, featured = false }) => (
    <Card
      hoverable
      className="post-card"
      cover={
        post.featured_image?.url && (
          <div style={{ overflow: 'hidden', height: featured ? 300 : 200 }}>
            <img
              alt={post.featured_image.alt_text || post.title}
              src={post.featured_image.url}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease',
              }}
            />
          </div>
        )
      }
      style={{ height: '100%' }}
    >
      <Link to={`/blog/${post.slug}`}>
        <Title level={featured ? 3 : 4} ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
          {post.title}
        </Title>
      </Link>
      
      <Space size={4} wrap style={{ marginBottom: 8 }}>
        {post.categories?.slice(0, 2).map((cat) => (
          <Link key={cat.id} to={`/category/${cat.slug}`}>
            <Tag color="blue">{cat.name}</Tag>
          </Link>
        ))}
      </Space>

      {post.excerpt && (
        <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 8 }}>
          {post.excerpt}
        </Paragraph>
      )}

      <Space split={<Divider type="vertical" />} size={0} wrap>
        <Text type="secondary">
          <UserOutlined /> {post.author?.display_name || post.author?.name}
        </Text>
        <Text type="secondary">
          <CalendarOutlined /> {dayjs(post.published_at).format('DD.MM.YYYY')}
        </Text>
        {post.reading_time && (
          <Text type="secondary">
            <ClockCircleOutlined /> {post.reading_time} min
          </Text>
        )}
        {post.views_count > 0 && (
          <Text type="secondary">
            <EyeOutlined /> {post.views_count}
          </Text>
        )}
      </Space>
    </Card>
  );

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            {featuredPosts.length > 0 && (
              <>
                <Title level={2} style={{ marginBottom: 16 }}>
                  Featured
                </Title>
                <Row gutter={[16, 16]}>
                  {featuredPosts.slice(0, 1).map((post) => (
                    <Col xs={24} key={post.id}>
                      <PostCard post={post} featured />
                    </Col>
                  ))}
                  {featuredPosts.slice(1, 3).map((post) => (
                    <Col xs={24} sm={12} key={post.id}>
                      <PostCard post={post} />
                    </Col>
                  ))}
                </Row>
                <Divider />
              </>
            )}

            <Title level={2} style={{ marginBottom: 16 }}>
              Latest Posts
            </Title>
            
            {latestPosts.length === 0 ? (
              <Empty description="No posts yet" />
            ) : (
              <Row gutter={[16, 16]}>
                {latestPosts.map((post) => (
                  <Col xs={24} sm={12} md={8} key={post.id}>
                    <PostCard post={post} />
                  </Col>
                ))}
              </Row>
            )}

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Link to="/blog">
                <Button type="primary" size="large" icon={<RightOutlined />}>
                  View All Posts
                </Button>
              </Link>
            </div>
          </Col>

          <Col xs={24} lg={8}>
            <Card style={{ marginBottom: 24 }}>
              <Search
                placeholder="Search posts..."
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={(value) => {
                  window.location.href = `/search?q=${encodeURIComponent(value)}`;
                }}
              />
            </Card>

            <Card title={<><FolderOutlined /> Categories</>} style={{ marginBottom: 24 }}>
              <List
                dataSource={categories}
                renderItem={(cat) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <Link to={`/category/${cat.slug}`} style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                      <Text>{cat.name}</Text>
                      <Tag>{cat.posts_count}</Tag>
                    </Link>
                  </List.Item>
                )}
              />
            </Card>

            <Card title={<><TagOutlined /> Popular Tags</>} style={{ marginBottom: 24 }}>
              <Space size={[8, 8]} wrap>
                {popularTags.map((tag) => (
                  <Link key={tag.id} to={`/tag/${tag.slug}`}>
                    <Tag style={{ cursor: 'pointer' }}>
                      {tag.name} ({tag.posts_count})
                    </Tag>
                  </Link>
                ))}
              </Space>
            </Card>

            <Card style={{ marginBottom: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Link to="/feed">
                  <Button block icon={<GlobalOutlined />}>
                    RSS Feed
                  </Button>
                </Link>
                {settings?.social_facebook && (
                  <Button block href={settings.social_facebook} target="_blank">
                    Facebook
                  </Button>
                )}
                {settings?.social_twitter && (
                  <Button block href={settings.social_twitter} target="_blank">
                    Twitter
                  </Button>
                )}
              </Space>
            </Card>

            <Card title="Newsletter">
              <Paragraph type="secondary">
                Subscribe to get the latest posts delivered to your inbox.
              </Paragraph>
              <Input placeholder="Your email" style={{ marginBottom: 8 }} />
              <Button type="primary" block>
                Subscribe
              </Button>
            </Card>
          </Col>
        </Row>
      </div>

      <footer style={{ background: '#001529', color: '#fff', padding: '48px 24px', marginTop: 48 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Title level={4} style={{ color: '#fff' }}>
                {settings?.site_name || 'Blog'}
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.65)' }}>
                {settings?.site_description}
              </Paragraph>
            </Col>
            <Col xs={24} md={8}>
              <Title level={5} style={{ color: '#fff' }}>Quick Links</Title>
              <Space direction="vertical">
                <Link to="/blog" style={{ color: 'rgba(255,255,255,0.65)' }}>Blog</Link>
                {menuPages.map((page) => (
                  <Link key={page.id} to={`/page/${page.slug}`} style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {page.title}
                  </Link>
                ))}
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Title level={5} style={{ color: '#fff' }}>Categories</Title>
              <Space direction="vertical">
                {categories.slice(0, 5).map((cat) => (
                  <Link key={cat.id} to={`/category/${cat.slug}`} style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {cat.name}
                  </Link>
                ))}
              </Space>
            </Col>
          </Row>
          <Divider style={{ background: 'rgba(255,255,255,0.1)', margin: '24px 0' }} />
          <Text style={{ color: 'rgba(255,255,255,0.45)', textAlign: 'center', display: 'block' }}>
            © {new Date().getFullYear()} {settings?.site_name || 'Blog'}. All rights reserved.
          </Text>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
