# Pixel Blast

Nekonečná 2D plošinovka s pixelovým panáčkem, který překonává překážky a laserovou
pistolí likviduje roboty. Veškerý text kreslí vlastní bitmapový font 5×7
(`src/font.js`), takže zůstává ostrý i na velkém displeji. Čistý HTML + CSS + JavaScript (ES moduly), žádný build,
žádné externí assety — všechny sprity jsou nakreslené přímo v kódu v `src/sprites.js`.

## Spuštění

Kvůli ES modulům je potřeba HTTP server, otevření souboru přes `file://` nefunguje:

```bash
python3 -m http.server 5173
```

Pak otevřít <http://localhost:5173>.

## Hlavní menu

Po spuštění se otevře menu **Pixel Blast**:

- **Nová hra** — nejdřív se zadá jméno postavy (HTML pole, takže na Androidu naskočí
  systémová klávesnice), pak běží úvodní scénka a hra.
- **Leaderboard** — deset nejlepších výsledků, ukládá se do `localStorage`
  (jméno, skóre, dosažený level). Zápis proběhne automaticky po každé prohře.

Ovládání menu: šipky nahoru/dolů, potvrzení Enterem nebo ťuknutím na položku.

## Úvodní scénka

Postava spí v pokoji, probudí se, všimne si laserové pistole na stolku, dojde k ní,
zvedne ji („LASEROVA PISTOLE!“ — v bublině je jméno zadané hráčem) a tím hra začíná. Scénka jde přeskočit Enterem
nebo tapem.

## Ovládání

| Akce | Klávesnice | Dotyk |
| --- | --- | --- |
| Pohyb | šipky vlevo/vpravo nebo `A` / `D` | tlačítka ◀ ▶ |
| Skok (2× = dvojskok) | mezerník, šipka nahoru, `W` | tlačítko ▲ |
| Laser | `X`, `K`, `J` | tlačítko ✷ |
| Start / restart | `Enter`, `R` | tap kamkoli |
| Pauza / menu během hry | `Esc`, `P` | tlačítko `II` v rohu |

Pauza nabídne pokračovat, nebo odejít do hlavního menu — tím ale běh končí a
skóre se nezapíše. Mince sebrané do té chvíle v peněžence zůstanou.

## Herní pravidla

- Tři životy. Zásah do pastí, robotů nebo pád do propasti bere život a hráč se vrací
  na poslední checkpoint (začátek aktuálního úseku). Po zásahu je krátce nesmrtelný.
- Skóre = ušlá vzdálenost + 10 za minci + 25 za zničeného robota + 150 za bosse.
- Srdíčko po bossovi vrací život, maximum je 5. Rekord se ukládá
  do `localStorage`.
- Laser má krátký cooldown, munice je neomezená. Střely se zastaví o bedny a zdi.
- Nepřátelé: pozemní robot (2 zásahy) a poletující netvor (1 zásah).

### Mini boss

Každých 500 bodů přiletí mini boss — pancéřovaný dron, který si drží odstup a pálí
plazmové koule ve výšce pasu. Koule se dají přeskočit, nebo se před nimi schovat za
bednu — o překážky se plazma zastaví stejně jako hráčův laser. Nad hlavou má boss
ukazatel života. Prvního složí 6 zásahů, každý další má o 3 životy víc a střílí
rychleji.

Odměna za zabití je 150 bodů, tři mince a **srdíčko**, které vrací jeden život
(maximum je 5). Další boss přijde až na dalším násobku 500 bodů, takže odměna sama
o sobě dalšího bosse nespustí. Boss přežije i ztrátu života, rozjetý souboj se
neresetuje.

Zásah nepřítele se kreslí jako oranžová záře kolem jeho siluety plus odskok o pixel
a jiskry proti směru střely — sprite zůstane čitelný.

## Power-upy

Ve světě se občas vznáší bonus (zhruba jeden na pět úseků) a jeden navíc pouští
každý poražený boss. Sebere se dotykem, aktivní bonusy jsou vidět jako ikony s
ubývajícím proužkem pod životy.

| Ikona | Bonus | Účinek | Trvání |
| --- | --- | --- | --- |
| blesk | rychlopalba | laser střílí zhruba 3× rychleji | 14 s |
| trojzubec | trojitý laser | každý výstřel jde ve třech drahách (nahoru, rovně, dolů) | 16 s |
| magnet | magnet na mince | mince do 64 px samy letí k hráči | 16 s |
| štít | štít | pohltí jeden zásah, kolem panáčka svítí kruh | do zásahu |

## Hlavní boss a konec levelu 1

Na **2000 bodech** přiletí hlavní boss — dvakrát větší mech, 26 životů, průběžně
vysílá poletující netvory a pod polovinou života přepne do druhé fáze: střílí
rychleji a útočí výpady k hráči.

Střelbu má v pevných drahách odvozených od země, takže každá salva jde vždycky
uhnout:

| Dráha | Výška | Jak uhnout |
| --- | --- | --- |
| nízká | 14 px nad zemí | přeskočit |
| vysoká | 40 px nad zemí | zůstat stát na zemi |
| horní | 56 px nad zemí | mine i ve skoku (jen tlačí na hráče) |

Hitbox bosse sahá až k zemi, takže ho hráčův laser trefí i když se boss vznáší
vysoko. Mini bossové se od
2000 bodů už neobjevují, level vrcholí tímhle soubojem.

Po jeho zničení se level uzavře scénkou (jde přeskočit Enterem / tapem):
přistane velká raketa, vystoupí kosmonaut a řekne *„Pojď se mnou na Měsíc!“*,
nejdřív nastoupí kosmonaut, pak k raketě dojde i hráčova postava — a odstartují.

Následuje samotný let: raketa stoupá vesmírem, Země se pod ní zmenšuje, Měsíc
nahoře roste, nahoře běží ukazatel Země → Měsíc a nakonec raketa přistane na
měsíčním povrchu. Celý let trvá zhruba 10 sekund a jde přeskočit.

## Level 2 — Měsíc

Druhý level pokračuje s nasbíraným skóre, životy i bonusy:

- **Nízká gravitace** (45 % pozemské) — skoky jsou vysoké a pomalé.
- Černá obloha s hvězdami, Země nad obzorem, šedý měsíční prach místo trávy.
- Mini bossové po 500 bodech pokračují, ale na Měsíci mají **dvojnásobek životů**
  a vypadají jinak — mimozemské moduly, a od 18 životů výš rovnou dvojnásobně
  velký mimozemský stroj.
- Nepřáteli jsou mimozemské potvory místo pozemských robotů — jinak vypadají a mají
  dvojnásobek životů (chodec 4 zásahy, létající 2).

## Konec hry — robot a ultra boss

Na **4000 bodech** na Měsíci se hra na chvíli zastaví: přistane robot, pochválí
hráče („DOHRAL JSI HRU! SUPER!“), rozesměje se („HA HA HA HA!“) a odletí — a nechá
po sobě **ultra bosse**: obrovský černočervený stroj se 40 životy, trojnásobným
měřítkem spritu, rychlejšími salvami a nepřetržitým vysíláním potvor.

Po jeho poražení se objeví závěrečná obrazovka **„POKRACOVANI PRISTE“** se souhrnem
běhu; skóre se zapíše do leaderboardu.

## Obchod za mince

Mince sebrané ve hře se sčítají do peněženky, která přežije smrt i restart
(`localStorage`). V hlavním menu je položka **Obchod**:

| Zboží | Cena | Efekt |
| --- | --- | --- |
| srdce navíc | 150 | běh začíná se 4 životy |
| startovní štít | 220 | každý běh začíná se štítem |
| rychlejší laser | 260 | trvale o 25 % kratší cooldown |
| delší power-upy | 200 | bonusy vydrží o polovinu déle |
| magnet na mince | 300 | slabý magnet funguje pořád, i bez bonusu |
| červený / zelený / fialový dres | 100 | barva trička postavy, dá se přepínat |
| modrý dres | zdarma | návrat k výchozí barvě |

Upgrady se kupují jednou a platí navždy, dresy se dají libovolně přepínat.
Ovládání: šipky vybírají, Enter nebo ťuknutí koupí, R vrátí do menu.

Když je nastavený Supabase (viz níže), peněženka i nákupy se zároveň ukládají
na server, takže se přenesou i na jiné zařízení.

## Online data (Supabase)

Hra umí běžet čistě lokálně, ale po nastavení Supabase se leaderboard, profily
hráčů, mince a nákupy drží centrálně v databázi.

Projekt už běží: `pixel-blast` v organizaci `richpear`, region `eu-central-1`
(Frankfurt), free plán. Adresa a veřejný klíč jsou v `src/cloud-config.js`.

**Když se zakládá znovu (nebo nový projekt)**

1. V Supabase vytvoř projekt (region EU Central je nejblíž).
2. V `SQL Editoru` spusť `supabase/schema.sql`. Skript založí tabulky
   `players` a `scores`, pohled `leaderboard`, politiky RLS a zároveň
   leaderboard vyresetuje (tabulky se nejdřív zahodí).
3. V `Project Settings → API` zkopíruj `Project URL` a veřejný klíč
   (`sb_publishable_…`, případně starší `anon`) do `src/cloud-config.js`.
4. `npm run build` (a pro Android `npm run sync`).

Pro pozdější reset samotného žebříčku, bez mazání profilů, slouží
`supabase/reset-leaderboard.sql`.

**Co se ukládá**

| Tabulka | Obsah |
| --- | --- |
| `players` | jeden řádek na instalaci (`device_id`): jméno, mince, koupené zboží, dres, rekord |
| `scores` | jeden dohraný běh: jméno, skóre, level, mince |
| `leaderboard` | pohled — nejlepší běh každého jména, hra z něj bere top 10 |

Anon klíč je veřejný (je to klientská hra), zápis proto hlídá jen RLS
s limity na délku jména a rozsah skóre. Kdo si klíč vytáhne z aplikace, umí
si zapsat skóre — na hobby žebříček to stačí, na turnaj ne.

Bez vyplněného `src/cloud-config.js` je vše jako dřív: hra jede offline nad
`localStorage`. Když server nejede nebo je telefon offline, hra to jen tiše
přejde a v leaderboardu napíše „offline".

## Struktura

| Soubor | Obsah |
| --- | --- |
| `index.html` | plátno 320×180 a dotyková tlačítka |
| `style.css` | rozvržení, pixel-perfect škálování plátna, styl tlačítek |
| `src/main.js` | inicializace, škálování plátna, dotyky, pole pro jméno, herní smyčka 1/60 s |
| `src/font.js` | bitmapový font 5×7 a vykreslování ostrého textu |
| `src/audio.js` | syntéza všech zvuků a hudby přes Web Audio |
| `src/shop.js` | peněženka, zboží a uložené nákupy |
| `src/cloud.js` | komunikace se Supabase (leaderboard, profil, mince, nákupy) |
| `src/cloud-config.js` | adresa projektu a veřejný anon klíč |
| `supabase/schema.sql` | schéma databáze, politiky RLS a reset leaderboardu |
| `scripts/build.mjs` | zkopíruje hru do `www/` pro Capacitor |
| `android/` | nativní Android projekt (Capacitor) |
| `src/input.js` | klávesnice + dotyk, držené klávesy i jednorázové stisky |
| `src/sprites.js` | pixel sprity jako pole textových řádků + paleta |
| `src/level.js` | nekonečný generátor úrovně z náhodných úseků, nepřátelé, mince |
| `src/player.js` | fyzika hráče, kolize, animace |
| `src/game.js` | stavy hry, kamera, střely, částice, vykreslování, HUD |

Level se generuje jen kousek před kamerou a za ní se zahazuje, takže běh je
konstantně paměťově nenáročný i po tisících úseků.

## Ladění

V konzoli prohlížeče je běžící hra dostupná jako `window.game`
(např. `game.player.x`, `game.level.enemies`).

## Zvuk

Všechny zvuky se syntetizují za běhu přes Web Audio API — žádné zvukové soubory
(`src/audio.js`). Skok, dvojskok, laser, zásah, výbuch, mince, srdíčko, power-up,
zranění, konec hry, příchod bosse, robotí smích, start rakety, vítězná fanfára a
tichá basová smyčka, která se přepíná mezi pozemským a měsíčním laděním.

Zvuk se zapne po prvním doteku nebo stisku klávesy (požadavek prohlížečů), vypíná
se klávesou **M** a stav se pamatuje v `localStorage`.

## Android (Capacitor + Android Studio)

Nativní projekt je hotový ve složce `android/` (balíček `cz.pixelblast.hra`).

```bash
npm install          # jednorazove
npm run android      # zkopiruje www/ a otevre projekt v Android Studiu
```

Jednotlivé kroky, když je nechceš dohromady:

```bash
npm run build        # zkopiruje index.html, style.css a src/ do www/
npx cap sync android # nasype www/ do android/app/src/main/assets/public
npx cap open android # otevre Android Studio
```

Build z příkazové řádky (Capacitor 8 potřebuje JDK 21, systémové JDK je 17 —
proto se použije to z Android Studia):

```bash
cd android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug
```

Hotové APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

Nahrání do skutečného telefonu: zapnout v telefonu **Vývojářské možnosti → Ladění
přes USB**, připojit kabelem a v Android Studiu vybrat zařízení a dát **Run**.
Nebo z terminálu:

```bash
~/Library/Android/sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Nastavení pro hru už je v projektu:

- `android:screenOrientation="sensorLandscape"` — hra běží na šířku.
- Immersive fullscreen v `MainActivity.java` (skryté systémové lišty, displej se
  nevypíná).
- Plátno se přizpůsobuje poměru stran displeje: výška je vždy 180 pixelů, šířka
  dopočítaná (320–560), takže na telefonu není žádný černý okraj.

**Důležité:** hra se needituje v `www/` ani v `android/app/src/main/assets/public/` —
to jsou generované kopie. Zdroj je `index.html`, `style.css` a `src/`, po změně
stačí `npm run sync`.
