<?php

namespace App\Models;

use App\Enums\BillingProviderName;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class BillingProvider extends Model
{
    use HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'environment_id',
        'provider',
        'display_name',
        'status',
        'configuration_encrypted',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'configuration_encrypted',
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
     * @return BelongsTo<Environment, $this>
     */
    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }

    /**
     * @param  array<string, mixed>  $configuration
     */
    public function setConfiguration(array $configuration): void
    {
        $this->configuration_encrypted = Crypt::encryptString(json_encode($configuration, JSON_THROW_ON_ERROR));
    }

    /**
     * @return array<string, mixed>
     */
    public function getConfiguration(): array
    {
        if ($this->configuration_encrypted === null || $this->configuration_encrypted === '') {
            return [];
        }

        $decoded = json_decode(Crypt::decryptString($this->configuration_encrypted), true);

        return is_array($decoded) ? $decoded : [];
    }
}
