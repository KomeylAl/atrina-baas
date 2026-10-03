<?php

namespace App\Models;

use App\Enums\BillingProviderName;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderProduct extends Model
{
    use HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'plan_id',
        'environment_id',
        'provider',
        'store_product_id',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'provider' => BillingProviderName::class,
        ];
    }

    /**
     * @return BelongsTo<Plan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
