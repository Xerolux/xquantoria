import { useQuery, useMutation, useLazyQuery, useSubscription } from '@apollo/client';
import { message } from 'antd';

/**
 * Custom hook for GraphQL queries with loading and error handling
 */
export function useGraphQLQuery(query, options = {}) {
  const result = useQuery(query, {
    onError: (error) => {
      console.error('GraphQL query error:', error);
      if (!options.onError) {
        message.error(error.message);
      }
    },
    ...options,
  });

  return {
    data: result.data,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Custom hook for GraphQL mutations with success/error handling
 */
export function useGraphQLMutation(mutation, options = {}) {
  const [mutate, result] = useMutation(mutation, {
    onError: (error) => {
      console.error('GraphQL mutation error:', error);
      if (!options.onError) {
        message.error(error.message);
      }
    },
    onCompleted: (_data) => {
      if (options.successMessage && !options.onCompleted) {
        message.success(options.successMessage);
      }
    },
    ...options,
  });

  return [
    mutate,
    {
      data: result.data,
      loading: result.loading,
      error: result.error,
      called: result.called,
    },
  ];
}

/**
 * Custom hook for lazy GraphQL queries
 */
export function useGraphQLLazyQuery(query, options = {}) {
  const [lazyQuery, result] = useLazyQuery(query, {
    onError: (error) => {
      console.error('GraphQL lazy query error:', error);
      if (!options.onError) {
        message.error(error.message);
      }
    },
    ...options,
  });

  return [
    lazyQuery,
    {
      data: result.data,
      loading: result.loading,
      error: result.error,
      called: result.called,
    },
  ];
}

/**
 * Custom hook for GraphQL subscriptions
 */
export function useGraphQLSubscription(subscription, options = {}) {
  return useSubscription(subscription, {
    onError: (error) => {
      console.error('GraphQL subscription error:', error);
    },
    ...options,
  });
}

/**
 * Custom hook for paginated queries
 */
export function useGraphQLPagination(query, options = {}) {
  const { data, loading, error, refetch } = useQuery(query, {
    onError: (error) => {
      console.error('GraphQL pagination error:', error);
      if (!options.onError) {
        message.error(error.message);
      }
    },
    ...options,
  });

  const paginatorInfo = data?.[Object.keys(data)[0]]?.paginatorInfo;

  return {
    data,
    loading,
    error,
    refetch,
    currentPage: paginatorInfo?.currentPage || 1,
    totalPages: paginatorInfo?.lastPage || 1,
    total: paginatorInfo?.total || 0,
    hasMorePages: paginatorInfo?.hasMorePages || false,
  };
}
