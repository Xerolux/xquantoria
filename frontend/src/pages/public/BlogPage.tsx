import React, { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Breadcrumb,
  Avatar,
  Divider,
  Skeleton,
  Image,
  Pagination,
  Empty,
  Button,
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  HomeOutlined,
  FolderOutlined,
  TagOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { publicService } from '../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

dayjs.locale('de');

const { Title, Text, Paragraph } = Typography;

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

interface PostDetail extends Post {
  content: string;
  author: { id: number; name: string; display_name: string; bio?: string; avatar?: string };
  meta_title?: string;
  meta_description?: string;
}

const BlogListPage: React.FC = () => {
  const location = useLocation();
  const params = useParams<{ category?: string; tag?: string }>();
  const searchParams = new URLSearchParams(location.search);

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12, total: 0 });
  const [settings, setSettings] = useState<any>({});
  const [filterInfo, setFilterInfo] = useState<{ type: string; name: string } | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const categorySlug = params.category;
  const tagSlug = params.tag;
  const searchQuery = searchParams.get('q');

  useEffect(() => {
    fetchPosts(1);
  }, [categorySlug, tagSlug, searchQuery]);

  const fetchPosts = async (pageNum: number) => {
    setLoading(true);
    try {
      let response;
      
      if (categorySlug) {
        response = await publicService.category(categorySlug);
        setFilterInfo({ type: 'category', name: response.category?.name || categorySlug });
      } else if (tagSlug) {
        response = await publicService.tag(tagSlug);
        setFilterInfo({ type: 'tag', name: response.tag?.name || tagSlug });
      } else if (searchQuery) {
        response = await publicService.search(searchQuery);
        setFilterInfo({ type: 'search', name: searchQuery });
      } else {
        response = await publicService.posts({ page: pageNum, per_page: 12 });
        setFilterInfo(null);
      }

      const postsData = response.posts?.data || response.posts || [];
      setPosts(Array.isArray(postsData) ? postsData : []);
      
      if (response.posts?.meta) {
        setPagination({
          current: response.posts.meta.current_page,
          pageSize: response.posts.meta.per_page,
          total: response.posts.meta.total,
        });
      }
      
      setSettings(response.settings || {});
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    fetchPosts(page);
    window.scrollTo(0, 0);
  };

  const formatDate = (date: string) => dayjs(date).format('DD. MMMM YYYY');

  if (loading) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Breadcrumb style={{ marginBottom: 24 }}>
          <Breadcrumb.Item>
            <Link to="/"><HomeOutlined /> Home</Link>
          </Breadcrumb.Item>
          {filterInfo && (
            <Breadcrumb.Item>
              {filterInfo.type === 'category' && <FolderOutlined />}
              {filterInfo.type === 'tag' && <TagOutlined />}
              {' '}{filterInfo.name}
            </Breadcrumb.Item>
          )}
        </Breadcrumb>

        <Title level={2} style={{ marginBottom: 24 }}>
          {filterInfo ? (
            <>
              {filterInfo.type === 'category' && (
                <><FolderOutlined /> Category: {filterInfo.name}</>
              )}
              {filterInfo.type === 'tag' && (
                <><TagOutlined /> Tag: {filterInfo.name}</>
              )}
              {filterInfo.type === 'search' && (
                <>Search results for: "{filterInfo.name}"</>
              )}
            </>
          ) : (
            'Blog'
          )}
        </Title>

        {posts.length === 0 ? (
          <Empty description="No posts found" />
        ) : (
          <>
            <Row gutter={[24, 24]}>
              {posts.map((post) => (
                <Col xs={24} sm={12} md={8} key={post.id}>
                  <Card
                    hoverable
                    cover={
                      post.featured_image?.url && (
                        <Link to={`/blog/${post.slug}`}>
                          <div style={{ height: 200, overflow: 'hidden' }}>
                            <img
                              alt={post.featured_image.alt_text || post.title}
                              src={post.featured_image.url}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        </Link>
                      )
                    }
                  >
                    <Space size={4} wrap style={{ marginBottom: 8 }}>
                      {post.categories?.slice(0, 2).map((cat) => (
                        <Link key={cat.id} to={`/category/${cat.slug}`}>
                          <Tag color="blue">{cat.name}</Tag>
                        </Link>
                      ))}
                    </Space>

                    <Link to={`/blog/${post.slug}`}>
                      <Title level={4} ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                        {post.title}
                      </Title>
                    </Link>

                    {post.excerpt && (
                      <Paragraph ellipsis={{ rows: 2 }} type="secondary">
                        {post.excerpt}
                      </Paragraph>
                    )}

                    <Space split={<Divider type="vertical" />} size={0}>
                      <Text type="secondary">
                        <UserOutlined /> {post.author?.display_name}
                      </Text>
                      <Text type="secondary">
                        <CalendarOutlined /> {dayjs(post.published_at).format('DD.MM.YY')}
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>

            {pagination.total > pagination.pageSize && (
              <div style={{ textAlign: 'center', marginTop: 48 }}>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                  showTotal={(total) => `${total} posts`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const PostDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [prevPost, setPrevPost] = useState<{ title: string; slug: string } | null>(null);
  const [nextPost, setNextPost] = useState<{ title: string; slug: string } | null>(null);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} - ${settings.site_name || 'Blog'}`;
      
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', post.meta_description || post.excerpt || '');
      }
    }
  }, [post, settings]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const response = await publicService.post(slug!);
      setPost(response.post);
      setRelatedPosts(response.related_posts || []);
      setPrevPost(response.prev_post);
      setNextPost(response.next_post);
      setSettings(response.settings || {});
    } catch (error) {
      console.error('Failed to load post:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <Skeleton active />
        <Skeleton active />
      </div>
    );
  }

  if (!post) {
    return <div style={{ textAlign: 'center', padding: 48 }}>Post not found</div>;
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {post.featured_image?.url && (
        <div style={{ height: 400, overflow: 'hidden', position: 'relative' }}>
          <img
            alt={post.featured_image.alt_text || post.title}
            src={post.featured_image.url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            padding: '48px 24px 24px',
          }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <Title level={1} style={{ color: '#fff', margin: 0 }}>
                {post.title}
              </Title>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <Breadcrumb style={{ marginBottom: 24 }}>
          <Breadcrumb.Item>
            <Link to="/"><HomeOutlined /> Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/blog">Blog</Link>
          </Breadcrumb.Item>
          {post.categories?.[0] && (
            <Breadcrumb.Item>
              <Link to={`/category/${post.categories[0].slug}`}>{post.categories[0].name}</Link>
            </Breadcrumb.Item>
          )}
        </Breadcrumb>

        {!post.featured_image?.url && (
          <Title level={1} style={{ marginBottom: 16 }}>{post.title}</Title>
        )}

        <Space size={16} wrap style={{ marginBottom: 24 }}>
          <Space>
            <Avatar src={post.author?.avatar} icon={<UserOutlined />} />
            <div>
              <Text strong>{post.author?.display_name || post.author?.name}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {post.author?.bio?.substring(0, 50)}{post.author?.bio && post.author.bio.length > 50 && '...'}
              </Text>
            </div>
          </Space>
          <Divider type="vertical" style={{ height: 40 }} />
          <Text type="secondary">
            <CalendarOutlined /> {dayjs(post.published_at).format('DD. MMMM YYYY')}
          </Text>
          {post.reading_time && (
            <Text type="secondary">
              <ClockCircleOutlined /> {post.reading_time} min read
            </Text>
          )}
          {post.views_count > 0 && (
            <Text type="secondary">
              <EyeOutlined /> {post.views_count} views
            </Text>
          )}
        </Space>

        <Space size={8} wrap style={{ marginBottom: 24 }}>
          {post.categories?.map((cat) => (
            <Link key={cat.id} to={`/category/${cat.slug}`}>
              <Tag color="blue">{cat.name}</Tag>
            </Link>
          ))}
          {post.tags?.map((tag) => (
            <Link key={tag.id} to={`/tag/${tag.slug}`}>
              <Tag>{tag.name}</Tag>
            </Link>
          ))}
        </Space>

        <Card style={{ marginBottom: 24 }}>
          <div 
            className="post-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
            style={{ 
              fontSize: 18, 
              lineHeight: 1.8,
            }}
          />
        </Card>

        <div style={{ marginBottom: 48 }}>
          <Row gutter={16}>
            <Col span={12}>
              {prevPost && (
                <Link to={`/blog/${prevPost.slug}`}>
                  <Card hoverable style={{ height: '100%' }}>
                    <Space>
                      <LeftOutlined />
                      <div>
                        <Text type="secondary">Previous</Text>
                        <br />
                        <Text strong ellipsis style={{ maxWidth: 250 }}>{prevPost.title}</Text>
                      </div>
                    </Space>
                  </Card>
                </Link>
              )}
            </Col>
            <Col span={12}>
              {nextPost && (
                <Link to={`/blog/${nextPost.slug}`}>
                  <Card hoverable style={{ height: '100%', textAlign: 'right' }}>
                    <Space>
                      <div>
                        <Text type="secondary">Next</Text>
                        <br />
                        <Text strong ellipsis style={{ maxWidth: 250 }}>{nextPost.title}</Text>
                      </div>
                      <RightOutlined />
                    </Space>
                  </Card>
                </Link>
              )}
            </Col>
          </Row>
        </div>

        {relatedPosts.length > 0 && (
          <div>
            <Title level={3} style={{ marginBottom: 24 }}>Related Posts</Title>
            <Row gutter={[16, 16]}>
              {relatedPosts.map((relatedPost) => (
                <Col xs={24} sm={12} md={6} key={relatedPost.id}>
                  <Link to={`/blog/${relatedPost.slug}`}>
                    <Card
                      hoverable
                      size="small"
                      cover={
                        relatedPost.featured_image?.url && (
                          <div style={{ height: 120, overflow: 'hidden' }}>
                            <img
                              alt={relatedPost.title}
                              src={relatedPost.featured_image.url}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        )
                      }
                    >
                      <Text ellipsis={{ rows: 2 }} strong>{relatedPost.title}</Text>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </div>

      <style>{`
        .post-content h1 { font-size: 2em; margin: 0.67em 0; }
        .post-content h2 { font-size: 1.5em; margin: 0.83em 0; }
        .post-content h3 { font-size: 1.17em; margin: 1em 0; }
        .post-content p { margin: 1em 0; }
        .post-content img { max-width: 100%; height: auto; border-radius: 8px; }
        .post-content a { color: #1890ff; }
        .post-content blockquote { 
          border-left: 4px solid #1890ff; 
          padding-left: 16px; 
          margin: 1em 0;
          color: #666;
        }
        .post-content pre { 
          background: #1e1e1e; 
          color: #d4d4d4; 
          padding: 16px; 
          border-radius: 8px;
          overflow-x: auto;
        }
        .post-content code { 
          background: #f5f5f5; 
          padding: 2px 6px; 
          border-radius: 4px;
          font-family: 'Fira Code', monospace;
        }
        .post-content ul, .post-content ol { padding-left: 24px; }
      `}</style>
    </div>
  );
};

export default BlogListPage;
