import React, { useState, useEffect } from 'react';
import { Input, AutoComplete, Card, List, Tag, Space, Typography, Button, Row, Col } from 'antd';
import { SearchOutlined, FireOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../services/api';
import type { Post, Category, Tag as TagType } from '../types';

const { Search } = Input;
const { Text, Paragraph } = Typography;

const SearchBar: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    posts: Post[];
    categories: Category[];
    tags: TagType[];
  } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  // Autocomplete Suggestions
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (searchValue.length >= 2) {
        try {
          const data = await searchService.getSuggestions(searchValue);
          setSuggestions(data.suggestions);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchValue]);

  const handleSearch = async (value: string) => {
    if (value.length < 2) return;

    setSearching(true);
    setSearchValue(value);
    setShowResults(true);

    try {
      const data = await searchService.search(value);
      setSearchResults(data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (value: string) => {
    handleSearch(value);
  };

  const navigateToPost = (postId: number) => {
    setShowResults(false);
    navigate(`/posts/${postId}/edit`);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  return (
    <div style={{ position: 'relative' }}>
      <AutoComplete
        value={searchValue}
        options={suggestions.map((s) => ({ value: s }))}
        onSelect={handleSelect}
        style={{ width: '100%' }}
      >
        <Search
          placeholder="Search posts, categories, tags..."
          size="large"
          loading={searching}
          onSearch={handleSearch}
          enterButton
        />
      </AutoComplete>

      {/* Search Results Dropdown */}
      {showResults && searchResults && (
        <Card
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: '600px',
            overflowY: 'auto',
            marginTop: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {/* Posts */}
          {searchResults.posts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>Posts ({searchResults.posts.length})</Text>
              <List
                dataSource={searchResults.posts}
                renderItem={(post: Post) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigateToPost(post.id)}
                  >
                    <List.Item.Meta
                      title={
                        <span
                          dangerouslySetInnerHTML={{
                            __html: highlightText(post.title, searchValue),
                          }}
                        />
                      }
                      description={
                        <Space direction="vertical" size="small">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: post.excerpt || '',
                            }}
                            style={{ fontSize: 12, color: '#666' }}
                          />
                          <Space>
                            {post.categories?.map((cat) => (
                              <Tag key={cat.id} color="blue">
                                {cat.name}
                              </Tag>
                            ))}
                            <Tag color={post.status === 'published' ? 'green' : 'default'}>
                              {post.status}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {post.view_count} views
                            </Text>
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* Categories */}
          {searchResults.categories.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>Categories ({searchResults.categories.length})</Text>
              <Space wrap style={{ marginTop: 8 }}>
                {searchResults.categories.map((cat: Category) => (
                  <Tag
                    key={cat.id}
                    color="geekblue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      navigate(`/posts?category=${cat.id}`);
                      setShowResults(false);
                    }}
                  >
                    {cat.name}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Tags */}
          {searchResults.tags.length > 0 && (
            <div>
              <Text strong>Tags ({searchResults.tags.length})</Text>
              <Space wrap style={{ marginTop: 8 }}>
                {searchResults.tags.map((tag: TagType) => (
                  <Tag
                    key={tag.id}
                    color="purple"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      navigate(`/posts?tag=${tag.id}`);
                      setShowResults(false);
                    }}
                  >
                    {tag.name}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* No Results */}
          {searchResults.posts.length === 0 &&
           searchResults.categories.length === 0 &&
           searchResults.tags.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Text type="secondary">No results found for &quot;{searchValue}&quot;</Text>
            </div>
          )}

          <Button
            type="link"
            onClick={() => setShowResults(false)}
            style={{ marginTop: 16 }}
            block
          >
            Close
          </Button>
        </Card>
      )}
    </div>
  );
};

export default SearchBar;
