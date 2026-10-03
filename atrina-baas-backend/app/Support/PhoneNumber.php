<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class PhoneNumber
{
    /**
     * Normalize Iranian mobile numbers to E.164 (+989...).
     */
    public static function normalizeIranianMobile(string $input): string
    {
        $digits = preg_replace('/\D+/', '', $input) ?? '';

        if (str_starts_with($digits, '0098')) {
            $digits = substr($digits, 4);
        } elseif (str_starts_with($digits, '98')) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (! preg_match('/^9\d{9}$/', $digits)) {
            throw ValidationException::withMessages([
                'phone' => ['Enter a valid Iranian mobile number.'],
            ]);
        }

        return '+98'.$digits;
    }
}
