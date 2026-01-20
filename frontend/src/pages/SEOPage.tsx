import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Space,
  message,
  Row,
  Col,
  Typography,
  Alert,
  Tabs,
  Tag,
  Divider,
  Descriptions,
  Input,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  CodeOutlined,
  CopyOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { seoService } from '../services/api';

const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

const SEOPage: React.FC = () => {
  const [robotsTxt, setRobotsTxt] = useState('');
  const [originalRobotsTxt, setOriginalRobotsTxt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchRobotsTxt();
  }, []);

  const fetchRobotsTxt = async () => {
    setLoading(true);
    try {
      const data = await seoService.getRobotsTxt();
      setRobotsTxt(data.content);
      setOriginalRobotsTxt(data.content);
      setLastUpdated(data.updated_at);
    } catch (error) {
      message.error('Failed to load robots.txt');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      const result = await seoService.validateRobotsTxt(robotsTxt);
      setValidationErrors(result.errors);
      setIsValid(result.valid);

      if (result.valid) {
        message.success('robots.txt is valid!');
      } else {
        message.warning(`Found ${result.errors.length} validation error(s)`);
      }
    } catch (error) {
      message.error('Failed to validate robots.txt');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await seoService.updateRobotsTxt(robotsTxt);
      setOriginalRobotsTxt(robotsTxt);
      message.success('robots.txt updated successfully');
      fetchRobotsTxt();
    } catch (error) {
      message.error('Failed to update robots.txt');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const data = await seoService.resetRobotsTxt();
      setRobotsTxt(data.robots.content);
      setOriginalRobotsTxt(data.robots.content);
      message.success('robots.txt reset to default');
    } catch (error) {
      message.error('Failed to reset robots.txt');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(robotsTxt);
    message.success('Copied to clipboard');
  };

  const hasChanges = robotsTxt !== originalRobotsTxt;

  const renderDirectivesHelp = () => {
    const directives = [
      {
        name: 'User-agent',
        description: 'Specifies which crawler the rule applies to (* for all)',
        example: 'User-agent: *',
      },
      {
        name: 'Disallow',
        description: 'Blocks access to specified paths',
        example: 'Disallow: /admin',
      },
      {
        name: 'Allow',
        description: 'Explicitly allows access to specific paths',
        example: 'Allow: /public',
      },
      {
        name: 'Crawl-delay',
        description: 'Delay in seconds between requests (not officially supported)',
        example: 'Crawl-delay: 1',
      },
      {
        name: 'Sitemap',
        description: 'URL to your sitemap.xml',
        example: 'Sitemap: https://example.com/sitemap.xml',
      },
    ];

    return (
      <Card title="Robots.txt Directives Reference" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          {directives.map((directive) => (
            <div key={directive.name}>
              <Tag color="blue">{directive.name}</Tag>
              <Paragraph style={{ margin: '4px 0' }}>
                {directive.description}
              </Paragraph>
              <Text code copyable>{directive.example}</Text>
            </div>
          ))}
        </Space>
      </Card>
    );
  };

  const renderCommonPatterns = () => {
    const patterns = [
      {
        name: 'Block Admin Area',
        code: `User-agent: *\nDisallow: /admin\nDisallow: /api`,
      },
      {
        name: 'Block All',
        code: `User-agent: *\nDisallow: /`,
      },
      {
        name: 'Allow All',
        code: `User-agent: *\nAllow: /`,
      },
      {
        name: 'Block Specific Files',
        code: `User-agent: *\nDisallow: /*.pdf$\nDisallow: /*.doc$`,
      },
      {
        name: 'Crawl Delay',
        code: `User-agent: *\nCrawl-delay: 1`,
      },
    ];

    return (
      <Card title="Common Patterns" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          {patterns.map((pattern) => (
            <div key={pattern.name}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{pattern.name}</div>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(pattern.code);
                  message.success('Pattern copied to clipboard');
                }}
              >
                Copy
              </Button>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 8,
                  borderRadius: 4,
                  marginTop: 4,
                  fontSize: 12,
                }}
              >
                {pattern.code}
              </pre>
            </div>
          ))}
        </Space>
      </Card>
    );
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Space>
              <GlobalOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <div>
                <div style={{ fontSize: 14, color: '#999' }}>SEO Status</div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>
                  {isValid ? 'Valid' : 'Has Errors'}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Space>
              <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <div style={{ fontSize: 14, color: '#999' }}>Last Updated</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Space>
              <CodeOutlined style={{ fontSize: 24, color: '#722ed1' }} />
              <div>
                <div style={{ fontSize: 14, color: '#999' }}>Status</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {hasChanges ? 'Unsaved Changes' : 'Up to Date'}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title="SEO Management"
        extra={
          <Space>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handleValidate}
              disabled={loading}
            >
              Validate
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={loading}
            >
              Reset to Default
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges || loading}
            >
              Save Changes
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="robots">
          <TabPane tab="Robots.txt" key="robots">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* Public URLs */}
              <Card size="small" title="Public URLs">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Robots.txt">
                    <Space>
                      <a
                        href={seoService.getRobotsTxtUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {seoService.getRobotsTxtUrl()}
                      </a>
                      <Button
                        type="text"
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() => window.open(seoService.getRobotsTxtUrl(), '_blank')}
                      />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Sitemap.xml">
                    <Space>
                      <a
                        href={seoService.getSitemapUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {seoService.getSitemapUrl()}
                      </a>
                      <Button
                        type="text"
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() => window.open(seoService.getSitemapUrl(), '_blank')}
                      />
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Validation Errors */}
              {!isValid && validationErrors.length > 0 && (
                <Alert
                  type="warning"
                  message="Validation Errors"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  }
                  showIcon
                />
              )}

              {/* Editor */}
              <Card size="small" title="Robots.txt Content">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">
                      Edit your robots.txt file below. Lines starting with # are comments.
                    </Text>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={handleCopy}
                    >
                      Copy
                    </Button>
                  </div>
                  <TextArea
                    value={robotsTxt}
                    onChange={(e) => setRobotsTxt(e.target.value)}
                    rows={20}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                    placeholder="# Robots.txt"
                    disabled={loading}
                  />
                </Space>
              </Card>
            </Space>
          </TabPane>

          <TabPane tab="Help" key="help">
            <Row gutter={16}>
              <Col span={12}>{renderDirectivesHelp()}</Col>
              <Col span={12}>{renderCommonPatterns()}</Col>
            </Row>
          </TabPane>

          <TabPane tab="Best Practices" key="best-practices">
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  type="info"
                  message="Robots.txt Best Practices"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>
                        <strong>Keep it simple:</strong> Only block what you need to block
                      </li>
                      <li>
                        <strong>Be specific:</strong> Use specific paths instead of broad rules
                      </li>
                      <li>
                        <strong>Test changes:</strong> Always validate before saving
                      </li>
                      <li>
                        <strong>Use comments:</strong> Add # comments to document your rules
                      </li>
                      <li>
                        <strong>Include sitemap:</strong> Always add your sitemap URL
                      </li>
                      <li>
                        <strong>Don&apos;t block CSS/JS:</strong> Search engines need these for
                        rendering
                      </li>
                      <li>
                        <strong>Check crawl-delay:</strong> Not officially supported by all
                        crawlers
                      </li>
                    </ul>
                  }
                  showIcon
                />

                <Divider />

                <Alert
                  type="warning"
                  message="Common Mistakes"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>
                        <strong>Blocking all bots:</strong> Disallow: / will block all crawlers
                      </li>
                      <li>
                        <strong>Wrong syntax:</strong> Missing colons or incorrect paths
                      </li>
                      <li>
                        <strong>Blocking important pages:</strong> Check your Disallow rules
                        carefully
                      </li>
                      <li>
                        <strong>Forgot sitemap:</strong> Always include your sitemap URL
                      </li>
                      <li>
                        <strong>Case sensitivity:</strong> URLs are case-sensitive
                      </li>
                    </ul>
                  }
                  showIcon
                />

                <Divider />

                <Alert
                  type="success"
                  message="Testing Tips"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>
                        Use Google Search Console&apos;s Robots.txt Tester tool
                      </li>
                      <li>
                        Check Bing Webmaster Tools for testing
                      </li>
                      <li>
                        Test with curl: <code>curl -I https://example.com/robots.txt</code>
                      </li>
                      <li>
                        Monitor crawl stats in Search Console
                      </li>
                    </ul>
                  }
                  showIcon
                />
              </Space>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default SEOPage;
