<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvironmentQuota extends Model
{
    use HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'environment_id',
        'metric',
        'soft_limit',
        'hard_limit',
        'window_seconds',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'soft_limit' => 'integer',
            'hard_limit' => 'integer',
            'window_seconds' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Environment, $this>
     */
    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }
}
