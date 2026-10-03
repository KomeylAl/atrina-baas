<?php

namespace App\Models;

use App\Enums\BillingProviderName;
use App\Enums\PurchaseStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class Purchase extends Model
{
    use HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'environment_id',
        'project_user_id',
        'plan_id',
        'provider',
        'provider_transaction_id',
        'provider_purchase_token_encrypted',
        'provider_purchase_token_hash',
        'provider_product_id',
        'status',
        'amount',
        'currency',
        'purchased_at',
        'verified_at',
        'raw_provider_payload',
        'idempotency_key',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'provider_purchase_token_encrypted',
        'provider_purchase_token_hash',
        'raw_provider_payload',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'provider' => BillingProviderName::class,
            'status' => PurchaseStatus::class,
            'purchased_at' => 'datetime',
            'verified_at' => 'datetime',
            'raw_provider_payload' => 'array',
        ];
    }

    public function setPurchaseToken(string $token): void
    {
        $this->provider_purchase_token_encrypted = Crypt::encryptString($token);
        $this->provider_purchase_token_hash = hash('sha256', $token);
    }

    public function getPurchaseToken(): ?string
    {
        if ($this->provider_purchase_token_encrypted === null || $this->provider_purchase_token_encrypted === '') {
            return null;
        }

        try {
            return Crypt::decryptString($this->provider_purchase_token_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return BelongsTo<Plan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * @return BelongsTo<ProjectUser, $this>
     */
    public function projectUser(): BelongsTo
    {
        return $this->belongsTo(ProjectUser::class);
    }
}
