# Serverga o'rnatish (Ubuntu VPS)

| Qism     | Domen                                  | Qanday ishlaydi                                  |
| -------- | -------------------------------------- | ------------------------------------------------ |
| Frontend | `idu-schedule.universal-uz.uz`         | nginx `client/dist` papkasini beradi             |
| Backend  | `api.idu-schedule.universal-uz.uz`     | nginx → `127.0.0.1:4000` (PM2 ostida Node.js)    |

Loyiha papkasi: `/var/www/idu-planning`. Barcha buyruqlar `root` sifatida.

---

## 0. DNS

Domen panelida ikkala domen uchun **A yozuv** server IP manziliga yo'naltirilgan bo'lishi kerak:

```
idu-schedule.universal-uz.uz      A   <SERVER_IP>
api.idu-schedule.universal-uz.uz  A   <SERVER_IP>
```

Tekshirish: `dig +short idu-schedule.universal-uz.uz` va `dig +short api.idu-schedule.universal-uz.uz` — ikkalasi server IP'sini qaytarishi kerak.

## 1. Kerakli dasturlar

```bash
node -v        # v22.18 yoki undan yuqori bo'lishi SHART (Prisma client .ts fayllari shuni talab qiladi)
```

Node yo'q yoki eski bo'lsa:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
```

Qolganlari (o'rnatilmagan bo'lsa):

```bash
apt-get install -y nginx postgresql certbot python3-certbot-nginx
npm install -g pm2
```

4000-port bandligini tekshiring (serverda boshqa loyihalar bo'lsa):

```bash
ss -ltnp | grep ':4000 ' || echo "4000 bo'sh"
```

Band bo'lsa — boshqa port tanlang va uni `server/.env` (`PORT=`) hamda nginx konfiguratsiyasida (`proxy_pass`) bir xil qilib yozing.

## 2. Kod

```bash
cd /var/www/idu-planning
git pull
```

## 3. PostgreSQL bazasi

```bash
DB_PASS=$(openssl rand -hex 24); echo "Baza paroli: $DB_PASS"
sudo -u postgres psql -c "CREATE USER idu WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE idu_planning OWNER idu;"
```

Chiqqan parolni keyingi qadamda `DATABASE_URL` ga yozasiz.

## 4. Backend sozlamalari

```bash
cd /var/www/idu-planning/server
cp .env.production.example .env
openssl rand -base64 48   # JWT_SECRET uchun
openssl rand -base64 48   # PASSWORD_SECRET uchun
nano .env
```

To'ldirish kerak bo'lganlar:

- `DATABASE_URL` — 3-qadamdagi parol bilan
- `JWT_SECRET`, `PASSWORD_SECRET` — yuqoridagi ikki xil tasodifiy qiymat
- `ADMIN_PASSWORD` — admin uchun kuchli parol

> `PASSWORD_SECRET` ni keyin **o'zgartirmang** — o'zgarsa, saqlangan boshlang'ich parollar Excel'ga chiqmay qoladi.
> Server standart (`change-me…`, `admin123`) qiymatlar bilan ishga tushmaydi — bu ataylab qilingan.

```bash
chmod 600 .env
```

Frontend sozlamasi `client/.env.production` da (API manzili allaqachon yozilgan). Toq/juft hafta avtomatik aniqlanishi kerak bo'lsa, u yerda `VITE_SEMESTER_START` ni semestr boshlanish sanasi bilan yoqing.

## 5. O'rnatish, migratsiya, build va ishga tushirish

```bash
cd /var/www/idu-planning
bash deploy/deploy.sh
pm2 startup systemd     # server qayta yonganda avtomatik ishga tushishi uchun (chiqqan buyruqni bajaring)
pm2 save
```

Oxirida `{"ok":true}` chiqishi kerak. Holatni ko'rish: `pm2 status`, loglar: `pm2 logs idu-planning-api`.

## 6. nginx

```bash
cp deploy/nginx/idu-schedule.conf /etc/nginx/sites-available/idu-schedule.conf
ln -sf /etc/nginx/sites-available/idu-schedule.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

nginx `www-data` foydalanuvchisi `client/dist` ni o'qiy olishi kerak:

```bash
chmod o+rx /var/www /var/www/idu-planning /var/www/idu-planning/client
```

## 7. HTTPS (Let's Encrypt)

```bash
certbot --nginx -d idu-schedule.universal-uz.uz -d api.idu-schedule.universal-uz.uz --redirect
```

Sertifikat avtomatik yangilanadi (`systemctl list-timers | grep certbot`).

## 8. Tekshirish

```bash
curl https://api.idu-schedule.universal-uz.uz/api/health    # {"ok":true}
```

1. https://idu-schedule.universal-uz.uz ni oching, `admin` va `.env` dagi `ADMIN_PASSWORD` bilan kiring.
2. **Import** → Excel jadvalni yuklang (avval "Faylni tekshirish").
3. **O'qituvchilar → Excel** — login/parollarni yuklab oling va tarqating.

---

## Yangilash

Kodga o'zgarish kiritilgandan keyin serverda:

```bash
cd /var/www/idu-planning && bash deploy/deploy.sh
```

Skript: `git pull` → bog'liqliklar → baza migratsiyalari → frontend build → API'ni uzilishsiz qayta yuklash.

## Muammolar

| Belgi | Tekshirish |
| --- | --- |
| Sayt ochiladi, lekin "Server bilan aloqa yo'q" | `curl https://api.idu-schedule.universal-uz.uz/api/health`; `pm2 logs idu-planning-api` |
| API 502 Bad Gateway | `pm2 status` — API ishlamayapti; `.env` dagi port nginx'dagi `proxy_pass` bilan bir xilmi |
| PM2 loglarida `server/.env da quyidagilarni o'rnating` | `.env` dagi sirlar to'ldirilmagan |
| Excel yuklashda 413 xatosi | nginx'da `client_max_body_size 12m;` API blokida turibdimi |
| Sahifani yangilaganda 404 | nginx frontend blokida `try_files $uri $uri/ /index.html;` bormi |
| Frontend 403 Forbidden | 6-qadamdagi `chmod o+rx` |

nginx loglari: `/var/log/nginx/error.log`.

## Lokal bazani ko'chirish (ixtiyoriy)

Lokal kompyuterdagi o'qituvchilar va ularning parollarini saqlab qolmoqchi bo'lsangiz:

```bash
# lokal kompyuterda
pg_dump -h localhost -U postgres -Fc idu_planning > idu.dump
scp idu.dump root@<SERVER_IP>:/tmp/

# serverda (bo'sh bazaga, 5-qadamdan OLDIN)
sudo -u postgres pg_restore --no-owner --role=idu -d idu_planning /tmp/idu.dump
```

Bu holda serverdagi `PASSWORD_SECRET` lokal `server/.env` dagi bilan **bir xil** bo'lishi kerak, aks holda saqlangan parollar Excel'ga chiqmaydi. Odatda bo'sh bazadan boshlab, Excel'ni serverda qayta import qilish osonroq.
