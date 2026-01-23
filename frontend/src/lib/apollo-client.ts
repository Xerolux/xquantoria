import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { message } from 'antd';

// HTTP connection to the GraphQL API
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8000/graphql',
  credentials: 'include',
});

// Auth link to add authentication headers
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = localStorage.getItem('auth_token');

  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      console.error(`[GraphQL error]: Message: ${err.message}`, err);

      // Handle authentication errors
      if (err.message === 'Authentication required.' || err.message === 'Unauthenticated') {
        message.error('Your session has expired. Please log in again.');
        // Redirect to login page
        window.location.href = '/login';
        return;
      }

      // Handle authorization errors
      if (err.message === 'Unauthorized') {
        message.error('You do not have permission to perform this action.');
        return;
      }

      // Handle validation errors
      if (err.extensions?.validation) {
        const validationErrors = err.extensions.validation as Record<string, string[]>;
        Object.entries(validationErrors).forEach(([field, messages]) => {
          message.error(`${field}: ${messages.join(', ')}`);
        });
        return;
      }

      // Show generic error message
      if (err.message) {
        message.error(err.message);
      }
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    message.error('Network error. Please check your connection.');
  }
});

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([authLink, errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Custom pagination policy for posts
          posts: {
            keyArgs: ['status', 'category_id', 'tag_id', 'author_id', 'search', 'language'],
            merge(existing = {}, incoming) {
              return {
                ...incoming,
                data: [...(existing.data || []), ...(incoming.data || [])],
              };
            },
          },
          // Custom pagination policy for users
          users: {
            keyArgs: ['role', 'search'],
            merge(existing = {}, incoming) {
              return {
                ...incoming,
                data: [...(existing.data || []), ...(incoming.data || [])],
              };
            },
          },
          // Custom pagination policy for categories
          categories: {
            keyArgs: ['parent_id', 'language'],
            merge(existing = {}, incoming) {
              return {
                ...incoming,
                data: [...(existing.data || []), ...(incoming.data || [])],
              };
            },
          },
          // Custom pagination policy for tags
          tags: {
            keyArgs: ['search', 'language'],
            merge(existing = {}, incoming) {
              return {
                ...incoming,
                data: [...(existing.data || []), ...(incoming.data || [])],
              };
            },
          },
          // Custom pagination policy for media
          media: {
            keyArgs: ['type'],
            merge(existing = {}, incoming) {
              return {
                ...incoming,
                data: [...(existing.data || []), ...(incoming.data || [])],
              };
            },
          },
          // Custom pagination policy for comments
          comments: {
            keyArgs: ['post_id', 'status'],
            merge(existing = {}, incoming) {
              return {
                ...incoming,
                data: [...(existing.data || []), ...(incoming.data || [])],
              };
            },
          },
          // Custom pagination policy for pages
          pages: {
            keyArgs: ['status', 'language'],
            merge(existing = {}, incoming) {
              return {
                ...incoming,
                data: [...(existing.data || []), ...(incoming.data || [])],
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Export the Apollo Client provider
export { ApolloProvider } from '@apollo/client';
