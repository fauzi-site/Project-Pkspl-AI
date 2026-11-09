<?php

namespace App\Services\AI;

use App\Models\AnalisisAi;
use App\Models\AreaTerdampak;
use App\Models\BasisDataAi;
use App\Models\CvmAnalysis;
use App\Models\CvmData;
use App\Models\DatasetReferensi;
use App\Models\Ekosistem;
use App\Models\MetodeValuasi;
use App\Models\Proyek;
use App\Models\Role;
use App\Models\TcmAnalysis;
use App\Models\TcmData;
use App\Models\User;
use App\Services\Valuation\ProjectTevResolver;
use Illuminate\Support\Facades\Log;

/**
 * Service terkontrol untuk mengambil data relevan dari database PKSPL (tafauzi)
 * guna mendukung Retrieval-Augmented Generation (RAG) pada AI Assistant.
 */
class DatabaseSearchService
{
    public function __construct(
        private ProjectTevResolver $tevResolver
    ) {
    }

    /**
     * Cari dan rangkum konteks data relevan dari database tafauzi sesuai hak akses.
     *
     * @param string $prompt
     * @param int|null $idProyek
     * @param User|null $user
     * @param string|null $pageContext
     * @return array{
     *     found: bool,
     *     context_text: string,
     *     project_info: array|null,
     *     references: array,
     *     metadata_matches: array
     * }
     */
    public function search(
        string $prompt,
        ?int $idProyek = null,
        ?User $user = null,
        ?string $pageContext = null
    ): array {
        $prompt = trim($prompt);
        Log::info('AI database search started', [
            'prompt' => $prompt,
            'id_proyek' => $idProyek,
            'user_id' => $user?->id_user,
            'page_context' => $pageContext,
        ]);

        $contextBlocks = [];
        $references = [];
        $projectInfo = null;
        $found = false;

        // 1. Deteksi atau gunakan ID Proyek
        $targetProject = $this->resolveProject($idProyek, $prompt, $user);

        if ($targetProject) {
            $found = true;
            $projectContext = $this->buildProjectContext($targetProject, $user);
            $contextBlocks[] = $projectContext['text'];
            $projectInfo = $projectContext['info'];

            if (! empty($projectContext['reference'])) {
                $references[] = $projectContext['reference'];
            }
        }

        // 2. Ekstrak Data Master Metode Valuasi jika relevan
        $methodContext = $this->buildMethodContext($prompt);
        if (! empty($methodContext)) {
            $found = true;
            $contextBlocks[] = $methodContext;
        }

        // 3. Ekstrak Data Master Ekosistem Pesisir jika relevan
        $ecosystemContext = $this->buildEcosystemContext($prompt);
        if (! empty($ecosystemContext)) {
            $found = true;
            $contextBlocks[] = $ecosystemContext;
        }

        // 4. Cari Metadata Basis Data & Dataset Referensi Terkait
        $metadataMatches = $this->searchMetadata($prompt);
        if (! empty($metadataMatches['text'])) {
            $found = true;
            $contextBlocks[] = $metadataMatches['text'];
            foreach ($metadataMatches['references'] as $ref) {
                $references[] = $ref;
            }
        }

        // 5. Gabungkan seluruh konteks menjadi teks RAG terstruktur
        $finalContextText = implode("\n\n", array_filter($contextBlocks));

        Log::info('AI database search completed', [
            'found' => $found,
            'context_length' => strlen($finalContextText),
            'references_count' => count($references),
        ]);

        return [
            'found' => $found,
            'context_text' => $finalContextText,
            'project_info' => $projectInfo,
            'references' => $references,
            'metadata_matches' => $metadataMatches['raw'] ?? [],
        ];
    }

    /**
     * Resolusi proyek target berdasarkan ID eksplisit atau pencarian nama/kode di prompt.
     */
    private function resolveProject(?int $idProyek, string $prompt, ?User $user): ?Proyek
    {
        if ($idProyek) {
            return Proyek::query()
                ->with(['user', 'provinsi', 'kabupatenKota', 'kecamatan', 'areaTerdampak.ekosistem'])
                ->find($idProyek);
        }

        // Cari berdasarkan kode atau kata kunci pulau/kawasan jika ada
        if (preg_match('/PRJ-[A-Z0-9-]+/i', $prompt, $matches)) {
            $code = strtoupper($matches[0]);
            $proj = Proyek::query()
                ->where('kode_proyek', 'like', "%{$code}%")
                ->with(['user', 'provinsi', 'kabupatenKota', 'kecamatan', 'areaTerdampak.ekosistem'])
                ->first();
            if ($proj) {
                return $proj;
            }
        }

        // Cari berdasarkan keyword lokasi umum seperti 'Pramuka'
        $commonLocations = ['Pramuka', 'Benoa', 'Nusa Penida', 'Derawan', 'Bintan', 'Bunaken', 'Karimunjawa'];
        foreach ($commonLocations as $loc) {
            if (stripos($prompt, $loc) !== false) {
                $proj = Proyek::query()
                    ->where('nama_proyek', 'ilike', "%{$loc}%")
                    ->with(['user', 'provinsi', 'kabupatenKota', 'kecamatan', 'areaTerdampak.ekosistem'])
                    ->first();
                if ($proj) {
                    return $proj;
                }
            }
        }

        return null;
    }

    /**
     * Bangun konteks rinci mengenai suatu program penelitian (dengan pengecekan hak akses).
     *
     * @return array{text: string, info: array, reference: array|null}
     */
    private function buildProjectContext(Proyek $project, ?User $user): array
    {
        $isSuperAdmin = $user && Role::normalize($user->role?->nama_role ?? '') === Role::SUPER_ADMIN;
        $isOwner = $user && (int) $user->id_user === (int) $project->id_user;

        // Isolasi data: jika bukan super admin dan bukan pemilik proyek, batasi informasi internal
        $hasFullAccess = $isSuperAdmin || $isOwner;

        $provinsi = $project->provinsi?->nama_provinsi ?? '-';
        $kabupaten = $project->kabupatenKota?->nama_kabupaten_kota ?? '-';
        $kecamatan = $project->kecamatan?->nama_kecamatan ?? '-';
        $ownerName = $project->user?->nama ?? 'Peneliti PKSPL';

        // Hitung nilai TEV riil dari database tafauzi
        $tevMap = $this->tevResolver->forProjects([$project->id_proyek]);
        $teVal = (float) ($tevMap[$project->id_proyek] ?? 0);
        $formattedTev = $this->tevResolver->format($teVal);

        // Ambil data kawasan & tutupan lahan
        $areas = $project->areaTerdampak ?? collect();
        $areaSummaries = [];
        foreach ($areas as $area) {
            $ecoName = $area->ekosistem?->nama_ekosistem ?? 'Ekosistem Pesisir';
            $areaSummaries[] = "- {$area->nama_area} (Ekosistem: {$ecoName}, Luas: {$area->luas} {$area->satuan_luas})";
        }
        $areaText = ! empty($areaSummaries) ? implode("\n", $areaSummaries) : 'Belum ada data tutupan area spesifik.';

        // Rangkuman survei CVM & TCM jika ada
        $surveyNotes = [];
        $cvmCount = CvmData::where('id_proyek', $project->id_proyek)->count();
        if ($cvmCount > 0) {
            $avgWtp = CvmData::where('id_proyek', $project->id_proyek)->avg('wtp_amount') ?? 0;
            $surveyNotes[] = "Survei CVM (Willingness to Pay): {$cvmCount} responden, rata-rata WTP Rp " . number_format($avgWtp, 0, ',', '.');
        }

        $tcmCount = TcmData::where('id_proyek', $project->id_proyek)->count();
        if ($tcmCount > 0) {
            $avgCost = TcmData::where('id_proyek', $project->id_proyek)->avg('total_travel_cost') ?? 0;
            $surveyNotes[] = "Survei TCM (Travel Cost Method): {$tcmCount} data survei pengunjung, rata-rata biaya perjalanan Rp " . number_format($avgCost, 0, ',', '.');
        }

        $surveyText = ! empty($surveyNotes) ? implode("\n", $surveyNotes) : 'Belum ada data survei CVM/TCM terdaftar.';

        $text = <<<TEXT
[DATA PROYEK PENELITIAN PKSPL (DATABASE TAFAUZI)]:
- Nama Program: {$project->nama_proyek}
- Kode Proyek: {$project->kode_proyek}
- Peneliti Utama: {$ownerName}
- Lokasi Administratif: {$kecamatan}, {$kabupaten}, {$provinsi}
- Luas Wilayah: {$project->luas} {$project->satuan_luas}
- Tahun Penelitian: {$project->tahun}
- Total Economic Value (TEV): {$formattedTev}
- Sebaran Kawasan & Ekosistem:
{$areaText}
- Data Survei Terkait:
{$surveyText}
TEXT;

        if (! $hasFullAccess) {
            $text .= "\n(Catatan: Akses dibatasi pada ringkasan publik sesuai kebijakan otorisasi hak akses).";
        }

        $info = [
            'id_proyek' => $project->id_proyek,
            'kode_proyek' => $project->kode_proyek,
            'nama_proyek' => $project->nama_proyek,
            'luas' => $project->luas,
            'satuan_luas' => $project->satuan_luas,
            'tev' => $teVal,
            'tev_formatted' => $formattedTev,
            'lokasi' => "{$kabupaten}, {$provinsi}",
        ];

        $reference = [
            'title' => "Laporan Valuasi {$project->nama_proyek} ({$project->kode_proyek})",
            'url' => url("/api/v1/public/projects/{$project->id_proyek}"),
            'type' => 'publication',
            'publisher' => 'PKSPL IPB University',
            'year' => (int) ($project->tahun ?: date('Y')),
        ];

        return [
            'text' => $text,
            'info' => $info,
            'reference' => $reference,
        ];
    }

    /**
     * Konteks metodologi valuasi resmi dari database.
     */
    private function buildMethodContext(string $prompt): string
    {
        $keywords = ['metode', 'tcm', 'cvm', 'wtp', 'travel cost', 'harga pasar', 'hedonic', 'hpm', 'benefit transfer', 'biaya pengganti', 'rumus', 'formula', 'cara hitung'];
        $matches = false;
        foreach ($keywords as $kw) {
            if (stripos($prompt, $kw) !== false) {
                $matches = true;
                break;
            }
        }

        if (! $matches) {
            return '';
        }

        $methods = MetodeValuasi::query()->where('status', 'Aktif')->get();
        if ($methods->isEmpty()) {
            return '';
        }

        $lines = ["[STANDAR METODE VALUASI PKSPL IPB]:"];
        foreach ($methods as $m) {
            $lines[] = "- {$m->nama_metode}: {$m->deskripsi} (Formula: {$m->formula})";
        }

        return implode("\n", $lines);
    }

    /**
     * Konteks tipe ekosistem pesisir resmi dari database.
     */
    private function buildEcosystemContext(string $prompt): string
    {
        $keywords = ['ekosistem', 'mangrove', 'lamun', 'karang', 'terumbu', 'pesisir', 'hutan pantai'];
        $matches = false;
        foreach ($keywords as $kw) {
            if (stripos($prompt, $kw) !== false) {
                $matches = true;
                break;
            }
        }

        if (! $matches) {
            return '';
        }

        $ecosystems = Ekosistem::query()->where('status', 'Aktif')->get();
        if ($ecosystems->isEmpty()) {
            return '';
        }

        $lines = ["[MASTER EKOSISTEM PESISIR TERDAFTAR]:"];
        foreach ($ecosystems as $eco) {
            $lines[] = "- {$eco->nama_ekosistem}: {$eco->deskripsi}";
        }

        return implode("\n", $lines);
    }

    /**
     * Cari metadata terdaftar di basis_data_ai dan dataset_referensi.
     *
     * @return array{text: string, references: array, raw: array}
     */
    private function searchMetadata(string $prompt): array
    {
        $searchTerm = '%' . str_replace(' ', '%', $prompt) . '%';

        $datasets = DatasetReferensi::query()
            ->where('nama_dataset', 'ilike', $searchTerm)
            ->orWhere('sumber', 'ilike', $searchTerm)
            ->orWhere('deskripsi', 'ilike', $searchTerm)
            ->limit(3)
            ->get();

        $basisData = BasisDataAi::query()
            ->where('nama_basis', 'ilike', $searchTerm)
            ->orWhere('deskripsi', 'ilike', $searchTerm)
            ->limit(3)
            ->get();

        $lines = [];
        $refs = [];
        $raw = [];

        if ($datasets->isNotEmpty()) {
            $lines[] = '[DATASET REFERENSI TERSEDIA]:';
            foreach ($datasets as $ds) {
                $lines[] = "- {$ds->nama_dataset} ({$ds->kategori}, {$ds->tahun}) - Sumber: {$ds->sumber}";
                $refs[] = [
                    'title' => $ds->nama_dataset,
                    'url' => 'https://pkspl.ipb.ac.id/datasets',
                    'type' => 'publication',
                    'publisher' => $ds->sumber ?: 'PKSPL IPB University',
                    'year' => (int) ($ds->tahun ?: 2024),
                ];
            }
            $raw['dataset_referensi'] = $datasets->toArray();
        }

        if ($basisData->isNotEmpty()) {
            $lines[] = '[KNOWLEDGE BASE TERDAFTAR]:';
            foreach ($basisData as $bd) {
                $lines[] = "- {$bd->nama_basis} (Versi: {$bd->versi}, Jenis: {$bd->jenis_basis}): {$bd->deskripsi}";
            }
            $raw['basis_data_ai'] = $basisData->toArray();
        }

        return [
            'text' => implode("\n", $lines),
            'references' => $refs,
            'raw' => $raw,
        ];
    }
}
