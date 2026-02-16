export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';
  display_name: string;
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  published_at?: string;
  view_count: number;
  meta_title?: string;
  meta_description?: string;
  language: 'de' | 'en';
  created_at: string;
  updated_at: string;
  author?: User;
  featured_image?: Media;
  categories?: Category[];
  tags?: Tag[];
  downloads?: Download[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon_url?: string;
  parent_id?: number;
  meta_title?: string;
  meta_description?: string;
  language?: 'de' | 'en';
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  usage_count: number;
  language?: 'de' | 'en';
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: number;
  filename: string;
  original_filename: string;
  filepath: string;
  url: string;
  mime_type: string;
  filesize: number;
  width?: number;
  height?: number;
  alt_text?: string;
  caption?: string;
  created_at: string;
  uploaded_by?: User;
}

export interface Download {
  id: number;
  filename: string;
  original_filename: string;
  title: string;
  description?: string;
  filepath: string;
  mime_type: string;
  filesize: number;
  access_level: 'public' | 'registered' | 'premium';
  download_count: number;
  expires_at?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Advertisement {
  id: number;
  name: string;
  zone: 'header' | 'sidebar' | 'footer' | 'in-content';
  ad_type: 'html' | 'image' | 'script';
  content?: string;
  image_url?: string;
  link_url?: string;
  impressions: number;
  clicks: number;
  click_through_rate?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  template: 'default' | 'full-width' | 'landing';
  meta_title?: string;
  meta_description?: string;
  is_visible: boolean;
  is_in_menu: boolean;
  menu_order: number;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  creator?: User;
  updater?: User;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id?: number;
  parent_id?: number;
  author_name?: string;
  author_email?: string;
  author_ip?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  likes_count: number;
  dislikes_count: number;
  approved_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  parent?: Comment;
  replies?: Comment[];
}

export interface Newsletter {
  id: number;
  subject: string;
  preview_text?: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  scheduled_at?: string;
  sent_at?: string;
  recipients_count: number;
  opened_count: number;
  clicked_count: number;
  unsubscribed_count: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  creator?: User;
  open_rate?: number;
  click_rate?: number;
  unsubscribe_rate?: number;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  status: 'pending' | 'active' | 'unsubscribed' | 'bounced';
  confirmed_at?: string;
  unsubscribed_at?: string;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  user_id?: number;
  ip_address?: string;
  referrer?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  engagement_rate?: number;
}

export interface NewsletterSent {
  id: number;
  newsletter_id: number;
  subscriber_id: number;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  unsubscribe_token?: string;
  newsletter?: Newsletter;
  subscriber?: NewsletterSubscriber;
}

export type SettingValue = string | number | boolean | Record<string, unknown> | null;

export interface Setting {
  id: number;
  key: string;
  value: SettingValue;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'json' | 'image' | 'file';
  group: 'general' | 'seo' | 'media' | 'email' | 'security' | 'performance';
  display_name: string;
  description?: string;
  options?: Record<string, string>;
  is_public: boolean;
  sort_order: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  updater?: User;
}

export interface SettingGroup {
  [key: string]: Setting[];
}

export interface PublicSettings {
  site_name?: string;
  site_description?: string;
  site_logo?: string;
  site_favicon?: string;
  site_email?: string;
  locale?: string;
  seo_og_image?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  action: string;
  model_type?: string;
  model_id?: number;
  description?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  tags?: string;
  created_at: string;
  user?: User;
  action_color?: string;
  action_icon?: string;
}

export interface ActivityLogStats {
  total_logs: number;
  today_logs: number;
  week_logs: number;
  month_logs: number;
  top_actions: { action: string; count: number }[];
  top_users: { user_id: number; count: number; user?: User }[];
  recent_activity: Record<string, ActivityLog[]>;
  security_events: ActivityLog[];
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  uptime: string;
  environment: {
    app_env: string;
    app_debug: boolean;
    app_url: string;
    timezone: string;
    locale: string;
  };
  server: {
    os: string;
    os_family: string;
    hostname: string;
    server_software: string;
    php_sapi: string;
  };
  database: {
    status: string;
    connection: string;
    version?: string;
    database?: string;
    size_mb?: number;
  };
  cache: {
    default: string;
    stores: Record<string, {
      driver: string;
      status: string;
      connection?: string;
    }>;
  };
  storage: Record<string, {
    driver: string;
    status: string;
    root?: string;
    usage?: {
      total_gb: number;
      used_gb: number;
      free_gb: number;
      usage_percent: number;
    };
  }>;
  services: Record<string, {
    name: string;
    status: 'ok' | 'warning' | 'critical';
    message: string;
  }>;
  php: {
    version: string;
    extensions: string[];
    memory_limit: string;
    max_execution_time: string;
    upload_max_filesize: string;
    post_max_size: string;
    opcache: string;
  };
  laravel: {
    version: string;
    locale: string;
    environment: string;
  };
}

// AI Types
export interface AIContentOptions {
  topic: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'technical';
  length?: 'short' | 'medium' | 'long';
  keywords?: string[];
}

export interface AISummaryOptions {
  content: string;
  max_sentences?: number;
}

export interface AIKeywordsOptions {
  title: string;
  content: string;
  count?: number;
}

export interface AIMetaDescriptionOptions {
  content: string;
  max_length?: number;
}

export interface AIRelatedPostsOptions {
  title: string;
  content: string;
  count?: number;
}

export interface AIProofreadOptions {
  content: string;
}

export interface AIIdeasOptions {
  topic: string;
  count?: number;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  summary?: string;
  keywords?: string[];
  description?: string;
  suggestions?: string[];
  improved_content?: string;
  ideas?: string[];
  error?: string;
}

// Post Share Types
export interface PostShare {
  id: number;
  post_id: number;
  platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'email';
  share_url: string;
  shares_count: number;
  clicks_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostShareStats {
  total_shares: number;
  total_clicks: number;
  by_platform: Record<string, {
    shares: number;
    clicks: number;
    links: number;
  }>;
  recent_shares: PostShare[];
}

export interface SharePlatform {
  key: string;
  name: string;
  icon: string;
  color: string;
  baseUrl: string;
}

// Plugin Types
export interface Plugin {
  id: number;
  name: string;
  version: string;
  author: string;
  description: string;
  path: string;
  is_active: boolean;
  installed_at: string;
  config?: Record<string, unknown>;
  hooks?: PluginHook[];
}

export interface PluginHook {
  id: number;
  plugin_id: number;
  hook: string;
  callback: string;
  priority: number;
  created_at: string;
  plugin?: Plugin;
}

export interface PluginStats {
  total_plugins: number;
  active_plugins: number;
  inactive_plugins: number;
  total_hooks: number;
}

export interface AvailableHook {
  name: string;
  description: string;
}

// Role Hierarchy Types
export interface Role {
  key: string;
  name: string;
  level: number;
  icon: React.ReactNode;
  color: string;
  description: string;
  permissions: string[];
  users_count: number;
}

export interface RoleLevel {
  key: string;
  name: string;
  level: number;
  permissions: string[];
}

// Editorial Layout Types
export interface EditorialArticle {
  id: number;
  title: string;
  excerpt: string;
  featured_image?: string;
  author: string;
  category: string;
  published_at: string;
  view_count: number;
  comment_count: number;
  is_featured: boolean;
  is_breaking: boolean;
}

export type EditorialLayoutType = 'classic' | 'modern' | 'magazine';

// Live Update Types
export interface LiveUpdateConfig {
  enabled: boolean;
  method: 'polling' | 'sse' | 'websocket';
  interval?: number;
  sseUrl?: string;
  wsUrl?: string;
  onUpdate?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}

export interface LiveUpdateResult {
  isConnected: boolean;
  lastUpdate: Date | null;
  disconnect: () => void;
  reconnect: () => void;
}

// Database Types
export interface DatabaseConfig {
  connection: string;
  driver: 'mysql' | 'pgsql' | 'sqlite' | 'sqlsrv' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  charset: string;
  collation: string;
  prefix: string;
  strict: boolean;
  engine: null | string;
}

export interface DatabaseStats {
  connection: string;
  driver: string;
  version: string;
  size: string;
  tables: number;
  status: 'connected' | 'disconnected' | 'error';
}

// Webhook Types
export interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  is_active: boolean;
  user_id?: number;
  last_triggered_at?: string;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
  success_rate?: number;
}

export interface WebhookLog {
  id: number;
  webhook_id: number;
  event_type: string;
  payload: any;
  response_body?: string;
  status_code?: number;
  attempt: number;
  success: boolean;
  error_message?: string;
  duration?: number;
  headers?: Record<string, string>;
  delivered_at?: string;
  created_at: string;
  webhook?: Webhook;
}

export interface WebhookEvent {
  name: string;
  description: string;
  category: string;
}

export interface WebhookStats {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  average_duration: string;
  last_successful_delivery?: string;
  last_failed_delivery?: string;
}

// Newsletter Campaign Types
export interface NewsletterCampaign {
  id: number;
  subject: string;
  preheader?: string;
  content: string;
  template_id?: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at?: string;
  sent_at?: string;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  template?: NewsletterTemplate;
}

export interface NewsletterTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  is_default: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface NewsletterStats {
  total_subscribers: number;
  active_subscribers: number;
  total_campaigns: number;
  avg_open_rate: number;
  avg_click_rate: number;
}

// Cookie Consent Types
export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

// Theme Types
export interface ThemeConfig {
  primaryColor: string;
  borderRadius: number;
  mode: 'light' | 'dark';
  fontFamily?: string;
}

// SEO Types
export interface SEOAnalysis {
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

// RSS Feed Types
export interface RSSFeedItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
  author: { name: string; display_name: string };
  categories: Array<{ id: number; name: string; slug: string }>;
  link: string;
}

export interface RSSFeedConfig {
  title: string;
  description: string;
  link: string;
  language: string;
  copyright: string;
  items: RSSFeedItem[];
}
