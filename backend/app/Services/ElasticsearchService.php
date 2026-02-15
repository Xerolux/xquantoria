<?php

namespace App\Services;

use Elastic\Elasticsearch\Client;
use Elastic\Elasticsearch\ClientBuilder;
use Elastic\Elasticsearch\Exception\AuthenticationException;
use Elastic\Elasticsearch\Exception\ClientResponseException;
use Elastic\Elasticsearch\Exception\MissingParameterException;
use Elastic\Elasticsearch\Exception\ServerResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Arr;

class ElasticsearchService
{
    protected Client $client;
    protected string $prefix;
    protected array $config;

    public function __construct()
    {
        $this->config = config('elasticsearch', []);
        $this->prefix = $this->config['prefix'] ?? 'cms_';
        $this->client = $this->createClient();
    }

    protected function createClient(): Client
    {
        $builder = ClientBuilder::create();

        $hosts = $this->config['hosts'] ?? ['http://localhost:9200'];
        $builder->setHosts($hosts);

        if ($user = $this->config['user'] ?? null) {
            $builder->setBasicAuthentication($user, $this->config['password'] ?? '');
        }

        if ($apiKey = $this->config['api_key'] ?? null) {
            $builder->setApiKey($apiKey);
        }

        if ($this->config['ssl']['verify'] ?? true) {
            $builder->setSSLVerification(true);
        } else {
            $builder->setSSLVerification(false);
        }

        if ($caBundle = $this->config['ssl']['ca_bundle'] ?? null) {
            $builder->setCABundle($caBundle);
        }

        $builder->setRetries($this->config['retries'] ?? 2);

        return $builder->build();
    }

    public function index(string $index, string|int $id, array $data): array
    {
        $indexName = $this->prefix . $index;

        try {
            $response = $this->client->index([
                'index' => $indexName,
                'id' => (string) $id,
                'body' => $data,
            ]);

            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch index error', [
                'index' => $indexName,
                'id' => $id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function bulkIndex(string $index, array $items): array
    {
        $indexName = $this->prefix . $index;
        $body = [];

        foreach ($items as $id => $data) {
            $body[] = ['index' => ['_index' => $indexName, '_id' => (string) $id]];
            $body[] = $data;
        }

        if (empty($body)) {
            return ['errors' => false, 'items' => []];
        }

        try {
            $response = $this->client->bulk(['body' => $body]);
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch bulk index error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function get(string $index, string|int $id): ?array
    {
        $indexName = $this->prefix . $index;

        try {
            $response = $this->client->get([
                'index' => $indexName,
                'id' => (string) $id,
            ]);

            $data = $response->asArray();
            return [
                'id' => $data['_id'] ?? $id,
                'source' => $data['_source'] ?? [],
            ];
        } catch (ClientResponseException $e) {
            if ($e->getCode() === 404) {
                return null;
            }
            throw $e;
        } catch (ServerResponseException $e) {
            Log::error('Elasticsearch get error', [
                'index' => $indexName,
                'id' => $id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function search(string $index, array $query, array $options = []): array
    {
        $indexName = $this->prefix . $index;

        $params = [
            'index' => $indexName,
            'body' => [
                'query' => $query,
            ],
        ];

        if ($size = $options['size'] ?? null) {
            $params['body']['size'] = $size;
        }

        if ($from = $options['from'] ?? null) {
            $params['body']['from'] = $from;
        }

        if ($sort = $options['sort'] ?? null) {
            $params['body']['sort'] = $sort;
        }

        if ($source = $options['_source'] ?? null) {
            $params['body']['_source'] = $source;
        }

        if ($highlight = $options['highlight'] ?? null) {
            $params['body']['highlight'] = $highlight;
        }

        if ($aggs = $options['aggs'] ?? null) {
            $params['body']['aggs'] = $aggs;
        }

        try {
            $response = $this->client->search($params);
            $data = $response->asArray();

            return $this->formatSearchResults($data);
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch search error', [
                'index' => $indexName,
                'query' => $query,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function multiSearch(array $searches): array
    {
        $body = [];

        foreach ($searches as $search) {
            $indexName = $this->prefix . $search['index'];
            $body[] = ['index' => $indexName];
            $body[] = $search['body'];
        }

        try {
            $response = $this->client->msearch(['body' => $body]);
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch multi-search error', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function delete(string $index, string|int $id): bool
    {
        $indexName = $this->prefix . $index;

        try {
            $this->client->delete([
                'index' => $indexName,
                'id' => (string) $id,
            ]);
            return true;
        } catch (ClientResponseException $e) {
            if ($e->getCode() === 404) {
                return false;
            }
            throw $e;
        } catch (ServerResponseException $e) {
            Log::error('Elasticsearch delete error', [
                'index' => $indexName,
                'id' => $id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function deleteByQuery(string $index, array $query): array
    {
        $indexName = $this->prefix . $index;

        try {
            $response = $this->client->deleteByQuery([
                'index' => $indexName,
                'body' => ['query' => $query],
            ]);
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch delete by query error', [
                'index' => $indexName,
                'query' => $query,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function update(string $index, string|int $id, array $data, bool $upsert = false): array
    {
        $indexName = $this->prefix . $index;

        $body = ['doc' => $data];

        if ($upsert) {
            $body['doc_as_upsert'] = true;
        }

        try {
            $response = $this->client->update([
                'index' => $indexName,
                'id' => (string) $id,
                'body' => $body,
            ]);
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch update error', [
                'index' => $indexName,
                'id' => $id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function createIndex(string $index, array $mappings = [], array $settings = []): array
    {
        $indexName = $this->prefix . $index;

        $body = [];

        if (!empty($settings)) {
            $body['settings'] = $settings;
        }

        if (!empty($mappings)) {
            $body['mappings'] = ['properties' => $mappings];
        }

        try {
            $response = $this->client->indices()->create([
                'index' => $indexName,
                'body' => $body,
            ]);
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch create index error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function deleteIndex(string $index): bool
    {
        $indexName = $this->prefix . $index;

        try {
            $this->client->indices()->delete(['index' => $indexName]);
            return true;
        } catch (ClientResponseException $e) {
            if ($e->getCode() === 404) {
                return false;
            }
            throw $e;
        } catch (ServerResponseException $e) {
            Log::error('Elasticsearch delete index error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function indexExists(string $index): bool
    {
        $indexName = $this->prefix . $index;

        try {
            $response = $this->client->indices()->exists(['index' => $indexName]);
            return $response->asBool();
        } catch (ClientResponseException | ServerResponseException $e) {
            return false;
        }
    }

    public function putMapping(string $index, array $mappings): array
    {
        $indexName = $this->prefix . $index;

        try {
            $response = $this->client->indices()->putMapping([
                'index' => $indexName,
                'body' => ['properties' => $mappings],
            ]);
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch put mapping error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function getMapping(string $index): array
    {
        $indexName = $this->prefix . $index;

        try {
            $response = $this->client->indices()->getMapping(['index' => $indexName]);
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch get mapping error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function refresh(string $index): array
    {
        $indexName = $this->prefix . $index;

        try {
            $response = $this->client->indices()->refresh(['index' => $indexName]);
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch refresh error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function count(string $index, array $query = []): int
    {
        $indexName = $this->prefix . $index;

        $params = ['index' => $indexName];

        if (!empty($query)) {
            $params['body'] = ['query' => $query];
        }

        try {
            $response = $this->client->count($params);
            return $response->asArray()['count'] ?? 0;
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch count error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }

    public function suggest(string $index, string $field, string $text, int $size = 5): array
    {
        $indexName = $this->prefix . $index;

        try {
            $response = $this->client->search([
                'index' => $indexName,
                'body' => [
                    'suggest' => [
                        'completion_suggest' => [
                            'prefix' => $text,
                            'completion' => [
                                'field' => $field,
                                'size' => $size,
                                'skip_duplicates' => true,
                            ],
                        ],
                    ],
                ],
            ]);

            $data = $response->asArray();
            $options = $data['suggest']['completion_suggest'][0]['options'] ?? [];

            return array_map(fn($option) => [
                'text' => $option['text'] ?? '',
                'score' => $option['_score'] ?? 0,
                'source' => $option['_source'] ?? [],
            ], $options);
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch suggest error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    public function aggregate(string $index, array $aggregations): array
    {
        $indexName = $this->prefix . $index;

        try {
            $response = $this->client->search([
                'index' => $indexName,
                'body' => [
                    'size' => 0,
                    'aggs' => $aggregations,
                ],
            ]);

            $data = $response->asArray();
            return $data['aggregations'] ?? [];
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch aggregate error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function reindex(string $sourceIndex, string $destIndex): array
    {
        $sourceName = $this->prefix . $sourceIndex;
        $destName = $this->prefix . $destIndex;

        try {
            $response = $this->client->reindex([
                'body' => [
                    'source' => ['index' => $sourceName],
                    'dest' => ['index' => $destName],
                ],
            ]);
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            Log::error('Elasticsearch reindex error', [
                'source' => $sourceName,
                'dest' => $destName,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function health(): array
    {
        try {
            $response = $this->client->cluster()->health();
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }

    public function stats(): array
    {
        try {
            $response = $this->client->indices()->stats();
            return $response->asArray();
        } catch (ClientResponseException | ServerResponseException $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }

    protected function formatSearchResults(array $data): array
    {
        $hits = $data['hits']['hits'] ?? [];
        $total = $data['hits']['total']['value'] ?? 0;

        $results = array_map(function ($hit) {
            $result = [
                'id' => $hit['_id'] ?? null,
                'score' => $hit['_score'] ?? 0,
                'source' => $hit['_source'] ?? [],
            ];

            if (isset($hit['highlight'])) {
                $result['highlight'] = $hit['highlight'];
            }

            return $result;
        }, $hits);

        return [
            'total' => $total,
            'results' => $results,
            'aggregations' => $data['aggregations'] ?? null,
            'suggestions' => $data['suggest'] ?? null,
        ];
    }

    public static function buildMultiMatchQuery(string $query, array $fields, array $options = []): array
    {
        return [
            'multi_match' => array_merge([
                'query' => $query,
                'fields' => $fields,
                'type' => 'best_fields',
                'fuzziness' => 'AUTO',
            ], $options),
        ];
    }

    public static function buildBoolQuery(array $must = [], array $should = [], array $mustNot = [], array $filter = []): array
    {
        $bool = [];

        if (!empty($must)) {
            $bool['must'] = $must;
        }

        if (!empty($should)) {
            $bool['should'] = $should;
            $bool['minimum_should_match'] = 1;
        }

        if (!empty($mustNot)) {
            $bool['must_not'] = $mustNot;
        }

        if (!empty($filter)) {
            $bool['filter'] = $filter;
        }

        return ['bool' => $bool];
    }

    public static function buildRangeQuery(string $field, array $ranges): array
    {
        return ['range' => [$field => $ranges]];
    }

    public static function buildTermQuery(string $field, string|int|bool $value): array
    {
        return ['term' => [$field => $value]];
    }

    public static function buildTermsQuery(string $field, array $values): array
    {
        return ['terms' => [$field => $values]];
    }

    public static function buildWildcardQuery(string $field, string $value): array
    {
        return ['wildcard' => [$field => $value]];
    }

    public static function buildExistsQuery(string $field): array
    {
        return ['exists' => ['field' => $field]];
    }

    public static function buildNestedQuery(string $path, array $query): array
    {
        return [
            'nested' => [
                'path' => $path,
                'query' => $query,
            ],
        ];
    }
}
