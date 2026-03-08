import React from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Typography, Space, Divider, Input, Button, Form } from 'antd';
import {
  FacebookOutlined,
  TwitterOutlined,
  InstagramOutlined,
  LinkedinOutlined,
  YoutubeOutlined,
  GithubOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface FooterLink {
  label: string;
  path: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  icon: React.ReactNode;
  url: string;
  label: string;
}

interface PublicFooterProps {
  siteName?: string;
  siteDescription?: string;
  footerColumns?: FooterColumn[];
  socialLinks?: SocialLink[];
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  showNewsletter?: boolean;
  copyrightText?: string;
}

const defaultFooterColumns: FooterColumn[] = [
  {
    title: 'Content',
    links: [
      { label: 'Blog', path: '/blog' },
      { label: 'Categories', path: '/categories' },
      { label: 'Tags', path: '/tags' },
      { label: 'Archive', path: '/archive' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Impressum', path: '/page/impressum' },
      { label: 'Datenschutz', path: '/page/datenschutz' },
      { label: 'AGB', path: '/page/agb' },
      { label: 'Cookie-Einstellungen', path: '#cookies' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Kontakt', path: '/page/kontakt' },
      { label: 'FAQ', path: '/page/faq' },
      { label: 'Hilfe', path: '/page/hilfe' },
    ],
  },
];

const PublicFooter: React.FC<PublicFooterProps> = ({
  siteName = 'Blog CMS',
  siteDescription = 'Eine moderne Blog-Plattform',
  footerColumns = defaultFooterColumns,
  socialLinks = [],
  contactInfo,
  showNewsletter = true,
  copyrightText,
}) => {
  const [form] = Form.useForm();

  const handleNewsletterSubmit = async (values: { email: string }) => {
    try {
      console.log('Newsletter signup:', values.email);
      form.resetFields();
    } catch (error) {
      console.error('Newsletter signup failed:', error);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ background: '#001529', color: '#fff', paddingTop: 48 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Row gutter={[48, 48]}>
          <Col xs={24} md={8}>
            <Title level={4} style={{ color: '#fff', marginBottom: 16 }}>
              {siteName}
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 24 }}>
              {siteDescription}
            </Paragraph>

            {socialLinks.length > 0 && (
              <Space size={12}>
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'rgba(255,255,255,0.65)',
                      fontSize: 20,
                      transition: 'color 0.3s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = '#1890ff')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                ))}
              </Space>
            )}

            <div style={{ marginTop: 16 }}>
              <Link to="/feed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <GlobalOutlined /> RSS Feed
              </Link>
            </div>
          </Col>

          {footerColumns.map((column, index) => (
            <Col xs={12} md={4} key={index}>
              <Title level={5} style={{ color: '#fff', marginBottom: 16 }}>
                {column.title}
              </Title>
              <Space direction="vertical" size={8}>
                {column.links.map((link, linkIndex) => (
                  <Link
                    key={linkIndex}
                    to={link.path}
                    style={{
                      color: 'rgba(255,255,255,0.65)',
                      transition: 'color 0.3s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = '#1890ff')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                  >
                    {link.label}
                  </Link>
                ))}
              </Space>
            </Col>
          ))}

          <Col xs={24} md={showNewsletter ? 4 : 8}>
            {contactInfo && (
              <>
                <Title level={5} style={{ color: '#fff', marginBottom: 16 }}>
                  Kontakt
                </Title>
                <Space direction="vertical" size={8}>
                  {contactInfo.email && (
                    <a
                      href={`mailto:${contactInfo.email}`}
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                    >
                      <MailOutlined /> {contactInfo.email}
                    </a>
                  )}
                  {contactInfo.phone && (
                    <a
                      href={`tel:${contactInfo.phone}`}
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                    >
                      <PhoneOutlined /> {contactInfo.phone}
                    </a>
                  )}
                  {contactInfo.address && (
                    <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
                      <EnvironmentOutlined /> {contactInfo.address}
                    </Text>
                  )}
                </Space>
              </>
            )}
          </Col>

          {showNewsletter && (
            <Col xs={24} md={4}>
              <Title level={5} style={{ color: '#fff', marginBottom: 16 }}>
                Newsletter
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>
                Erhalten Sie die neuesten Artikel direkt in Ihr Postfach.
              </Paragraph>
              <Form form={form} onFinish={handleNewsletterSubmit}>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: 'Bitte Email eingeben' },
                    { type: 'email', message: 'Ungültige Email' },
                  ]}
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Ihre Email" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" block>
                    Anmelden
                  </Button>
                </Form.Item>
              </Form>
            </Col>
          )}
        </Row>

        <Divider style={{ background: 'rgba(255,255,255,0.1)', margin: '32px 0 24px' }} />

        <Row justify="space-between" align="middle" style={{ paddingBottom: 24 }}>
          <Col>
            <Text style={{ color: 'rgba(255,255,255,0.45)' }}>
              {copyrightText || `© ${currentYear} ${siteName}. Alle Rechte vorbehalten.`}
            </Text>
          </Col>
          <Col>
            <Space split={<Divider type="vertical" style={{ background: 'rgba(255,255,255,0.2)' }} />}>
              <Link to="/page/datenschutz" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                Datenschutz
              </Link>
              <Link to="/page/impressum" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                Impressum
              </Link>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('openCookieSettings'));
                }}
                style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}
              >
                Cookie-Einstellungen
              </a>
            </Space>
          </Col>
        </Row>
      </div>

      <style>{`
        footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </footer>
  );
};

export default PublicFooter;
export type { FooterColumn, FooterLink, SocialLink, PublicFooterProps };
