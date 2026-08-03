<div align="center">

<p><strong>Құжаттама:</strong> <a href="README.ru.md">Русский</a> · <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.kk.md">Қазақша</a> · <a href="README.th.md">ไทย</a> · <a href="README.id.md">Bahasa Indonesia</a></p>

<h1>Hermes Todo</h1>
<p><strong>Hermes-пен әр әңгімені ортақ жоспарға айналдырыңыз.</strong></p>
<p>Hermes-ке мәтін немесе дауыстық хабарлама жіберіңіз. Тапсырмалар, жауапты адамдар мен күндер барлығы көріп, бірге жаңарта алатын қарапайым күнтізбеде пайда болады.</p>
<p><a href="#әңгімеден-әрекетке">Қалай жұмыс істейді</a> · <a href="#жергілікті-демо">Демоны іске қосу</a> · <a href="#нақты-орнату">Docker арқылы орнату</a></p>
<p>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml/badge.svg" alt="CI күйі" /></a>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml/badge.svg" alt="Қауіпсіздік тексерулерінің күйі" /></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/status-v0.1.0-c65b4b" alt="v0.1.0 релизі" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-252826" alt="MIT лицензиясы" /></a>
</p>

</div>

<a href="docs/assets/desktop-overview.png">
  <img src="docs/assets/desktop-overview.png" alt="Жоспарланған тапсырмалары, орындаушылары және бэклогы бар Hermes Todo екі апталық ортақ жоспары" />
</a>

Жоспарлар көбіне әңгімеде құрылады да, сол әңгіменің ішінде жоғалып кетеді. Біреу күнді есте сақтауы, тапсырманы басқа қолданбаға көшіруі және өзгеріс туралы бәріне бөлек хабарлауы керек.

Hermes Todo осы үзілісті жояды. [Hermes Agent](https://github.com/NousResearch/hermes-agent)-ке не істеу керегін бір рет айтыңыз. Сұрау ортақ күнтізбедегі тапсырмаға айналады, ал отбасыңыз, үйдегілер немесе шағын команда орындаушыны тағайындап, мерзімді ауыстырып, тапсырманы бірге аяқтай алады.

> Hermes Todo — қауымдастық жасаған тәуелсіз жоба. Ол Nous Research немесе Telegram компанияларымен байланысты емес және олар тарапынан мақұлданбаған.

## Әңгімеден әрекетке

> 🎙️ **«Hermes, азық-түлік алуды бейсенбі 18:00-ге қосып, Alex пен Maya-ға тағайында».**

<table>
  <tr>
    <td width="33%"><strong>1. Қалыпты тілмен айтыңыз</strong><br /><br />Hermes Agent қолдайтын арнада мәтін немесе аудио қолданыңыз. Тапсырма формасын толтыру қажет емес.</td>
    <td width="33%"><strong>2. Hermes құрылымдайды</strong><br /><br />Hermes Todo плагині сұрауды күні, уақыты, тегтері және орындаушылары бар тапсырмаға айналдырады.</td>
    <td width="33%"><strong>3. Барлығы көреді</strong><br /><br />Ортақ Telegram Mini App жаңарып, әр қатысушыға бірдей өзекті жоспарды көрсетеді.</td>
  </tr>
</table>

Әңгіме мен аудионы Hermes Agent өңдейді. Hermes Todo — плагин арқылы құрылымдалған нәтижені қабылдайтын көрнекі ортақ кеңістік.

## Барлық ортақ іс бір жерде

- **Жоспар бірден көрінеді.** 1–7 күн, екі апта немесе төрт апта көрінісін таңдаңыз.
- **Кім жауапты екені анық.** Бір тапсырмаға бір немесе бірнеше қатысушыны тағайындаңыз.
- **Күннің толық тізімін ашыңыз.** Күнді екі рет басу немесе **Күнді ашу** батырмасы сол күннің барлық тапсырмасын көрсетеді.
- **Жоспарды оңай өзгертіңіз.** Тапсырманы ұстап, саусақпен не тінтуірмен басқа күнге сүйреңіз.
- **Қажетті мәліметті сақтаңыз.** Ескертпе, тег, толық күн немесе нақты басталу мен аяқталу уақытын қосыңыз.
- **Барлығы синхронды.** Hermes сессияларындағы және басқа Mini App клиенттеріндегі өзгерістер ортақ көріністе пайда болады.
- **Дерек өз бақылауыңызда.** Қолданба өз серверіңізде жұмыс істейді, қалпына келтірілетін архивтер жасайды және тапсырмаларды сонда сақтайды.

## Интерфейс

<table>
  <tr><th width="50%">Аптаны бір қарағанда</th><th width="50%">Күннің толық жоспары</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-calendar.png"><img src="docs/assets/mobile-calendar.png" alt="Ортақ тапсырмалар мен бірнеше орындаушы көрсетілген Hermes Todo жеті күндік мобильді күнтізбесі" /></a></td>
    <td><a href="docs/assets/mobile-day-plan.png"><img src="docs/assets/mobile-day-plan.png" alt="Бейсенбінің барлық тапсырмасы көрсетілген Hermes Todo күндік парағы" /></a></td>
  </tr>
  <tr><td><strong>Бір рет басу күнді таңдайды, екі рет басу толық тізімді ашады.</strong></td><td><strong>Толық күндік және уақытпен берілген тапсырмалар ретімен көрінеді.</strong></td></tr>
</table>

<table>
  <tr><th width="50%">Қайта өңдемей-ақ ауыстыру</th><th width="50%">Тапсырманы нақтылау</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-drag-task.png"><img src="docs/assets/mobile-drag-task.png" alt="Hermes Todo тапсырмасын күнтізбедегі басқа күнге жоғары қарай сүйреу" /></a></td>
    <td><a href="docs/assets/mobile-task-editor.png"><img src="docs/assets/mobile-task-editor.png" alt="24 сағаттық уақыт, тегтер, ескертпе және бірнеше орындаушысы бар Hermes Todo редакторы" /></a></td>
  </tr>
  <tr><td><strong>Ұстаңыз, сүйреңіз, жіберіңіз — барлық мәлімет жаңа күнде сақталады.</strong></td><td><strong>Әдепкіде 24 сағаттық пішім, баптаудан AM/PM таңдауға болады.</strong></td></tr>
</table>

<table>
  <tr><th width="50%">Бірнеше адамға ортақ жоспар</th><th width="50%">Орындалған іс жоғалмайды</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-team-settings.png"><img src="docs/assets/mobile-team-settings.png" alt="Үш қатысушы, шақырулар, уақыт пішімі және Google Calendar бар Hermes Todo баптаулары" /></a></td>
    <td><a href="docs/assets/mobile-completed.png"><img src="docs/assets/mobile-completed.png" alt="Қалпына келтіруге болатын аяқталған Hermes Todo тапсырмалары" /></a></td>
  </tr>
  <tr><td><strong>Қатысушыларды шақырып, барлығына бір өзекті жоспар беріңіз.</strong></td><td><strong>Аяқталған және архивтелген тапсырмалар көрінеді әрі қалпына келеді.</strong></td></tr>
</table>

## Жергілікті демо

Өнімді түсінудің ең жылдам жолы. Node.js 22+ қажет, бірақ Telegram боты, домен, Docker немесе production құпиялары керек емес.

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
npm ci
npm run dev:demo
```

[http://127.0.0.1:5173](http://127.0.0.1:5173) мекенжайын ашыңыз. Жасанды тапсырмалары бар жергілікті кеңістік көрінеді. Демо әдейі тек loopback адресінде жұмыс істейді, оны желіге жарияламаңыз.

### Coding agent қолданасыз ба?

Мына промптты кодтау құралына беріңіз:

> `flufox/jnicq-hermes-todolist` репозиторийін клонда, тек loopback-та жұмыс істейтін демоны іске қос және өзгертпес бұрын жоба құрылымын түсіндір. Құпияларды оқыма және оларды промпттарға не commit-терге қоспа. Бір шағын өзгеріс жаса, содан кейін тесттерді, production build және release scan іске қос.

Өзгерістен кейін мынаны орындаңыз:

```bash
npm test
npm run test:python
npm run build
npm run release:scan
```

## Нақты орнату

Алғашқы орнату үшін қадамдық орнатқыш ұсынылады.

### Не қажет

- Git, Docker Engine және Docker Compose v2 орнатылған Linux сервері;
- DNS жазбасы сол серверге бағытталған домен;
- ұсынылған Caddy режимінде ашық 80 және 443 порттары;
- Telegram аккаунты және [BotFather](https://t.me/BotFather) берген жаңа бот токені;
- тапсырмалар Hermes әңгімелерінен келуі керек болса ғана Hermes Agent 0.16.x.

### 1. Telegram ботын жасаңыз

[BotFather](https://t.me/BotFather)-ды ашып, `/newbot` жіберіңіз және нұсқауларды орындаңыз. Алынған токенді қауіпсіз сақтаңыз; оны commit-ке немесе GitHub Issue-ға қоспаңыз.

### 2. Орнатқышты іске қосыңыз

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
chmod +x hermes-todo
./hermes-todo setup
```

Ең оңай орнату үшін proxy mode сұрағында `caddy` таңдаңыз. Орнатқыш доменді, ACME email, уақыт белдеуін, тілді, кеңістік атауын және Telegram бот токенін сұрайды. Содан кейін ол:

- Docker Compose пен бот токенін тексереді;
- жеке secret файлдарын және жергілікті дерекқорды жасайды;
- контейнерлерді іске қосып, health check аяқталғанша күтеді;
- бот мәзірінің батырмасын Mini App-пен байланыстырады;
- 30 минуттан кейін жарамсыз болатын бір реттік admin шақыруын көрсетеді.

### 3. Кеңістікті ашыңыз

Telegram-да ботты ашып, мәзір батырмасын басыңыз және көрсетілген admin шақыруын енгізіңіз. Ортақ күнтізбе ашылады. Басқа қатысушыларды кейін **Баптаулар → Қатысушылар** арқылы шақырыңыз.

Қолданба healthy күйіне өтпесе, іске қосыңыз:

```bash
./hermes-todo doctor
```

### 4. Hermes Agent-ті қосыңыз (міндетті емес)

Бұл қадам `хабарлама/аудио → ортақ тапсырма` ағынын қосады. Орнатқыш жергілікті Hermes 0.16.x нұсқасын тауып, плагинді орнатуға келіссеңіз, қадамды өткізіп жіберіңіз.

Әйтпесе `secrets/hermes_agent_token` мәнін Hermes жұмыс істейтін компьютерге қауіпсіз көшіріп, орындаңыз:

```bash
hermes plugins install https://github.com/flufox/jnicq-hermes-todolist.git --enable
hermes gateway restart
```

Орнатқыш екі мәнді сұрап, оларды Hermes-тің жеке environment файлында сақтайды:

- `HERMES_TODO_API_URL`: мысалы, `https://todo.example.com`; соңына `/api/agent/v1` қоспаңыз;
- `HERMES_TODO_API_TOKEN`: көшірілген шектеулі токен; енгізу жасырын болады.

Мәндерді тек бір shell сессиясында `export` етпеңіз: gateway қайта іске қосылғаннан кейін де олар сақталуы керек. Токенді жасырын орнатқыш өрісінен басқа shell тарихына, AI чатына, issue-ға немесе репозиторийге қоспаңыз.

Қауіпсіз сұраумен тексеріңіз:

> «Hermes, “Hermes Todo-ны тексеру” тапсырмасын ертең 10:00-ге қос».

Тапсырма Mini App ішінде пайда болуы керек. Орнатқыш Hermes-тің өзін орнатпайды; плагин [Hermes-тің ресми плагин тәртібімен](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/plugins.md) қосылады.

## v0.1.0 нұсқасында не бар

`v0.1.0` — алғашқы ашық релиз. Ортақ тапсырмалар ағыны, автоматты тексерулер және жергілікті Docker runtime тексерілді. Әр public орнатуда өз доменін/TLS және нақты Telegram-to-Hermes ағынын бөлек тексеру қажет. Кері байланыс, қате туралы хабарламалар және алғашқы үлестер қабылданады.

- admin және member рөлдері бар бір ортақ кеңістік;
- тапсырманы жасау, өңдеу, аяқтау, қалпына келтіру және архивтеу;
- бірнеше орындаушы, тегтер, ескертпелер, толық күн және нақты уақыт;
- 1–7 күн, екі апта және төрт апта күнтізбе ауқымы;
- күнді екі рет басып толық ашу және touch/mouse арқылы мерзімін ауыстыру;
- Hermes пен Mini App сессиялары арасында жедел жаңарту;
- әдепкі 24 сағаттық пішім және AM/PM таңдауы;
- бір реттік шақырулар мен шектеулі, қайтарылатын agent токендері;
- бөлек Google Calendar-мен қосымша екіжақты синхрондау;
- шифрланған тасымалданатын backup және тұтастығы тексерілетін restore;
- ағылшын және орыс интерфейстері.

Бірінші релиз әдейі шағын: бір instance бір шағын топқа және қолданбаның бір replica-сына арналған. Production кіруі Telegram арқылы орындалады. Ішкі микрофон, SaaS, multitenancy немесе Google Calendar қайшылығын автоматты шешу жоқ. Келесі қадамдар [roadmap](ROADMAP.md) ішінде.

## Құпиялық және қалпына келтіру

Тапсырма мәтіні қорғалған SQLite дерекқорында өрістік шифрлаусыз сақталады. Дискіні толық шифрлауды, шифрланған сыртқы backup-тарды, OS жаңартуларын және сенімді TLS proxy қолданыңыз. Қолданба мен worker-лер root емес пайдаланушымен, read-only root filesystem, толық түсірілген capabilities және `no-new-privileges` арқылы жұмыс істейді; Caddy тыңдау порттары үшін тек `NET_BIND_SERVICE` сақтайды.

Hermes тапсырма ескертпелерін тек tool call оны нақты сұрағанда алады. Agent API тапсырмаларды біржола жоя алмайды және workspace, OAuth немесе синхрондау баптауларын өзгерте алмайды. Instance жарияламас бұрын [қауіпсіздік саясатын](SECURITY.md), [қауіп моделін](docs/THREAT_MODEL.md) және [соңғы қауіпсіздік шолуын](docs/SECURITY_REVIEW.md) оқыңыз.

<details>
<summary><strong>Кеңейтілген баптау және пайдалану</strong></summary>

### Proxy режимдері

Ұсынылған `caddy` профилі 80/443 порттарын жариялап, HTTPS сертификаттарын автоматты алады. TLS-ті басқа reverse proxy аяқтаса, `external` таңдаңыз; Hermes Todo тек `127.0.0.1:3000` адресін тыңдайды. Қашықтағы Hermes Agent API-ға public HTTPS арқылы қосылуы керек. HTTP тек loopback әзірлеуге жарайды.

### Google Calendar

1. [Google Cloud](https://support.google.com/cloud/answer/15549257) ішінде Google Calendar API қосып, OAuth consent screen баптаңыз және **Web application** түріндегі OAuth client жасаңыз.
2. Доменді ауыстырып, дәл осы authorized redirect URI қосыңыз:

   ```text
   https://todo.example.com/api/v1/admin/integrations/google/callback
   ```

3. `.env` ішінде `COMPOSE_PROFILES=caddy,calendar` немесе `COMPOSE_PROFILES=external-proxy,calendar` орнатыңыз.
4. Worker-ді іске қосып, **Баптаулар → Google Calendar** бөлімінде client ID және secret енгізіңіз:

```bash
docker compose up -d --wait
```

Hermes Todo бөлек күнтізбе жасап, тек соны пайдаланады. OAuth refresh credentials AES-256-GCM арқылы шифрланады. Бір мезгілдегі өзгерістер `needs_attention` деп белгіленеді; ешбір тарап үнсіз жеңбейді.

### Күнделікті командалар

```bash
./hermes-todo doctor
./hermes-todo invite-member
./hermes-todo rotate-token
./hermes-todo backup
./hermes-todo backup --portable
./hermes-todo restore --archive backups/example.htbackup
./hermes-todo update
```

Backup қызметі жеті күнделікті және төрт апталық SQLite snapshot сақтайды. Тасымалданатын backup дерекқор мен master key-ді құпиясөзбен қорғалған AES-256-GCM контейнеріне жинайды.

### Негізгі конфигурация

Құпия емес мәндер `.env` ішінде. Telegram токені, дерекқор master key және Hermes Agent токені тек иесі оқи алатын `secrets/` файлдарында сақталады.

| Айнымалы | Мақсаты | Әдепкі мән |
| --- | --- | --- |
| `HERMES_TODO_DOMAIN` | Ашық hostname | міндетті |
| `HERMES_TODO_TIMEZONE` | Workspace IANA уақыт белдеуі | `UTC` |
| `HERMES_TODO_LOCALE` | Орнату кезіндегі workspace locale; әр client UI тілін өзі таңдайды | `en` |
| `COMPOSE_PROFILES` | `caddy` немесе `external-proxy`; `calendar` қосуға болады | `caddy` |
| `HERMES_TODO_CALENDAR_POLL_MS` | Күнтізбені сұрау аралығы | `30000` |

</details>

## Құрастыру және үлес қосу

Стек әдейі шағын: React/Vite, Express 5, SQLite, Python Hermes плагині, Docker Compose және қосымша Google Calendar worker. Алдымен [CONTRIBUTING.md](CONTRIBUTING.md) оқыңыз, кейін орындаңыз:

```bash
npm ci
npm test
npm run test:python
npm run build
npm run dev:demo
```

Архитектура мен API [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) және [OpenAPI 3.1 келісімінде](docs/openapi-agent.yaml) берілген. Релиз тарихы [CHANGELOG.md](CHANGELOG.md), қауымдастық ережелері [Code of Conduct](CODE_OF_CONDUCT.md) ішінде.

## Лицензия

[MIT](LICENSE)
