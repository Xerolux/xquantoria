import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  List,
  Typography,
  Tag,
  Space,
  Button,
  Empty,
  Skeleton,
  Divider,
  Input,
  message,
} from 'antd';
import {
  GlobalOutlined,
  CopyOutlined,
  LinkOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { publicService } from '../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

dayjs.locale('de');

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface FeedItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
  author: { name: string; display_name: string };
  categories: Array<{ id: number; name: string; slug: string }>;
  link: string;
}

interface RSSFeedPageProps {
  feedUrl?: string;
  siteName?: string;
}

const RSSFeedPage: React.FC<RSSFeedPageProps> = ({
  feedUrl = '/api/v1/public/feed',
  siteName = 'Blog CMS',
}) => {
  const [loading, setLoading] = useState(true);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fullFeedUrl = `${window.location.origin}${feedUrl}`;

  useEffect(() => {
    fetchFeed();
  }, [selectedCategory]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      const response = await publicService.feed(params);
      setFeedItems(response.items || []);
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyFeedUrl = () => {
    navigator.clipboard.writeText(fullFeedUrl);
    message.success('Feed-URL kopiert!');
  };

  const filteredItems = feedItems.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.excerpt?.toLowerCase().includes(query) ||
      item.categories?.some((c) => c.name.toLowerCase().includes(query))
    );
  });

  const formatDate = (date: string) => dayjs(date).format('DD. MMMM YYYY');

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Card style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <GlobalOutlined style={{ fontSize: 48, color: '#f26522', marginBottom: 16 }} />
            <Title level={2} style={{ marginBottom: 8 }}>
              RSS Feed
            </Title>
            <Paragraph type="secondary">
              Abonnieren Sie unseren RSS-Feed, um über neue Artikel informiert zu werden.
            </Paragraph>
          </div>

          <Divider />

          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
            <Text strong>Feed-URL:</Text>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Input readOnly value={fullFeedUrl} />
              <Button icon={<CopyOutlined />} onClick={copyFeedUrl}>
                Kopieren
              </Button>
              <Button icon={<LinkOutlined />} href={fullFeedUrl} target="_blank">
                Öffnen
              </Button>
            </div>
          </div>

          <Divider orientation="left">So abonnieren Sie den Feed</Divider>
          
          <Paragraph>
            <ol style={{ paddingLeft: 20 }}>
              <li>Kopieren Sie die Feed-URL oben</li>
              <li>Öffnen Sie Ihren RSS-Reader (z.B. Feedly, Inoreader, NetNewsWire)</li>
              <li>Fügen Sie die URL zu Ihren Feeds hinzu</li>
              <li>Sie erhalten automatisch Updates bei neuen Artikeln</li>
            </ol>
          </Paragraph>

          <Space wrap>
            <Text type="secondary">Empfohlene RSS-Reader:</Text>
            <a href="https://feedly.com" target="_blank" rel="noopener noreferrer">Feedly</a>
            <a href="https://www.inoreader.com" target="_blank" rel="noopener noreferrer">Inoreader</a>
            <a href="https://netnewswire.com" target="_blank" rel="noopener noreferrer">NetNewsWire</a>
          </Space>
        </Card>

        <Card
          title={
            <Space>
              <FilterOutlined />
              <span>Filter</span>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Space wrap>
            <Button
              type={selectedCategory === null ? 'primary' : 'default'}
              onClick={() => setSelectedCategory(null)}
            >
              Alle
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                type={selectedCategory === cat.slug ? 'primary' : 'default'}
                onClick={() => setSelectedCategory(cat.slug)}
              >
                {cat.name}
              </Button>
            ))}
          </Space>

          <Divider style={{ margin: '16px 0' }} />

          <Search
            placeholder="Artikel durchsuchen..."
            allowClear
            enterButton={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Card>

        <Card title={`Feed-Vorschau (${filteredItems.length} Artikel)`}>
          {filteredItems.length === 0 ? (
            <Empty description="Keine Artikel gefunden" />
          ) : (
            <List
              itemLayout="vertical"
              dataSource={filteredItems}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  extra={
                    <Link to={`/blog/${item.slug}`}>
                      <Button type="link">Artikel lesen</Button>
                    </Link>
                  }
                >
                  <List.Item.Meta
                    title={
                      <Link to={`/blog/${item.slug}`} style={{ color: 'inherit' }}>
                        {item.title}
                      </Link>
                    }
                    description={
                      <Space split={<Divider type="vertical" />}>
                        <Text type="secondary">
                          {item.author?.display_name || item.author?.name}
                        </Text>
                        <Text type="secondary">{formatDate(item.published_at)}</Text>
                      </Space>
                    }
                  />
                  <Paragraph ellipsis={{ rows: 2 }} type="secondary">
                    {item.excerpt}
                  </Paragraph>
                  <Space size={[8, 8]} wrap>
                    {item.categories?.map((cat) => (
                      <Link key={cat.id} to={`/category/${cat.slug}`}>
                        <Tag color="blue">{cat.name}</Tag>
                      </Link>
                    ))}
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card style={{ marginTop: 24 }}>
          <Title level={5}>Was ist RSS?</Title>
          <Paragraph>
            RSS (Really Simple Syndication) ist ein Format, um Inhalte von Websites 
            automatisch zu abonnieren. Anstatt jede Website einzeln zu besuchen, 
            können Sie alle Ihre Lieblings-Feeds in einem Reader verwalten und 
            erhalten so einen schnellen Überblick über neue Artikel.
          </Paragraph>
          <Paragraph>
            RSS-Feeds sind besonders nützlich für Blogs, Nachrichtenseiten und 
            Podcasts. Sie sind werbefrei, datenschutzfreundlich und funktionieren 
            ohne Algorithmen – Sie sehen genau das, was Sie abonniert haben.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
};

export default RSSFeedPage;
