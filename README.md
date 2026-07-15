# Draw on Page — Draw it, son.

Wtyczka do Chrome do rysowania po dowolnej stronie: ramki, strzałki, elipsy, pióro, zakreślacz i tekst. Interfejs po angielsku (domyślnie) lub polsku — wybór w ustawieniach.

## Instalacja

1. Otwórz `chrome://extensions`
2. Włącz **Tryb dewelopera**
3. Kliknij **Załaduj rozpakowane** i wskaż ten folder
4. Przy pierwszej instalacji otworzy się strona powitalna

Po każdej zmianie plików kliknij **Odśwież** na karcie wtyczki.

## Użycie

Kliknij ikonę wtyczki (lub **Alt+A**) — pojawi się pasek narzędzi. **Esc** lub drugie kliknięcie ikony zamyka.

Przy pierwszym uruchomieniu na danej stronie Chrome pokaże „Prośba o dostęp" — to normalne i wynika z modelu prywatności (wtyczka nie ma stałego dostępu do stron). Kliknięcie ikony przyznaje dostęp tylko tej jednej karcie.

## Skróty (domyślne, można zmienić w ustawieniach)

| Klawisz | Akcja |
|---|---|
| V | kursor (klikanie w stronę) |
| P / H | pióro / zakreślacz |
| R / E / A / L / T | ramka / elipsa / strzałka / linia / tekst |
| N / B / G | pinezka / rozmycie / laser |
| S | panel ustawień |
| F | ukryj HUD (rysowanie dalej działa) |
| M | zwiń pasek do kółka |
| Ctrl+Z / Ctrl+Y | cofnij / ponów |
| Esc | zamknij |

Wszystkie skróty można zmienić w pełnych ustawieniach.

## Funkcje

- **Rysowanie**: pióro, zakreślacz, ramki, elipsy, strzałki, linie, tekst
- **Numerowane pinezki** (N) — do instrukcji krok po kroku
- **Rozmycie / zamazywanie** (B) — ukryj dane przed udostępnieniem screena
- **Laser** (G) — świecący, znikający ślad myszy do prezentacji i nagrań
- **Zrzut PNG**, **kopiuj do schowka**, **eksport całej strony** (przewijanej)
- **Zapamiętywanie rysunków na stronie** — wracają po ponownym otwarciu (można wyłączyć)

## Panel podręczny (zębatka lub S)

Grubość, krycie, linia przerywana, wypełnienie kształtów + linki do pełnych ustawień i wsparcia.

**Wypełnienie kształtów** — ramki i elipsy dostają w środku półprzezroczysty kolor linii (jak marker na szkle).

## Pełne ustawienia (prawy klik na ikonę → Opcje)

- **Język** (English / Polski, domyślnie English)
- Rozmiar tekstu, zaokrąglenie rogów
- Podpowiedzi, wygładzanie pióra
- **Skróty klawiszowe** — kliknij pole i naciśnij literę/cyfrę
- **Zgłaszanie błędów** — anonimowa wysyłka, bez konta
- Reset ustawień, wsparcie projektu

## Strona pożegnalna (po odinstalowaniu)

Gdy ktoś usunie wtyczkę, Chrome otwiera stronę `uninstall.html` hostowaną na GitHub Pages — musi być zewnętrzna, bo po odinstalowaniu kod wtyczki już nie istnieje. Użytkownik jednym kliknięciem wybiera powód, który trafia **anonimowo** do tego samego formularza z prefiksem `[UNINSTALL vX.Y.Z]`.

Adres ustawia stała `UNINSTALL_PAGE` w [background.js](background.js) — **musi zgadzać się z nazwą repozytorium na GitHubie**.

Konfiguracja GitHub Pages: Settings → Pages → Source: `main`, folder `/docs`.

## Struktura repozytorium

Repozytorium zawiera **wyłącznie wtyczkę i to, co jest potrzebne do jej działania**:

```
manifest.json, *.js, *.html, *.css   ← wtyczka (to się pakuje do ZIP)
icons/                               ← ikony
_locales/en, _locales/pl             ← tłumaczenia nazwy i opisu
uninstall.html                       ← strona pożegnalna (GitHub Pages, źródło z /root)
LICENSE, PRIVACY.md,                 ← dokumenty projektu
THIRD-PARTY-NOTICES.txt
```

Materiały do listingu w Chrome Web Store (opisy, zrzuty promocyjne, szablon grafik) **celowo nie są w repo** — to zasoby jednorazowe, potrzebne tylko przy wgrywaniu do sklepu, a wygenerowane PNG-i to pliki wtórne. Trzymane są lokalnie w `store-assets/` i są w `.gitignore`.

## Prywatność

- Tylko `activeTab` — dostęp wyłącznie do jednej karty i wyłącznie po kliknięciu ikony; po zamknięciu wtyczki jej kod nie robi nic, a etykieta dostępu w menu Chrome znika przy następnej nawigacji
- Nic nie jest wysyłane automatycznie; jedyne wysyłki to zgłoszenie błędu po kliknięciu **Wyślij** oraz powód odinstalowania po kliknięciu na stronie pożegnalnej — oba anonimowe i wyłącznie z inicjatywy użytkownika

## Ograniczenia

- Nie działa na stronach wewnętrznych przeglądarki (`chrome://…`) ani w Chrome Web Store — Chrome blokuje tam **wszystkie** rozszerzenia; na zwykłych stronach internetowych działa wszędzie
- Dla plików lokalnych (`file://`) włącz „Zezwalaj na dostęp do adresów URL plików" w szczegółach wtyczki
- Rysunki znikają po odświeżeniu strony (użyj zrzutu ekranu)

## Autorstwo i licencja

Cały kod, teksty i ikona aplikacji to oryginalna praca autora: **Draw on Page** © 2026 romanzbudowy — wszystkie prawa zastrzeżone (patrz [LICENSE](LICENSE)). Kod jest udostępniony do wglądu, ale nie jest open source — nikt nie może go kopiować, modyfikować ani publikować bez pisemnej zgody autora.

Ikony na pasku narzędzi pochodzą z zestawu **Feather Icons** (licencja MIT) — pełna informacja o autorstwie w pliku [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

Realną ochroną nazwy jest publikacja w Chrome Web Store na własnym koncie — sklep blokuje duplikaty nazw i daje priorytet pierwszemu wydawcy.

### Uwaga o koncepcie

Rysowanie/adnotacje na stronie to popularna kategoria wtyczek (istnieją np. „Draw on Screen", „Page Marker", „Web Paint"). Sam pomysł nie jest oryginalny i nie podlega ochronie — chroniony jest konkretny kod i zasoby tej wtyczki, które napisano od zera.
