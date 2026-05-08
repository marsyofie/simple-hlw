# simple-hello-world

Aplikasi web sederhana berbasis Node.js yang berjalan di AWS menggunakan ECS Fargate, RDS MySQL, dan Application Load Balancer. Deployment dilakukan secara otomatis melalui GitHub Actions setiap kali ada perubahan di branch `main`.

---

## Struktur Folder

### `app/`

Berisi source code aplikasi dan segala sesuatu yang berkaitan langsung dengan runtime-nya.

- `server.js` — HTTP server menggunakan Express. Melayani dua endpoint: `/` untuk menampilkan pesan dari database, dan `/health` untuk health check.
- `migrate.js` — Script untuk menjalankan migrasi database.
- `update-message.js` — Script untuk memperbarui isi pesan yang ditampilkan di halaman utama.
- `migrations/` — File SQL berisi skema awal database.
- `Dockerfile` — Konfigurasi build image Docker untuk aplikasi ini.
- `_cdk/` — AWS CDK stack khusus untuk mendeploy aplikasi ke ECS (task definition, service, target group, dsb).

### `infra/`

Berisi kode AWS CDK untuk menyiapkan infrastruktur dasar yang dibutuhkan aplikasi.

- `lib/vpc.ts` — Mendefinisikan VPC dan subnet.
- `lib/rds.ts` — Provisioning database RDS MySQL.
- `lib/ecs.ts` — Membuat ECS cluster.
- `lib/alb.ts` — Membuat Application Load Balancer.
- `lib/infra-stack.ts` — Stack utama yang merangkai semua komponen di atas, lalu mengekspor nilai-nilainya ke CloudFormation outputs dan AWS SSM Parameter Store.

---

## Deployment

Pipeline CI/CD berjalan di GitHub Actions (`.github/workflows/deploy-aws.yml`).

- Jika ada perubahan di folder `infra/`, workflow akan mendeploy ulang stack infrastruktur.
- Jika ada perubahan di folder `app/`, workflow akan mendeploy ulang stack aplikasi.
- Keduanya bisa berjalan secara independen maupun berurutan, tergantung file mana yang berubah.

Autentikasi ke AWS menggunakan OIDC dengan IAM role yang di-assume lewat secret `AWS_ROLE_ARN`.

---

## Menjalankan Secara Lokal

Pastikan ada instance MySQL yang berjalan, lalu set environment variable berikut:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=helloworld
```

Kemudian jalankan migrasi dan start server:

```bash
cd app
npm install
npm run migrate
npm start
```

Server berjalan di port `8080` secara default.
