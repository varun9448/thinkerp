<?php

namespace Workdo\Taskly\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Crypt;

class MomAiConfig extends Model
{
    use HasFactory;

    protected $fillable = ['created_by', 'provider', 'api_key', 'model'];

    public const PROVIDERS = [
        'anthropic' => [
            'label'  => 'Anthropic (Claude)',
            'models' => [
                'claude-opus-4-7'        => 'Claude Opus 4.7',
                'claude-sonnet-4-6'      => 'Claude Sonnet 4.6',
                'claude-haiku-4-5-20251001' => 'Claude Haiku 4.5',
            ],
        ],
        'openai' => [
            'label'  => 'OpenAI (GPT)',
            'models' => [
                'gpt-4o'       => 'GPT-4o',
                'gpt-4-turbo'  => 'GPT-4 Turbo',
                'gpt-3.5-turbo'=> 'GPT-3.5 Turbo',
            ],
        ],
        'google' => [
            'label'  => 'Google (Gemini)',
            'models' => [
                'gemini-1.5-pro'   => 'Gemini 1.5 Pro',
                'gemini-1.5-flash' => 'Gemini 1.5 Flash',
            ],
        ],
    ];

    public function setApiKeyAttribute(string $value): void
    {
        $this->attributes['api_key'] = Crypt::encryptString($value);
    }

    public function getApiKeyAttribute(string $value): string
    {
        try {
            return Crypt::decryptString($value);
        } catch (\Exception $e) {
            return '';
        }
    }
}
