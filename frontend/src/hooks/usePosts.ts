import { useQuery, useMutation } from '@apollo/client';
import { message } from 'antd';
import {
  GET_PUBLIC_POSTS,
  GET_POSTS,
  GET_POST,
  GET_PUBLIC_POST_BY_SLUG,
} from '../graphql/queries';
import {
  CREATE_POST,
  UPDATE_POST,
  DELETE_POST,
  SUBMIT_FOR_REVIEW,
  APPROVE_POST,
  REQUEST_CHANGES,
} from '../graphql/mutations';

/**
 * Custom hook for posts
 */
export function usePosts(options = {}) {
  const { data, loading, error, refetch } = useQuery(GET_POSTS, {
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      console.error('Error fetching posts:', err);
      message.error('Failed to load posts');
    },
    ...options,
  });

  const posts = data?.posts?.data || [];
  const paginatorInfo = data?.posts?.paginatorInfo;

  return {
    posts,
    loading,
    error,
    refetch,
    currentPage: paginatorInfo?.currentPage || 1,
    totalPages: paginatorInfo?.lastPage || 1,
    total: paginatorInfo?.total || 0,
    hasMorePages: paginatorInfo?.hasMorePages || false,
  };
}

/**
 * Custom hook for public posts
 */
export function usePublicPosts(variables, options = {}) {
  const { data, loading, error, refetch } = useQuery(GET_PUBLIC_POSTS, {
    variables,
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      console.error('Error fetching public posts:', err);
    },
    ...options,
  });

  const posts = data?.publicPosts?.data || [];
  const paginatorInfo = data?.publicPosts?.paginatorInfo;

  return {
    posts,
    loading,
    error,
    refetch,
    currentPage: paginatorInfo?.currentPage || 1,
    totalPages: paginatorInfo?.lastPage || 1,
    total: paginatorInfo?.total || 0,
    hasMorePages: paginatorInfo?.hasMorePages || false,
  };
}

/**
 * Custom hook for single post
 */
export function usePost(id, options = {}) {
  const { data, loading, error, refetch } = useQuery(GET_POST, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      console.error('Error fetching post:', err);
      message.error('Failed to load post');
    },
    ...options,
  });

  return {
    post: data?.post,
    loading,
    error,
    refetch,
  };
}

/**
 * Custom hook for public post by slug
 */
export function usePublicPostBySlug(slug, options = {}) {
  const { data, loading, error } = useQuery(GET_PUBLIC_POST_BY_SLUG, {
    variables: { slug },
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      console.error('Error fetching public post:', err);
    },
    ...options,
  });

  return {
    post: data?.publicPostBySlug,
    loading,
    error,
  };
}

/**
 * Custom hook for creating post
 */
export function useCreatePost() {
  const [createPost, { loading, error }] = useMutation(CREATE_POST, {
    onCompleted: (_data) => {
      message.success('Post created successfully');
    },
    onError: (err) => {
      console.error('Error creating post:', err);
      message.error('Failed to create post');
    },
    refetchQueries: ['GetPosts'],
    awaitRefetchQueries: true,
  });

  return [createPost, { loading, error }];
}

/**
 * Custom hook for updating post
 */
export function useUpdatePost() {
  const [updatePost, { loading, error }] = useMutation(UPDATE_POST, {
    onCompleted: (_data) => {
      message.success('Post updated successfully');
    },
    onError: (err) => {
      console.error('Error updating post:', err);
      message.error('Failed to update post');
    },
    refetchQueries: ['GetPosts', 'GetPost'],
    awaitRefetchQueries: true,
  });

  return [updatePost, { loading, error }];
}

/**
 * Custom hook for deleting post
 */
export function useDeletePost() {
  const [deletePost, { loading, error }] = useMutation(DELETE_POST, {
    onCompleted: (_data) => {
      message.success('Post deleted successfully');
    },
    onError: (err) => {
      console.error('Error deleting post:', err);
      message.error('Failed to delete post');
    },
    refetchQueries: ['GetPosts'],
    awaitRefetchQueries: true,
  });

  return [deletePost, { loading, error }];
}

/**
 * Custom hook for submitting post for review
 */
export function useSubmitForReview() {
  const [submitForReview, { loading, error }] = useMutation(SUBMIT_FOR_REVIEW, {
    onCompleted: (_data) => {
      message.success('Post submitted for review');
    },
    onError: (err) => {
      console.error('Error submitting post for review:', err);
      message.error('Failed to submit post for review');
    },
    refetchQueries: ['GetPost'],
  });

  return [submitForReview, { loading, error }];
}

/**
 * Custom hook for approving post
 */
export function useApprovePost() {
  const [approvePost, { loading, error }] = useMutation(APPROVE_POST, {
    onCompleted: (_data) => {
      message.success('Post approved successfully');
    },
    onError: (err) => {
      console.error('Error approving post:', err);
      message.error('Failed to approve post');
    },
    refetchQueries: ['GetPost'],
  });

  return [approvePost, { loading, error }];
}

/**
 * Custom hook for requesting changes
 */
export function useRequestChanges() {
  const [requestChanges, { loading, error }] = useMutation(REQUEST_CHANGES, {
    onCompleted: (_data) => {
      message.success('Changes requested successfully');
    },
    onError: (err) => {
      console.error('Error requesting changes:', err);
      message.error('Failed to request changes');
    },
    refetchQueries: ['GetPost'],
  });

  return [requestChanges, { loading, error }];
}
