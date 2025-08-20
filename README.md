npm run dev
# certs-proto (Minimal Certificate Issuer MVP)

This prototype does:

- Generates PDF certificates with UID + QR.
- Verification endpoint `/verify/:uid`.
- Very simple admin form at `/admin`.

## Usage

1. Copy `.env.example` to `.env` and adjust paths if needed.
2. Install dependencies: `npm install`.
3. Run dev server: `npm run dev`.
4. Open http://localhost:3000/admin to upload certificates and add QR codes.

## Configuration

The application uses environment variables for all directory paths:

- `PUBLIC_DIR`: Public files directory (default: `public`)
- `UPLOADS_DIR`: Temporary uploads directory (default: `public/uploads`)
- `CERTS_DIR`: Generated certificates directory (default: `public/certs`)
- `ASSETS_DIR`: Static assets directory (default: `public/assets`)
- `DB_DIR`: Database directory (default: `db`)
- `DB_FILE`: Database filename (default: `certs.json`)

All paths are configurable via the `.env` file.

