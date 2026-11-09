<?php

namespace App\Http\Controllers\Api\V1\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\AIRequest;
use App\Models\Proyek;
use App\Models\Role;
use App\Services\AI\AIHistoryService;
use App\Services\AI\AIOrchestrator;
use App\Services\AI\AIResponseService;
use App\Services\AI\DatabaseSearchService;
use App\Services\AI\PromptBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AIController extends Controller
{
    public function __construct(
        private AIOrchestrator $aiOrchestrator,
        private PromptBuilder $promptBuilder,
        private DatabaseSearchService $databaseSearchService,
        private AIHistoryService $historyService,
        private AIResponseService $responseService,
    ) {
    }

    /**
     * Endpoint pengecekan konfigurasi provider & model AI.
     */
    public function test(Request $request): JsonResponse
    {
        $provider = config('ai.provider', 'gemini');
        $model = config('ai.' . $provider . '.model', 'gemini-3.5-flash');

        return response()->json([
            'success' => true,
            'provider' => $provider,
            'model' => $model,
            'status' => 'connected',
            'database' => config('database.connections.pgsql.database'),
        ]);
    }

    /**
     * Endpoint uji koneksi langsung ke provider AI (Google Gemini).
     */
    public function health(Request $request): JsonResponse
    {
        try {
            $response = $this->aiOrchestrator->generate('Reply only OK.');

            if (! $response->success) {
                return response()->json([
                    'success' => false,
                    'status' => 'disconnected',
                    'message' => $response->message ?? 'AI health check gagal.',
                ], Response::HTTP_SERVICE_UNAVAILABLE);
            }

            return response()->json([
                'success' => true,
                'status' => 'connected',
                'provider' => $response->provider,
                'model' => $response->model,
                'reply' => $response->answer,
            ]);
        } catch (\Throwable $e) {
            Log::error('AI health check exception', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'status' => 'error',
                'message' => 'Layanan AI sementara tidak dapat dihubungi: ' . $e->getMessage(),
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }
    }

    /**
     * Endpoint utama pengiriman pesan percakapan AI Assistant (Controlled RAG).
     */
    public function generate(AIRequest $request): JsonResponse
    {
        $user = $request->user();
        $userPrompt = trim($request->input('prompt'));
        $sessionId = $request->input('session_id') ? trim($request->input('session_id')) : (string) Str::uuid();
        $idProyek = $request->input('id_proyek') ? (int) $request->input('id_proyek') : null;
        $pageContext = $request->input('page_context') ? trim($request->input('page_context')) : null;

        Log::info('AI Assistant request received', [
            'user_id' => $user?->id_user,
            'session_id' => $sessionId,
            'id_proyek' => $idProyek,
            'page_context' => $pageContext,
            'prompt' => $userPrompt,
        ]);

        // 1. Validasi Akses & Isolasi Data Proyek
        if ($idProyek && $user) {
            $isSuperAdmin = Role::normalize($user->role?->nama_role ?? '') === Role::SUPER_ADMIN;
            $project = Proyek::find($idProyek);

            if (! $project) {
                return response()->json([
                    'success' => false,
                    'message' => 'Proyek penelitian tidak ditemukan.',
                ], Response::HTTP_NOT_FOUND);
            }

            // Jika user adalah Peneliti, pastikan hanya dapat mengakses program riset miliknya
            if (! $isSuperAdmin && (int) $project->id_user !== (int) $user->id_user) {
                Log::warning('Unauthorized project data access attempt', [
                    'user_id' => $user->id_user,
                    'id_proyek' => $idProyek,
                    'project_owner_id' => $project->id_user,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak. Anda tidak memiliki otoritas untuk mengakses data proyek ini.',
                ], Response::HTTP_FORBIDDEN);
            }
        }

        // 2. Ambil Riwayat Percakapan Sesi untuk Memori Percakapan Multi-Turn
        $conversationHistory = [];
        if ($user) {
            $conversationHistory = $this->historyService->getRecentSessionContext($sessionId, (int) $user->id_user, 4);
        }

        // 3. Controlled RAG: Ekstrak Data Relevan dari Database PostgreSQL tafauzi
        $databaseResult = $this->databaseSearchService->search(
            $userPrompt,
            $idProyek,
            $user,
            $pageContext
        );

        // 4. Susun System Prompt Terpadu (Persona + Data Riil PKSPL + Riwayat + Pertanyaan)
        $fullPrompt = $this->promptBuilder->build(
            $userPrompt,
            $databaseResult['context_text'] ?? null,
            $conversationHistory,
            $pageContext
        );

        // 5. Eksekusi Model LLM (Google Gemini) melalui Orkestrator
        $generated = $this->aiOrchestrator->generate($fullPrompt);

        if (! $generated->success) {
            Log::error('AI generation failed', [
                'session_id' => $sessionId,
                'message' => $generated->message,
            ]);

            return response()->json([
                'success' => false,
                'message' => $generated->message ?? 'AI Assistant gagal menghasilkan jawaban. Silakan coba kembali sesaat lagi.',
            ], Response::HTTP_BAD_GATEWAY);
        }

        // 6. Integrasi & Deduplikasi Referensi (Referensi database + referensi Gemini)
        $mergedReferences = $this->mergeReferences(
            $databaseResult['references'] ?? [],
            $generated->references ?? []
        );

        // Jika data bersumber dari database tafauzi, tingkatkan confidence
        $confidence = $databaseResult['found']
            ? max(85, (int) ($generated->confidence ?? 80))
            : (int) ($generated->confidence ?? 70);

        $responseData = [
            'success' => true,
            'session_id' => $sessionId,
            'id_proyek' => $idProyek,
            'page_context' => $pageContext,
            'provider' => $generated->provider,
            'model' => $generated->model,
            'confidence' => $confidence,
            'summary' => $generated->summary,
            'answer' => $generated->answer,
            'references' => $mergedReferences,
            'limitations' => $generated->limitations,
            'database_grounded' => ! empty($databaseResult['context_text']),
        ];

        // 7. Simpan Riwayat Percakapan ke Tabel ai_history
        $this->historyService->storeExternal(
            $userPrompt,
            [
                'provider' => $generated->provider,
                'model' => $generated->model,
            ],
            $responseData,
            $mergedReferences,
            $confidence,
            $sessionId,
            $idProyek,
            $pageContext,
            $user?->id_user
        );

        return response()->json($responseData);
    }

    /**
     * Endpoint untuk mengambil daftar sesi percakapan pengguna.
     */
    public function conversations(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        $conversations = $this->historyService->getUserConversations((int) $user->id_user);

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    /**
     * Endpoint untuk mengambil seluruh pesan dalam satu sesi percakapan.
     */
    public function conversationMessages(Request $request, string $sessionId): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        $messages = $this->historyService->getSessionMessages($sessionId, (int) $user->id_user);

        return response()->json([
            'success' => true,
            'session_id' => $sessionId,
            'data' => $messages,
        ]);
    }

    /**
     * Endpoint untuk menghapus sesi percakapan pengguna.
     */
    public function deleteConversation(Request $request, string $sessionId): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        $deleted = $this->historyService->deleteSession($sessionId, (int) $user->id_user);

        return response()->json([
            'success' => true,
            'message' => 'Sesi percakapan berhasil dihapus.',
            'deleted_count' => $deleted,
        ]);
    }

    /**
     * Gabungkan dan bersihkan referensi agar tidak duplikat.
     */
    private function mergeReferences(array $dbRefs, array $aiRefs): array
    {
        $all = array_merge($dbRefs, $aiRefs);
        $unique = [];
        $seen = [];

        foreach ($all as $ref) {
            $title = trim((string) ($ref['title'] ?? ''));
            if ($title === '' || isset($seen[$title])) {
                continue;
            }
            $seen[$title] = true;
            $unique[] = $ref;
        }

        return $unique;
    }
}
