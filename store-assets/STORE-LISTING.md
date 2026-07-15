# Chrome Web Store — materiały do publikacji „Draw on Page"

Wszystko gotowe do wklejenia w panelu Chrome Web Store Developer Dashboard.

---

## 1. Nazwa

**Draw on Page — Draw it, son.**

(28 znaków — mieści się w limicie 45 dla manifestu. „Draw on Page" niesie zasięgi, „Draw it, son." to tagline marki.)

## 2. Krótki opis (do 132 znaków)

**EN:** Draw boxes, arrows, text and highlights on any web page. Blur sensitive info, drop numbered pins, and save or copy a screenshot.

**PL:** Rysuj ramki, strzałki, tekst i zakreślenia na każdej stronie. Rozmywaj dane, stawiaj numerowane pinezki, zapisuj lub kopiuj zrzut.

## 3. Kategoria

**Tools / Narzędzia**

## 4. Opis szczegółowy

### EN
Draw on Page turns any web page into a canvas. Click the icon and a toolbar appears — draw freehand, add boxes, arrows, ellipses, lines, text and a highlighter, right on top of the page.

FEATURES
• Pen, highlighter, boxes, ellipses, arrows, lines and text
• Numbered pins for step-by-step guides
• Blur / redact tool to hide sensitive info before sharing
• Laser pointer mode for presentations and screen recordings
• Save a screenshot as PNG, copy it to the clipboard, or export the whole page
• Your drawings can be remembered per page and come back when you reopen them
• Undo / redo, adjustable thickness, opacity, colors, custom color and eyedropper
• Fully customizable keyboard shortcuts
• English and Polish interface

PRIVACY FIRST
Draw on Page has no permanent access to any website. It only runs on a page after you click its icon (activeTab), and it never reads or sends the content of the pages you visit. Your settings stay on your device. Nothing is sent anywhere automatically.

### PL
Draw on Page zamienia każdą stronę w płótno do rysowania. Kliknij ikonę, a pojawi się pasek narzędzi — rysuj odręcznie, dodawaj ramki, strzałki, elipsy, linie, tekst i zakreślacz bezpośrednio na stronie.

FUNKCJE
• Pióro, zakreślacz, ramki, elipsy, strzałki, linie i tekst
• Numerowane pinezki do instrukcji krok po kroku
• Narzędzie rozmycia / zamazywania danych przed udostępnieniem
• Tryb wskaźnika laserowego do prezentacji i nagrań
• Zapis zrzutu PNG, kopiowanie do schowka lub eksport całej strony
• Rysunki mogą być zapamiętane dla danej strony i wracać po ponownym otwarciu
• Cofnij / ponów, regulacja grubości, krycia, kolory, własny kolor i pipeta
• W pełni konfigurowalne skróty klawiszowe
• Interfejs po polsku i angielsku

PRYWATNOŚĆ PRZEDE WSZYSTKIM
Draw on Page nie ma stałego dostępu do żadnej strony. Uruchamia się dopiero po kliknięciu ikony (activeTab) i nigdy nie czyta ani nie wysyła treści odwiedzanych stron. Ustawienia zostają na Twoim urządzeniu. Nic nie jest nigdzie wysyłane automatycznie.

---

## 5. Uzasadnienia uprawnień (pole „Permission justification" przy publikacji)

**activeTab**
> Injects the drawing overlay into the tab the user is currently viewing, only after the user clicks the extension icon. Required so the user can draw on and capture the current page.

**scripting**
> Used with chrome.scripting.executeScript to inject the drawing tools into the active tab when the user clicks the icon. No scripts are injected without that user action.

**storage**
> Stores the user's settings (colors, thickness, language, keyboard shortcuts) and, optionally, their drawings — locally via chrome.storage.local. This data never leaves the user's device.

**Host permissions**
> None. The extension declares no host permissions and relies solely on activeTab, so it has no standing access to any site.

**Remote code**
> None. No remote or externally hosted code is loaded or executed. All code is bundled in the package.

**Single purpose**
> A drawing and annotation tool that lets the user draw shapes, arrows, text and highlights over any web page and then save, copy or export the result.

---

## 6. Deklaracja prywatności danych (zakładka „Privacy" w Dashboard)

**Privacy policy URL:** _(wklej tu link do polityki — patrz sekcja 7)_

**Czy wtyczka zbiera lub używa danych użytkownika?**
Zaznacz zgodnie z prawdą:
- Personally identifiable info — **NIE**
- Health info — **NIE**
- Financial / payment info — **NIE**
- Authentication info — **NIE**
- Personal communications — **NIE**
- Location — **NIE**
- Web history — **NIE**
- User activity (kliknięcia, ruch myszy) — **NIE**
- Website content — **NIE**

Jedyne dane opuszczające urządzenie to **dobrowolne zgłoszenie błędu** — tekst wpisany przez użytkownika, wysłany po kliknięciu „Wyślij" do formularza Google autora. Nie zawiera danych osobowych. Jeśli formularz sklepu wymaga kategorii, potraktuj to jako treść dostarczoną dobrowolnie przez użytkownika (support), nie jako zbieranie danych.

**Trzy wymagane oświadczenia — zaznacz wszystkie trzy:**
- ✅ Nie sprzedaję ani nie przekazuję danych użytkownika stronom trzecim poza zatwierdzonymi przypadkami
- ✅ Nie używam ani nie przekazuję danych do celów niezwiązanych z jedynym przeznaczeniem wtyczki
- ✅ Nie używam danych do oceny zdolności kredytowej / pożyczek

---

## 7. Polityka prywatności (do wystawienia pod URL)

Gotowy tekst jest w pliku wtyczki `PRIVACY.md`. Wklej go do Google Docs (Udostępnij → „Każdy z linkiem może wyświetlać") albo opublikuj przez GitHub, i ten adres wklej w polu „Privacy policy URL".

---

## 8. Zrzuty ekranu

Otwórz plik `store-assets/promo.html` w Chrome (zoom 100%). Każdy kafelek ma dokładnie **1280×800 px** — zrób zrzut każdego (lub użyj narzędzia do przechwytywania obszaru). Wgraj 3–5 z nich jako screenshoty listingu.

Wymagania Chrome Web Store: min. 1 zrzut, format 1280×800 lub 640×400 (PNG/JPG).
