import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Space,
  message,
  Row,
  Col,
  Typography,
  Alert,
  Tag,
  Divider,
  List,
  Tabs,
  Progress,
  Slider,
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  EditOutlined,
  CheckCircleOutlined,
  TranslationOutlined,
  PictureOutlined,
  MessageOutlined,
  StarOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { aiService } from '../services/api';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface AIResult {
  type: string;
  data: any;
  usage?: any;
}

const AIAssistantPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [activeTab, setActiveTab] = useState('generate');

  // Content Generation
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [tone, setTone] = useState('professional');
  const [wordCount, setWordCount] = useState(1500);
  const [targetAudience, setTargetAudience] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [outline, setOutline] = useState('');

  // SEO & Analysis
  const [content, setContent] = useState('');
  const [analysisTitle, setAnalysisTitle] = useState('');

  // Translation
  const [translateContent, setTranslateContent] = useState('');
  const [targetLang, setTargetLang] = useState('DE');
  const [sourceLang, setSourceLang] = useState('auto');

  // Image Generation
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageStyle, setImageStyle] = useState('vivid');

  // Chat
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [chatInput, setChatInput] = useState('');

  const handleGenerateFullArticle = async () => {
    if (!topic && !title) {
      message.warning('Please enter a topic or title');
      return;
    }

    setLoading(true);
    try {
      const response = await aiService.generateFullArticle({
        title: title || undefined,
        topic: topic || '',
        tone,
        target_audience: targetAudience,
        keywords,
        word_count: wordCount,
        outline: outline || undefined,
        temperature,
      });

      if (response.success) {
        setResult({
          type: 'full-article',
          data: response.content,
          usage: response.usage,
        });
        message.success('Full article generated successfully!');
      } else {
        message.error(response.error || 'Generation failed');
      }
    } catch (error) {
      message.error('Failed to generate article');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeSEO = async () => {
    if (!analysisTitle || !content) {
      message.warning('Please enter title and content');
      return;
    }

    setLoading(true);
    try {
      const response = await aiService.optimizeSEO(analysisTitle, content);

      if (response.success) {
        setResult({
          type: 'seo-analysis',
          data: response.analysis,
          usage: response.usage,
        });
        message.success('SEO analysis complete!');
      } else {
        message.error(response.error || 'Analysis failed');
      }
    } catch (error) {
      message.error('Failed to analyze SEO');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTags = async () => {
    if (!analysisTitle || !content) {
      message.warning('Please enter title and content');
      return;
    }

    setLoading(true);
    try {
      const response = await aiService.generateTags(analysisTitle, content, 10);

      if (response.success) {
        setResult({
          type: 'tags',
          data: response.tags,
        });
        message.success('Tags generated!');
      } else {
        message.error('Failed to generate tags');
      }
    } catch (error) {
      message.error('Failed to generate tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!content) {
      message.warning('Please enter content to check');
      return;
    }

    setLoading(true);
    try {
      const response = await aiService.checkPlagiarism(content);

      if (response.success) {
        setResult({
          type: 'plagiarism',
          data: response.analysis,
        });
        message.success('Plagiarism check complete!');
      } else {
        message.error(response.error || 'Check failed');
      }
    } catch (error) {
      message.error('Failed to check plagiarism');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSentiment = async () => {
    if (!content) {
      message.warning('Please enter content to analyze');
      return;
    }

    setLoading(true);
    try {
      const response = await aiService.analyzeSentiment(content);

      if (response.success) {
        setResult({
          type: 'sentiment',
          data: response.sentiment,
        });
        message.success('Sentiment analysis complete!');
      } else {
        message.error('Failed to analyze sentiment');
      }
    } catch (error) {
      message.error('Failed to analyze sentiment');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestHeadlines = async () => {
    if (!topic) {
      message.warning('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const response = await aiService.suggestHeadlines(topic, content);

      if (response.success) {
        setResult({
          type: 'headlines',
          data: response.headlines,
        });
        message.success('Headlines generated!');
      } else {
        message.error('Failed to generate headlines');
      }
    } catch (error) {
      message.error('Failed to generate headlines');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!translateContent) {
      message.warning('Please enter content to translate');
      return;
    }

    setLoading(true);
    try {
      const response = await aiService.translateContent(
        translateContent,
        targetLang,
        sourceLang
      );

      if (response.success) {
        setResult({
          type: 'translation',
          data: {
            original: translateContent,
            translated: response.translated_text,
            detected_language: response.detected_language,
          },
        });
        message.success('Translation complete!');
      } else {
        message.error(response.error || 'Translation failed');
      }
    } catch (error) {
      message.error('Failed to translate');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt) {
      message.warning('Please enter an image prompt');
      return;
    }

    setLoading(true);
    try {
      const response = await aiService.generateImage(imagePrompt, imageSize, imageStyle);

      if (response.success) {
        setResult({
          type: 'image',
          data: {
            url: response.image_url,
            revised_prompt: response.revised_prompt,
          },
        });
        message.success('Image generated!');
      } else {
        message.error(response.error || 'Image generation failed');
      }
    } catch (error) {
      message.error('Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput && !keywords.includes(keywordInput)) {
      setKeywords([...keywords, keywordInput]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) {
      return;
    }

    const newMessages = [
      ...chatMessages,
      { role: 'user', content: chatInput }
    ];

    setChatMessages(newMessages);
    setChatInput('');
    setLoading(true);

    try {
      const response = await aiService.chat(newMessages);

      if (response.success) {
        setChatMessages([
          ...newMessages,
          { role: 'assistant', content: response.message }
        ]);
      } else {
        message.error(response.error || 'Chat failed');
      }
    } catch (error) {
      message.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <Card
        title={<Space><CheckCircleOutlined /> Result</Space>}
        style={{ marginTop: 16 }}
        extra={
          <Button size="small" onClick={() => setResult(null)}>
            Clear
          </Button>
        }
      >
        {result.type === 'full-article' && (
          <div>
            <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 16 }}>
              {result.data}
            </Paragraph>
            {result.usage && (
              <Alert
                message={`Tokens used: ${result.usage.total_tokens || 'N/A'}`}
                type="info"
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        )}

        {result.type === 'seo-analysis' && (
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {result.data}
          </Paragraph>
        )}

        {result.type === 'tags' && (
          <Space wrap>
            {result.data.map((tag: string, i: number) => (
              <Tag key={i} color="blue" style={{ fontSize: 14 }}>{tag}</Tag>
            ))}
          </Space>
        )}

        {result.type === 'headlines' && (
          <List
            dataSource={result.data}
            renderItem={(headline: string, i: number) => (
              <List.Item>
                <Space>
                  <Tag color="green">{i + 1}</Tag>
                  <Text strong>{headline}</Text>
                </Space>
              </List.Item>
            )}
          />
        )}

        {result.type === 'plagiarism' && (
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {result.data}
          </Paragraph>
        )}

        {result.type === 'sentiment' && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small">
                  <Text type="secondary">Sentiment</Text>
                  <Title level={4}>{result.data.sentiment}</Title>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Text type="secondary">Score</Text>
                  <Progress
                    percent={result.data.score}
                    status={result.data.score > 60 ? 'success' : result.data.score < 40 ? 'exception' : 'normal'}
                  />
                </Card>
              </Col>
            </Row>
            <Divider />
            <Text strong>Tone: </Text>
            <Tag>{result.data.tone}</Tag>
            <br /><br />
            <Text strong>Confidence: </Text>
            <Progress percent={result.data.confidence} size="small" style={{ width: 200 }} />
          </div>
        )}

        {result.type === 'translation' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Original: </Text>
              <Text type="secondary">({result.data.detected_language || 'Unknown'})</Text>
              <Paragraph style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 12 }}>
                {result.data.original}
              </Paragraph>
            </div>
            <div>
              <Text strong>Translated: </Text>
              <Text type="secondary">({targetLang})</Text>
              <Paragraph style={{ whiteSpace: 'pre-wrap', background: '#e6f7ff', padding: 12, borderLeft: '3px solid #1890ff' }}>
                {result.data.translated}
              </Paragraph>
            </div>
          </div>
        )}

        {result.type === 'image' && (
          <div>
            <img
              src={result.data.url}
              alt="AI Generated"
              style={{ maxWidth: '100%', borderRadius: 8 }}
            />
            {result.data.revised_prompt && (
              <Alert
                message="Revised Prompt"
                description={result.data.revised_prompt}
                type="info"
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div>
      <Title level={2}>
        <RobotOutlined /> AI Content Assistant
      </Title>
      <Text type="secondary">Advanced AI-powered content creation, optimization, and analysis</Text>

      <Divider />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={<span><FileTextOutlined /> Generate</span>} key="generate">
          <Row gutter={16}>
            <Col span={16}>
              <Card title="Full Article Generator">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Input
                    placeholder="Article Title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    prefix={<EditOutlined />}
                  />

                  <TextArea
                    rows={2}
                    placeholder="Topic (required if no title)"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />

                  <Select
                    style={{ width: '100%' }}
                    value={tone}
                    onChange={setTone}
                    placeholder="Select tone"
                  >
                    <Select.Option value="professional">Professional</Select.Option>
                    <Select.Option value="casual">Casual</Select.Option>
                    <Select.Option value="friendly">Friendly</Select.Option>
                    <Select.Option value="formal">Formal</Select.Option>
                    <Select.Option value="technical">Technical</Select.Option>
                    <Select.Option value="conversational">Conversational</Select.Option>
                  </Select>

                  <Input
                    placeholder="Target Audience (optional)"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />

                  <div>
                    <Text strong>Keywords: </Text>
                    <Space wrap>
                      {keywords.map((kw) => (
                        <Tag
                          key={kw}
                          closable
                          onClose={() => handleRemoveKeyword(kw)}
                          color="blue"
                        >
                          {kw}
                        </Tag>
                      ))}
                    </Space>
                    <Input
                      style={{ marginTop: 8 }}
                      placeholder="Add keyword and press Enter"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onPressEnter={handleAddKeyword}
                      suffix={<Button type="link" size="small" onClick={handleAddKeyword}>Add</Button>}
                    />
                  </div>

                  <div>
                    <Text strong>Word Count: {wordCount}</Text>
                    <Slider
                      min={100}
                      max={5000}
                      step={100}
                      value={wordCount}
                      onChange={setWordCount}
                    />
                  </div>

                  <TextArea
                    rows={4}
                    placeholder="Custom outline (optional)"
                    value={outline}
                    onChange={(e) => setOutline(e.target.value)}
                  />

                  <div>
                    <Text strong>Creativity (Temperature): {temperature}</Text>
                    <Slider
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperature}
                      onChange={setTemperature}
                      marks={{
                        0: 'Focused',
                        1: 'Balanced',
                        2: 'Creative'
                      }}
                    />
                  </div>

                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={handleGenerateFullArticle}
                    loading={loading}
                    block
                    size="large"
                  >
                    Generate Full Article
                  </Button>
                </Space>
              </Card>
            </Col>

            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Card title="Quick Actions" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                      placeholder="Enter topic for headlines"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                    <Button
                      block
                      icon={<StarOutlined />}
                      onClick={handleSuggestHeadlines}
                      loading={loading}
                    >
                      Generate Headlines
                    </Button>
                  </Space>
                </Card>

                <Card title="AI Chat" size="small">
                  <div style={{ height: 300, overflow: 'auto', marginBottom: 8 }}>
                    {chatMessages.length === 0 ? (
                      <Text type="secondary">Start a conversation with AI...</Text>
                    ) : (
                      chatMessages.map((msg, i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <Tag color={msg.role === 'user' ? 'blue' : 'green'}>
                            {msg.role}
                          </Tag>
                          <Text>{msg.content}</Text>
                        </div>
                      ))
                    )}
                  </div>
                  <Input.Search
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onSearch={handleSendChat}
                    placeholder="Ask AI anything..."
                    enterButton={<MessageOutlined />}
                    loading={loading}
                  />
                </Card>
              </Space>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><SearchOutlined /> Analyze</span>} key="analyze">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Content Input">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Input
                    placeholder="Post Title"
                    value={analysisTitle}
                    onChange={(e) => setAnalysisTitle(e.target.value)}
                  />
                  <TextArea
                    rows={12}
                    placeholder="Paste your content here for analysis..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </Space>
              </Card>
            </Col>

            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Card title="SEO Optimization" size="small">
                  <Button
                    block
                    icon={<ThunderboltOutlined />}
                    onClick={handleOptimizeSEO}
                    loading={loading}
                  >
                    Optimize SEO
                  </Button>
                </Card>

                <Card title="Generate Tags" size="small">
                  <Button
                    block
                    onClick={handleGenerateTags}
                    loading={loading}
                  >
                    Generate Tags
                  </Button>
                </Card>

                <Card title="Plagiarism Check" size="small">
                  <Button
                    block
                    onClick={handleCheckPlagiarism}
                    loading={loading}
                  >
                    Check Plagiarism
                  </Button>
                </Card>

                <Card title="Sentiment Analysis" size="small">
                  <Button
                    block
                    onClick={handleAnalyzeSentiment}
                    loading={loading}
                  >
                    Analyze Sentiment
                  </Button>
                </Card>
              </Space>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><TranslationOutlined /> Translate</span>} key="translate">
          <Card title="DeepL Translation">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Source Language:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={sourceLang}
                    onChange={setSourceLang}
                  >
                    <Select.Option value="auto">Auto Detect</Select.Option>
                    <Select.Option value="EN">English</Select.Option>
                    <Select.Option value="DE">German</Select.Option>
                    <Select.Option value="FR">French</Select.Option>
                    <Select.Option value="ES">Spanish</Select.Option>
                    <Select.Option value="IT">Italian</Select.Option>
                    <Select.Option value="NL">Dutch</Select.Option>
                    <Select.Option value="PL">Polish</Select.Option>
                  </Select>
                </Col>

                <Col span={12}>
                  <Text strong>Target Language:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={targetLang}
                    onChange={setTargetLang}
                  >
                    <Select.Option value="DE">German</Select.Option>
                    <Select.Option value="EN">English</Select.Option>
                    <Select.Option value="FR">French</Select.Option>
                    <Select.Option value="ES">Spanish</Select.Option>
                    <Select.Option value="IT">Italian</Select.Option>
                    <Select.Option value="NL">Dutch</Select.Option>
                    <Select.Option value="PL">Polish</Select.Option>
                  </Select>
                </Col>
              </Row>

              <TextArea
                rows={8}
                placeholder="Enter text to translate..."
                value={translateContent}
                onChange={(e) => setTranslateContent(e.target.value)}
              />

              <Button
                type="primary"
                icon={<TranslationOutlined />}
                onClick={handleTranslate}
                loading={loading}
                block
                size="large"
              >
                Translate Content
              </Button>
            </Space>
          </Card>
        </TabPane>

        <TabPane tab={<span><PictureOutlined /> Image</span>} key="image">
          <Card title="DALL-E Image Generation">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <TextArea
                rows={4}
                placeholder="Describe the image you want to generate..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
              />

              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Size:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={imageSize}
                    onChange={setImageSize}
                  >
                    <Select.Option value="1024x1024">Square (1024x1024)</Select.Option>
                    <Select.Option value="1792x1024">Landscape (1792x1024)</Select.Option>
                    <Select.Option value="1024x1792">Portrait (1024x1792)</Select.Option>
                  </Select>
                </Col>

                <Col span={12}>
                  <Text strong>Style:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={imageStyle}
                    onChange={setImageStyle}
                  >
                    <Select.Option value="vivid">Vivid (Hyper-realistic)</Select.Option>
                    <Select.Option value="natural">Natural (More subtle)</Select.Option>
                  </Select>
                </Col>
              </Row>

              <Button
                type="primary"
                icon={<PictureOutlined />}
                onClick={handleGenerateImage}
                loading={loading}
                block
                size="large"
              >
                Generate Image
              </Button>

              <Alert
                message="Image Generation Info"
                description="Images are generated using DALL-E 3. The process may take 10-30 seconds. Make sure your prompt is descriptive for best results."
                type="info"
                showIcon
              />
            </Space>
          </Card>
        </TabPane>
      </Tabs>

      {renderResult()}
    </div>
  );
};

export default AIAssistantPage;
