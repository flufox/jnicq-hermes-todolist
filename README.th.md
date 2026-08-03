<div align="center">

<p><strong>ภาษาเอกสาร:</strong> <a href="README.ru.md">Русский</a> · <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.kk.md">Қазақша</a> · <a href="README.th.md">ไทย</a> · <a href="README.id.md">Bahasa Indonesia</a></p>

<h1>Hermes Todo</h1>
<p><strong>เปลี่ยนทุกบทสนทนากับ Hermes ให้เป็นแผนงานร่วมกัน</strong></p>
<p>ส่งข้อความหรือข้อความเสียงถึง Hermes แล้วงาน ผู้รับผิดชอบ และวันที่จะปรากฏในปฏิทินที่เรียบง่าย ทุกคนมองเห็นและอัปเดตร่วมกันได้</p>
<p><a href="#จากบทสนทนาสู่การลงมือทำ">ดูวิธีทำงาน</a> · <a href="#ทดลองบนเครื่อง">ลองเดโม</a> · <a href="#ติดตั้งใช้งานจริง">ติดตั้งด้วย Docker</a></p>
<p>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml/badge.svg" alt="สถานะ CI" /></a>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml/badge.svg" alt="สถานะการตรวจสอบความปลอดภัย" /></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/status-v0.1.0-c65b4b" alt="รุ่น v0.1.0" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-252826" alt="สัญญาอนุญาต MIT" /></a>
</p>

</div>

<a href="docs/assets/desktop-overview.png">
  <img src="docs/assets/desktop-overview.png" alt="แผนร่วมสองสัปดาห์ใน Hermes Todo พร้อมงาน ผู้รับผิดชอบ และงานค้าง" />
</a>

หลายครั้งเราวางแผนกันในบทสนทนา แล้วแผนนั้นก็หายไปพร้อมกับข้อความเก่า ใครสักคนต้องจำวัน คัดลอกงานไปยังแอปอื่น และคอยบอกทุกคนเมื่อแผนเปลี่ยน

Hermes Todo เชื่อมช่องว่างนี้ เพียงบอก [Hermes Agent](https://github.com/NousResearch/hermes-agent) ครั้งเดียวว่าต้องทำอะไร คำขอจะกลายเป็นงานในปฏิทินร่วม ซึ่งครอบครัว เพื่อนร่วมบ้าน หรือทีมขนาดเล็กสามารถมอบหมาย เลื่อนวัน และทำให้เสร็จร่วมกันได้

> Hermes Todo เป็นโครงการของชุมชน ไม่มีความเกี่ยวข้องหรือการรับรองจาก Nous Research หรือ Telegram

## จากบทสนทนาสู่การลงมือทำ

> 🎙️ **“Hermes เพิ่มรายการซื้อของวันพฤหัสบดีเวลา 18:00 และมอบหมายให้ Alex กับ Maya”**

<table>
  <tr>
    <td width="33%"><strong>1. บอกอย่างเป็นธรรมชาติ</strong><br /><br />ใช้ข้อความหรือเสียงในช่องทางที่ Hermes Agent รองรับ ไม่ต้องกรอกแบบฟอร์มงาน</td>
    <td width="33%"><strong>2. Hermes จัดโครงสร้างให้</strong><br /><br />ปลั๊กอิน Hermes Todo เปลี่ยนคำขอเป็นงานที่มีวันที่ เวลา แท็ก และผู้รับผิดชอบ</td>
    <td width="33%"><strong>3. ทุกคนเห็นตรงกัน</strong><br /><br />Telegram Mini App ที่ใช้ร่วมกันจะรีเฟรชและแสดงแผนล่าสุดให้ผู้เข้าร่วมทุกคน</td>
  </tr>
</table>

Hermes Agent ดูแลบทสนทนาและเสียง ส่วน Hermes Todo คือพื้นที่ทำงานแบบภาพที่รับผลลัพธ์ที่จัดโครงสร้างแล้วผ่านปลั๊กอิน

## งานร่วมทั้งหมดในที่เดียว

- **เห็นแผนได้ทันที** สลับมุมมอง 1–7 วัน สองสัปดาห์ หรือสี่สัปดาห์
- **รู้ว่าใครรับผิดชอบอะไร** มอบหมายงานให้สมาชิกหนึ่งคนหรือหลายคน
- **เปิดรายการทั้งหมดของวัน** แตะวันที่สองครั้งหรือกด **เปิดวันนี้** เพื่อดูทุกงานในวันนั้น
- **เปลี่ยนแผนได้เป็นธรรมชาติ** กดงานค้างไว้แล้วลากด้วยนิ้วหรือเมาส์ไปยังวันอื่น
- **เก็บรายละเอียดที่จำเป็น** เพิ่มบันทึก แท็ก งานทั้งวัน หรือเวลาเริ่มและสิ้นสุดที่แน่นอน
- **ทุกคนซิงก์กัน** การเปลี่ยนแปลงจาก Hermes และ Mini App เครื่องอื่นจะปรากฏในมุมมองร่วม
- **ควบคุมข้อมูลเอง** แอปโฮสต์บนเซิร์ฟเวอร์ของคุณ มีไฟล์สำรองที่กู้คืนได้ และเก็บงานไว้กับคุณ

## หน้าตาแอป

<table>
  <tr><th width="50%">เห็นทั้งสัปดาห์ในครั้งเดียว</th><th width="50%">แผนงานครบทั้งวัน</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-calendar.png"><img src="docs/assets/mobile-calendar.png" alt="ปฏิทินมือถือ Hermes Todo แบบเจ็ดวัน พร้อมงานร่วมและผู้รับผิดชอบหลายคน" /></a></td>
    <td><a href="docs/assets/mobile-day-plan.png"><img src="docs/assets/mobile-day-plan.png" alt="แผงแผนรายวัน Hermes Todo แสดงงานทั้งหมดของวันพฤหัสบดี" /></a></td>
  </tr>
  <tr><td><strong>แตะหนึ่งครั้งเพื่อเลือกวัน แตะสองครั้งเพื่อเปิดรายการทั้งหมด</strong></td><td><strong>เห็นทั้งงานแบบทั้งวันและงานตามเวลาเรียงในที่เดียว</strong></td></tr>
</table>

<table>
  <tr><th width="50%">ย้ายงานโดยไม่ต้องเปิดแก้ไขใหม่</th><th width="50%">กำหนดรายละเอียดงานได้ครบ</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-drag-task.png"><img src="docs/assets/mobile-drag-task.png" alt="ลากงาน Hermes Todo ขึ้นไปยังวันอื่นในปฏิทิน" /></a></td>
    <td><a href="docs/assets/mobile-task-editor.png"><img src="docs/assets/mobile-task-editor.png" alt="ตัวแก้ไขงาน Hermes Todo พร้อมเวลาแบบ 24 ชั่วโมง แท็ก บันทึก และผู้รับผิดชอบหลายคน" /></a></td>
  </tr>
  <tr><td><strong>กดค้าง ลาก แล้วปล่อย รายละเอียดยังคงอยู่ในวันที่ใหม่</strong></td><td><strong>ใช้เวลา 24 ชั่วโมงเป็นค่าเริ่มต้น หรือเปลี่ยนเป็น AM/PM ในการตั้งค่า</strong></td></tr>
</table>

<table>
  <tr><th width="50%">แผนเดียวสำหรับหลายคน</th><th width="50%">เสร็จแล้วแต่ไม่หายไป</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-team-settings.png"><img src="docs/assets/mobile-team-settings.png" alt="การตั้งค่า Hermes Todo พร้อมสมาชิกสามคน คำเชิญ รูปแบบเวลา และ Google Calendar" /></a></td>
    <td><a href="docs/assets/mobile-completed.png"><img src="docs/assets/mobile-completed.png" alt="รายการงานที่เสร็จแล้วใน Hermes Todo ซึ่งสามารถกู้คืนได้" /></a></td>
  </tr>
  <tr><td><strong>เชิญผู้เข้าร่วมและให้ทุกคนใช้แผนล่าสุดชุดเดียวกัน</strong></td><td><strong>งานที่เสร็จหรือเก็บถาวรยังดูและกู้คืนได้</strong></td></tr>
</table>

## ทดลองบนเครื่อง

นี่คือวิธีที่เร็วที่สุดในการเข้าใจผลิตภัณฑ์ ต้องใช้ Node.js 22+ แต่ไม่ต้องมีบอต Telegram โดเมน Docker หรือ secret สำหรับ production

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
npm ci
npm run dev:demo
```

เปิด [http://127.0.0.1:5173](http://127.0.0.1:5173) คุณจะเห็นพื้นที่ทำงานบนเครื่องพร้อมข้อมูลงานตัวอย่าง เดโมตั้งใจให้ทำงานเฉพาะ loopback เท่านั้น ห้ามเปิดออกสู่เครือข่าย

### ใช้ coding agent อยู่หรือไม่?

วางพรอมป์นี้ลงในเครื่องมือเขียนโค้ดของคุณ:

> โคลน `flufox/jnicq-hermes-todolist` เปิดเดโมที่จำกัดเฉพาะ loopback และอธิบายโครงสร้างโปรเจกต์ก่อนแก้ไข ห้ามอ่านหรือใส่ secret ในพรอมป์หรือ commit ทำการเปลี่ยนแปลงขนาดเล็กหนึ่งรายการ แล้วรันการทดสอบ production build และ release scan

หลังแก้ไข ให้รัน:

```bash
npm test
npm run test:python
npm run build
npm run release:scan
```

## ติดตั้งใช้งานจริง

สำหรับการติดตั้งครั้งแรก แนะนำให้ใช้ตัวช่วยติดตั้งแบบทีละขั้นตอน

### สิ่งที่ต้องมี

- เซิร์ฟเวอร์ Linux ที่มี Git, Docker Engine และ Docker Compose v2;
- โดเมนที่ DNS ชี้มายังเซิร์ฟเวอร์นั้น;
- เปิดพอร์ต 80 และ 443 เมื่อใช้โหมด Caddy ที่แนะนำ;
- บัญชี Telegram และโทเค็นบอตใหม่จาก [BotFather](https://t.me/BotFather);
- Hermes Agent 0.16.x เฉพาะกรณีที่ต้องการสร้างงานจากบทสนทนากับ Hermes

### 1. สร้างบอต Telegram

เปิด [BotFather](https://t.me/BotFather) ส่ง `/newbot` และทำตามขั้นตอน เก็บโทเค็นที่ได้รับให้ปลอดภัย ห้าม commit หรือวางลงใน GitHub Issue

### 2. เรียกตัวช่วยติดตั้ง

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
chmod +x hermes-todo
./hermes-todo setup
```

สำหรับการติดตั้งที่ง่ายที่สุด ให้เลือก `caddy` เมื่อระบบถาม proxy mode ตัวช่วยจะถามโดเมน อีเมล ACME เขตเวลา ภาษา ชื่อพื้นที่ทำงาน และโทเค็นบอต Telegram จากนั้นจะ:

- ตรวจสอบ Docker Compose และโทเค็นบอต;
- สร้างไฟล์ secret แบบส่วนตัวและฐานข้อมูลบนเครื่อง;
- เริ่ม container และรอ health check;
- เชื่อมปุ่มเมนูของบอตกับ Mini App;
- แสดงคำเชิญ admin แบบใช้ครั้งเดียวที่หมดอายุใน 30 นาที

### 3. เปิดพื้นที่ทำงาน

เปิดบอตใน Telegram แตะปุ่มเมนู และกรอกคำเชิญ admin ที่แสดงไว้ ปฏิทินร่วมควรปรากฏขึ้น เชิญสมาชิกคนอื่นภายหลังจาก **การตั้งค่า → สมาชิก**

หากแอปไม่ขึ้นสถานะ healthy ให้รัน:

```bash
./hermes-todo doctor
```

### 4. เชื่อม Hermes Agent (ไม่บังคับ)

ขั้นตอนนี้เปิดการทำงานแบบ `ข้อความ/เสียง → งานร่วม` หากตัวช่วยพบ Hermes 0.16.x บนเครื่องและคุณยอมรับการติดตั้งปลั๊กอิน ให้ข้ามขั้นตอนนี้

มิฉะนั้น ให้คัดลอกค่าจาก `secrets/hermes_agent_token` ไปยังเครื่องที่รัน Hermes อย่างปลอดภัย แล้วรัน:

```bash
hermes plugins install https://github.com/flufox/jnicq-hermes-todolist.git --enable
hermes gateway restart
```

ตัวติดตั้งจะถามสองค่าและบันทึกลงในไฟล์ environment ส่วนตัวของ Hermes:

- `HERMES_TODO_API_URL`: origin สาธารณะ เช่น `https://todo.example.com` โดยไม่ต้องเติม `/api/agent/v1`;
- `HERMES_TODO_API_TOKEN`: scoped token ที่คัดลอกมา ช่องกรอกจะซ่อนค่าไว้

อย่าใช้เพียง `export` ชั่วคราวใน shell เดียว เพราะค่าต้องยังอยู่หลังรีสตาร์ต gateway นอกจากช่องกรอกแบบซ่อนของตัวติดตั้งแล้ว ห้ามใส่โทเค็นในประวัติ shell แชต AI, Issue หรือ repository

ทดสอบด้วยคำขอที่ไม่มีความเสี่ยง เช่น:

> “Hermes เพิ่มงาน ‘ตรวจสอบ Hermes Todo’ สำหรับพรุ่งนี้เวลา 10:00”

งานควรปรากฏใน Mini App สคริปต์ติดตั้งไม่ได้ติดตั้ง Hermes เอง การติดตั้งปลั๊กอินใช้[ขั้นตอนปลั๊กอินอย่างเป็นทางการของ Hermes](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/plugins.md)

## สิ่งที่มีใน v0.1.0

`v0.1.0` คือรุ่นสาธารณะครั้งแรก ขั้นตอนหลักของงานร่วม การตรวจสอบอัตโนมัติ และ Docker runtime บนเครื่องได้รับการตรวจสอบแล้ว การติดตั้งสาธารณะแต่ละแห่งยังควรทดสอบโดเมน/TLS ของตนเองและการทำงานจริงจาก Telegram ไปยัง Hermes เรายินดีรับคำติชม รายงานบั๊ก และ contribution แรก ๆ

- พื้นที่ทำงานร่วมหนึ่งแห่ง พร้อมบทบาท admin และ member;
- สร้าง แก้ไข ทำเสร็จ กู้คืน และเก็บงานถาวร;
- ผู้รับผิดชอบหลายคน แท็ก บันทึก งานทั้งวัน และเวลาที่กำหนด;
- มุมมองปฏิทิน 1–7 วัน สองสัปดาห์ และสี่สัปดาห์;
- เปิดวันเต็มด้วยการแตะสองครั้ง และลากเปลี่ยนวันด้วยนิ้วหรือเมาส์;
- รีเฟรชสดระหว่าง Hermes และ Mini App;
- เวลา 24 ชั่วโมงเป็นค่าเริ่มต้น พร้อมตัวเลือก AM/PM;
- คำเชิญใช้ครั้งเดียวและโทเค็น agent แบบจำกัดสิทธิ์ที่เพิกถอนได้;
- ซิงก์สองทางกับ Google Calendar แยกเฉพาะได้ตามต้องการ;
- ข้อมูลสำรองแบบพกพาที่เข้ารหัส และการกู้คืนพร้อมตรวจสอบความถูกต้อง;
- อินเทอร์เฟซภาษาอังกฤษและรัสเซีย

รุ่นแรกตั้งใจจำกัดขอบเขต: หนึ่ง instance รองรับกลุ่มขนาดเล็กหนึ่งกลุ่มและ application replica หนึ่งชุด การเข้าสู่ระบบ production ใช้ Telegram ไม่มีไมโครโฟนในตัว, SaaS, multitenancy หรือการตัดสินผู้ชนะอัตโนมัติเมื่อ Google Calendar ขัดแย้ง ดูแผนถัดไปได้ใน [roadmap](ROADMAP.md)

## ความเป็นส่วนตัวและการกู้คืน

เนื้อหางานถูกเก็บเป็น plaintext ภายในฐานข้อมูล SQLite ที่ได้รับการป้องกัน ควรใช้การเข้ารหัสดิสก์เต็มรูปแบบ ข้อมูลสำรองนอกเครื่องที่เข้ารหัส การอัปเดต OS และ TLS proxy ที่ไว้ใจได้ แอปและ worker ทำงานด้วยผู้ใช้ที่ไม่ใช่ root พร้อม read-only root filesystem, ลด capabilities ทั้งหมด และเปิด `no-new-privileges`; Caddy คงไว้เพียง `NET_BIND_SERVICE` สำหรับพอร์ตที่รับฟัง

Hermes จะได้รับบันทึกของงานเมื่อ tool call ขออย่างชัดเจนเท่านั้น Agent API ไม่สามารถลบงานอย่างถาวรหรือแก้การตั้งค่า workspace, OAuth และการซิงก์ได้ อ่าน[นโยบายความปลอดภัย](SECURITY.md), [แบบจำลองภัยคุกคาม](docs/THREAT_MODEL.md) และ[ผลตรวจสอบล่าสุด](docs/SECURITY_REVIEW.md) ก่อนเปิด instance สู่สาธารณะ

<details>
<summary><strong>การตั้งค่าและดูแลระบบขั้นสูง</strong></summary>

### โหมด proxy

โปรไฟล์ `caddy` ที่แนะนำจะเปิดพอร์ต 80/443 และรับใบรับรอง HTTPS อัตโนมัติ เลือก `external` หาก reverse proxy อื่นจัดการ TLS อยู่แล้ว จากนั้น Hermes Todo จะฟังเฉพาะ `127.0.0.1:3000` เท่านั้น Hermes ที่อยู่คนละเครื่องต้องใช้ Agent API ผ่าน HTTPS สาธารณะ ส่วน HTTP ใช้ได้เฉพาะการพัฒนาบน loopback

### Google Calendar

1. เปิด Google Calendar API ใน [Google Cloud](https://support.google.com/cloud/answer/15549257) ตั้งค่า OAuth consent screen และสร้าง OAuth client ชนิด **Web application**
2. เพิ่ม authorized redirect URI นี้โดยเปลี่ยนโดเมน:

   ```text
   https://todo.example.com/api/v1/admin/integrations/google/callback
   ```

3. แก้ `.env` เป็น `COMPOSE_PROFILES=caddy,calendar` หรือ `COMPOSE_PROFILES=external-proxy,calendar`
4. เริ่ม worker แล้วเปิด **การตั้งค่า → Google Calendar** กรอก client ID และ secret จากนั้นเชื่อมบัญชี:

```bash
docker compose up -d --wait
```

Hermes Todo สร้างและใช้ปฏิทินแยกเฉพาะ OAuth refresh credentials เข้ารหัสด้วย AES-256-GCM การแก้ไขพร้อมกันจะถูกทำเครื่องหมาย `needs_attention` และไม่มีฝั่งใดทับอีกฝั่งโดยเงียบ ๆ

### คำสั่งประจำวัน

```bash
./hermes-todo doctor
./hermes-todo invite-member
./hermes-todo rotate-token
./hermes-todo backup
./hermes-todo backup --portable
./hermes-todo restore --archive backups/example.htbackup
./hermes-todo update
```

บริการสำรองข้อมูลเก็บ snapshot SQLite รายวัน 7 ชุดและรายสัปดาห์ 4 ชุด ข้อมูลสำรองแบบพกพารวมฐานข้อมูลและ master key ที่จำเป็นไว้ใน container AES-256-GCM ที่ป้องกันด้วย passphrase

### การตั้งค่าหลัก

ค่าที่ไม่ใช่ความลับอยู่ใน `.env` ส่วนโทเค็น Telegram, master key ฐานข้อมูล และโทเค็น Hermes Agent อยู่ในไฟล์ใต้ `secrets/` ที่เจ้าของเท่านั้นอ่านได้

| ตัวแปร | จุดประสงค์ | ค่าเริ่มต้น |
| --- | --- | --- |
| `HERMES_TODO_DOMAIN` | hostname สาธารณะ | จำเป็น |
| `HERMES_TODO_TIMEZONE` | เขตเวลา IANA ของ workspace | `UTC` |
| `HERMES_TODO_LOCALE` | locale ของ workspace ตอนติดตั้ง; แต่ละ client เลือกภาษา UI ได้เอง | `en` |
| `COMPOSE_PROFILES` | `caddy` หรือ `external-proxy`; เพิ่ม `calendar` ได้ | `caddy` |
| `HERMES_TODO_CALENDAR_POLL_MS` | ช่วงเวลา polling ปฏิทิน | `30000` |

</details>

## Build และร่วมพัฒนา

สแตกตั้งใจให้เล็ก: React/Vite, Express 5, SQLite, ปลั๊กอิน Hermes ภาษา Python, Docker Compose และ Google Calendar worker ที่เลือกใช้ได้ เริ่มจาก [CONTRIBUTING.md](CONTRIBUTING.md) แล้วรัน:

```bash
npm ci
npm test
npm run test:python
npm run build
npm run dev:demo
```

รายละเอียดสถาปัตยกรรมและ API อยู่ใน [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) และ[สัญญา OpenAPI 3.1](docs/openapi-agent.yaml) ประวัติรุ่นอยู่ใน [CHANGELOG.md](CHANGELOG.md) และแนวทางชุมชนอยู่ใน [Code of Conduct](CODE_OF_CONDUCT.md)

## สัญญาอนุญาต

[MIT](LICENSE)
