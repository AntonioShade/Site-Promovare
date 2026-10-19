# Spitalul Medical Eclipse Tower

Site static cu administrare printr-un server Node.js și SQLite. Anunțurile și organigrama sunt salvate local, iar modificările se văd pentru toți vizitatorii site-ului.

Fiecare element din meniul principal are propria adresă și pagină: `/despre-noi`, `/anunturi`, `/conducere`, `/sub-departamente`, `/cereri-de-audienta`, `/informatii`, `/criterii-admitere`, `/reintegrare` și `/transfer`. Navigarea schimbă pagina, nu derulează către o secțiune din pagina principală.

## Pornire pe Windows

Ai nevoie de Node.js 22.13 sau mai nou.

1. Deschide PowerShell în folderul proiectului.
2. Creează fișierul local de configurare: `Copy-Item .env.example .env`.
3. Deschide `.env` și înlocuiește `ADMIN_PASSWORD` cu parola de administrare aleasă. La prima pornire, serverul o salvează ca hash bcrypt în baza de date; parola nu este păstrată în cod.
4. Instalează pachetele: `npm install`.
5. Pornește site-ul: `npm start`.
6. Deschide `http://localhost:3000` și conectează-te folosind utilizatorul configurat.

Datele persistente sunt salvate în `data/site.db`, iar fotografiile încărcate în `uploads/`. Aceste foldere și fișierul `.env` sunt excluse din Git.

## Administrare

Butonul **Conectare** deschide panoul de administrare. De acolo poți publica anunțuri cu fotografii, modifica ultimele trei anunțuri și actualiza numele și fotografiile celor nouă membri din organigramă. La publicarea unui anunț nou, cel mai vechi dintre cele trei este înlocuit.

Imaginile acceptate sunt JPG, PNG și WebP, cu o dimensiune maximă de 5 MB. Pentru publicare pe internet, folosește HTTPS și o găzduire care păstrează între reporniri fișierul SQLite și folderul `uploads/`. Setează `NODE_ENV=production`; dacă aplicația este în spatele unui reverse proxy de încredere, setează și `TRUST_PROXY=1`.
