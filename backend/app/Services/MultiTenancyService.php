<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class MultiTenancyService
{
    protected ?Tenant $currentTenant = null;
    protected string $cachePrefix = 'tenant:';

    public function __construct()
    {
        $this->initializeTenant();
    }

    protected function initializeTenant(): void
    {
        $host = request()->getHost();
        
        if ($tenant = $this->resolveTenantFromHost($host)) {
            $this->currentTenant = $tenant;
            $this->switchDatabase($tenant);
        }
    }

    protected function resolveTenantFromHost(string $host): ?Tenant
    {
        $cacheKey = $this->cachePrefix . 'host:' . $host;
        
        return Cache::remember($cacheKey, 3600, function () use ($host) {
            $parts = explode('.', $host);
            
            if (count($parts) >= 3) {
                $subdomain = $parts[0];
                return Tenant::where('subdomain', $subdomain)
                    ->where('status', 'active')
                    ->first();
            }
            
            return Tenant::where('domain', $host)
                ->where('status', 'active')
                ->first();
        });
    }

    protected function switchDatabase(Tenant $tenant): void
    {
        if ($tenant->database_name) {
            config(['database.connections.tenant' => [
                'driver' => 'pgsql',
                'host' => $tenant->database_host ?? config('database.connections.pgsql.host'),
                'port' => $tenant->database_port ?? config('database.connections.pgsql.port'),
                'database' => $tenant->database_name,
                'username' => $tenant->database_username ?? config('database.connections.pgsql.username'),
                'password' => $tenant->database_password ?? config('database.connections.pgsql.password'),
                'charset' => 'utf8',
                'prefix' => '',
                'schema' => 'public',
            ]]);
            
            DB::purge('tenant');
            DB::reconnect('tenant');
        }
    }

    public function getCurrentTenant(): ?Tenant
    {
        return $this->currentTenant;
    }

    public function hasTenant(): bool
    {
        return $this->currentTenant !== null;
    }

    public function createTenant(array $data): Tenant
    {
        $tenant = Tenant::create([
            'name' => $data['name'],
            'subdomain' => $data['subdomain'] ?? Str::slug($data['name']),
            'domain' => $data['domain'] ?? null,
            'plan' => $data['plan'] ?? 'starter',
            'status' => 'pending',
            'settings' => $data['settings'] ?? [],
            'trial_ends_at' => now()->addDays(14),
        ]);

        if (config('tenancy.database_mode') === 'separate') {
            $this->createTenantDatabase($tenant);
        }

        $this->runTenantMigrations($tenant);

        Log::info("Tenant created: {$tenant->name}");

        return $tenant;
    }

    protected function createTenantDatabase(Tenant $tenant): void
    {
        $databaseName = 'tenant_' . $tenant->id;
        
        DB::statement("CREATE DATABASE {$databaseName}");
        
        $tenant->update([
            'database_name' => $databaseName,
            'database_host' => config('database.connections.pgsql.host'),
            'database_port' => config('database.connections.pgsql.port'),
        ]);
    }

    protected function runTenantMigrations(Tenant $tenant): void
    {
        $originalConnection = DB::getDefaultConnection();
        
        $this->switchDatabase($tenant);
        DB::setDefaultConnection('tenant');
        
        try {
            $this->migrateTenant();
        } finally {
            DB::setDefaultConnection($originalConnection);
        }
    }

    protected function migrateTenant(): void
    {
        $migrationPath = database_path('migrations/tenant');
        
        if (is_dir($migrationPath)) {
            $migrator = app('migrator');
            $migrator->run($migrationPath);
        }
    }

    public function activateTenant(int $tenantId): Tenant
    {
        $tenant = Tenant::findOrFail($tenantId);
        
        $tenant->update([
            'status' => 'active',
            'activated_at' => now(),
        ]);

        Cache::forget($this->cachePrefix . 'host:' . $tenant->subdomain . '.' . config('app.domain'));
        
        Log::info("Tenant activated: {$tenant->name}");

        return $tenant;
    }

    public function suspendTenant(int $tenantId, string $reason = null): Tenant
    {
        $tenant = Tenant::findOrFail($tenantId);
        
        $tenant->update([
            'status' => 'suspended',
            'suspended_at' => now(),
            'suspension_reason' => $reason,
        ]);

        $this->clearTenantCache($tenant);
        
        Log::info("Tenant suspended: {$tenant->name}");

        return $tenant;
    }

    public function deleteTenant(int $tenantId): void
    {
        $tenant = Tenant::findOrFail($tenantId);
        
        if (config('tenancy.database_mode') === 'separate' && $tenant->database_name) {
            DB::statement("DROP DATABASE IF EXISTS {$tenant->database_name}");
        }
        
        $this->clearTenantCache($tenant);
        
        $tenant->delete();
        
        Log::info("Tenant deleted: {$tenant->name}");
    }

    public function updateTenantSettings(int $tenantId, array $settings): Tenant
    {
        $tenant = Tenant::findOrFail($tenantId);
        
        $currentSettings = $tenant->settings ?? [];
        $tenant->settings = array_merge($currentSettings, $settings);
        $tenant->save();
        
        $this->clearTenantCache($tenant);
        
        return $tenant;
    }

    public function checkTenantLimits(Tenant $tenant, string $resource): array
    {
        $limits = config("tenancy.plans.{$tenant->plan}.limits", []);
        $limit = $limits[$resource] ?? PHP_INT_MAX;
        
        $usage = match ($resource) {
            'users' => User::where('tenant_id', $tenant->id)->count(),
            'posts' => DB::table('posts')->count(),
            'storage' => $this->getStorageUsage($tenant),
            default => 0,
        };
        
        return [
            'limit' => $limit,
            'usage' => $usage,
            'remaining' => max(0, $limit - $usage),
            'exceeded' => $usage >= $limit,
        ];
    }

    protected function getStorageUsage(Tenant $tenant): int
    {
        return DB::table('media')
            ->where('tenant_id', $tenant->id)
            ->sum('size') ?? 0;
    }

    public function getTenantStatistics(Tenant $tenant): array
    {
        return [
            'users' => $this->checkTenantLimits($tenant, 'users'),
            'posts' => $this->checkTenantLimits($tenant, 'posts'),
            'storage' => $this->checkTenantLimits($tenant, 'storage'),
            'created_at' => $tenant->created_at,
            'trial_ends_at' => $tenant->trial_ends_at,
            'subscription_status' => $tenant->subscription_status ?? 'none',
        ];
    }

    protected function clearTenantCache(Tenant $tenant): void
    {
        $patterns = [
            $this->cachePrefix . 'host:' . $tenant->subdomain . '.*',
            $this->cachePrefix . 'id:' . $tenant->id,
        ];
        
        foreach ($patterns as $pattern) {
            if (config('cache.default') === 'redis') {
                $keys = Cache::getRedis()->keys($pattern);
                foreach ($keys as $key) {
                    Cache::forget($key);
                }
            }
        }
    }

    public function runForTenant(Tenant $tenant, callable $callback): mixed
    {
        $originalTenant = $this->currentTenant;
        $originalConnection = DB::getDefaultConnection();
        
        try {
            $this->currentTenant = $tenant;
            $this->switchDatabase($tenant);
            DB::setDefaultConnection('tenant');
            
            return $callback($tenant);
        } finally {
            $this->currentTenant = $originalTenant;
            DB::setDefaultConnection($originalConnection);
            
            if ($originalTenant) {
                $this->switchDatabase($originalTenant);
            }
        }
    }

    public function getAllTenants(array $filters = []): array
    {
        $query = Tenant::query();
        
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        
        if (isset($filters['plan'])) {
            $query->where('plan', $filters['plan']);
        }
        
        return $query->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }

    public function getTenantBilling(Tenant $tenant): array
    {
        return [
            'plan' => $tenant->plan,
            'plan_name' => config("tenancy.plans.{$tenant->plan}.name", $tenant->plan),
            'price' => config("tenancy.plans.{$tenant->plan}.price", 0),
            'billing_cycle' => $tenant->billing_cycle ?? 'monthly',
            'next_billing_date' => $tenant->next_billing_date,
            'payment_method' => $tenant->payment_method,
            'subscription_status' => $tenant->subscription_status ?? 'none',
        ];
    }

    public function upgradePlan(int $tenantId, string $newPlan): Tenant
    {
        $tenant = Tenant::findOrFail($tenantId);
        
        $oldPlan = $tenant->plan;
        $tenant->plan = $newPlan;
        $tenant->plan_updated_at = now();
        $tenant->save();
        
        $this->clearTenantCache($tenant);
        
        Log::info("Tenant upgraded: {$tenant->name} from {$oldPlan} to {$newPlan}");
        
        return $tenant;
    }
}
