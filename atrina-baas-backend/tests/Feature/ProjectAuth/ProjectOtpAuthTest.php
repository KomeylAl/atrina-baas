<?php

namespace Tests\Feature\ProjectAuth;

use App\Contracts\SmsSender;
use App\Enums\ApiCredentialKind;
use App\Enums\OrganizationMemberRole;
use App\Enums\OrganizationMemberStatus;
use App\Models\Environment;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\User;
use App\Services\ApiCredentialService;
use App\Services\Sms\LogSmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectOtpAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        LogSmsSender::$sent = [];
        $this->app->instance(SmsSender::class, new LogSmsSender);
        config([
            'services.smsir.enabled' => false,
            'services.smsir.otp_resend_seconds' => 0,
        ]);
    }

    public function test_otp_request_and_verify_issues_token(): void
    {
        $secret = $this->makePublishableSecret();

        $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/otp/request', [
                'phone' => '09121234567',
            ])
            ->assertOk()
            ->assertJsonStructure(['destination_hint', 'expires_in']);

        $this->assertNotEmpty(LogSmsSender::$sent);
        $this->assertDatabaseCount('otp_challenges', 1);

        preg_match('/\b(\d{6})\b/', LogSmsSender::$sent[0]['message'], $matches);
        $code = $matches[1] ?? null;
        $this->assertNotNull($code);

        $verify = $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/otp/verify', [
                'phone' => '09121234567',
                'code' => $code,
            ]);

        $verify->assertOk()
            ->assertJsonPath('user.phone', '+989121234567')
            ->assertJsonStructure(['token']);
    }

    public function test_invalid_otp_is_rejected_without_revealing_details(): void
    {
        $secret = $this->makePublishableSecret();

        $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/otp/request', [
                'phone' => '09121234567',
            ])->assertOk();

        $this->withHeader('X-Atrina-Key', $secret)
            ->postJson('/api/v1/project-auth/otp/verify', [
                'phone' => '09121234567',
                'code' => '000000',
            ])->assertUnprocessable();
    }

    private function makePublishableSecret(): string
    {
        $owner = User::factory()->create();
        $organization = Organization::factory()->create();

        OrganizationMember::factory()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => OrganizationMemberRole::Owner,
            'status' => OrganizationMemberStatus::Active,
        ]);

        $project = Project::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $owner->id,
        ]);

        $environment = Environment::factory()->create([
            'project_id' => $project->id,
        ]);

        return app(ApiCredentialService::class)->create(
            environment: $environment,
            actor: $owner,
            name: 'Pub',
            kind: ApiCredentialKind::Publishable,
        )['secret'];
    }
}
