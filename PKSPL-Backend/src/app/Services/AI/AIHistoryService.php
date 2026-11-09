<?php

namespace App\Services\AI;

use App\Models\AIHistory;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Menyimpan dan mengelola histori percakapan AI Assistant PKSPL.
 */
class AIHistoryService
{
    /**
     * Simpan riwayat pencarian yang ditemukan di database.
     *
     * @param string $prompt
     * @param array<string, mixed> $response
     * @param string|null $sessionId
     * @param int|null $idProyek
     * @param string|null $pageContext
     * @param int|null $userId
     * @return AIHistory
     */
    public function storeDatabase(
        string $prompt,
        array $response,
        ?string $sessionId = null,
        ?int $idProyek = null,
        ?string $pageContext = null,
        ?int $userId = null
    ): AIHistory {
        $userId = $userId ?? Auth::id();

        Log::info('AI history store database started', [
            'prompt' => $prompt,
            'user_id' => $userId,
            'session_id' => $sessionId,
        ]);

        $record = AIHistory::create([
            'id_user' => $userId,
            'session_id' => $sessionId,
            'id_proyek' => $idProyek,
            'page_context' => $pageContext,
            'prompt' => $prompt,
            'provider' => 'database',
            'source' => 'database',
            'confidence' => 100,
            'response' => json_encode($response, JSON_UNESCAPED_UNICODE),
            'references' => json_encode([], JSON_UNESCAPED_UNICODE),
        ]);

        Log::info('AI history store database completed', ['id_ai_history' => $record->id_ai_history]);

        return $record;
    }

    /**
     * Simpan riwayat yang dihasilkan dari provider AI eksternal (Gemini).
     *
     * @param string $prompt
     * @param array<string, mixed> $generated
     * @param array<string, mixed> $response
     * @param array<int, array<string, mixed>> $references
     * @param int $confidence
     * @param string|null $sessionId
     * @param int|null $idProyek
     * @param string|null $pageContext
     * @param int|null $userId
     * @return AIHistory
     */
    public function storeExternal(
        string $prompt,
        array $generated,
        array $response,
        array $references,
        int $confidence,
        ?string $sessionId = null,
        ?int $idProyek = null,
        ?string $pageContext = null,
        ?int $userId = null
    ): AIHistory {
        $userId = $userId ?? Auth::id();

        Log::info('AI history store external started', [
            'prompt' => $prompt,
            'user_id' => $userId,
            'session_id' => $sessionId,
            'confidence' => $confidence,
        ]);

        $record = AIHistory::create([
            'id_user' => $userId,
            'session_id' => $sessionId,
            'id_proyek' => $idProyek,
            'page_context' => $pageContext,
            'prompt' => $prompt,
            'provider' => $generated['provider'] ?? 'gemini',
            'source' => 'gemini',
            'confidence' => $confidence,
            'response' => json_encode($response, JSON_UNESCAPED_UNICODE),
            'references' => json_encode($references, JSON_UNESCAPED_UNICODE),
        ]);

        Log::info('AI history store external completed', ['id_ai_history' => $record->id_ai_history]);

        return $record;
    }

    /**
     * Ambil daftar sesi percakapan untuk pengguna tertentu.
     *
     * @param int $userId
     * @param int $limit
     * @return array<int, array<string, mixed>>
     */
    public function getUserConversations(int $userId, int $limit = 30): array
    {
        $rawSessions = AIHistory::query()
            ->where('id_user', $userId)
            ->whereNotNull('session_id')
            ->select('session_id', DB::raw('MAX(id_ai_history) as latest_id'), DB::raw('COUNT(*) as message_count'))
            ->groupBy('session_id')
            ->orderByDesc('latest_id')
            ->limit($limit)
            ->get();

        if ($rawSessions->isEmpty()) {
            return [];
        }

        $latestIds = $rawSessions->pluck('latest_id');
        $histories = AIHistory::query()
            ->whereIn('id_ai_history', $latestIds)
            ->with(['proyek:id_proyek,nama_proyek,kode_proyek'])
            ->get()
            ->keyBy('session_id');

        $result = [];
        foreach ($rawSessions as $session) {
            $history = $histories->get($session->session_id);
            if (! $history) {
                continue;
            }

            $responseDecoded = json_decode($history->response, true) ?: [];

            $result[] = [
                'session_id' => $session->session_id,
                'title' => $this->generateConversationTitle($history->prompt),
                'latest_prompt' => $history->prompt,
                'latest_summary' => $responseDecoded['summary'] ?? '',
                'id_proyek' => $history->id_proyek,
                'proyek' => $history->proyek ? [
                    'id_proyek' => $history->proyek->id_proyek,
                    'nama_proyek' => $history->proyek->nama_proyek,
                    'kode_proyek' => $history->proyek->kode_proyek,
                ] : null,
                'page_context' => $history->page_context,
                'message_count' => (int) $session->message_count,
                'created_at' => $history->created_at?->toISOString() ?? now()->toISOString(),
            ];
        }

        return $result;
    }

    /**
     * Ambil seluruh pesan dalam satu sesi percakapan.
     *
     * @param string $sessionId
     * @param int $userId
     * @return array<int, array<string, mixed>>
     */
    public function getSessionMessages(string $sessionId, int $userId): array
    {
        $histories = AIHistory::query()
            ->where('session_id', $sessionId)
            ->where('id_user', $userId)
            ->orderBy('id_ai_history', 'asc')
            ->get();

        return $histories->map(function (AIHistory $h) {
            $response = json_decode($h->response, true) ?: [];
            $references = json_decode($h->references, true) ?: [];

            return [
                'id_ai_history' => $h->id_ai_history,
                'session_id' => $h->session_id,
                'prompt' => $h->prompt,
                'summary' => $response['summary'] ?? '',
                'answer' => $response['answer'] ?? ($response['message'] ?? ''),
                'references' => $references ?: ($response['references'] ?? []),
                'limitations' => $response['limitations'] ?? '',
                'confidence' => $h->confidence,
                'source' => $h->source,
                'provider' => $h->provider,
                'page_context' => $h->page_context,
                'created_at' => $h->created_at?->toISOString(),
            ];
        })->toArray();
    }

    /**
     * Ambil konteks beberapa putaran pesan terakhir untuk memori percakapan LLM.
     *
     * @param string $sessionId
     * @param int $userId
     * @param int $limitTurns
     * @return array<int, array<string, string>>
     */
    public function getRecentSessionContext(string $sessionId, int $userId, int $limitTurns = 4): array
    {
        $records = AIHistory::query()
            ->where('session_id', $sessionId)
            ->where('id_user', $userId)
            ->orderBy('id_ai_history', 'desc')
            ->limit($limitTurns)
            ->get()
            ->reverse();

        $historyContext = [];
        foreach ($records as $rec) {
            $historyContext[] = [
                'role' => 'user',
                'content' => $rec->prompt,
            ];

            $decoded = json_decode($rec->response, true) ?: [];
            $answer = $decoded['answer'] ?? $decoded['summary'] ?? '';
            if (! empty($answer)) {
                $historyContext[] = [
                    'role' => 'model',
                    'content' => $answer,
                ];
            }
        }

        return $historyContext;
    }

    /**
     * Hapus sebuah sesi percakapan milik pengguna.
     *
     * @param string $sessionId
     * @param int $userId
     * @return int Jumlah pesan yang dihapus
     */
    public function deleteSession(string $sessionId, int $userId): int
    {
        return AIHistory::query()
            ->where('session_id', $sessionId)
            ->where('id_user', $userId)
            ->delete();
    }

    /**
     * Buat judul ringkas dari pertanyaan awal.
     */
    private function generateConversationTitle(string $prompt): string
    {
        $prompt = trim($prompt);
        if (mb_strlen($prompt) <= 45) {
            return $prompt;
        }

        return mb_substr($prompt, 0, 42) . '...';
    }
}
