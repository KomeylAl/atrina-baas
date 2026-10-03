<?php

namespace Tests\Feature\Tenancy;

use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganizationIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_organization_and_becomes_owner(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/organizations', [
            'name' => 'Acme Corp',
            'slug' => 'acme-corp',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'acme-corp')
            ->assertJsonPath('data.role', 'owner');

        $this->assertDatabaseHas('organization_members', [
            'user_id' => $user->id,
            'role' => OrganizationMemberRole::Owner->value,
        ]);
    }

    public function test_user_cannot_view_organization_they_do_not_belong_to(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();
        $organization = Organization::factory()->create();

        OrganizationMember::factory()->owner()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'status' => OrganizationMemberStatus::Active,
        ]);

        Sanctum::actingAs($outsider);

        $this->getJson("/api/v1/organizations/{$organization->id}")
            ->assertForbidden();
    }

    public function test_member_can_list_only_their_organizations(): void
    {
        $user = User::factory()->create();
        $mine = Organization::factory()->create(['name' => 'Mine']);
        $other = Organization::factory()->create(['name' => 'Other']);

        OrganizationMember::factory()->create([
            'organization_id' => $mine->id,
            'user_id' => $user->id,
        ]);

        OrganizationMember::factory()->create([
            'organization_id' => $other->id,
            'user_id' => User::factory()->create()->id,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/organizations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);
    }
}
