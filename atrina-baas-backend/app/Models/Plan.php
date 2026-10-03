<?php

namespace App\Models;

use App\Enums\BillingPeriodUnit;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'product_id',
        'code',
        'name',
        'billing_period_unit',
        'billing_period_count',
        'price',
        'currency',
        'status',
        'features',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'billing_period_unit' => BillingPeriodUnit::class,
            'features' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return HasMany<ProviderProduct, $this>
     */
    public function providerProducts(): HasMany
    {
        return $this->hasMany(ProviderProduct::class);
    }

    /**
     * @return BelongsToMany<Entitlement, $this>
     */
    public function entitlements(): BelongsToMany
    {
        return $this->belongsToMany(Entitlement::class, 'plan_entitlements')
            ->withPivot('value');
    }
}
