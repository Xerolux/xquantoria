<?php

namespace App\Services;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use ReflectionClass;
use ReflectionMethod;

class OpenApiGeneratorService
{
    protected array $spec = [];
    protected string $version = '1.0.0';
    protected string $title = 'XQUANTORIA CMS API';
    protected string $description = 'RESTful API for XQUANTORIA CMS - A modern blog and content management system';

    public function __construct()
    {
        $this->initializeSpec();
    }

    protected function initializeSpec(): void
    {
        $this->spec = [
            'openapi' => '3.0.3',
            'info' => [
                'title' => $this->title,
                'description' => $this->description,
                'version' => $this->version,
                'contact' => [
                    'name' => 'API Support',
                    'email' => config('mail.from.address'),
                ],
            ],
            'servers' => [
                [
                    'url' => config('app.url') . '/api/v1',
                    'description' => 'API Server',
                ],
            ],
            'security' => [
                ['sanctum' => []],
            ],
            'components' => [
                'securitySchemes' => [
                    'sanctum' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                        'bearerFormat' => 'JWT',
                        'description' => 'Laravel Sanctum Token Authentication',
                    ],
                ],
                'schemas' => $this->getSchemas(),
                'responses' => $this->getCommonResponses(),
            ],
            'paths' => [],
        ];
    }

    public function generate(): array
    {
        $this->generateAuthEndpoints();
        $this->generatePostEndpoints();
        $this->generateCategoryEndpoints();
        $this->generateTagEndpoints();
        $this->generateMediaEndpoints();
        $this->generateUserEndpoints();
        $this->generatePageEndpoints();
        $this->generateCommentEndpoints();
        $this->generateSettingsEndpoints();
        $this->generateSearchEndpoints();
        $this->generateAnalyticsEndpoints();
        $this->generateWebhookEndpoints();

        return $this->spec;
    }

    protected function generateAuthEndpoints(): void
    {
        $this->spec['paths']['/auth/login'] = [
            'post' => [
                'tags' => ['Authentication'],
                'summary' => 'User Login',
                'description' => 'Authenticate user and receive API token',
                'security' => [],
                'requestBody' => [
                    'required' => true,
                    'content' => [
                        'application/json' => [
                            'schema' => [
                                'type' => 'object',
                                'required' => ['email', 'password'],
                                'properties' => [
                                    'email' => ['type' => 'string', 'format' => 'email', 'example' => 'admin@example.com'],
                                    'password' => ['type' => 'string', 'format' => 'password', 'example' => 'password'],
                                    'remember' => ['type' => 'boolean', 'default' => false],
                                ],
                            ],
                        ],
                    ],
                ],
                'responses' => [
                    '200' => ['$ref' => '#/components/responses/LoginSuccess'],
                    '401' => ['$ref' => '#/components/responses/Unauthorized'],
                    '422' => ['$ref' => '#/components/responses/ValidationError'],
                ],
            ],
        ];

        $this->spec['paths']['/auth/register'] = [
            'post' => [
                'tags' => ['Authentication'],
                'summary' => 'User Registration',
                'description' => 'Register a new user account',
                'security' => [],
                'requestBody' => [
                    'required' => true,
                    'content' => [
                        'application/json' => [
                            'schema' => [
                                'type' => 'object',
                                'required' => ['name', 'email', 'password', 'password_confirmation'],
                                'properties' => [
                                    'name' => ['type' => 'string', 'example' => 'John Doe'],
                                    'email' => ['type' => 'string', 'format' => 'email', 'example' => 'john@example.com'],
                                    'password' => ['type' => 'string', 'format' => 'password', 'minLength' => 8, 'example' => 'securepassword'],
                                    'password_confirmation' => ['type' => 'string', 'format' => 'password', 'example' => 'securepassword'],
                                ],
                            ],
                        ],
                    ],
                ],
                'responses' => [
                    '201' => ['$ref' => '#/components/responses/LoginSuccess'],
                    '422' => ['$ref' => '#/components/responses/ValidationError'],
                ],
            ],
        ];

        $this->spec['paths']['/auth/logout'] = [
            'post' => [
                'tags' => ['Authentication'],
                'summary' => 'User Logout',
                'description' => 'Revoke current API token',
                'responses' => [
                    '200' => [
                        'description' => 'Successfully logged out',
                        'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['message' => ['type' => 'string']]]]],
                    ],
                ],
            ],
        ];

        $this->spec['paths']['/auth/me'] = [
            'get' => [
                'tags' => ['Authentication'],
                'summary' => 'Get Current User',
                'description' => 'Get the authenticated user details',
                'responses' => [
                    '200' => [
                        'description' => 'User details',
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/User']]],
                    ],
                    '401' => ['$ref' => '#/components/responses/Unauthorized'],
                ],
            ],
        ];

        $this->spec['paths']['/auth/refresh'] = [
            'post' => [
                'tags' => ['Authentication'],
                'summary' => 'Refresh Token',
                'description' => 'Refresh the current API token',
                'responses' => [
                    '200' => ['$ref' => '#/components/responses/LoginSuccess'],
                    '401' => ['$ref' => '#/components/responses/Unauthorized'],
                ],
            ],
        ];
    }

    protected function generatePostEndpoints(): void
    {
        $this->spec['paths']['/posts'] = [
            'get' => [
                'tags' => ['Posts'],
                'summary' => 'List Posts',
                'description' => 'Get paginated list of posts with optional filters',
                'parameters' => [
                    ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 1]],
                    ['name' => 'per_page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 15]],
                    ['name' => 'status', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['draft', 'scheduled', 'published', 'archived']]],
                    ['name' => 'category_id', 'in' => 'query', 'schema' => ['type' => 'integer']],
                    ['name' => 'tag_id', 'in' => 'query', 'schema' => ['type' => 'integer']],
                    ['name' => 'search', 'in' => 'query', 'schema' => ['type' => 'string']],
                    ['name' => 'language', 'in' => 'query', 'schema' => ['type' => 'string']],
                ],
                'responses' => [
                    '200' => [
                        'description' => 'Paginated list of posts',
                        'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PostPagination']]],
                    ],
                ],
            ],
            'post' => [
                'tags' => ['Posts'],
                'summary' => 'Create Post',
                'description' => 'Create a new blog post',
                'requestBody' => [
                    'required' => true,
                    'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PostInput']]],
                ],
                'responses' => [
                    '201' => ['description' => 'Post created', 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/Post']]]],
                    '422' => ['$ref' => '#/components/responses/ValidationError'],
                ],
            ],
        ];

        $this->spec['paths']['/posts/{id}'] = [
            'get' => [
                'tags' => ['Posts'],
                'summary' => 'Get Post',
                'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                'responses' => [
                    '200' => ['description' => 'Post details', 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/Post']]]],
                    '404' => ['$ref' => '#/components/responses/NotFound'],
                ],
            ],
            'put' => [
                'tags' => ['Posts'],
                'summary' => 'Update Post',
                'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PostInput']]]],
                'responses' => [
                    '200' => ['description' => 'Post updated', 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/Post']]]],
                    '404' => ['$ref' => '#/components/responses/NotFound'],
                ],
            ],
            'delete' => [
                'tags' => ['Posts'],
                'summary' => 'Delete Post',
                'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                'responses' => [
                    '204' => ['description' => 'Post deleted'],
                    '404' => ['$ref' => '#/components/responses/NotFound'],
                ],
            ],
        ];

        $this->spec['paths']['/posts/bulk'] = [
            'post' => [
                'tags' => ['Posts'],
                'summary' => 'Bulk Create Posts',
                'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['posts' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/PostInput']]]]]]],
                'responses' => ['201' => ['description' => 'Posts created']],
            ],
            'delete' => [
                'tags' => ['Posts'],
                'summary' => 'Bulk Delete Posts',
                'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['type' => 'object', 'required' => ['ids'], 'properties' => ['ids' => ['type' => 'array', 'items' => ['type' => 'integer']]]]]]],
                'responses' => ['204' => ['description' => 'Posts deleted']],
            ],
        ];
    }

    protected function generateCategoryEndpoints(): void
    {
        $this->spec['paths']['/categories'] = [
            'get' => [
                'tags' => ['Categories'],
                'summary' => 'List Categories',
                'responses' => ['200' => ['description' => 'List of categories', 'content' => ['application/json' => ['schema' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Category']]]]]],
            ],
            'post' => [
                'tags' => ['Categories'],
                'summary' => 'Create Category',
                'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/CategoryInput']]]],
                'responses' => ['201' => ['description' => 'Category created']],
            ],
        ];

        $this->spec['paths']['/categories/{id}'] = [
            'get' => [
                'tags' => ['Categories'],
                'summary' => 'Get Category',
                'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                'responses' => ['200' => ['description' => 'Category details']],
            ],
            'put' => [
                'tags' => ['Categories'],
                'summary' => 'Update Category',
                'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/CategoryInput']]]],
                'responses' => ['200' => ['description' => 'Category updated']],
            ],
            'delete' => [
                'tags' => ['Categories'],
                'summary' => 'Delete Category',
                'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                'responses' => ['204' => ['description' => 'Category deleted']],
            ],
        ];
    }

    protected function generateTagEndpoints(): void
    {
        $this->spec['paths']['/tags'] = [
            'get' => ['tags' => ['Tags'], 'summary' => 'List Tags', 'responses' => ['200' => ['description' => 'List of tags', 'content' => ['application/json' => ['schema' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Tag']]]]]]],
            'post' => ['tags' => ['Tags'], 'summary' => 'Create Tag', 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/TagInput']]]], 'responses' => ['201' => ['description' => 'Tag created']]],
        ];

        $this->spec['paths']['/tags/{id}'] = [
            'get' => ['tags' => ['Tags'], 'summary' => 'Get Tag', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'Tag details']]],
            'put' => ['tags' => ['Tags'], 'summary' => 'Update Tag', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/TagInput']]]], 'responses' => ['200' => ['description' => 'Tag updated']]],
            'delete' => ['tags' => ['Tags'], 'summary' => 'Delete Tag', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['204' => ['description' => 'Tag deleted']]],
        ];
    }

    protected function generateMediaEndpoints(): void
    {
        $this->spec['paths']['/media'] = [
            'get' => [
                'tags' => ['Media'],
                'summary' => 'List Media',
                'parameters' => [
                    ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer']],
                    ['name' => 'per_page', 'in' => 'query', 'schema' => ['type' => 'integer']],
                    ['name' => 'type', 'in' => 'query', 'description' => 'Filter by MIME type', 'schema' => ['type' => 'string']],
                ],
                'responses' => ['200' => ['description' => 'Paginated list of media']],
            ],
            'post' => [
                'tags' => ['Media'],
                'summary' => 'Upload Media',
                'requestBody' => [
                    'required' => true,
                    'content' => [
                        'multipart/form-data' => [
                            'schema' => [
                                'type' => 'object',
                                'required' => ['file'],
                                'properties' => [
                                    'file' => ['type' => 'string', 'format' => 'binary'],
                                    'alt_text' => ['type' => 'string'],
                                    'caption' => ['type' => 'string'],
                                ],
                            ],
                        ],
                    ],
                ],
                'responses' => ['201' => ['description' => 'Media uploaded', 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/Media']]]]],
            ],
        ];

        $this->spec['paths']['/media/bulk-upload'] = [
            'post' => [
                'tags' => ['Media'],
                'summary' => 'Bulk Upload Media',
                'requestBody' => ['required' => true, 'content' => ['multipart/form-data' => ['schema' => ['type' => 'object', 'required' => ['files'], 'properties' => ['files' => ['type' => 'array', 'items' => ['type' => 'string', 'format' => 'binary']]]]]]],
                'responses' => ['201' => ['description' => 'Media uploaded']],
            ],
        ];

        $this->spec['paths']['/media/{id}'] = [
            'get' => ['tags' => ['Media'], 'summary' => 'Get Media', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'Media details']]],
            'put' => ['tags' => ['Media'], 'summary' => 'Update Media', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'requestBody' => ['content' => ['multipart/form-data' => ['schema' => ['type' => 'object', 'properties' => ['alt_text' => ['type' => 'string'], 'caption' => ['type' => 'string']]]]]], 'responses' => ['200' => ['description' => 'Media updated']]],
            'delete' => ['tags' => ['Media'], 'summary' => 'Delete Media', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['204' => ['description' => 'Media deleted']]],
        ];
    }

    protected function generateUserEndpoints(): void
    {
        $this->spec['paths']['/users'] = [
            'get' => ['tags' => ['Users'], 'summary' => 'List Users', 'parameters' => [['name' => 'role', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['super_admin', 'admin', 'editor', 'author', 'contributor', 'subscriber']]], ['name' => 'is_active', 'in' => 'query', 'schema' => ['type' => 'boolean']]], 'responses' => ['200' => ['description' => 'List of users']]],
            'post' => ['tags' => ['Users'], 'summary' => 'Create User', 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UserInput']]]], 'responses' => ['201' => ['description' => 'User created']]],
        ];

        $this->spec['paths']['/users/{id}'] = [
            'get' => ['tags' => ['Users'], 'summary' => 'Get User', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'User details', 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/User']]]]]],
            'put' => ['tags' => ['Users'], 'summary' => 'Update User', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/UserInput']]]], 'responses' => ['200' => ['description' => 'User updated']]],
            'delete' => ['tags' => ['Users'], 'summary' => 'Delete User', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['204' => ['description' => 'User deleted']]],
        ];
    }

    protected function generatePageEndpoints(): void
    {
        $this->spec['paths']['/pages'] = [
            'get' => ['tags' => ['Pages'], 'summary' => 'List Pages', 'responses' => ['200' => ['description' => 'List of pages']]],
            'post' => ['tags' => ['Pages'], 'summary' => 'Create Page', 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PageInput']]]], 'responses' => ['201' => ['description' => 'Page created']]],
        ];

        $this->spec['paths']['/pages/{id}'] = [
            'get' => ['tags' => ['Pages'], 'summary' => 'Get Page', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'Page details']]],
            'put' => ['tags' => ['Pages'], 'summary' => 'Update Page', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/PageInput']]]], 'responses' => ['200' => ['description' => 'Page updated']]],
            'delete' => ['tags' => ['Pages'], 'summary' => 'Delete Page', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['204' => ['description' => 'Page deleted']]],
        ];

        $this->spec['paths']['/pages/menu'] = [
            'get' => ['tags' => ['Pages'], 'summary' => 'Get Menu Pages', 'security' => [], 'description' => 'Get pages for navigation menu', 'responses' => ['200' => ['description' => 'Menu pages']]],
        ];
    }

    protected function generateCommentEndpoints(): void
    {
        $this->spec['paths']['/comments'] = [
            'get' => ['tags' => ['Comments'], 'summary' => 'List Comments', 'parameters' => [['name' => 'status', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['pending', 'approved', 'rejected', 'spam']]], ['name' => 'post_id', 'in' => 'query', 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'List of comments']]],
            'post' => ['tags' => ['Comments'], 'summary' => 'Create Comment', 'security' => [], 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/CommentInput']]]], 'responses' => ['201' => ['description' => 'Comment created']]],
        ];

        $this->spec['paths']['/comments/{id}/approve'] = [
            'post' => ['tags' => ['Comments'], 'summary' => 'Approve Comment', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'Comment approved']]],
        ];

        $this->spec['paths']['/comments/{id}/reject'] = [
            'post' => ['tags' => ['Comments'], 'summary' => 'Reject Comment', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'Comment rejected']]],
        ];

        $this->spec['paths']['/comments/{id}/spam'] = [
            'post' => ['tags' => ['Comments'], 'summary' => 'Mark as Spam', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'Comment marked as spam']]],
        ];
    }

    protected function generateSettingsEndpoints(): void
    {
        $this->spec['paths']['/settings'] = [
            'get' => ['tags' => ['Settings'], 'summary' => 'Get All Settings', 'responses' => ['200' => ['description' => 'All settings grouped by category']]],
            'post' => ['tags' => ['Settings'], 'summary' => 'Bulk Update Settings', 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['settings' => ['type' => 'array', 'items' => ['type' => 'object', 'properties' => ['key' => ['type' => 'string'], 'value' => ['type' => 'mixed']]]]]]]]], 'responses' => ['200' => ['description' => 'Settings updated']]],
        ];

        $this->spec['paths']['/settings/{key}'] = [
            'get' => ['tags' => ['Settings'], 'summary' => 'Get Setting', 'parameters' => [['name' => 'key', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string']]], 'responses' => ['200' => ['description' => 'Setting value']]],
            'put' => ['tags' => ['Settings'], 'summary' => 'Update Setting', 'parameters' => [['name' => 'key', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string']]], 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['value' => ['type' => 'mixed']]]]]], 'responses' => ['200' => ['description' => 'Setting updated']]],
        ];

        $this->spec['paths']['/settings/public'] = [
            'get' => ['tags' => ['Settings'], 'summary' => 'Get Public Settings', 'security' => [], 'responses' => ['200' => ['description' => 'Public settings']]],
        ];
    }

    protected function generateSearchEndpoints(): void
    {
        $this->spec['paths']['/search'] = [
            'get' => [
                'tags' => ['Search'],
                'summary' => 'Search Content',
                'security' => [],
                'parameters' => [
                    ['name' => 'q', 'in' => 'query', 'required' => true, 'schema' => ['type' => 'string'], 'description' => 'Search query'],
                    ['name' => 'type', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['posts', 'pages', 'media', 'all'], 'default' => 'all']],
                    ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 1]],
                    ['name' => 'per_page', 'in' => 'query', 'schema' => ['type' => 'integer', 'default' => 15]],
                ],
                'responses' => ['200' => ['description' => 'Search results']],
            ],
        ];

        $this->spec['paths']['/search/suggestions'] = [
            'get' => ['tags' => ['Search'], 'summary' => 'Get Search Suggestions', 'security' => [], 'parameters' => [['name' => 'q', 'in' => 'query', 'required' => true, 'schema' => ['type' => 'string']]], 'responses' => ['200' => ['description' => 'Search suggestions']]],
        ];

        $this->spec['paths']['/search/trending'] = [
            'get' => ['tags' => ['Search'], 'summary' => 'Get Trending Content', 'security' => [], 'responses' => ['200' => ['description' => 'Trending content']]],
        ];
    }

    protected function generateAnalyticsEndpoints(): void
    {
        $this->spec['paths']['/analytics/stats'] = [
            'get' => ['tags' => ['Analytics'], 'summary' => 'Get Analytics Stats', 'parameters' => [['name' => 'period', 'in' => 'query', 'schema' => ['type' => 'string', 'default' => '7 days']]], 'responses' => ['200' => ['description' => 'Analytics statistics']]],
        ];

        $this->spec['paths']['/analytics/track'] = [
            'post' => ['tags' => ['Analytics'], 'summary' => 'Track Event', 'security' => [], 'requestBody' => ['content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['post_id' => ['type' => 'integer'], 'page_url' => ['type' => 'string'], 'event_type' => ['type' => 'string']]]]]], 'responses' => ['204' => ['description' => 'Event tracked']]],
        ];
    }

    protected function generateWebhookEndpoints(): void
    {
        $this->spec['paths']['/webhooks'] = [
            'get' => ['tags' => ['Webhooks'], 'summary' => 'List Webhooks', 'responses' => ['200' => ['description' => 'List of webhooks']]],
            'post' => ['tags' => ['Webhooks'], 'summary' => 'Create Webhook', 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/WebhookInput']]]], 'responses' => ['201' => ['description' => 'Webhook created']]],
        ];

        $this->spec['paths']['/webhooks/events'] = [
            'get' => ['tags' => ['Webhooks'], 'summary' => 'Get Available Events', 'responses' => ['200' => ['description' => 'Available webhook events']]],
        ];

        $this->spec['paths']['/webhooks/{id}'] = [
            'get' => ['tags' => ['Webhooks'], 'summary' => 'Get Webhook', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'Webhook details']]],
            'put' => ['tags' => ['Webhooks'], 'summary' => 'Update Webhook', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/WebhookInput']]]], 'responses' => ['200' => ['description' => 'Webhook updated']]],
            'delete' => ['tags' => ['Webhooks'], 'summary' => 'Delete Webhook', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['204' => ['description' => 'Webhook deleted']]],
        ];

        $this->spec['paths']['/webhooks/{id}/test'] = [
            'post' => ['tags' => ['Webhooks'], 'summary' => 'Test Webhook', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'Test result']]],
        ];

        $this->spec['paths']['/webhooks/{id}/toggle'] = [
            'post' => ['tags' => ['Webhooks'], 'summary' => 'Toggle Webhook', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'Webhook toggled']]],
        ];
    }

    protected function getSchemas(): array
    {
        return [
            'User' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer'],
                    'name' => ['type' => 'string'],
                    'email' => ['type' => 'string', 'format' => 'email'],
                    'role' => ['type' => 'string', 'enum' => ['super_admin', 'admin', 'editor', 'author', 'contributor', 'subscriber']],
                    'is_active' => ['type' => 'boolean'],
                    'avatar' => ['type' => 'string', 'nullable' => true],
                    'created_at' => ['type' => 'string', 'format' => 'date-time'],
                    'updated_at' => ['type' => 'string', 'format' => 'date-time'],
                ],
            ],
            'UserInput' => [
                'type' => 'object',
                'required' => ['name', 'email', 'password', 'role'],
                'properties' => [
                    'name' => ['type' => 'string'],
                    'email' => ['type' => 'string', 'format' => 'email'],
                    'password' => ['type' => 'string', 'format' => 'password', 'minLength' => 8],
                    'role' => ['type' => 'string', 'enum' => ['super_admin', 'admin', 'editor', 'author', 'contributor', 'subscriber']],
                    'is_active' => ['type' => 'boolean', 'default' => true],
                ],
            ],
            'Post' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer'],
                    'title' => ['type' => 'string'],
                    'slug' => ['type' => 'string'],
                    'content' => ['type' => 'string'],
                    'excerpt' => ['type' => 'string'],
                    'status' => ['type' => 'string', 'enum' => ['draft', 'scheduled', 'published', 'archived']],
                    'featured_image' => ['$ref' => '#/components/schemas/Media'],
                    'author' => ['$ref' => '#/components/schemas/User'],
                    'categories' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Category']],
                    'tags' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Tag']],
                    'meta_title' => ['type' => 'string'],
                    'meta_description' => ['type' => 'string'],
                    'language' => ['type' => 'string'],
                    'published_at' => ['type' => 'string', 'format' => 'date-time'],
                    'created_at' => ['type' => 'string', 'format' => 'date-time'],
                    'updated_at' => ['type' => 'string', 'format' => 'date-time'],
                ],
            ],
            'PostInput' => [
                'type' => 'object',
                'required' => ['title'],
                'properties' => [
                    'title' => ['type' => 'string'],
                    'slug' => ['type' => 'string'],
                    'content' => ['type' => 'string'],
                    'excerpt' => ['type' => 'string'],
                    'status' => ['type' => 'string', 'enum' => ['draft', 'scheduled', 'published', 'archived'], 'default' => 'draft'],
                    'featured_image_id' => ['type' => 'integer'],
                    'category_ids' => ['type' => 'array', 'items' => ['type' => 'integer']],
                    'tag_ids' => ['type' => 'array', 'items' => ['type' => 'integer']],
                    'meta_title' => ['type' => 'string'],
                    'meta_description' => ['type' => 'string'],
                    'language' => ['type' => 'string', 'default' => 'de'],
                    'published_at' => ['type' => 'string', 'format' => 'date-time'],
                ],
            ],
            'PostPagination' => [
                'type' => 'object',
                'properties' => [
                    'data' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Post']],
                    'current_page' => ['type' => 'integer'],
                    'last_page' => ['type' => 'integer'],
                    'per_page' => ['type' => 'integer'],
                    'total' => ['type' => 'integer'],
                ],
            ],
            'Category' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer'],
                    'name' => ['type' => 'string'],
                    'slug' => ['type' => 'string'],
                    'description' => ['type' => 'string'],
                    'parent_id' => ['type' => 'integer', 'nullable' => true],
                    'color' => ['type' => 'string'],
                    'icon' => ['type' => 'string'],
                    'created_at' => ['type' => 'string', 'format' => 'date-time'],
                ],
            ],
            'CategoryInput' => [
                'type' => 'object',
                'required' => ['name'],
                'properties' => [
                    'name' => ['type' => 'string'],
                    'slug' => ['type' => 'string'],
                    'description' => ['type' => 'string'],
                    'parent_id' => ['type' => 'integer'],
                    'color' => ['type' => 'string'],
                    'icon' => ['type' => 'string'],
                    'meta_title' => ['type' => 'string'],
                    'meta_description' => ['type' => 'string'],
                ],
            ],
            'Tag' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer'],
                    'name' => ['type' => 'string'],
                    'slug' => ['type' => 'string'],
                    'description' => ['type' => 'string'],
                    'color' => ['type' => 'string'],
                    'usage_count' => ['type' => 'integer'],
                    'created_at' => ['type' => 'string', 'format' => 'date-time'],
                ],
            ],
            'TagInput' => [
                'type' => 'object',
                'required' => ['name'],
                'properties' => [
                    'name' => ['type' => 'string'],
                    'slug' => ['type' => 'string'],
                    'description' => ['type' => 'string'],
                    'color' => ['type' => 'string'],
                ],
            ],
            'Media' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'integer'],
                    'filename' => ['type' => 'string'],
                    'original_filename' => ['type' => 'string'],
                    'mime_type' => ['type' => 'string'],
                    'file_size' => ['type' => 'integer'],
                    'path' => ['type' => 'string'],
                    'url' => ['type' => 'string'],
                    'alt_text' => ['type' => 'string'],
                    'caption' => ['type' => 'string'],
                    'width' => ['type' => 'integer'],
                    'height' => ['type' => 'integer'],
                    'created_at' => ['type' => 'string', 'format' => 'date-time'],
                ],
            ],
            'PageInput' => [
                'type' => 'object',
                'required' => ['title'],
                'properties' => [
                    'title' => ['type' => 'string'],
                    'slug' => ['type' => 'string'],
                    'content' => ['type' => 'string'],
                    'template' => ['type' => 'string', 'enum' => ['default', 'full_width', 'landing'], 'default' => 'default'],
                    'show_in_menu' => ['type' => 'boolean', 'default' => false],
                    'menu_order' => ['type' => 'integer', 'default' => 0],
                    'is_visible' => ['type' => 'boolean', 'default' => true],
                    'meta_title' => ['type' => 'string'],
                    'meta_description' => ['type' => 'string'],
                ],
            ],
            'CommentInput' => [
                'type' => 'object',
                'required' => ['content', 'post_id'],
                'properties' => [
                    'content' => ['type' => 'string'],
                    'post_id' => ['type' => 'integer'],
                    'parent_id' => ['type' => 'integer'],
                    'author_name' => ['type' => 'string'],
                    'author_email' => ['type' => 'string', 'format' => 'email'],
                ],
            ],
            'WebhookInput' => [
                'type' => 'object',
                'required' => ['name', 'url', 'events'],
                'properties' => [
                    'name' => ['type' => 'string'],
                    'url' => ['type' => 'string', 'format' => 'uri'],
                    'events' => ['type' => 'array', 'items' => ['type' => 'string']],
                    'headers' => ['type' => 'object'],
                    'is_active' => ['type' => 'boolean', 'default' => true],
                ],
            ],
        ];
    }

    protected function getCommonResponses(): array
    {
        return [
            'LoginSuccess' => [
                'description' => 'Successful authentication',
                'content' => [
                    'application/json' => [
                        'schema' => [
                            'type' => 'object',
                            'properties' => [
                                'token' => ['type' => 'string'],
                                'user' => ['$ref' => '#/components/schemas/User'],
                                'expires_at' => ['type' => 'string', 'format' => 'date-time'],
                            ],
                        ],
                    ],
                ],
            ],
            'Unauthorized' => [
                'description' => 'Unauthorized - Invalid or missing token',
                'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['message' => ['type' => 'string', 'example' => 'Unauthenticated.']]]]],
            ],
            'NotFound' => [
                'description' => 'Resource not found',
                'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['message' => ['type' => 'string', 'example' => 'Resource not found']]]]],
            ],
            'ValidationError' => [
                'description' => 'Validation error',
                'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['message' => ['type' => 'string'], 'errors' => ['type' => 'object']]]]],
            ],
            'Forbidden' => [
                'description' => 'Forbidden - Insufficient permissions',
                'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['message' => ['type' => 'string', 'example' => 'This action is unauthorized.']]]]],
            ],
            'RateLimited' => [
                'description' => 'Too many requests',
                'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['message' => ['type' => 'string', 'example' => 'Too many requests. Please try again later.']]]]],
            ],
        ];
    }

    public function toJson(): string
    {
        return json_encode($this->generate(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    public function toYaml(): string
    {
        $yaml = "openapi: '3.0.3'\n";
        $yaml .= "info:\n";
        $yaml .= "  title: '{$this->title}'\n";
        $yaml .= "  description: '{$this->description}'\n";
        $yaml .= "  version: '{$this->version}'\n";
        $yaml .= "servers:\n";
        $yaml .= "  - url: " . config('app.url') . "/api/v1\n";
        $yaml .= "    description: API Server\n";

        return $yaml;
    }
}
