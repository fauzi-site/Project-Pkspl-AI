# PKSPL AI Assistant - Sistem Valuasi Ekonomi Sumberdaya Pesisir & Lautan

Repositori ini memuat seluruh sistem terintegrasi **PKSPL AI Assistant**, yaitu asisten kecerdasan buatan berbasis *Generative AI* (*Controlled Retrieval-Augmented Generation / RAG*) yang terintegrasi langsung dengan Sistem Valuasi Ekonomi Ekosistem Pesisir PKSPL IPB.

---

## Arsitektur Sistem

Proyek ini terdiri dari dua komponen utama:

1. **`PKSPL-Backend` (Laravel 11 & PostgreSQL 16 + PostGIS 3.4)**
   - **AI Orchestrator & Controlled RAG:** Menghubungkan prompt pengguna dengan fakta empiris dari database penelitian (Total Economic Value / TEV, CVM, TCM, biofisik ekosistem pesisir).
   - **Google Gemini API (`gemini-2.5-flash`):** Model Generative AI untuk interpretasi data, analisis metode, dan rekomendasi kebijakan.
   - **Multi-Turn Session Memory:** Sistem riwayat percakapan bertahap (`session_id`) yang mencatat konteks sesi dan isolasi proyek riset per peneliti (*Role-Based Access Control*).
   - **Infrastruktur Docker:** Siap pakai dengan container Nginx, PHP 8.3 FPM, PostgreSQL PostGIS, Queue worker, dan Mailpit.

2. **`PKSPL-Project-Frontend` (React 18 + Vite + TypeScript + Tailwind CSS)**
   - **Global AI Assistant:** Tombol melayang (*Floating Action Button*) dan drawer panel obrolan di seluruh halaman aplikasi.
   - **Context-Aware Engine:** Secara otomatis menyertakan konteks halaman aktif (`page_context`) dan ID proyek penelitian aktif (`id_proyek`).
   - **Rich Markdown & Citations:** Merender format teks Markdown, tabel valuasi, metrik *Confidence Score*, dan kartu referensi database terverifikasi.
   - **Workflow 9 Tahap Peneliti:** Modul spasial peta pesisir, data master, jasa & metode valuasi, input survei (CVM/TCM), kalkulator TEV, visualisasi analitik, dan pelaporan review.

---

## Struktur Direktori

```text
Project-Pkspl-AI/
├── PKSPL-Backend/             # Backend API Laravel 11
│   ├── docker-compose.yml     # Konfigurasi container Docker
│   ├── src/                   # Source code Laravel
│   │   ├── app/Services/AI/   # RAG Engine, Gemini AIService, AIHistoryService
│   │   ├── app/Http/          # Controller, Request, Middleware AI
│   │   └── database/          # Migrasi dan Seeder (PostgreSQL PostGIS)
├── PKSPL-Project-Frontend/    # Frontend React Vite TypeScript
│   ├── src/
│   │   ├── components/ai-assistant/  # Komponen UI Global AI Assistant
│   │   ├── services/aiAssistantService.ts
│   │   ├── peneliti/                 # Modul alur kerja Peneliti
│   │   └── admin/                    # Modul Super Admin
└── README.md
```

---

## Menjalankan Proyek

### 1. Menjalankan Backend (Docker)
```bash
cd PKSPL-Backend
cp .env.docker.example .env.docker
cp src/.env.example src/.env
docker compose up -d
docker compose exec pkspl-app php artisan migrate
```

### 2. Menjalankan Frontend
```bash
cd PKSPL-Project-Frontend
cp .env.example .env
npm install
npm run dev
```

---

## Lisensi & Hak Cipta
Hak cipta dilindungi oleh **PKSPL IPB University**.
Dikembangkan untuk pengembangan Sistem Informasi Valuasi Ekonomi Sumberdaya Pesisir dan Lautan serta Tugas Akhir (TA).
