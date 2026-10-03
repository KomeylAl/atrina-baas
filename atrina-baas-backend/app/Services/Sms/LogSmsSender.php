<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;
use App\Contracts\SmsSendResult;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LogSmsSender implements SmsSender
{
    /** @var list<array{message: string, mobiles: list<string>}> */
    public static array $sent = [];

    public function send(string $message, array $mobiles, ?string $lineNumber = null): SmsSendResult
    {
        self::$sent[] = [
            'message' => $message,
            'mobiles' => $mobiles,
        ];

        Log::info('sms.log_sender', [
            'line' => $lineNumber,
            'mobiles' => $mobiles,
            // Never log OTP values in production adapters; this local adapter is for development only.
            'message_redacted' => Str::of($message)->replaceMatches('/\d{4,}/', '[code]')->toString(),
        ]);

        return new SmsSendResult(true, 'log_'.Str::lower(Str::random(8)));
    }
}
