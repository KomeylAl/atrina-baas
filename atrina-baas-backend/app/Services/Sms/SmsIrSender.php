<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;
use App\Contracts\SmsSendResult;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class SmsIrSender implements SmsSender
{
    public function send(string $message, array $mobiles, ?string $lineNumber = null): SmsSendResult
    {
        $apiKey = (string) config('services.smsir.api_key');
        $line = $lineNumber ?? (string) config('services.smsir.line_number');

        if ($apiKey === '' || $line === '') {
            throw new RuntimeException('SMS.ir is not configured.');
        }

        $normalizedMobiles = array_values(array_map(
            fn (string $mobile) => $this->toSmsIrMobile($mobile),
            $mobiles,
        ));

        try {
            $response = Http::timeout(15)
                ->withHeaders([
                    'X-API-KEY' => $apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post('https://api.sms.ir/v1/send/bulk', [
                    'lineNumber' => (int) $line,
                    'MessageText' => $message,
                    'Mobiles' => $normalizedMobiles,
                    'SendDateTime' => null,
                ]);
        } catch (Throwable $exception) {
            Log::warning('smsir.send_failed', [
                'error' => $exception->getMessage(),
            ]);

            return new SmsSendResult(false, null, $exception->getMessage());
        }

        $payload = $response->json() ?? [];
        $success = $response->successful() && (int) data_get($payload, 'status') === 1;

        if (! $success) {
            Log::warning('smsir.send_rejected', [
                'http_status' => $response->status(),
                'provider_status' => data_get($payload, 'status'),
                'message' => data_get($payload, 'message'),
            ]);

            return new SmsSendResult(
                success: false,
                errorMessage: (string) (data_get($payload, 'message') ?? 'SMS provider rejected the request.'),
                raw: is_array($payload) ? $payload : [],
            );
        }

        $messageId = data_get($payload, 'data.messageIds.0')
            ?? data_get($payload, 'data.packId');

        return new SmsSendResult(
            success: true,
            providerMessageId: $messageId !== null ? (string) $messageId : null,
            raw: is_array($payload) ? $payload : [],
        );
    }

    private function toSmsIrMobile(string $mobile): string
    {
        $digits = preg_replace('/\D+/', '', $mobile) ?? '';

        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            return substr($digits, 2);
        }

        if (str_starts_with($digits, '0') && strlen($digits) === 11) {
            return substr($digits, 1);
        }

        return $digits;
    }
}
