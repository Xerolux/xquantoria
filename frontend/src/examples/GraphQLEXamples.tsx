/**
 * GraphQL Usage Examples for XQUANTORIA
 *
 * This file demonstrates how to use GraphQL in the XQUANTORIA frontend
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Button, List, Card, message, Spin } from 'antd';
import {
  GET_PUBLIC_POSTS,
  GET_POSTS,
  GET_POST,
} from '../graphql/queries';
import {
  UPDATE_POST,
  DELETE_POST,
  SUBMIT_FOR_REVIEW,
} from '../graphql/mutations';
import { usePosts, useCreatePost, useUpdatePost } from '../hooks/usePosts';

/**
 * Example 1: Fetching public posts (no authentication required)
 */
export function PublicPostsExample() {
  const { data, loading, error } = useQuery(GET_PUBLIC_POSTS, {
    variables: { first: 10 },
  });

  if (loading) return <Spin />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <List
      dataSource={data?.publicPosts?.data || []}
      renderItem={(post: any) => (
        <List.Item key={post.id}>
          <Card>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <p>By {post.author.name}</p>
          </Card>
        </List.Item>
      )}
    />
  );
}

/**
 * Example 2: Fetching all posts (authentication required)
 */
export function AllPostsExample() {
  const { data, loading, error, refetch } = useQuery(GET_POSTS, {
    variables: { first: 20 },
    fetchPolicy: 'cache-and-network',
  });

  if (loading) return <Spin />;
  if (error) return <div>Error: {error.message}</div>;

  const posts = data?.posts?.data || [];

  return (
    <div>
      <Button onClick={() => refetch()}>Refresh</Button>
      <List
        dataSource={posts}
        renderItem={(post: any) => (
          <List.Item key={post.id}>
            <Card>
              <h3>{post.title}</h3>
              <p>Status: {post.status}</p>
              <p>By {post.author.name}</p>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}

/**
 * Example 3: Using custom hook for posts
 */
export function CustomHookExample() {
  const { posts, loading, error, refetch, currentPage, totalPages } = usePosts();

  if (loading) return <Spin />;
  if (error) return <div>Error loading posts</div>;

  return (
    <div>
      <Button onClick={() => refetch()}>Refresh</Button>
      <p>Page {currentPage} of {totalPages}</p>
      <List
        dataSource={posts}
        renderItem={(post: any) => (
          <List.Item key={post.id}>
            <Card>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}

/**
 * Example 4: Creating a new post
 */
export function CreatePostExample() {
  const [createPost, { loading, error }] = useCreatePost();
  const [title, setTitle] = useState('');

  const handleSubmit = async () => {
    try {
      await createPost({
        variables: {
          input: {
            title,
            slug: title.toLowerCase().replace(/\s+/g, '-'),
            content: 'Post content here...',
            status: 'draft',
          },
        },
      });
      setTitle('');
      message.success('Post created successfully!');
    } catch (err) {
      message.error('Failed to create post');
    }
  };

  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
      />
      <Button onClick={handleSubmit} loading={loading}>
        Create Post
      </Button>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}

/**
 * Example 5: Updating a post
 */
export function UpdatePostExample({ postId }: { postId: string }) {
  const [updatePost, { loading, error }] = useUpdatePost();
  const [title, setTitle] = useState('');

  const handleSubmit = async () => {
    try {
      await updatePost({
        variables: {
          input: {
            id: postId,
            title,
          },
        },
      });
      message.success('Post updated successfully!');
    } catch (err) {
      message.error('Failed to update post');
    }
  };

  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New title"
      />
      <Button onClick={handleSubmit} loading={loading}>
        Update Post
      </Button>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}

/**
 * Example 6: Deleting a post
 */
export function DeletePostExample({ postId }: { postId: string }) {
  const [deletePost, { loading }] = useMutation(DELETE_POST, {
    onCompleted: () => {
      message.success('Post deleted successfully!');
    },
    onError: (err) => {
      message.error(`Failed to delete post: ${err.message}`);
    },
    refetchQueries: [{ query: GET_POSTS }],
  });

  return (
    <Button
      danger
      onClick={() => deletePost({ variables: { id: postId } })}
      loading={loading}
    >
      Delete Post
    </Button>
  );
}

/**
 * Example 7: Submitting post for review
 */
export function SubmitForReviewExample({ postId }: { postId: string }) {
  const [submitForReview, { loading }] = useMutation(SUBMIT_FOR_REVIEW, {
    onCompleted: (data) => {
      message.success('Post submitted for review!');
      console.log('Updated post:', data.submitForReview);
    },
    onError: (err) => {
      message.error(`Failed to submit: ${err.message}`);
    },
    refetchQueries: [
      { query: GET_POST, variables: { id: postId } }
    ],
  });

  return (
    <Button
      type="primary"
      onClick={() => submitForReview({ variables: { id: postId } })}
      loading={loading}
    >
      Submit for Review
    </Button>
  );
}

/**
 * Example 8: Filtering posts
 */
export function FilteredPostsExample() {
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  const { data, loading } = useQuery(GET_POSTS, {
    variables: {
      first: 20,
      status,
      search: search || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  return (
    <div>
      <select onChange={(e) => setStatus(e.target.value || undefined)}>
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="scheduled">Scheduled</option>
      </select>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search posts..."
      />
      {loading ? (
        <Spin />
      ) : (
        <List
          dataSource={data?.posts?.data || []}
          renderItem={(post: any) => (
            <List.Item key={post.id}>
              <Card>
                <h3>{post.title}</h3>
                <p>Status: {post.status}</p>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}

/**
 * Example 9: Pagination
 */
export function PaginatedPostsExample() {
  const [page, setPage] = useState(1);
  const { data, loading } = useQuery(GET_POSTS, {
    variables: {
      first: 10,
      page,
    },
  });

  const paginatorInfo = data?.posts?.paginatorInfo;

  return (
    <div>
      <List
        dataSource={data?.posts?.data || []}
        renderItem={(post: any) => (
          <List.Item key={post.id}>
            <Card>
              <h3>{post.title}</h3>
            </Card>
          </List.Item>
        )}
      />
      <div>
        <Button
          disabled={page === 1 || loading}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <span>Page {paginatorInfo?.currentPage} of {paginatorInfo?.lastPage}</span>
        <Button
          disabled={!paginatorInfo?.hasMorePages || loading}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/**
 * Example 10: Using optimistic updates
 */
export function OptimisticUpdateExample({ postId }: { postId: string }) {
  const [updatePost] = useMutation(UPDATE_POST, {
    optimisticResponse: (variables) => ({
      updatePost: {
        __typename: 'Post',
        id: variables.input.id,
        title: variables.input.title || '',
        // ... other fields
      },
    }),
    update: (cache, { data }) => {
      // Update the cache with the new data
      cache.modify({
        id: cache.identify(data?.updatePost),
        fields: {
          title() {
            return data?.updatePost.title;
          },
        },
      });
    },
  });

  const [title, setTitle] = useState('');

  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New title"
      />
      <Button
        onClick={() =>
          updatePost({
            variables: {
              input: { id: postId, title },
            },
          })
        }
      >
        Update (Optimistic)
      </Button>
    </div>
  );
}

/**
 * Example 11: Combining multiple queries
 */
export function CombinedQueriesExample() {
  const { data: postsData } = useQuery(GET_POSTS, {
    variables: { first: 5 },
  });

  const { data: postData } = useQuery(GET_POST, {
    variables: { id: '1' },
    skip: !postsData, // Only run after posts query completes
  });

  return (
    <div>
      <h2>All Posts</h2>
      <List
        dataSource={postsData?.posts?.data || []}
        renderItem={(post: any) => (
          <List.Item key={post.id}>{post.title}</List.Item>
        )}
      />
      <h2>Single Post Details</h2>
      {postData?.post && (
        <Card>
          <h3>{postData.post.title}</h3>
          <p>{postData.post.content}</p>
        </Card>
      )}
    </div>
  );
}
