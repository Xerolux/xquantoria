import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to ensure mockApi is available for mock factory
const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

// Mock axios before importing api.ts
vi.mock('axios', () => ({
  default: {
    create: () => mockApi,
  },
}));

// Now import the services
import {
  authService,
  postService,
  userService,
  categoryService,
  tagService,
  commentService,
  workflowService,
  socialMediaService,
  sessionService,
} from '../api';

const mockedAxios = mockApi;

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    window.localStorage.clear();
  });

  it('should login user with valid credentials', async () => {
    const mockResponse = {
      token: 'test-token',
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
    };

    // The login method implementation:
    // async login(email: string, password: string) {
    //   const { data } = await api.post('/auth/login', { email, password });
    //   localStorage.setItem('auth_token', data.token);
    //   return data;
    // }
    //
    // So axios needs to resolve with { data: mockResponse }
    // And result will be mockResponse

    mockedAxios.post.mockResolvedValue({ data: mockResponse });

    const result = await authService.login('test@example.com', 'password');

    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password',
    });
    expect(result.user.email).toBe('test@example.com');
  });

  it('should logout user', async () => {
    mockedAxios.post.mockResolvedValue({ data: { message: 'Logged out' } });

    await authService.logout();

    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('should get current user profile', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
    mockedAxios.get.mockResolvedValue({ data: mockUser });

    const result = await authService.me(); // Updated from getProfile to me

    expect(result.email).toBe('test@example.com');
  });
});

describe('PostService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch posts with pagination', async () => {
    const mockPosts = {
      data: [
        { id: 1, title: 'Post 1' },
        { id: 2, title: 'Post 2' },
      ],
    };

    mockedAxios.get.mockResolvedValue({ data: mockPosts });

    const result = await postService.getAll({ page: 1, per_page: 10 });

    expect(mockedAxios.get).toHaveBeenCalledWith('/posts', {
      params: { page: 1, per_page: 10 },
    });
    expect(result.data).toHaveLength(2);
  });

  it('should create a new post', async () => {
    const newPost = { title: 'New Post', content: 'Content' };
    const mockResponse = { id: 1, ...newPost };

    mockedAxios.post.mockResolvedValue({ data: mockResponse });

    const result = await postService.create(newPost);

    expect(mockedAxios.post).toHaveBeenCalledWith('/posts', newPost);
    expect(result.title).toBe('New Post');
  });

  it('should update a post', async () => {
    const updatedPost = { title: 'Updated Post' };
    const mockResponse = { id: 1, ...updatedPost };

    mockedAxios.put.mockResolvedValue({ data: mockResponse });

    await postService.update(1, updatedPost);

    expect(mockedAxios.put).toHaveBeenCalledWith('/posts/1', updatedPost);
  });

  it('should delete a post', async () => {
    mockedAxios.delete.mockResolvedValue({ data: { message: 'Deleted' } });

    await postService.delete(1);

    expect(mockedAxios.delete).toHaveBeenCalledWith('/posts/1');
  });
});

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all users', async () => {
    const mockUsers = {
      data: [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ],
    };

    mockedAxios.get.mockResolvedValue({ data: mockUsers });

    const result = await userService.getAll();

    expect(result.data).toHaveLength(2);
  });

  it('should create a new user', async () => {
    const newUser = { name: 'New User', email: 'new@example.com', password: 'password' };
    const mockResponse = { id: 1, ...newUser };

    mockedAxios.post.mockResolvedValue({ data: mockResponse });

    const result = await userService.create(newUser);

    expect(result.name).toBe('New User');
  });
});

describe('CategoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all categories', async () => {
    const mockCategories = [
      { id: 1, name: 'Tech' },
      { id: 2, name: 'News' },
    ];

    mockedAxios.get.mockResolvedValue({ data: mockCategories });

    const result = await categoryService.getAll();

    expect(result).toHaveLength(2);
  });

  it('should create a category', async () => {
    const newCategory = { name: 'Tech', slug: 'tech' };
    const mockResponse = { id: 1, ...newCategory };

    mockedAxios.post.mockResolvedValue({ data: mockResponse });

    const result = await categoryService.create(newCategory);

    expect(result.name).toBe('Tech');
  });
});

describe('TagService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all tags', async () => {
    const mockTags = [
      { id: 1, name: 'Laravel' },
      { id: 2, name: 'React' },
    ];

    mockedAxios.get.mockResolvedValue({ data: mockTags });

    const result = await tagService.getAll();

    expect(result).toHaveLength(2);
  });
});

describe('CommentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch comments for a post', async () => {
    const mockComments = {
      data: [
        { id: 1, content: 'Great post!' },
        { id: 2, content: 'Thanks!' },
      ],
    };

    mockedAxios.get.mockResolvedValue({ data: mockComments });

    const result = await commentService.getAll({ post_id: 1 });

    expect(mockedAxios.get).toHaveBeenCalledWith('/comments', { params: { post_id: 1 } });
    expect(result.data).toHaveLength(2);
  });

  it('should create a comment', async () => {
    const newComment = { content: 'Great post!', post_id: 1 };
    const mockResponse = { id: 1, ...newComment };

    mockedAxios.post.mockResolvedValue({ data: mockResponse });

    const result = await commentService.create(newComment);

    expect(result.content).toBe('Great post!');
  });
});

describe('WorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get workflow stats', async () => {
    const mockStats = {
      pending_review: 5,
      approved: 10,
      changes_requested: 2,
      draft: 8,
    };

    mockedAxios.get.mockResolvedValue({ data: mockStats });

    const result = await workflowService.getStats();

    expect(result.pending_review).toBe(5);
    expect(result.approved).toBe(10);
  });

  it('should assign user to post', async () => {
    mockedAxios.post.mockResolvedValue({ data: { message: 'Assigned' } });

    await workflowService.assignUser(1, 2, 'author');

    expect(mockedAxios.post).toHaveBeenCalledWith('/workflow/posts/1/assign', {
      user_id: 2,
      role: 'author',
    });
  });

  it('should approve post', async () => {
    mockedAxios.post.mockResolvedValue({ data: { message: 'Approved' } });

    await workflowService.approvePost(1, 'Looks good!');

    expect(mockedAxios.post).toHaveBeenCalledWith('/workflow/posts/1/approve', {
      feedback: 'Looks good!',
    });
  });

  it('should get SEO score', async () => {
    const mockScore = {
      score: 85,
      grade: 'A',
      issues: [],
      warnings: [],
      passes: ['Title length is good', 'Meta description is good'],
    };

    mockedAxios.get.mockResolvedValue({ data: mockScore });

    const result = await workflowService.getSEOScore(1);

    expect(result.score).toBe(85);
    expect(result.grade).toBe('A');
  });
});

describe('SocialMediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get social media stats', async () => {
    const mockStats = {
      total_shares: 100,
      by_platform: {
        twitter: 50,
        facebook: 30,
        linkedin: 20,
      },
    };

    mockedAxios.get.mockResolvedValue({ data: mockStats });

    const result = await socialMediaService.getStats();

    expect(result.total_shares).toBe(100);
  });

  it('should share post', async () => {
    mockedAxios.post.mockResolvedValue({ data: { message: 'Shared' } });

    await socialMediaService.sharePost(1, ['twitter', 'facebook'], 'Check this out!');

    expect(mockedAxios.post).toHaveBeenCalledWith('/social-media/posts/1/share', {
      platforms: ['twitter', 'facebook'],
      custom_message: 'Check this out!',
      scheduled_at: undefined,
    });
  });

  it('should get post shares', async () => {
    const mockShares = [
      { id: 1, platform: 'twitter', shared_at: '2024-01-01' },
      { id: 2, platform: 'facebook', shared_at: '2024-01-02' },
    ];

    mockedAxios.get.mockResolvedValue({ data: mockShares });

    const result = await socialMediaService.getPostShares(1);

    expect(result).toHaveLength(2);
  });
});

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get all sessions', async () => {
    const mockSessions = [
      { id: 1, ip_address: '127.0.0.1', device_type: 'desktop' },
      { id: 2, ip_address: '192.168.1.1', device_type: 'mobile' },
    ];

    mockedAxios.get.mockResolvedValue({ data: mockSessions });

    const result = await sessionService.getAll();

    expect(result).toHaveLength(2);
  });

  it('should revoke session', async () => {
    mockedAxios.delete.mockResolvedValue({ data: { message: 'Revoked' } });

    await sessionService.revoke(1);

    expect(mockedAxios.delete).toHaveBeenCalledWith('/sessions/1');
  });

  it('should revoke all other sessions', async () => {
    mockedAxios.delete.mockResolvedValue({ data: { message: 'All revoked' } });

    await sessionService.revokeAll();

    expect(mockedAxios.delete).toHaveBeenCalledWith('/sessions');
  });
});
