<?php

namespace App\Contracts;

interface GoogleIdentityVerifier
{
    /**
     * @return array{subject: string, email: ?string, name: ?string, email_verified: bool}
     */
    public function verifyIdToken(string $idToken): array;
}
