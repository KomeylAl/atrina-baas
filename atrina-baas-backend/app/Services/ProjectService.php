<?php

namespace App\Services;

use App\Enums\EnvironmentStatus;
use App\Enums\EnvironmentType;
use App\Enums\ProjectStatus;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjectService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function create(
        Organization $organization,
        User $actor,
        string $name,
        ?string $slug = null,
        ?string $description = null,
    ): Project {
        return DB::transaction(function () use ($organization, $actor, $name, $slug, $description) {
            $project = Project::query()->create([
                'organization_id' => $organization->id,
                'name' => $name,
                'slug' => $this->uniqueSlug($organization, $slug ?: $name),
                'description' => $description,
                'status' => ProjectStatus::Active,
                'created_by' => $actor->id,
            ]);

            Environment::query()->create([
                'project_id' => $project->id,
                'name' => 'Development',
                'slug' => 'development',
                'type' => EnvironmentType::Development,
                'status' => EnvironmentStatus::Active,
            ]);

            Environment::query()->create([
                'project_id' => $project->id,
                'name' => 'Production',
                'slug' => 'production',
                'type' => EnvironmentType::Production,
                'status' => EnvironmentStatus::Active,
            ]);

            $this->auditLogger->record(
                action: 'project.created',
                resourceType: 'project',
                resourceId: $project->id,
                actor: $actor,
                organizationId: $organization->id,
                projectId: $project->id,
                metadata: [
                    'name' => $project->name,
                    'slug' => $project->slug,
                ],
            );

            return $project->load('environments');
        });
    }

    public function update(Project $project, User $actor, array $attributes): Project
    {
        if (array_key_exists('slug', $attributes) && $attributes['slug'] !== null) {
            $attributes['slug'] = $this->uniqueSlug($project->organization, $attributes['slug'], $project->id);
        }

        $project->fill(collect($attributes)->only(['name', 'slug', 'description', 'status'])->all());
        $project->save();

        $this->auditLogger->record(
            action: 'project.updated',
            resourceType: 'project',
            resourceId: $project->id,
            actor: $actor,
            organizationId: $project->organization_id,
            projectId: $project->id,
            metadata: [
                'changes' => array_keys($project->getChanges()),
            ],
        );

        return $project->refresh();
    }

    public function archive(Project $project, User $actor): Project
    {
        $project->forceFill(['status' => ProjectStatus::Archived])->save();

        $this->auditLogger->record(
            action: 'project.archived',
            resourceType: 'project',
            resourceId: $project->id,
            actor: $actor,
            organizationId: $project->organization_id,
            projectId: $project->id,
        );

        return $project->refresh();
    }

    public function createEnvironment(
        Project $project,
        User $actor,
        string $name,
        string $slug,
        EnvironmentType $type,
    ): Environment {
        $environment = Environment::query()->create([
            'project_id' => $project->id,
            'name' => $name,
            'slug' => $slug,
            'type' => $type,
            'status' => EnvironmentStatus::Active,
        ]);

        $this->auditLogger->record(
            action: 'environment.created',
            resourceType: 'environment',
            resourceId: $environment->id,
            actor: $actor,
            organizationId: $project->organization_id,
            projectId: $project->id,
            environmentId: $environment->id,
            metadata: [
                'name' => $environment->name,
                'slug' => $environment->slug,
                'type' => $environment->type->value,
            ],
        );

        return $environment;
    }

    public function updateEnvironment(Environment $environment, User $actor, array $attributes): Environment
    {
        $environment->fill(collect($attributes)->only(['name', 'slug', 'type', 'status'])->all());
        $environment->save();

        $project = $environment->project;

        $this->auditLogger->record(
            action: 'environment.updated',
            resourceType: 'environment',
            resourceId: $environment->id,
            actor: $actor,
            organizationId: $project->organization_id,
            projectId: $project->id,
            environmentId: $environment->id,
            metadata: [
                'changes' => array_keys($environment->getChanges()),
            ],
        );

        return $environment->refresh();
    }

    private function uniqueSlug(Organization $organization, string $value, ?string $ignoreId = null): string
    {
        $base = Str::slug($value);
        $slug = $base !== '' ? $base : 'project';
        $candidate = $slug;
        $suffix = 1;

        while (
            Project::query()
                ->where('organization_id', $organization->id)
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $candidate)
                ->exists()
        ) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }
}
