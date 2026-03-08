import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  message,
  Select,
  Input,
  Switch,
  DatePicker,
  Drawer,
  Tabs,
  Tooltip,
  Badge,
  Progress,
  Dropdown,
  Menu,
  Modal,
  Form,
  Spin,
  Typography,
  Divider,
  Upload,
  Image,
  Popover,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  RobotOutlined,
  PictureOutlined,
  FontSizeOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  MessageOutlined,
  CodeOutlined,
  LinkOutlined,
  TableOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BulbOutlined,
  FormOutlined,
  TranslationOutlined,
  SoundOutlined,
  FileTextOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  DragOutlined,
  FullscreenOutlined,
  UndoOutlined,
  RedoOutlined,
  SettingOutlined,
  SearchOutlined,
  CloudUploadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { postService, categoryService, tagService, mediaService, aiService } from '../services/api';
import type { Post, Category, Tag as TagType, Media } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface SEOScore {
  score: number;
  title: { status: string; message: string };
  metaDescription: { status: string; message: string };
  contentLength: { status: string; message: string; value: number };
  headings: { status: string; message: string; value: number };
  links: { status: string; message: string; value: number };
  images: { status: string; message: string; value: number };
  keywordDensity: { status: string; message: string; value: number };
  readability: { status: string; message: string; value: number };
}

interface ContentBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'image' | 'video' | 'quote' | 'list' | 'code' | 'cta' | 'gallery' | 'embed';
  content: string;
  settings?: Record<string, any>;
}

const BLOCK_TYPES = [
  { type: 'paragraph', icon: <FileTextOutlined />, label: 'Paragraph' },
  { type: 'heading', icon: <FontSizeOutlined />, label: 'Heading' },
  { type: 'image', icon: <PictureOutlined />, label: 'Image' },
  { type: 'quote', icon: <MessageOutlined />, label: 'Quote' },
  { type: 'list', icon: <UnorderedListOutlined />, label: 'List' },
  { type: 'code', icon: <CodeOutlined />, label: 'Code' },
  { type: 'cta', icon: <ThunderboltOutlined />, label: 'Call to Action' },
  { type: 'gallery', icon: <PictureOutlined />, label: 'Gallery' },
  { type: 'embed', icon: <LinkOutlined />, label: 'Embed' },
];

const PostEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const editorRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDrawerVisible, setAiDrawerVisible] = useState(false);
  const [mediaDrawerVisible, setMediaDrawerVisible] = useState(false);
  const [seoDrawerVisible, setSeoDrawerVisible] = useState(false);
  const [blockDrawerVisible, setBlockDrawerVisible] = useState(false);
  const [settingsDrawerVisible, setSettingsDrawerVisible] = useState(false);
  
  const [mediaFiles, setMediaFiles] = useState<Media[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null);
  const [focusKeyword, setFocusKeyword] = useState('');
  
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [editorMode, setEditorMode] = useState<'visual' | 'blocks' | 'markdown'>('visual');
  
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);

  useEffect(() => {
    fetchCategories();
    fetchTags();
    fetchMedia();
    if (id) {
      fetchPost(id);
    }
  }, [id]);

  useEffect(() => {
    if (autoSaveEnabled && content) {
      const interval = setInterval(handleAutoSave, 30000);
      return () => clearInterval(interval);
    }
  }, [autoSaveEnabled, content, id]);

  useEffect(() => {
    updateWordCount();
  }, [content]);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data.data || data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await tagService.getAll();
      setTags(data.data || data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const fetchMedia = async () => {
    try {
      const data = await mediaService.getAll({ per_page: 50 });
      setMediaFiles(data.data || data);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    }
  };

  const fetchPost = async (postId: string) => {
    setLoading(true);
    try {
      const data = await postService.get(postId);
      setPost(data);
      setContent(data.content || '');
      setFocusKeyword(data.focus_keyword || '');
      form.setFieldsValue({
        ...data,
        category_ids: data.categories?.map((c: Category) => c.id),
        tag_ids: data.tags?.map((t: TagType) => t.id),
        published_at: data.published_at ? dayjs(data.published_at) : null,
      });
      analyzeSEO(data.content, data.title, data.meta_description);
    } catch (error) {
      message.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const updateWordCount = () => {
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text.split(' ').filter(w => w.length > 0).length;
    setWordCount(words);
    setReadingTime(Math.ceil(words / 200));
  };

  const handleAutoSave = async () => {
    const values = form.getFieldsValue();
    if (!values.title) return;
    
    try {
      setSaving(true);
      if (id) {
        await postService.update(id, { ...values, content, status: 'draft' });
      } else {
        const newPost = await postService.create({ ...values, content, status: 'draft' });
        navigate(`/posts/${newPost.id}/edit`, { replace: true });
      }
      setLastSaved(new Date());
      message.info('Auto-saved', 1);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (publish = false) => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      
      const postData = {
        ...values,
        content,
        focus_keyword: focusKeyword,
        status: publish ? 'published' : values.status || 'draft',
        published_at: publish ? new Date().toISOString() : values.published_at?.toISOString(),
        word_count: wordCount,
        reading_time: readingTime,
      };

      if (id) {
        await postService.update(id, postData);
        message.success(publish ? 'Post published!' : 'Post saved!');
      } else {
        const newPost = await postService.create(postData);
        message.success(publish ? 'Post published!' : 'Post created!');
        navigate(`/posts/${newPost.id}/edit`, { replace: true });
      }
      
      setLastSaved(new Date());
    } catch (error) {
      message.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (newContent: string) => {
    setContent(newContent);
  };

  const analyzeSEO = async (contentText?: string, title?: string, metaDesc?: string) => {
    const contentToAnalyze = contentText || content;
    const titleToAnalyze = title || form.getFieldValue('title');
    const metaToAnalyze = metaDesc || form.getFieldValue('meta_description');
    
    if (!contentToAnalyze || !titleToAnalyze) return;
    
    const score: SEOScore = {
      score: 0,
      title: { status: 'warning', message: '' },
      metaDescription: { status: 'warning', message: '' },
      contentLength: { status: 'warning', message: '', value: wordCount },
      headings: { status: 'warning', message: '', value: 0 },
      links: { status: 'warning', message: '', value: 0 },
      images: { status: 'warning', message: '', value: 0 },
      keywordDensity: { status: 'warning', message: '', value: 0 },
      readability: { status: 'warning', message: '', value: 0 },
    };

    if (titleToAnalyze.length >= 30 && titleToAnalyze.length <= 60) {
      score.title = { status: 'success', message: 'Good length (30-60 chars)' };
    } else if (titleToAnalyze.length < 30) {
      score.title = { status: 'warning', message: 'Too short (min 30 chars)' };
    } else {
      score.title = { status: 'error', message: 'Too long (max 60 chars)' };
    }

    if (metaToAnalyze?.length >= 120 && metaToAnalyze?.length <= 160) {
      score.metaDescription = { status: 'success', message: 'Good length' };
    } else if (!metaToAnalyze) {
      score.metaDescription = { status: 'error', message: 'Missing' };
    } else {
      score.metaDescription = { status: 'warning', message: 'Optimize length (120-160)' };
    }

    if (wordCount >= 300) {
      score.contentLength = { status: 'success', message: 'Good length', value: wordCount };
    } else {
      score.contentLength = { status: 'warning', message: 'Add more content (min 300 words)', value: wordCount };
    }

    const headingMatches = contentToAnalyze.match(/<h[2-6][^>]*>.*?<\/h[2-6]>/gi) || [];
    score.headings = {
      status: headingMatches.length >= 3 ? 'success' : 'warning',
      message: `${headingMatches.length} subheadings found`,
      value: headingMatches.length,
    };

    const linkMatches = contentToAnalyze.match(/<a[^>]*href/gi) || [];
    score.links = {
      status: linkMatches.length >= 3 ? 'success' : 'warning',
      message: `${linkMatches.length} links`,
      value: linkMatches.length,
    };

    const imageMatches = contentToAnalyze.match(/<img[^>]*>/gi) || [];
    const imagesWithAlt = contentToAnalyze.match(/<img[^>]*alt=["'][^"']+["']/gi) || [];
    score.images = {
      status: imageMatches.length === imagesWithAlt.length ? 'success' : 'warning',
      message: `${imagesWithAlt.length}/${imageMatches.length} have alt text`,
      value: imageMatches.length,
    };

    if (focusKeyword) {
      const plainText = contentToAnalyze.replace(/<[^>]*>/g, ' ').toLowerCase();
      const keywordCount = (plainText.match(new RegExp(focusKeyword.toLowerCase(), 'g')) || []).length;
      const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
      score.keywordDensity = {
        status: density >= 0.5 && density <= 3 ? 'success' : 'warning',
        message: `${density.toFixed(2)}% density`,
        value: density,
      };
    }

    score.readability = {
      status: wordCount > 0 && readingTime <= 5 ? 'success' : 'warning',
      message: `${readingTime} min read`,
      value: readingTime,
    };

    const scores = Object.values(score).filter(v => typeof v === 'object' && 'status' in v);
    const successCount = scores.filter((s: any) => s.status === 'success').length;
    score.score = Math.round((successCount / scores.length) * 100);

    setSeoScore(score);
  };

  const handleAIAction = async (action: string, options?: any) => {
    setAiLoading(true);
    try {
      const selectedText = editorRef.current?.selection.getContent({ format: 'text' });
      let result;

      switch (action) {
        case 'generate':
          result = await aiService.generateContent({
            topic: options?.topic || form.getFieldValue('title'),
            tone: options?.tone || 'professional',
            word_count: options?.wordCount || 500,
          });
          break;

        case 'improve':
          result = await aiService.generateContent({
            prompt: `Improve this text, make it more engaging and professional:\n\n${selectedText || content}`,
          });
          break;

        case 'expand':
          result = await aiService.generateContent({
            prompt: `Expand on this content with more details and examples:\n\n${selectedText || content}`,
          });
          break;

        case 'summarize':
          result = await aiService.generateSummary(selectedText || content, 160);
          if (result.content) {
            form.setFieldValue('meta_description', result.content.trim());
            message.success('Summary added to meta description');
          }
          break;

        case 'fix-grammar':
          result = await aiService.proofread(selectedText || content);
          if (result.analysis?.corrected_content) {
            if (selectedText && editorRef.current) {
              editorRef.current.selection.setContent(result.analysis.corrected_content);
            } else {
              setContent(result.analysis.corrected_content);
            }
            message.success(`Fixed! Score: ${result.analysis.score}/100`);
          }
          break;

        case 'generate-tags':
          result = await aiService.generateTags(
            form.getFieldValue('title'),
            content,
            5
          );
          if (result.tags) {
            message.success(`Generated ${result.tags.length} tags`);
          }
          break;

        case 'generate-headlines':
          result = await aiService.suggestHeadlines(
            form.getFieldValue('title'),
            content,
            5
          );
          if (result.headlines) {
            Modal.info({
              title: 'Suggested Headlines',
              content: (
                <ul>
                  {result.headlines.map((h: string, i: number) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      <Button size="small" onClick={() => {
                        form.setFieldValue('title', h);
                        Modal.destroyAll();
                      }}>
                        Use
                      </Button>
                      {' '}{h}
                    </li>
                  ))}
                </ul>
              ),
            });
          }
          break;

        case 'translate':
          result = await aiService.translate(selectedText || content, options?.language || 'en');
          break;

        case 'seo-optimize':
          result = await aiService.optimizeSEO(form.getFieldValue('title'), content);
          if (result.content) {
            const seoResult = JSON.parse(result.content);
            Modal.info({
              title: 'SEO Analysis',
              width: 600,
              content: (
                <div>
                  <p><strong>Score:</strong> {seoResult['SEO Score']}/100</p>
                  <p><strong>Improved Title:</strong> {seoResult['Improved Title']}</p>
                  <p><strong>Meta Description:</strong> {seoResult['Meta Description']}</p>
                </div>
              ),
            });
          }
          break;
      }

      if (result?.content && action !== 'summarize' && action !== 'generate-tags' && action !== 'seo-optimize') {
        if (selectedText && editorRef.current) {
          editorRef.current.selection.setContent(result.content);
        } else {
          setContent(prev => prev + '\n\n' + result.content);
        }
        message.success('AI generated content!');
      }
    } catch (error) {
      message.error('AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const insertMedia = (media: Media) => {
    const imgHtml = `<img src="${media.url}" alt="${media.alt_text || ''}" style="max-width: 100%;" />`;
    if (editorRef.current) {
      editorRef.current.insertContent(imgHtml);
    }
    setMediaDrawerVisible(false);
    message.success('Image inserted');
  };

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      settings: {},
    };
    setContentBlocks([...contentBlocks, newBlock]);
    setBlockDrawerVisible(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const result = await mediaService.upload(file);
      const imgHtml = `<img src="${result.url}" alt="" style="max-width: 100%;" />`;
      if (editorRef.current) {
        editorRef.current.insertContent(imgHtml);
      }
      message.success('Image uploaded and inserted');
    } catch (error) {
      message.error('Upload failed');
    }
  };

  const aiMenu = (
    <Menu>
      <Menu.Item key="generate" icon={<BulbOutlined />} onClick={() => handleAIAction('generate')}>
        Generate Content
      </Menu.Item>
      <Menu.Item key="improve" icon={<EditOutlined />} onClick={() => handleAIAction('improve')}>
        Improve Writing
      </Menu.Item>
      <Menu.Item key="expand" icon={<FormOutlined />} onClick={() => handleAIAction('expand')}>
        Expand Content
      </Menu.Item>
      <Menu.Item key="summarize" icon={<FileTextOutlined />} onClick={() => handleAIAction('summarize')}>
        Generate Summary
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="fix-grammar" icon={<CheckCircleOutlined />} onClick={() => handleAIAction('fix-grammar')}>
        Fix Grammar & Spelling
      </Menu.Item>
      <Menu.Item key="translate" icon={<TranslationOutlined />} onClick={() => handleAIAction('translate', { language: 'en' })}>
        Translate to English
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="generate-tags" icon={<EditOutlined />} onClick={() => handleAIAction('generate-tags')}>
        Generate Tags
      </Menu.Item>
      <Menu.Item key="headlines" icon={<H1Outlined />} onClick={() => handleAIAction('generate-headlines')}>
        Suggest Headlines
      </Menu.Item>
      <Menu.Item key="seo" icon={<SafetyCertificateOutlined />} onClick={() => handleAIAction('seo-optimize')}>
        SEO Optimize
      </Menu.Item>
    </Menu>
  );

  const getSeoColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const getSeoStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'error': return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      default: return null;
    }
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Card
        loading={loading}
        title={
          <Space>
            <span>{id ? 'Edit Post' : 'New Post'}</span>
            {post && (
              <Tag color={
                post.status === 'published' ? 'success' :
                post.status === 'scheduled' ? 'processing' :
                post.status === 'draft' ? 'default' : 'warning'
              }>
                {post.status.toUpperCase()}
              </Tag>
            )}
            {wordCount > 0 && (
              <Badge count={`${wordCount} words`} style={{ backgroundColor: '#1890ff' }} />
            )}
          </Space>
        }
        extra={
          <Space>
            {lastSaved && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Saved: {lastSaved.toLocaleTimeString()}
              </Text>
            )}
            <Button icon={<EyeOutlined />} onClick={() => setSeoDrawerVisible(true)}>
              SEO {seoScore && (
                <Badge 
                  count={seoScore.score} 
                  style={{ 
                    backgroundColor: getSeoColor(seoScore.score),
                    marginLeft: 4 
                  }} 
                />
              )}
            </Button>
            <Button icon={<PictureOutlined />} onClick={() => setMediaDrawerVisible(true)}>
              Media
            </Button>
            <Dropdown overlay={aiMenu} trigger={['click']}>
              <Button icon={<RobotOutlined />} loading={aiLoading}>
                AI Assistant
              </Button>
            </Dropdown>
            <Button onClick={() => handleSave(false)} loading={saving}>
              Save Draft
            </Button>
            <Button type="primary" onClick={() => handleSave(true)} loading={saving}>
              Publish
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                rules={[{ required: true, message: 'Title required' }]}
              >
                <Input
                  placeholder="Enter post title..."
                  size="large"
                  showCount
                  maxLength={255}
                  onChange={() => analyzeSEO()}
                />
              </Form.Item>

              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Select value={editorMode} onChange={setEditorMode} style={{ width: 120 }}>
                    <Option value="visual">Visual</Option>
                    <Option value="blocks">Blocks</Option>
                    <Option value="markdown">Markdown</Option>
                  </Select>
                  <Button icon={<PlusOutlined />} onClick={() => setBlockDrawerVisible(true)}>
                    Add Block
                  </Button>
                  <Button icon={<PictureOutlined />} onClick={() => setMediaDrawerVisible(true)}>
                    Add Media
                  </Button>
                  <Button icon={<LinkOutlined />}>
                    Add Link
                  </Button>
                </Space>
              </div>

              <Form.Item name="content">
                <Editor
                  apiKey="no-api-key"
                  onInit={(evt, editor) => editorRef.current = editor}
                  value={content}
                  onEditorChange={handleEditorChange}
                  init={{
                    height: 600,
                    menubar: true,
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                      'emoticons', 'codesample', 'quickbars', 'pagebreak',
                    ],
                    toolbar:
                      'undo redo | blocks fontfamily fontsize | ' +
                      'bold italic underline strikethrough | ' +
                      'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
                      'bullist numlist outdent indent | ' +
                      'link image media table | ' +
                      'codesample code fullscreen preview | ' +
                      'emoticons pagebreak | help',
                    quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
                    quickbars_insert_toolbar: 'quickimage quicktable',
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 16px; line-height: 1.6; }',
                    automatic_uploads: true,
                    file_picker_types: 'image media',
                    file_picker_callback: (callback: any) => {
                      setMediaDrawerVisible(true);
                      window.insertMediaCallback = callback;
                    },
                    images_upload_handler: async (blobInfo: any) => {
                      try {
                        const file = blobInfo.blob();
                        const result = await mediaService.upload(file);
                        return result.url;
                      } catch (error) {
                        message.error('Upload failed');
                        return '';
                      }
                    },
                    setup: (editor: any) => {
                      editor.ui.registry.addButton('aiassist', {
                        text: 'AI',
                        icon: 'user',
                        onAction: () => setAiDrawerVisible(true),
                      });
                    },
                  }}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="meta_title" label="Meta Title">
                    <Input 
                      placeholder="SEO title" 
                      showCount 
                      maxLength={60}
                      onChange={() => analyzeSEO()}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="focus_keyword" label="Focus Keyword">
                    <Input 
                      placeholder="Main keyword for SEO"
                      value={focusKeyword}
                      onChange={(e) => {
                        setFocusKeyword(e.target.value);
                        analyzeSEO();
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="meta_description" label="Meta Description">
                <TextArea 
                  rows={2} 
                  placeholder="SEO description"
                  showCount
                  maxLength={160}
                  onChange={() => analyzeSEO()}
                />
              </Form.Item>

              <Form.Item name="excerpt" label="Excerpt">
                <TextArea rows={3} placeholder="Short excerpt for previews" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Card title="Publish Settings" size="small" style={{ marginBottom: 16 }}>
                <Form.Item name="status" label="Status">
                  <Select>
                    <Option value="draft">Draft</Option>
                    <Option value="private">Private</Option>
                    <Option value="scheduled">Scheduled</Option>
                    <Option value="published">Published</Option>
                    <Option value="archived">Archived</Option>
                  </Select>
                </Form.Item>

                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) =>
                    getFieldValue('status') === 'scheduled' && (
                      <Form.Item name="scheduled_at" label="Schedule For">
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    )
                  }
                </Form.Item>

                <Form.Item name="language" label="Language">
                  <Select>
                    <Option value="de">Deutsch</Option>
                    <Option value="en">English</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Auto-Save">
                  <Switch checked={autoSaveEnabled} onChange={setAutoSaveEnabled} />
                </Form.Item>

                <Space>
                  <Text type="secondary">
                    {readingTime} min read
                  </Text>
                </Space>
              </Card>

              <Card title="Categories & Tags" size="small" style={{ marginBottom: 16 }}>
                <Form.Item name="category_ids" label="Categories">
                  <Select mode="multiple" placeholder="Select categories">
                    {categories.map((cat) => (
                      <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="tag_ids" label="Tags">
                  <Select mode="tags" placeholder="Select or create tags">
                    {tags.map((tag) => (
                      <Option key={tag.id} value={tag.id}>{tag.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Card>

              <Card title="Featured Image" size="small" style={{ marginBottom: 16 }}>
                <Form.Item name="featured_image_id">
                  <Upload
                    listType="picture-card"
                    maxCount={1}
                    showUploadList={false}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      try {
                        const result = await mediaService.upload(file as File);
                        form.setFieldValue('featured_image_id', result.id);
                        onSuccess?.(result);
                        message.success('Uploaded');
                      } catch (error) {
                        onError?.(error as Error);
                      }
                    }}
                  >
                    <Button icon={<CloudUploadOutlined />}>Upload</Button>
                  </Upload>
                </Form.Item>
                <Button block onClick={() => setMediaDrawerVisible(true)}>
                  Choose from Library
                </Button>
              </Card>

              {seoScore && (
                <Card 
                  title={
                    <Space>
                      <span>SEO Score</span>
                      <Progress 
                        percent={seoScore.score} 
                        size="small" 
                        strokeColor={getSeoColor(seoScore.score)}
                        style={{ width: 100 }}
                      />
                    </Space>
                  } 
                  size="small"
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {[
                      { key: 'title', label: 'Title' },
                      { key: 'metaDescription', label: 'Meta Desc' },
                      { key: 'contentLength', label: 'Content' },
                      { key: 'headings', label: 'Headings' },
                      { key: 'links', label: 'Links' },
                      { key: 'images', label: 'Images' },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {getSeoStatusIcon((seoScore as any)[key].status)}
                        <Text>{label}</Text>
                      </div>
                    ))}
                  </Space>
                </Card>
              )}
            </Col>
          </Row>
        </Form>
      </Card>

      <Drawer
        title="AI Assistant"
        placement="right"
        width={400}
        open={aiDrawerVisible}
        onClose={() => setAiDrawerVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            type="info"
            message="Select text in the editor to transform it, or generate new content."
          />
          
          <Card title="Generate Content" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<BulbOutlined />} onClick={() => handleAIAction('generate')} loading={aiLoading}>
                Generate Full Article
              </Button>
              <Button block icon={<EditOutlined />} onClick={() => handleAIAction('improve')} loading={aiLoading}>
                Improve Selected Text
              </Button>
              <Button block icon={<FormOutlined />} onClick={() => handleAIAction('expand')} loading={aiLoading}>
                Expand Content
              </Button>
            </Space>
          </Card>

          <Card title="Quick Actions" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<CheckCircleOutlined />} onClick={() => handleAIAction('fix-grammar')} loading={aiLoading}>
                Fix Grammar & Spelling
              </Button>
              <Button block icon={<FileTextOutlined />} onClick={() => handleAIAction('summarize')} loading={aiLoading}>
                Generate Summary
              </Button>
              <Button block icon={<H1Outlined />} onClick={() => handleAIAction('generate-headlines')} loading={aiLoading}>
                Suggest Headlines
              </Button>
              <Button block icon={<TranslationOutlined />} onClick={() => handleAIAction('translate')} loading={aiLoading}>
                Translate to English
              </Button>
            </Space>
          </Card>

          <Card title="SEO Tools" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<SafetyCertificateOutlined />} onClick={() => handleAIAction('seo-optimize')} loading={aiLoading}>
                Full SEO Analysis
              </Button>
              <Button block icon={<EditOutlined />} onClick={() => handleAIAction('generate-tags')} loading={aiLoading}>
                Auto-Generate Tags
              </Button>
            </Space>
          </Card>
        </Space>
      </Drawer>

      <Drawer
        title="Media Library"
        placement="right"
        width={500}
        open={mediaDrawerVisible}
        onClose={() => setMediaDrawerVisible(false)}
      >
        <Tabs defaultActiveKey="library">
          <TabPane tab="Library" key="library">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {mediaFiles.map((media) => (
                <Card
                  key={media.id}
                  hoverable
                  style={{ padding: 4 }}
                  cover={
                    <Image
                      src={media.url}
                      alt={media.alt_text}
                      style={{ height: 100, objectFit: 'cover' }}
                      preview={false}
                    />
                  }
                  onClick={() => insertMedia(media)}
                >
                  <Card.Meta
                    title={media.alt_text || 'No alt text'}
                    description={<Text type="secondary" style={{ fontSize: 11 }}>{media.file_path?.split('/').pop()}</Text>}
                  />
                </Card>
              ))}
            </div>
          </TabPane>
          <TabPane tab="Upload" key="upload">
            <Upload.Dragger
              multiple
              customRequest={async ({ file, onSuccess }) => {
                try {
                  await mediaService.upload(file as File);
                  fetchMedia();
                  onSuccess?.(true);
                  message.success('Uploaded');
                } catch (error) {
                  message.error('Upload failed');
                }
              }}
            >
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag files here</p>
            </Upload.Dragger>
          </TabPane>
        </Tabs>
      </Drawer>

      <Drawer
        title="SEO Analysis"
        placement="right"
        width={450}
        open={seoDrawerVisible}
        onClose={() => setSeoDrawerVisible(false)}
      >
        {seoScore ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={seoScore.score}
                strokeColor={getSeoColor(seoScore.score)}
                size={120}
              />
              <Title level={4} style={{ marginTop: 16 }}>SEO Score</Title>
            </div>

            <Divider />

            {[
              { key: 'title', label: 'Title' },
              { key: 'metaDescription', label: 'Meta Description' },
              { key: 'contentLength', label: 'Content Length' },
              { key: 'headings', label: 'Headings' },
              { key: 'links', label: 'Internal Links' },
              { key: 'images', label: 'Images' },
              { key: 'keywordDensity', label: 'Keyword Density' },
              { key: 'readability', label: 'Readability' },
            ].map(({ key, label }) => {
              const item = (seoScore as any)[key];
              return (
                <Card key={key} size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      {getSeoStatusIcon(item.status)}
                      <Text strong>{label}</Text>
                    </Space>
                    {item.value !== undefined && (
                      <Badge count={item.value} style={{ backgroundColor: '#1890ff' }} />
                    )}
                  </div>
                  <Text type="secondary">{item.message}</Text>
                </Card>
              );
            })}

            <Button type="primary" block icon={<RobotOutlined />} onClick={() => handleAIAction('seo-optimize')} loading={aiLoading}>
              AI SEO Optimization
            </Button>
          </Space>
        ) : (
          <Alert type="info" message="Start writing to see SEO analysis" />
        )}
      </Drawer>

      <Drawer
        title="Add Block"
        placement="right"
        width={300}
        open={blockDrawerVisible}
        onClose={() => setBlockDrawerVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {BLOCK_TYPES.map(({ type, icon, label }) => (
            <Button 
              key={type} 
              block 
              icon={icon}
              onClick={() => addBlock(type as ContentBlock['type'])}
              style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
            >
              {label}
            </Button>
          ))}
        </Space>
      </Drawer>
    </div>
  );
};

export default PostEditorPage;
