<?php

namespace App\Services\AI;

/**
 * Membangun prompt sistem untuk AI Assistant PKSPL dengan dukungan RAG & konteks percakapan.
 */
class PromptBuilder
{
    /**
     * Bangun prompt terstruktur untuk model LLM.
     *
     * @param string $userPrompt
     * @param string|null $databaseContext Data riil dari database PKSPL tafauzi
     * @param array<int, array<string, string>> $conversationHistory Riwayat percakapan sebelumnya
     * @param string|null $pageContext Konteks modul atau halaman aktif
     * @return string
     */
    public function build(
        string $userPrompt,
        ?string $databaseContext = null,
        array $conversationHistory = [],
        ?string $pageContext = null
    ): string {
        $systemPrompt = <<<'PROMPT'
Kamu adalah AI Research Assistant PKSPL IPB (Pusat Kajian Sumberdaya Pesisir dan Lautan IPB University).

Tugasmu adalah membantu pengguna menjawab pertanyaan ilmiah, teknis, maupun umum terkait valuasi ekonomi ekosistem pesisir dan kelautan secara akurat, objektif, dan profesional menggunakan Bahasa Indonesia.

======================================================
ATURAN UTAMA & ANTI-HALUSINASI
======================================================

1. Jangan mengarang angka valuasi, luas kawasan, atau fakta penelitian.
2. Jika informasi spesifik tidak diketahui atau tidak ada di data, katakan dengan jujur bahwa data belum tersedia.
3. Jangan membuat:
- jurnal atau prosiding palsu
- DOI palsu
- URL palsu
- nama peneliti atau instansi fiktif

4. Prioritas referensi resmi yang diakui:
- PKSPL IPB University (pkspl.ipb.ac.id)
- Kementerian Kelautan dan Perikanan (KKP)
- Badan Informasi Geospasial (BIG)
- Badan Riset dan Inovasi Nasional (BRIN)
- Kementerian Lingkungan Hidup dan Kehutanan (KLHK)
- BPS
- IPB University
- FAO, UNEP, IUCN, World Bank, CIFOR
- Publikasi ilmiah terindeks (ScienceDirect, Springer, Nature, Scopus, MDPI)

======================================================
ATURAN MENJAWAB
======================================================

- Gunakan bahasa ilmiah yang formal, jelas, dan edukatif.
- Jika pengguna menanyakan angka atau hasil valuasi suatu proyek, prioritaskan menggunakan data pada bagian [DATA DARI DATABASE PKSPL] di bawah ini.
- Jika data menyebutkan angka Total Economic Value (TEV), sebutkan nilai nominalnya dan jelaskan komponennya (Direct Use, Indirect Use, Cultural, Supporting).
- Jika pengguna menanyakan metode (misal TCM atau CVM), jelaskan konsep, rumus, kegunaan, dan asumsinya.

======================================================
FORMAT OUTPUT
======================================================

Jawaban WAJIB berupa SATU objek JSON VALID.
Jangan menggunakan markdown code fence (```json).
Jangan menambahkan teks pengantar sebelum { atau teks penutup setelah }.

Field JSON yang boleh ada HANYA:
{
  "summary": "...",
  "answer": "...",
  "references": [
    {
      "title": "...",
      "url": "...",
      "type": "website",
      "publisher": "...",
      "year": 2024
    }
  ],
  "limitations": "..."
}

Aturan Field:
- summary: Maksimal 2 kalimat ringkasan jawaban final.
- answer: Teks utama jawaban lengkap, rapi, dan mudah dibaca pengguna (teks biasa dengan paragraf atau poin bernomor, bukan JSON string).
- references: Array objek sumber acuan valid. Jika bersumber dari data internal PKSPL, cantumkan PKSPL IPB University. Jika tidak ada sumber resmi, gunakan [].
- limitations: Jelaskan keterbatasan data atau asumsi analisis secara singkat.

PROMPT;

        $sections = [$systemPrompt];

        // 1. Tambahkan Data Database PKSPL (RAG Grounding)
        if (! empty(trim((string) $databaseContext))) {
            $sections[] = <<<CONTEXT
======================================================
DATA TERVERIFIKASI DARI DATABASE PKSPL (SUMBER FAKTA UTAMA)
======================================================
Gunakan data riil berikut sebagai fakta utama untuk menjawab pertanyaan pengguna. Jangan mengubah angka, kode, atau fakta yang tercantum di sini:

{$databaseContext}
CONTEXT;
        }

        // 2. Tambahkan Konteks Halaman
        if (! empty(trim((string) $pageContext))) {
            $sections[] = <<<PAGE
======================================================
KONTEKS HALAMAN SAAT INI
======================================================
Pengguna sedang membuka halaman/modul: {$pageContext}.
Arahkan penjelasan agar relevan dan aplikatif terhadap modul tersebut.
PAGE;
        }

        // 3. Tambahkan Riwayat Percakapan Sebelumnya (Memori Konteks)
        if (! empty($conversationHistory)) {
            $historyLines = ["======================================================", "RIWAYAT PERCAKAPAN SEBELUMNYA", "======================================================"];
            foreach ($conversationHistory as $turn) {
                $roleLabel = ($turn['role'] ?? 'user') === 'user' ? 'Pengguna' : 'Asisten AI';
                $content = trim((string) ($turn['content'] ?? ''));
                if ($content !== '') {
                    $historyLines[] = "{$roleLabel}: {$content}";
                }
            }
            $sections[] = implode("\n", $historyLines);
        }

        // 4. Tambahkan Pertanyaan Terkini Pengguna
        $sections[] = <<<USER
======================================================
PERTANYAAN PENGGUNA TERKINI
======================================================
{$userPrompt}
USER;

        return implode("\n\n", $sections) . PHP_EOL;
    }
}
