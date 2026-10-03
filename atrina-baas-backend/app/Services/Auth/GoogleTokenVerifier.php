<?php

namespace App\Services\Auth;

use App\Contracts\GoogleIdentityVerifier;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class GoogleTokenVerifier implements GoogleIdentityVerifier
{
    public function verifyIdToken(string $idToken): array
    {
        $clientId = (string) config('services.google.client_id');

        if ($clientId === '') {
            throw ValidationException::withMessages([
                'id_token' => ['Google sign-in is not configured.'],
            ]);
        }

        $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->successful()) {
            throw ValidationException::withMessages([
                'id_token' => ['Invalid Google identity token.'],
            ]);
        }

        $payload = $response->json() ?? [];
        $audience = (string) data_get($payload, 'aud');

        if ($audience !== $clientId) {
            throw ValidationException::withMessages([
                'id_token' => ['Google token audience mismatch.'],
            ]);
        }

        $subject = (string) data_get($payload, 'sub', '');
        if ($subject === '') {
            throw ValidationException::withMessages([
                'id_token' => ['Invalid Google identity token.'],
            ]);
        }

        return [
            'subject' => $subject,
            'email' => data_get($payload, 'email'),
            'name' => data_get($payload, 'name'),
            'email_verified' => filter_var(data_get($payload, 'email_verified'), FILTER_VALIDATE_BOOLEAN),
        ];
    }
}
