<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\OpenApiGeneratorService;
use Illuminate\Http\JsonResponse;

class OpenApiController extends Controller
{
    protected OpenApiGeneratorService $generator;

    public function __construct(OpenApiGeneratorService $generator)
    {
        $this->generator = $generator;
    }

    public function index(): JsonResponse
    {
        return response()->json($this->generator->generate());
    }

    public function json(): JsonResponse
    {
        return response()
            ->json($this->generator->generate())
            ->header('Content-Type', 'application/json');
    }

    public function download(): JsonResponse
    {
        $json = $this->generator->toJson();

        return response($json)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="openapi.json"');
    }

    public function endpoints(): JsonResponse
    {
        $spec = $this->generator->generate();
        $endpoints = [];

        foreach ($spec['paths'] as $path => $methods) {
            foreach ($methods as $method => $details) {
                $endpoints[] = [
                    'path' => $path,
                    'method' => strtoupper($method),
                    'tags' => $details['tags'] ?? [],
                    'summary' => $details['summary'] ?? '',
                    'description' => $details['description'] ?? '',
                    'requires_auth' => !isset($details['security']) || !empty($details['security']),
                ];
            }
        }

        return response()->json([
            'endpoints' => $endpoints,
            'total' => count($endpoints),
            'by_tag' => collect($endpoints)->groupBy('tags.0')->map->count(),
        ]);
    }

    public function schemas(): JsonResponse
    {
        $spec = $this->generator->generate();

        return response()->json([
            'schemas' => $spec['components']['schemas'] ?? [],
        ]);
    }

    public function stats(): JsonResponse
    {
        $spec = $this->generator->generate();
        $paths = $spec['paths'];
        $schemas = $spec['components']['schemas'] ?? [];

        $methodCounts = [];
        $tagCounts = [];

        foreach ($paths as $path => $methods) {
            foreach ($methods as $method => $details) {
                $methodCounts[$method] = ($methodCounts[$method] ?? 0) + 1;
                foreach ($details['tags'] ?? [] as $tag) {
                    $tagCounts[$tag] = ($tagCounts[$tag] ?? 0) + 1;
                }
            }
        }

        return response()->json([
            'total_endpoints' => count($paths),
            'total_operations' => array_sum($methodCounts),
            'total_schemas' => count($schemas),
            'by_method' => $methodCounts,
            'by_tag' => $tagCounts,
            'version' => $spec['info']['version'],
        ]);
    }
}
