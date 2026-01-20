// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
}

// User Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'author' | 'contributor';
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Post Types
export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image_id?: number;
  category_id?: number;
  status: 'draft' | 'published' | 'scheduled' | 'hidden';
  published_at?: string;
  created_at: string;
  updated_at: string;
  user: User;
  category?: Category;
  tags: Tag[];
  media?: Media;
}

// Category Types
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}

// Tag Types
export interface Tag {
  id: number;
  name: string;
  slug: string;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

// Media Types
export interface Media {
  id: number;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  path: string;
  url: string;
  alt_text?: string;
  caption?: string;
  created_at: string;
  updated_at: string;
}

// Comment Types
export interface Comment {
  id: number;
  post_id: number;
  user_id?: number;
  author_name?: string;
  author_email?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  created_at: string;
  updated_at: string;
  post?: Post;
  user?: User;
}

// Newsletter Types
export interface Newsletter {
  id: number;
  subject: string;
  content: string;
  status: 'draft' | 'sent' | 'scheduled';
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  status: 'pending' | 'active' | 'unsubscribed';
  subscribed_at?: string;
  created_at: string;
  updated_at: string;
}

// Analytics Types
export interface AnalyticsStats {
  period: string;
  total_views: number;
  unique_visitors: number;
  avg_session_duration: number;
  bounce_rate: number;
  top_posts: Array<{
    id: number;
    title: string;
    views: number;
  }>;
}

// Search Types
export interface SearchResult {
  posts: Post[];
  pages: Page[];
  total: number;
}

// Page Types
export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  show_in_menu: boolean;
  menu_order: number;
  created_at: string;
  updated_at: string;
}

// Settings Types
export interface Setting {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  group: string;
  description?: string;
}

// Backup Types
export interface Backup {
  id: number;
  filename: string;
  size: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

// Activity Log Types
export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  subject_type?: string;
  subject_id?: number;
  description?: string;
  created_at: string;
  user?: User;
}

// Plugin Types
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'active' | 'inactive';
  config?: Record<string, any>;
}

// System Health Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    queue: 'up' | 'down';
  };
  disk_usage: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
}

// Form Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PostFormData {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  category_id?: number;
  tags?: number[];
  featured_image_id?: number;
  status: 'draft' | 'published' | 'scheduled' | 'hidden';
  published_at?: string;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'editor' | 'author' | 'contributor';
}
