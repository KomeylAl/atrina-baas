<?php

namespace App\Providers;

use App\Contracts\GoogleIdentityVerifier;
use App\Contracts\SmsSender;
use App\Services\Auth\GoogleTokenVerifier;
use App\Services\Sms\LogSmsSender;
use App\Services\Sms\SmsIrSender;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SmsSender::class, function () {
            if (config('services.smsir.enabled')) {
                return $this->app->make(SmsIrSender::class);
            }

            return $this->app->make(LogSmsSender::class);
        });

        $this->app->bind(GoogleIdentityVerifier::class, GoogleTokenVerifier::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
