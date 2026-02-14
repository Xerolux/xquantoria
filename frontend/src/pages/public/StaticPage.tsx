import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Card,
  Typography,
  Breadcrumb,
  Skeleton,
  Result,
  Button,
} from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { publicService } from '../../services/api';

const { Title, Text } = Typography;

interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  author?: { name: string; display_name: string };
  updated_at?: string;
}

const StaticPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPage();
    }
  }, [slug]);

  useEffect(() => {
    if (page) {
      document.title = `${page.meta_title || page.title}`;
      
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && page.meta_description) {
        metaDesc.setAttribute('content', page.meta_description);
      }
    }
  }, [page]);

  const fetchPage = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await publicService.page(slug!);
      setPage(response.page);
    } catch (err) {
      console.error('Failed to load page:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Result
          status="404"
          title="Page Not Found"
          subTitle="The page you're looking for doesn't exist."
          extra={
            <Link to="/">
              <Button type="primary">Back to Home</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Breadcrumb style={{ marginBottom: 24 }}>
          <Breadcrumb.Item>
            <Link to="/"><HomeOutlined /> Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <FileTextOutlined /> {page.title}
          </Breadcrumb.Item>
        </Breadcrumb>

        <Card>
          <Title level={1} style={{ marginBottom: 24 }}>{page.title}</Title>
          
          <div 
            className="page-content"
            dangerouslySetInnerHTML={{ __html: page.content }}
            style={{ 
              fontSize: 16, 
              lineHeight: 1.8,
            }}
          />

          {page.updated_at && (
            <Text type="secondary" style={{ display: 'block', marginTop: 32, textAlign: 'right' }}>
              Last updated: {new Date(page.updated_at).toLocaleDateString()}
            </Text>
          )}
        </Card>
      </div>

      <style>{`
        .page-content h1 { font-size: 2em; margin: 0.67em 0; }
        .page-content h2 { font-size: 1.5em; margin: 0.83em 0; }
        .page-content h3 { font-size: 1.17em; margin: 1em 0; }
        .page-content p { margin: 1em 0; }
        .page-content img { max-width: 100%; height: auto; border-radius: 8px; }
        .page-content a { color: #1890ff; }
        .page-content blockquote { 
          border-left: 4px solid #1890ff; 
          padding-left: 16px; 
          margin: 1em 0;
          color: #666;
        }
        .page-content ul, .page-content ol { padding-left: 24px; }
        .page-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        .page-content th, .page-content td {
          border: 1px solid #d9d9d9;
          padding: 8px 12px;
          text-align: left;
        }
        .page-content th {
          background: #fafafa;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default StaticPage;
