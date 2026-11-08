# Ambient TV Fotolijst & Kalender

Een moderne, responsieve digitale fotolijst voor je televisie met automatische diavoorstelling, Google Photos integratie, Google Calendar weergave en een afgeschermde admin-omgeving.

---

## 🚀 Hosten op GitHub (Pages, Vercel of Netlify)

Ja, je kunt dit project direct op **GitHub** zetten en hosten met behoud van alle Google functionaliteiten (**Inloggen**, **Google Calendar** en **Google Photos**).

Omdat dit een statische React + Vite webapplicatie is, draaien alle API-aanroepen direct in de browser van de gebruiker (client-side) via OAuth tokens.

### Stap 1: Je GitHub domein autoriseren in Google & Firebase
Google en Firebase blokkeren standaard onbekende websites om misbruik te voorkomen. Wanneer je het op GitHub Pages of een eigen domein host, hoef je alleen dat domein eenmalig toe te voegen:

1. **In Firebase Console** ([console.firebase.google.com](https://console.firebase.google.com)):
   - Open je project (`gen-lang-client-0766206815` of je eigen project).
   - Ga naar **Authentication** > **Settings** (tabblad Instellingen) > **Authorized domains** (Geautoriseerde domeinen).
   - Klik op **Add domain** en voeg toe:
     - Voor GitHub Pages: `jouw-gebruikersnaam.github.io`
     - Voor Vercel: `jouw-app.vercel.app`
     - Of je eigen domeinnaam (bijv. `fotolijst.jouwdomein.nl`).

2. **In Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):
   - Ga naar **APIs & Services** > **Credentials** (Inloggegevens).
   - Open je OAuth 2.0-client-ID (`Web client`).
   - Voeg bij **Geautoriseerde JavaScript-oorsprongen** de URL van je site toe:
     - Bijvoorbeeld: `https://jouw-gebruikersnaam.github.io`

---

### Stap 2: Bouwen en Publiceren

#### Optie A: GitHub Pages via GitHub Actions (Aanbevolen)
1. Push de code naar je GitHub repository.
2. Ga in je repository naar **Settings** > **Pages**.
3. Kies bij **Source** voor **GitHub Actions**.
4. GitHub zal het project automatisch bouwen via Vite en binnen 1 minuut live zetten.

#### Optie B: Handmatig bouwen
```bash
# Dependencies installeren
npm install

# Productie build maken (genereert /dist)
npm run build
```
De inhoud van de map `dist/` kun je direct uploaden naar elke webserver, GitHub Pages, Firebase Hosting, Cloudflare Pages, Netlify of Vercel.

---

## 📺 Gebruik op je TV
- **TV URL**: Open `https://jouw-domein.com/?mode=tv` in de internetbrowser van je Smart TV (Samsung Tizen, LG webOS, Android/Google TV, Apple TV).
- **Admin URL**: Open `https://jouw-domein.com/?mode=admin` op je smartphone of computer om albums, overgangen en kalenders in te stellen.
- **Sneltoetsen op TV**:
  - `Spatiebalk`: Diavoorstelling pauzeren / afspelen
  - `Pijl links / rechts`: Vorige / volgende foto
  - `F`: Volledig scherm (Fullscreen)
  - `C`: Kalender overlay in-/uitschakelen
  - `A`: Admin scherm openen
