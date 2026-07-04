<?php

namespace Workdo\Taskly\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Workdo\Taskly\Models\MomRoom;
use Workdo\Taskly\Models\MomStatement;
use Workdo\Taskly\Models\MomAiConfig;
use Workdo\Taskly\Models\MomDocument;

class MomAiController extends Controller
{
    public function suggest(Request $request, MomRoom $room)
    {
        $user = Auth::user();

        // AI is strictly internal-only
        abort_if($user->type === 'client', 403);
        abort_if($room->created_by !== creatorId(), 403);
        abort_if(!$room->isMember($user->id), 403);

        $validated = $request->validate([
            'statement_id' => 'required|integer|exists:mom_statements,id',
            'tone_input'   => 'nullable|string|max:500',
        ]);

        $config = MomAiConfig::where('created_by', creatorId())->first();
        if (!$config || empty($config->api_key)) {
            return response()->json(['error' => __('AI is not configured. Please set up AI settings first.')], 422);
        }

        // The target statement
        $targetStatement = MomStatement::with('user:id,name,type')->find($validated['statement_id']);
        abort_if($targetStatement->room_id !== $room->id, 422);

        // Build full conversation history as JSON
        $allStatements = MomStatement::where('room_id', $room->id)
            ->with('user:id,name,type')
            ->orderBy('created_at')
            ->get()
            ->map(fn($s) => [
                'sl_no'   => $s->sl_no,
                'speaker' => $s->user->name . ' (' . $s->user->type . ')',
                'content' => $s->content,
                'time'    => $s->created_at->format('Y-m-d H:i'),
            ])
            ->all();

        // Document context
        $documents = MomDocument::where('room_id', $room->id)
            ->where('is_latest', true)
            ->get()
            ->map(fn($d) => $d->original_name . ($d->description ? ': ' . $d->description : ''))
            ->implode(', ');

        $prompt = $this->buildPrompt(
            room: $room,
            targetStatement: $targetStatement,
            allStatements: $allStatements,
            documents: $documents,
            toneInput: $validated['tone_input'] ?? ''
        );

        try {
            $suggestions = $this->callAi($config, $prompt);
            return response()->json(['suggestions' => $suggestions]);
        } catch (\Exception $e) {
            return response()->json(['error' => __('AI request failed: ') . $e->getMessage()], 500);
        }
    }

    public function settings()
    {
        $user = Auth::user();
        abort_if($user->type === 'client', 403);
        abort_if(!$user->can('manage-project'), 403);

        return Inertia::render('Taskly/Mom/Settings');
    }

    public function getConfig()
    {
        $user = Auth::user();
        abort_if($user->type === 'client', 403);
        abort_if(!$user->can('manage-project'), 403);

        $config = MomAiConfig::where('created_by', creatorId())->first();

        return response()->json([
            'provider'  => $config?->provider ?? 'anthropic',
            'model'     => $config?->model ?? 'claude-sonnet-4-6',
            'has_key'   => !empty($config?->api_key),
            'providers' => MomAiConfig::PROVIDERS,
        ]);
    }

    public function saveConfig(Request $request)
    {
        $user = Auth::user();
        abort_if($user->type === 'client', 403);
        abort_if(!$user->can('manage-project'), 403);

        $existing = MomAiConfig::where('created_by', creatorId())->first();
        $keyRequired = !$existing || empty($existing->api_key);

        $validated = $request->validate([
            'provider' => 'required|in:anthropic,openai,google',
            'api_key'  => $keyRequired ? 'required|string|min:10' : 'nullable|string|min:10',
            'model'    => 'required|string|max:100',
        ]);

        $data = ['provider' => $validated['provider'], 'model' => $validated['model']];
        if (!empty($validated['api_key'])) {
            $data['api_key'] = $validated['api_key'];
        }

        MomAiConfig::updateOrCreate(['created_by' => creatorId()], $data);

        return back()->with('success', __('AI configuration saved.'));
    }

    private function buildPrompt(MomRoom $room, $targetStatement, array $allStatements, string $documents, string $toneInput): string
    {
        $historyJson = json_encode($allStatements, JSON_PRETTY_PRINT);

        return <<<PROMPT
You are a professional business communication assistant helping the internal team of a company respond to a client in a formal Minutes of Meeting (MOM) discussion.

PROJECT: {$room->project->name}
ROOM NAME: {$room->name}
ROOM CONTEXT: {$room->description}

DOCUMENTS IN THIS ROOM: {$documents}

FULL CONVERSATION HISTORY (JSON):
{$historyJson}

THE CLIENT STATEMENT TO RESPOND TO (#{$targetStatement->sl_no} by {$targetStatement->user->name}):
"{$targetStatement->content}"

DESIRED TONE/APPROACH FROM OUR TEAM: {$toneInput}

Please provide exactly 3 professional reply options for this client statement. Each reply should:
- Be suitable for official meeting minutes
- Be clear, factual, and professional
- Address the client's specific point
- Reflect the desired tone if specified

IMPORTANT: Return ONLY valid JSON in this exact format, no extra text:
{
  "suggestions": [
    { "tone": "Brief tone label (e.g. Firm and Direct)", "text": "Full reply text here" },
    { "tone": "Brief tone label", "text": "Full reply text here" },
    { "tone": "Brief tone label", "text": "Full reply text here" }
  ]
}
PROMPT;
    }

    private function callAi(MomAiConfig $config, string $prompt): array
    {
        $raw = match ($config->provider) {
            'anthropic' => $this->callAnthropic($config, $prompt),
            'openai'    => $this->callOpenAi($config, $prompt),
            'google'    => $this->callGoogle($config, $prompt),
            default     => throw new \RuntimeException('Unknown AI provider'),
        };

        $decoded = json_decode($raw, true);
        if (!isset($decoded['suggestions']) || !is_array($decoded['suggestions'])) {
            // Try to extract JSON from the response if model added extra text
            preg_match('/\{[\s\S]*\}/m', $raw, $matches);
            if ($matches) {
                $decoded = json_decode($matches[0], true);
            }
        }

        return $decoded['suggestions'] ?? [];
    }

    private function callAnthropic(MomAiConfig $config, string $prompt): string
    {
        $response = Http::withHeaders([
            'x-api-key'         => $config->api_key,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model'      => $config->model,
            'max_tokens' => 2048,
            'messages'   => [['role' => 'user', 'content' => $prompt]],
        ]);

        if ($response->failed()) {
            throw new \RuntimeException($response->json('error.message') ?? 'Anthropic API error');
        }

        return $response->json('content.0.text') ?? '';
    }

    private function callOpenAi(MomAiConfig $config, string $prompt): string
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $config->api_key,
            'Content-Type'  => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model'    => $config->model,
            'messages' => [['role' => 'user', 'content' => $prompt]],
        ]);

        if ($response->failed()) {
            throw new \RuntimeException($response->json('error.message') ?? 'OpenAI API error');
        }

        return $response->json('choices.0.message.content') ?? '';
    }

    private function callGoogle(MomAiConfig $config, string $prompt): string
    {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$config->model}:generateContent?key={$config->api_key}";

        $response = Http::post($url, [
            'contents' => [['parts' => [['text' => $prompt]]]],
        ]);

        if ($response->failed()) {
            throw new \RuntimeException($response->json('error.message') ?? 'Google AI API error');
        }

        return $response->json('candidates.0.content.parts.0.text') ?? '';
    }
}
