# NexusOps Billing (demo)

A small static billing app used to test the AI Test Accelerator, including **Auto-Rewrite Tests on PR**.
It has no server: pages are plain HTML/JS and all data lives in the browser's localStorage.

## Pages

| Page | File | What it does |
|---|---|---|
| Sign in | `login.html` | Email + password, "Remember me" |
| Dashboard | `dashboard.html` | Customer count, open invoices, outstanding amount, paid this month, recent invoices |
| Customers | `customers.html` | Add, edit, delete, search |
| Invoices | `invoices.html` | Create (with line items), send, mark as paid, delete drafts, filter |
| Settings | `settings.html` | Company name, tax rate, currency, reset demo data |

Shared code (navigation, auth, storage, toasts) is in `assets/js/app.js`.

## Demo login

- Email: `admin@nexusops.io`
- Password: `Nexus@2026`

These are fake and public. Do not reuse this password anywhere else.

## Run locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000/login.html

## Host on GitHub Pages

Repository Settings > Pages > Deploy from a branch > `main` / root. The site is then at
`https://<your-user>.github.io/<repo>/` and the app starts at `login.html`.
