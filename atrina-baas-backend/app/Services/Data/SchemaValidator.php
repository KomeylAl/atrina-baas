<?php

namespace App\Services\Data;

use Illuminate\Validation\ValidationException;

class SchemaValidator
{
    public const MAX_PAYLOAD_BYTES = 65536;

    public const MAX_COLUMNS = 50;

    public const ALLOWED_TYPES = ['string', 'text', 'integer', 'number', 'boolean', 'json'];

    /**
     * @param  array<string, mixed>  $schema
     * @return array{columns: list<array<string, mixed>>}
     */
    public function normalizeSchemaDefinition(array $schema): array
    {
        $columns = $schema['columns'] ?? null;

        if (! is_array($columns) || $columns === []) {
            throw ValidationException::withMessages([
                'schema_definition' => ['schema_definition.columns must be a non-empty array.'],
            ]);
        }

        if (count($columns) > self::MAX_COLUMNS) {
            throw ValidationException::withMessages([
                'schema_definition' => ['A table may define at most '.self::MAX_COLUMNS.' columns.'],
            ]);
        }

        $normalized = [];
        $names = [];

        foreach ($columns as $index => $column) {
            if (! is_array($column)) {
                throw ValidationException::withMessages([
                    "schema_definition.columns.$index" => ['Each column must be an object.'],
                ]);
            }

            $name = strtolower((string) ($column['name'] ?? ''));
            $type = strtolower((string) ($column['type'] ?? ''));

            if ($name === '' || ! preg_match('/^[a-z][a-z0-9_]{0,63}$/', $name)) {
                throw ValidationException::withMessages([
                    "schema_definition.columns.$index.name" => ['Invalid column name.'],
                ]);
            }

            if (in_array($name, ['id', 'created_at', 'updated_at', 'owner_id'], true)) {
                throw ValidationException::withMessages([
                    "schema_definition.columns.$index.name" => ['Column name is reserved.'],
                ]);
            }

            if (isset($names[$name])) {
                throw ValidationException::withMessages([
                    "schema_definition.columns.$index.name" => ['Duplicate column name.'],
                ]);
            }

            if (! in_array($type, self::ALLOWED_TYPES, true)) {
                throw ValidationException::withMessages([
                    "schema_definition.columns.$index.type" => ['Unsupported column type.'],
                ]);
            }

            $names[$name] = true;
            $normalized[] = [
                'name' => $name,
                'type' => $type,
                'required' => (bool) ($column['required'] ?? false),
                'max' => isset($column['max']) ? (int) $column['max'] : null,
                'default' => $column['default'] ?? null,
            ];
        }

        return ['columns' => $normalized];
    }

    /**
     * @param  array{columns: list<array<string, mixed>>}  $schema
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function validatePayload(array $schema, array $payload, bool $partial = false): array
    {
        $encoded = json_encode($payload);
        if ($encoded === false || strlen($encoded) > self::MAX_PAYLOAD_BYTES) {
            throw ValidationException::withMessages([
                'data' => ['Payload exceeds the maximum allowed size.'],
            ]);
        }

        $columns = collect($schema['columns'])->keyBy('name');
        $unknown = array_diff(array_keys($payload), $columns->keys()->all());

        if ($unknown !== []) {
            throw ValidationException::withMessages([
                'data' => ['Unknown fields: '.implode(', ', $unknown)],
            ]);
        }

        $result = [];

        foreach ($columns as $name => $column) {
            $present = array_key_exists($name, $payload);

            if (! $present) {
                if ($partial) {
                    continue;
                }

                if ($column['required'] && $column['default'] === null) {
                    throw ValidationException::withMessages([
                        "data.$name" => ['This field is required.'],
                    ]);
                }

                if ($column['default'] !== null) {
                    $result[$name] = $column['default'];
                }

                continue;
            }

            $result[$name] = $this->castValue($name, $column, $payload[$name]);
        }

        return $result;
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function castValue(string $name, array $column, mixed $value): mixed
    {
        if ($value === null) {
            if ($column['required']) {
                throw ValidationException::withMessages([
                    "data.$name" => ['This field is required.'],
                ]);
            }

            return null;
        }

        return match ($column['type']) {
            'string', 'text' => $this->asString($name, $value, $column),
            'integer' => $this->asInteger($name, $value),
            'number' => $this->asNumber($name, $value),
            'boolean' => $this->asBoolean($name, $value),
            'json' => $this->asJson($name, $value),
            default => throw ValidationException::withMessages([
                "data.$name" => ['Unsupported type.'],
            ]),
        };
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function asString(string $name, mixed $value, array $column): string
    {
        if (! is_string($value)) {
            throw ValidationException::withMessages([
                "data.$name" => ['Must be a string.'],
            ]);
        }

        $max = $column['max'] ?? ($column['type'] === 'text' ? 10000 : 255);
        if (mb_strlen($value) > $max) {
            throw ValidationException::withMessages([
                "data.$name" => ["May not be greater than {$max} characters."],
            ]);
        }

        return $value;
    }

    private function asInteger(string $name, mixed $value): int
    {
        if (! is_int($value) && ! (is_string($value) && preg_match('/^-?\d+$/', $value))) {
            throw ValidationException::withMessages([
                "data.$name" => ['Must be an integer.'],
            ]);
        }

        return (int) $value;
    }

    private function asNumber(string $name, mixed $value): float
    {
        if (! is_int($value) && ! is_float($value) && ! (is_string($value) && is_numeric($value))) {
            throw ValidationException::withMessages([
                "data.$name" => ['Must be a number.'],
            ]);
        }

        return (float) $value;
    }

    private function asBoolean(string $name, mixed $value): bool
    {
        if (! is_bool($value)) {
            throw ValidationException::withMessages([
                "data.$name" => ['Must be a boolean.'],
            ]);
        }

        return $value;
    }

    private function asJson(string $name, mixed $value): mixed
    {
        if (! is_array($value)) {
            throw ValidationException::withMessages([
                "data.$name" => ['Must be a JSON object or array.'],
            ]);
        }

        return $value;
    }
}
