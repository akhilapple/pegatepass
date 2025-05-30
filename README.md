# pegatepass

## Data Storage Update

As of May 2025, this project no longer uses browser localStorage for data persistence.  
**All data is stored and retrieved exclusively via API calls to the backend server.**

### How Data is Stored

- All create, read, update, and delete operations are performed via HTTP requests to the backend API (Node.js + PostgreSQL).
- If the API is unreachable, the app will show an error; data will not be stored locally.

### Why This Change?

- Ensures all users see a consistent view of the data.
- Prevents issues with data loss or inconsistency across browsers/devices.
- Supports centralized, secure storage and auditing.

### Backend API

The backend API endpoints are:

- `POST /api/submit` — Create a new outpass request.
- `GET /api/requests` — Retrieve all outpass requests.
- `PATCH /api/requests/:id` — Update a specific outpass request.
- `DELETE /api/requests` — Delete all outpass requests (HR only).

See `server.cjs` for more details.

