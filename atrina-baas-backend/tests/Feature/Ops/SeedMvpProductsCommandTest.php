<?php

namespace Tests\Feature\Ops;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeedMvpProductsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_two_product_projects_with_catalog_and_notes_table(): void
    {
        $this->artisan('mvp:seed-products', [
            '--product-a' => 'Alpha App',
            '--product-b' => 'Beta App',
        ])->assertSuccessful();

        $this->assertDatabaseHas('projects', ['slug' => 'alpha-app']);
        $this->assertDatabaseHas('projects', ['slug' => 'beta-app']);

        $project = Project::query()->where('slug', 'alpha-app')->firstOrFail();
        $production = $project->environments()->where('slug', 'production')->firstOrFail();

        $this->assertDatabaseHas('data_tables', [
            'environment_id' => $production->id,
            'name' => 'notes',
        ]);
        $this->assertDatabaseHas('products', [
            'project_id' => $project->id,
            'code' => 'premium',
        ]);
    }
}
