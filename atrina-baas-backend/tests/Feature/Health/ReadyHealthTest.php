<?php

namespace Tests\Feature\Health;

use Tests\TestCase;

class ReadyHealthTest extends TestCase
{
    public function test_ready_endpoint_reports_dependency_status(): void
    {
        $this->getJson('/api/v1/health/ready')
            ->assertOk()
            ->assertJsonPath('status', 'ready')
            ->assertJsonStructure(['checks' => ['database', 'redis']]);
    }
}
