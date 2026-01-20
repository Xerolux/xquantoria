import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Select,
  message,
  Card,
  Row,
  Col,
  Tag,
  Space,
  Modal,
  Descriptions,
  Upload,
  Switch,
  DatePicker,
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  UploadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { postService, categoryService, tagService, mediaService } from '../services/api';
import type { Post, Category, Tag as TagType, Media } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const PostEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [post, setPost] = useState<Post | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchTags();
    if (id) {
      fetchPost(id);
    }

    // Auto-Save alle 30 Sekunden
    let autoSaveInterval: number | undefined;
    if (autoSaveEnabled) {
      autoSaveInterval = window.setInterval(() => {
        handleAutoSave();
      }, 30000);
    }

    return () => {
      if (autoSaveInterval) clearInterval(autoSaveInterval);
    };
  }, [id, autoSaveEnabled]);

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

  const fetchPost = async (postId: string) => {
    setLoading(true);
    try {
      const data = await postService.get(postId);
      setPost(data);
      form.setFieldsValue({
        ...data,
        category_ids: data.categories?.map((c: Category) => c.id),
        tag_ids: data.tags?.map((t: TagType) => t.id),
        published_at: data.published_at ? dayjs(data.published_at) : null,
      });
    } catch (error) {
      message.error('Failed to fetch post');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (id) {
        await postService.update(id, {
          ...values,
          status: 'draft', // Auto-save immer als Draft
        });
      } else {
        // Für neue Posts nur Auto-save wenn Titel vorhanden
        if (values.title) {
          const newPost = await postService.create({
            ...values,
            status: 'draft',
          });
          // Redirect zur Edit-Seite des neuen Posts
          navigate(`/posts/${newPost.id}/edit`, { replace: true });
        }
      }

      setLastSaved(new Date());
      message.success('Auto-saved', 1);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (publish = false) => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const status = values.status || 'draft';
      const isScheduled = status === 'scheduled';

      const postData = {
        ...values,
        status: publish && !isScheduled ? 'published' : status,
        published_at: isScheduled ? values.scheduled_at?.toISOString() : (publish ? new Date().toISOString() : values.published_at?.toISOString()),
        scheduled_at: isScheduled ? values.scheduled_at?.toISOString() : undefined,
      };

      if (id) {
        await postService.update(id, postData);
        message.success(`Post ${isScheduled ? 'scheduled' : (publish ? 'published' : 'saved')} successfully`);
      } else {
        const newPost = await postService.create(postData);
        message.success(`Post ${isScheduled ? 'scheduled' : (publish ? 'published' : 'created')} successfully`);
        navigate(`/posts/${newPost.id}/edit`, { replace: true });
      }

      setLastSaved(new Date());
    } catch (error) {
      message.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    setPreviewVisible(true);
  };

  const formValues = Form.useWatch([], form);

  return (
    <div>
      <Card
        title={
          <Space>
            <span>{id ? 'Edit Post' : 'New Post'}</span>
            {id && <Tag color={post?.status === 'published' ? 'green' : 'default'}>{post?.status}</Tag>}
          </Space>
        }
        extra={
          <Space>
            {lastSaved && (
              <span style={{ color: '#999', fontSize: 12 }}>
                <ClockCircleOutlined /> Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button icon={<EyeOutlined />} onClick={handlePreview}>
              Preview
            </Button>
            <Button onClick={() => handleSave(false)} loading={saving} icon={<SaveOutlined />}>
              Save Draft
            </Button>
            <Button type="primary" onClick={() => handleSave(true)} loading={saving}>
              Publish
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'draft',
            language: 'de',
          }}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true, message: 'Please enter title' }]}
              >
                <Input
                  placeholder="Enter post title"
                  size="large"
                  showCount
                  maxLength={255}
                />
              </Form.Item>

              <Form.Item
                name="content"
                label="Content"
                rules={[{ required: true, message: 'Please enter content' }]}
              >
                <Editor
                  apiKey="no-api-key"
                  init={{
                    height: 500,
                    menubar: true,
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                    ],
                    toolbar:
                      'undo redo | blocks | ' +
                      'bold italic forecolor | alignleft aligncenter ' +
                      'alignright alignjustify | bullist numlist outdent indent | ' +
                      'removeformat | link image media | code preview fullscreen help',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                    automatic_uploads: true,
                    file_picker_types: 'image',
                    images_upload_handler: async (blobInfo: any, progress: any) => {
                      try {
                        const file = blobInfo.blob();
                        const result = await mediaService.upload(file, {
                          alt_text: blobInfo.filename(),
                        });
                        return result.url;
                      } catch (error) {
                        message.error('Image upload failed');
                        return '';
                      }
                    },
                  }}
                />
              </Form.Item>

              <Form.Item name="excerpt" label="Excerpt (Optional)">
                <TextArea
                  rows={3}
                  placeholder="Short excerpt for meta description and post previews"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Card title="Post Settings" size="small" style={{ marginBottom: 16 }}>
                <Form.Item name="status" label="Status">
                  <Select>
                    <Option value="draft">Draft</Option>
                    <Option value="private">
                      <Space>
                        <span>🔒</span>
                        <span>Private (Hidden)</span>
                      </Space>
                    </Option>
                    <Option value="scheduled">Scheduled</Option>
                    <Option value="published">Published</Option>
                    <Option value="archived">Archived</Option>
                  </Select>
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
                  {({ getFieldValue }) =>
                    getFieldValue('status') === 'scheduled' ? (
                      <Form.Item
                        name="scheduled_at"
                        label="Schedule For"
                        rules={[{ required: true, message: 'Please select publication date' }]}
                      >
                        <DatePicker
                          showTime
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD HH:mm:ss"
                          placeholder="Select date and time"
                          disabledDate={(current) => current && current < dayjs().startOf('day')}
                        />
                      </Form.Item>
                    ) : (
                      <Form.Item name="published_at" label="Publication Date">
                        <DatePicker
                          showTime
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD HH:mm:ss"
                        />
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

                <Form.Item label="Auto-Save (30s)">
                  <Switch
                    checked={autoSaveEnabled}
                    onChange={setAutoSaveEnabled}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                  />
                </Form.Item>
              </Card>

              <Card title="Categories & Tags" size="small" style={{ marginBottom: 16 }}>
                <Form.Item name="category_ids" label="Categories">
                  <Select mode="multiple" placeholder="Select categories">
                    {categories.map((cat) => (
                      <Option key={cat.id} value={cat.id}>
                        {cat.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="tag_ids" label="Tags">
                  <Select mode="tags" placeholder="Select or create tags">
                    {tags.map((tag) => (
                      <Option key={tag.id} value={tag.id}>
                        {tag.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Card>

              <Card title="Featured Image" size="small" style={{ marginBottom: 16 }}>
                <Form.Item name="featured_image_id" label="Image">
                  <Upload
                    listType="picture-card"
                    maxCount={1}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      try {
                        const result = await mediaService.upload(file as File);
                        form.setFieldValue('featured_image_id', result.id);
                        onSuccess?.(result);
                        message.success('Image uploaded');
                      } catch (error) {
                        onError?.(error as Error);
                        message.error('Upload failed');
                      }
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Upload</Button>
                  </Upload>
                </Form.Item>
              </Card>

              <Card title="SEO Settings" size="small">
                <Form.Item name="meta_title" label="Meta Title">
                  <Input placeholder="SEO title (leave empty to use post title)" />
                </Form.Item>

                <Form.Item name="meta_description" label="Meta Description">
                  <TextArea
                    rows={3}
                    placeholder="SEO description for search engines"
                    showCount
                    maxLength={500}
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Preview Modal */}
      <Modal
        title="Post Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={1000}
      >
        <div style={{ minHeight: 400 }}>
          <h1>{formValues?.title || 'Untitled'}</h1>
          <div style={{ marginBottom: 16 }}>
            <Tag color={formValues?.status === 'published' ? 'green' : 'default'}>
              {formValues?.status}
            </Tag>
            {formValues?.published_at && (
              <span style={{ marginLeft: 8, color: '#999' }}>
                {dayjs(formValues.published_at).format('YYYY-MM-DD HH:mm')}
              </span>
            )}
          </div>
          {formValues?.excerpt && (
            <p style={{ fontStyle: 'italic', marginBottom: 16 }}>{formValues.excerpt}</p>
          )}
          <div
            dangerouslySetInnerHTML={{
              __html: formValues?.content || '<p>No content</p>',
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default PostEditorPage;
