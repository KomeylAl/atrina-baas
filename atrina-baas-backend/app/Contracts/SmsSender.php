<?php

namespace App\Contracts;

interface SmsSender
{
    /**
     * @param  list<string>  $mobiles  E.164 or local normalized numbers accepted by the provider
     */
    public function send(string $message, array $mobiles, ?string $lineNumber = null): SmsSendResult;
}
