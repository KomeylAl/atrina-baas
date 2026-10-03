<?php

namespace App\Services\Auth;

use App\Contracts\SmsSender;
use App\Enums\IdentityProvider;
use App\Enums\ProjectUserStatus;
use App\Models\Environment;
use App\Models\OtpChallenge;
use App\Models\ProjectUser;
use App\Models\UserIdentity;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Throwable;

class OtpAuthService
{
    public function __construct(private readonly SmsSender $smsSender) {}

    public function request(Environment $environment, string $rawPhone): array
    {
        $phone = PhoneNumber::normalizeIranianMobile($rawPhone);
        $project = $environment->project;

        $ipKey = 'otp-request-ip:'.request()->ip();
        $phoneKey = 'otp-request-phone:'.$environment->id.':'.$phone;

        if (RateLimiter::tooManyAttempts($ipKey, 20) || RateLimiter::tooManyAttempts($phoneKey, 5)) {
            throw ValidationException::withMessages([
                'phone' => ['Too many OTP requests. Please try again later.'],
            ]);
        }

        RateLimiter::hit($ipKey, 3600);
        RateLimiter::hit($phoneKey, 3600);

        $existing = OtpChallenge::query()
            ->where('environment_id', $environment->id)
            ->where('destination', $phone)
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->latest('last_sent_at')
            ->first();

        $cooldown = (int) config('services.smsir.otp_resend_seconds', 60);
        if ($existing?->last_sent_at !== null && $existing->last_sent_at->diffInSeconds(now()) < $cooldown) {
            throw ValidationException::withMessages([
                'phone' => ['Please wait before requesting another code.'],
            ]);
        }

        $length = (int) config('services.smsir.otp_length', 6);
        $ttl = (int) config('services.smsir.otp_ttl_seconds', 120);
        $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);

        $challenge = OtpChallenge::query()->create([
            'project_id' => $project->id,
            'environment_id' => $environment->id,
            'channel' => 'sms',
            'destination' => $phone,
            'code_hash' => hash('sha256', $code),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addSeconds($ttl),
            'last_sent_at' => now(),
        ]);

        $message = "Atrina BaaS code: {$code}\nExpire: {$ttl}s";

        try {
            $result = $this->smsSender->send($message, [$phone]);
        } catch (Throwable $exception) {
            $challenge->delete();

            throw ValidationException::withMessages([
                'phone' => ['Unable to send verification SMS right now.'],
            ]);
        }

        if (! $result->success) {
            $challenge->delete();

            throw ValidationException::withMessages([
                'phone' => ['Unable to send verification SMS right now.'],
            ]);
        }

        $challenge->forceFill([
            'provider_message_id' => $result->providerMessageId,
        ])->save();

        return [
            'destination_hint' => $this->maskPhone($phone),
            'expires_in' => $ttl,
            'resend_after' => $cooldown,
        ];
    }

    public function verify(Environment $environment, string $rawPhone, string $code): ProjectUser
    {
        $phone = PhoneNumber::normalizeIranianMobile($rawPhone);
        $verifyKey = 'otp-verify:'.$environment->id.':'.$phone;

        if (RateLimiter::tooManyAttempts($verifyKey, 10)) {
            throw ValidationException::withMessages([
                'code' => ['Too many verification attempts. Please try again later.'],
            ]);
        }

        RateLimiter::hit($verifyKey, 600);

        $challenge = OtpChallenge::query()
            ->where('environment_id', $environment->id)
            ->where('destination', $phone)
            ->whereNull('consumed_at')
            ->latest('created_at')
            ->first();

        if ($challenge === null || $challenge->isExpired()) {
            throw ValidationException::withMessages([
                'code' => ['The verification code is invalid or expired.'],
            ]);
        }

        if (! $challenge->hasAttemptsRemaining()) {
            throw ValidationException::withMessages([
                'code' => ['The verification code is invalid or expired.'],
            ]);
        }

        $challenge->increment('attempts');

        if (! hash_equals($challenge->code_hash, hash('sha256', $code))) {
            throw ValidationException::withMessages([
                'code' => ['The verification code is invalid or expired.'],
            ]);
        }

        return DB::transaction(function () use ($environment, $phone, $challenge) {
            $challenge->forceFill(['consumed_at' => now()])->save();

            $user = ProjectUser::query()->firstOrCreate(
                [
                    'environment_id' => $environment->id,
                    'phone' => $phone,
                ],
                [
                    'project_id' => $environment->project_id,
                    'status' => ProjectUserStatus::Active,
                    'phone_verified_at' => now(),
                    'display_name' => $phone,
                ],
            );

            if (! $user->isActive()) {
                throw ValidationException::withMessages([
                    'phone' => ['This account is blocked.'],
                ]);
            }

            if ($user->phone_verified_at === null) {
                $user->forceFill(['phone_verified_at' => now()])->save();
            }

            UserIdentity::query()->firstOrCreate(
                [
                    'provider' => IdentityProvider::PhoneOtp,
                    'provider_subject' => $phone,
                    'environment_id' => $environment->id,
                ],
                [
                    'project_user_id' => $user->id,
                    'project_id' => $environment->project_id,
                ],
            );

            $user->forceFill(['last_sign_in_at' => now()])->save();

            return $user->refresh();
        });
    }

    private function maskPhone(string $phone): string
    {
        return preg_replace('/(\+98\d{2})\d{5}(\d{2})/', '$1*****$2', $phone) ?? $phone;
    }
}
