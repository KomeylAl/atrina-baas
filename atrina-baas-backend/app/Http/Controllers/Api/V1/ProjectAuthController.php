<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UsageMetric;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProjectAuth\GoogleLoginRequest;
use App\Http\Requests\ProjectAuth\OtpRequestRequest;
use App\Http\Requests\ProjectAuth\OtpVerifyRequest;
use App\Http\Requests\ProjectAuth\ProjectLoginRequest;
use App\Http\Requests\ProjectAuth\ProjectSignupRequest;
use App\Http\Resources\ProjectUserResource;
use App\Models\Environment;
use App\Models\ProjectUser;
use App\Services\Auth\OtpAuthService;
use App\Services\Auth\ProjectAuthService;
use App\Services\Usage\UsageRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectAuthController extends Controller
{
    public function __construct(
        private readonly ProjectAuthService $projectAuthService,
        private readonly OtpAuthService $otpAuthService,
        private readonly UsageRecorder $usageRecorder,
    ) {}

    public function signup(ProjectSignupRequest $request): JsonResponse
    {
        $environment = $this->environment($request);

        $user = $this->projectAuthService->registerWithPassword(
            environment: $environment,
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
            displayName: $request->input('display_name'),
        );

        return $this->tokenResponse($user, $environment, $request->string('device_name', 'app')->toString(), 201, true);
    }

    public function login(ProjectLoginRequest $request): JsonResponse
    {
        $environment = $this->environment($request);

        $user = $this->projectAuthService->loginWithPassword(
            environment: $environment,
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
        );

        return $this->tokenResponse($user, $environment, $request->string('device_name', 'app')->toString(), countSignin: true);
    }

    public function requestOtp(OtpRequestRequest $request): JsonResponse
    {
        $environment = $this->environment($request);

        $payload = $this->otpAuthService->request(
            environment: $environment,
            rawPhone: $request->string('phone')->toString(),
        );

        return response()->json([
            'message' => 'If the phone number is valid, a verification code has been sent.',
            ...$payload,
        ]);
    }

    public function verifyOtp(OtpVerifyRequest $request): JsonResponse
    {
        $environment = $this->environment($request);

        $user = $this->otpAuthService->verify(
            environment: $environment,
            rawPhone: $request->string('phone')->toString(),
            code: $request->string('code')->toString(),
        );

        return $this->tokenResponse($user, $environment, $request->string('device_name', 'app')->toString(), countSignin: true);
    }

    public function google(GoogleLoginRequest $request): JsonResponse
    {
        $environment = $this->environment($request);

        $user = $this->projectAuthService->loginWithGoogle(
            environment: $environment,
            idToken: $request->string('id_token')->toString(),
        );

        return $this->tokenResponse($user, $environment, $request->string('device_name', 'app')->toString(), countSignin: true);
    }

    public function me(Request $request): ProjectUserResource
    {
        /** @var ProjectUser $user */
        $user = $request->user();

        return new ProjectUserResource($user);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var ProjectUser $user */
        $user = $request->user();
        $this->projectAuthService->revokeCurrentToken($user);

        return response()->json(['message' => 'Logged out.']);
    }

    public function refresh(Request $request): JsonResponse
    {
        /** @var ProjectUser $user */
        $user = $request->user();
        $this->projectAuthService->revokeCurrentToken($user);

        return $this->tokenResponse($user, $user->environment, $request->string('device_name', 'app')->toString());
    }

    private function environment(Request $request): Environment
    {
        /** @var Environment $environment */
        $environment = $request->attributes->get('projectEnvironment');

        return $environment;
    }

    private function tokenResponse(
        ProjectUser $user,
        Environment $environment,
        string $deviceName,
        int $status = 200,
        bool $countSignin = false,
    ): JsonResponse {
        $token = $this->projectAuthService->issueToken($user, $deviceName);

        if ($countSignin) {
            $this->usageRecorder->record($environment, UsageMetric::AuthSignins);
        }

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => (new ProjectUserResource($user))->resolve(),
        ], $status);
    }
}
