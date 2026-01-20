<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_that_true_is_true(): void
    {
        $this->assertTrue(true);
    }

    /**
     * A basic test example.
     */
    public function test_assertions_equals(): void
    {
        $expected = 1;
        $actual = 1;

        $this->assertEquals($expected, $actual);
    }
}
