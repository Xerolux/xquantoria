<?php

namespace Database\Factories;

use App\Models\Backup;
use Illuminate\Database\Eloquent\Factories\Factory;

class BackupFactory extends Factory
{
    protected $model = Backup::class;

    public function definition(): array
    {
        return [
            'name' => 'Backup ' . fake()->date(),
            'type' => fake()->randomElement(['full', 'database', 'files']),
            'status' => 'completed',
            'file_path' => 'backups/' . fake()->uuid() . '.zip',
            'size' => fake()->numberBetween(1000000, 100000000),
            'description' => fake()->sentence(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'file_path' => null,
            'size' => null,
        ]);
    }

    public function creating(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'creating',
            'file_path' => null,
            'size' => null,
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'failed',
            'error_message' => fake()->sentence(),
        ]);
    }

    public function database(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'database',
        ]);
    }

    public function files(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'files',
        ]);
    }
}
