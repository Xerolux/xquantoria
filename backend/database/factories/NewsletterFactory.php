<?php

namespace Database\Factories;

use App\Models\Newsletter;
use Illuminate\Database\Eloquent\Factories\Factory;

class NewsletterFactory extends Factory
{
    protected $model = Newsletter::class;

    public function definition(): array
    {
        return [
            'subject' => fake()->sentence(),
            'preview_text' => fake()->sentence(),
            'content' => '<p>' . fake()->paragraph() . '</p>',
            'status' => 'draft',
            'recipients' => 0,
            'opened_count' => 0,
            'clicked_count' => 0,
            'unsubscribed_count' => 0,
        ];
    }

    public function sent(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'sent',
            'recipients' => fake()->numberBetween(100, 1000),
            'opened_count' => fake()->numberBetween(50, 500),
            'clicked_count' => fake()->numberBetween(10, 100),
            'sent_at' => now(),
        ]);
    }

    public function scheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'scheduled',
            'scheduled_at' => now()->addDays(1),
        ]);
    }
}
