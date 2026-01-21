import React, { useState, useEffect } from 'react';
import { Input, Modal, List, Typography, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';

const { Search } = Input;
const { Text } = Typography;

interface QuickSearchProps {
  visible: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: number;
  title: string;
  type: 'post' | 'page' | 'user' | 'category' | 'tag';
  url: string;
  description?: string;
}

const QuickSearch: React.FC<QuickSearchProps> = ({ visible, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Debounced search
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        // Search posts
        const postsResponse = await fetch(`/api/v1/posts?search=${encodeURIComponent(debouncedQuery)}&per_page=5`);
        const postsData = await postsResponse.json();
        const posts = (postsData.data?.data || []).map((post: any) => ({
          id: post.id,
          title: post.title,
          type: 'post' as const,
          url: `/admin/posts/${post.id}/edit`,
          description: post.excerpt,
        }));

        // Search users
        const usersResponse = await fetch(`/api/v1/users?search=${encodeURIComponent(debouncedQuery)}&per_page=3`);
        const usersData = await usersResponse.json();
        const users = (usersData.data?.data || []).map((user: any) => ({
          id: user.id,
          title: user.name,
          type: 'user' as const,
          url: `/admin/users/${user.id}/edit`,
          description: user.email,
        }));

        // Search categories
        const catsResponse = await fetch(`/api/v1/categories?search=${encodeURIComponent(debouncedQuery)}&per_page=3`);
        const catsData = await catsResponse.json();
        const categories = (catsData.data || []).map((cat: any) => ({
          id: cat.id,
          title: cat.name,
          type: 'category' as const,
          url: `/admin/categories/${cat.id}/edit`,
          description: cat.description,
        }));

        // Search tags
        const tagsResponse = await fetch(`/api/v1/tags?search=${encodeURIComponent(debouncedQuery)}&per_page=3`);
        const tagsData = await tagsResponse.json();
        const tags = (tagsData.data || []).map((tag: any) => ({
          id: tag.id,
          title: tag.name,
          type: 'tag' as const,
          url: `/admin/tags/${tag.id}/edit`,
        }));

        setResults([...posts, ...users, ...categories, ...tags]);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    onClose();
    setSearchQuery('');
    setResults([]);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      post: 'blue',
      page: 'green',
      user: 'purple',
      category: 'orange',
      tag: 'cyan',
    };
    return colors[type] || 'default';
  };

  return (
    <Modal
      title={<SearchOutlined style={{ marginRight: 8 }} /> + "Quick Search"}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      <Search
        placeholder="Search posts, pages, users, categories, tags... (Cmd+K)"
        size="large"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
        allowClear
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading...
        </div>
      )}

      {!loading && results.length > 0 && (
        <List
          dataSource={results}
          renderItem={(item) => (
            <List.Item
              key={`${item.type}-${item.id}`}
              style={{ cursor: 'pointer' }}
              onClick={() => handleResultClick(item)}
            >
              <List.Item.Meta
                title={
                  <div>
                    <Tag color={getTypeColor(item.type)} style={{ marginRight: 8 }}>
                      {item.type.toUpperCase()}
                    </Tag>
                    <Text strong>{item.title}</Text>
                  </div>
                }
                description={item.description}
              />
            </List.Item>
          )}
        />
      )}

      {!loading && debouncedQuery.length >= 2 && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          No results found
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
        <Text type="secondary">
          Keyboard shortcuts: ↑↓ to navigate, Enter to select, Esc to close
        </Text>
      </div>
    </Modal>
  );
};

export default QuickSearch;
