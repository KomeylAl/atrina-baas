<?php

namespace App\Models;

use App\Enums\ApiCredentialKind;
use App\Enums\ApiCredentialStatus;
use Database\Factories\ApiCredentialFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiCredential extends Model
{
    /** @use HasFactory<ApiCredentialFactory> */
    use HasFactory, HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'environment_id',
        'name',
        'key_prefix',
        'secret_hash',
        'kind',
        'scopes',
        'status',
        'expires_at',
        'last_used_at',
        'created_by',
        'revoked_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'secret_hash',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => ApiCredentialKind::class,
            'status' => ApiCredentialStatus::class,
            'scopes' => 'array',
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isActive(): bool
    {
        if ($this->status !== ApiCredentialStatus::Active) {
            return false;
        }

        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }
}
