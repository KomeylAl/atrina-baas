<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PlatformUserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::query()->create([
            'name' => $request->string('name')->toString(),
            'email' => strtolower($request->string('email')->toString()),
            'password' => $request->string('password')->toString(),
            'status' => PlatformUserStatus::Active,
            'email_verified_at' => now(),
        ]);

        $token = $user->createToken($request->string('device_name', 'dashboard')->toString())->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => (new UserResource($user))->resolve(),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $email = strtolower($request->string('email')->toString());
        $user = User::query()->where('email', $email)->first();

        if (
            $user === null
            || $user->password === null
            || ! Hash::check($request->string('password')->toString(), $user->password)
            || ! $user->isActive()
        ) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken($request->string('device_name', 'dashboard')->toString())->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => (new UserResource($user))->resolve(),
        ]);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out.',
        ]);
    }
}
