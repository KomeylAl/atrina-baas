<?php

namespace App\Services\Auth;

use App\Contracts\GoogleIdentityVerifier;
use App\Enums\IdentityProvider;
use App\Enums\ProjectUserStatus;
use App\Models\Environment;
use App\Models\ProjectUser;
use App\Models\UserIdentity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProjectAuthService
{
    public function __construct(private readonly GoogleIdentityVerifier $googleIdentityVerifier) {}

    public function registerWithPassword(
        Environment $environment,
        string $email,
        string $password,
        ?string $displayName = null,
    ): ProjectUser {
        $email = strtolower(trim($email));

        $exists = ProjectUser::query()
            ->where('environment_id', $environment->id)
            ->where('email', $email)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'email' => ['Unable to register with the provided credentials.'],
            ]);
        }

        return DB::transaction(function () use ($environment, $email, $password, $displayName) {
            $user = ProjectUser::query()->create([
                'project_id' => $environment->project_id,
                'environment_id' => $environment->id,
                'email' => $email,
                'password' => $password,
                'display_name' => $displayName ?: strstr($email, '@', true),
                'status' => ProjectUserStatus::Active,
                'email_verified_at' => now(),
            ]);

            UserIdentity::query()->create([
                'project_user_id' => $user->id,
                'project_id' => $environment->project_id,
                'environment_id' => $environment->id,
                'provider' => IdentityProvider::Password,
                'provider_subject' => $email,
            ]);

            $user->forceFill(['last_sign_in_at' => now()])->save();

            return $user->refresh();
        });
    }

    public function loginWithPassword(Environment $environment, string $email, string $password): ProjectUser
    {
        $email = strtolower(trim($email));

        $user = ProjectUser::query()
            ->where('environment_id', $environment->id)
            ->where('email', $email)
            ->first();

        if (
            $user === null
            || $user->password === null
            || ! Hash::check($password, $user->password)
            || ! $user->isActive()
        ) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->forceFill(['last_sign_in_at' => now()])->save();

        return $user->refresh();
    }

    public function loginWithGoogle(Environment $environment, string $idToken): ProjectUser
    {
        $identity = $this->googleIdentityVerifier->verifyIdToken($idToken);

        return DB::transaction(function () use ($environment, $identity) {
            $existingIdentity = UserIdentity::query()
                ->where('environment_id', $environment->id)
                ->where('provider', IdentityProvider::Google)
                ->where('provider_subject', $identity['subject'])
                ->first();

            if ($existingIdentity !== null) {
                $user = $existingIdentity->projectUser()->firstOrFail();

                if (! $user->isActive()) {
                    throw ValidationException::withMessages([
                        'id_token' => ['This account is blocked.'],
                    ]);
                }

                $user->forceFill(['last_sign_in_at' => now()])->save();

                return $user->refresh();
            }

            $email = isset($identity['email']) ? strtolower((string) $identity['email']) : null;

            $user = null;
            if ($email !== null && $email !== '') {
                $user = ProjectUser::query()
                    ->where('environment_id', $environment->id)
                    ->where('email', $email)
                    ->first();
            }

            if ($user === null) {
                $user = ProjectUser::query()->create([
                    'project_id' => $environment->project_id,
                    'environment_id' => $environment->id,
                    'email' => $email,
                    'display_name' => $identity['name'] ?? ($email ? strstr($email, '@', true) : 'Google User'),
                    'status' => ProjectUserStatus::Active,
                    'email_verified_at' => ($identity['email_verified'] ?? false) ? now() : null,
                ]);
            } elseif (! $user->isActive()) {
                throw ValidationException::withMessages([
                    'id_token' => ['This account is blocked.'],
                ]);
            }

            UserIdentity::query()->create([
                'project_user_id' => $user->id,
                'project_id' => $environment->project_id,
                'environment_id' => $environment->id,
                'provider' => IdentityProvider::Google,
                'provider_subject' => $identity['subject'],
            ]);

            $user->forceFill(['last_sign_in_at' => now()])->save();

            return $user->refresh();
        });
    }

    public function issueToken(ProjectUser $user, string $deviceName = 'app'): string
    {
        return $user->createToken($deviceName, ['project-user'])->plainTextToken;
    }

    public function revokeCurrentToken(ProjectUser $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    public function revokeAllTokens(ProjectUser $user): void
    {
        $user->tokens()->delete();
    }
}
