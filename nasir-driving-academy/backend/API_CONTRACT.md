# NASIR API contract — role-specific personal workspaces v0.9

All routes are below `/api/v1`. They require a real authenticated session in production.
Every endpoint must apply server-side role/ownership checks. Client-side role selectors are demo-only.

## Student and case file
- `GET /students` — management-only academy-wide list. Students must use `/me/case-file`; instructors must use `/instructors/me/students`. Never return a global list to a student or instructor.
- `POST /students` — create a student, contact/address profile and initial enrollment; admin only; validates duplicate student code and writes timeline + audit row. Accepted fields include `nationalId`, `birthDate`, `guardianName`, `guardianPhone`, `alternatePhone`, `emergencyPhone`, `province`, `city`, `neighborhood`, `postalCode`, `address`, `course`, `registrationDate`, and `tuitionAmountToman`.
- `GET /students/:studentId` — management-only basic student profile; instructor clients receive only the scoped instructional projection from `/instructors/me/students`.
- `PATCH /students/:studentId` — update permitted profile fields; admin only.
- `PATCH /students/:studentId/stage` — update workflow stage; admin only; writes timeline + audit.
- `GET /students/:studentId/case-file` — management-only full case response `{ student, contracts, payments, practicalSessions, exams, finalResults, finalResult, documents, workflowEvents }`. The signed-in student uses `/me/case-file` for their own data.

## Case-file records
- `POST /students/:studentId/contracts` — create contract metadata; admin only.
- `POST /students/:studentId/payments` — record a verified/offline payment; admin only. Metadata includes amount in Toman, date, method, receipt/reference, type, status and note. Never trust a client declaration as proof of online payment.
- `POST /students/:studentId/practical-sessions` — management-only legacy route. Instructors must use `/instructors/me/students/:studentId/reports`, which derives the instructor identity from the session and verifies assignment.
- `POST /students/:studentId/exams` — record exam result; admin only.
- `PUT /students/:studentId/final-result` — upsert final course result; admin only.
- `POST /students/:studentId/timeline` — append a permitted note/event; admin or assigned instructor.

## Documents (defined in API contract v0.2)
- `GET /documents`, `POST /documents` (multipart metadata + file), `GET /documents/:id`, `GET /documents/:id/file`, `POST /documents/:id/archive`, `POST /documents/:id/restore`, `DELETE /documents/:id` (soft-delete only).
- File bytes belong in private object storage; database contains storage keys and metadata only.

## Case-file response example
```json
{
  "student": { "id": "...", "studentCode": "N-...", "name": "...", "stage": "training" },
  "contracts": [], "payments": [], "practicalSessions": [], "exams": [],
  "finalResults": [], "finalResult": null, "documents": [], "workflowEvents": []
}
```

## Required transaction behavior
Every write to a case file must also write a timeline event and an audit row in the same database transaction. The server—not the browser—sets `actor_id`, timestamps, student ownership, and trusted payment status.

### Money unit mapping
The UI accepts whole Tomans (`amountToman`). The existing SQL `payments.amount_minor` column is Rial-oriented; when the backend stores a Toman amount there, it must convert it consistently (1 Toman = 10 Rials) and also populate `payments.amount_toman`. Return `amountToman` to the UI. Record payment status only after the payment is actually verified/received according to the academy's process.


## Registration and finance workspace (v0.7)
- Admin student intake captures identity basics, contact numbers, province/city/neighborhood, postal code and full address, course, agreed tuition and optional first receipt.
- Optional initial uploads use existing `POST /documents` multipart route, one file per category (ID card, birth certificate, portrait, medical paper if required, other).
- If tuition is entered, the client creates a draft contract record; if an initial receipt amount is entered, the client creates a payment record with `received` status for the local demo. Production backend must validate cashier permissions and record actual receipt status itself.
- The admin finance page aggregates tuition, verified/received payments and balances from case-file responses. Pending and cancelled rows are excluded from received totals.
- Use migration `003_student_intake_finance_contact.sql` after migrations 001 and 002.


## Role-specific workspaces (v0.8)
The server derives the role and user ID from the authenticated session. Never trust a `role`, `studentId`, or `instructorId` supplied by the browser as authority.

### Authentication and student self-service
- `POST /auth/otp/request` — request a one-time code for a mobile number; rate-limited.
- `POST /auth/otp/verify` — verify the code and issue a secure, HttpOnly, SameSite session cookie.
- `POST /registration-requests` — student self-registration; requires a verified phone session and creates a pending request, not an approved student account. Optional files go to `POST /registration-requests/:requestId/documents`; file size/type checks and private storage are mandatory. The request must be reviewed by management before a student account is activated.
- `GET /me/case-file` — return only the signed-in student's own case, including their own contracts, payments, lessons, exams and document metadata.
- `GET /me/profile` — return the signed-in student's own profile fields only.
- `GET /me/payments` — optional narrow payment projection for the signed-in student; never return other students' payments.
- `GET /me/documents` and `POST /me/documents` — list/upload files for the signed-in student's own case only. Ignore or reject any client-supplied student ID.
- `GET /me/schedule` — only sessions assigned to the signed-in student.
- `GET /me/documents` and `/me/case-file` must never accept a student ID as an authority; derive ownership from the session.
- `GET /me/payments` — only the signed-in student's own payment records.
- `POST /me/payment-requests` — create a pending declaration/request; it must not increase received totals until an authorized admin verifies it.

### Instructor workspace
- `GET /instructors/me/schedule` — only lessons assigned to the authenticated instructor.
- `GET /instructors/me/students` — only active assigned students; return only minimum instructional fields (student ID, display name, course, session count/status). Do not return national ID, full address, phone unless explicitly required for a scheduled lesson, identity documents, contracts or payments.
- `GET /instructors/me/students/:studentId/reports` — only lesson reports created by or assigned to this instructor for that student; verify an active assignment.
- `POST /instructors/me/students/:studentId/reports` — record attendance and instructional notes; verify active assignment, derive instructor ID from session, and write audit + timeline. A teacher cannot create a report for a non-assigned student.
- Instructors have no access to the academy-wide student list, document archive, case-file endpoint, financial dashboards, cash receipts, or tuition balances.

### Management workspace
- `GET /students`, `POST /students`, `GET /students/:studentId/case-file` — management-only academy-wide registry and case view.
- `POST /admin/schedule` and `GET /admin/schedule` — management-only session planning, assigning a student and instructor.
- `POST /admin/registration-requests/:requestId/approve` and `/reject` — review registration requests and, on approval, create the student user/profile/enrollment transactionally.
- `GET /documents` — management archive. Student-facing document routes remain `/me/documents`.
- `GET /admin/finance`, `POST /students/:studentId/payments`, `PATCH /payments/:paymentId/status` — management-only finance and receipt verification.
- `GET /admin/reports` — academy-wide reporting.

### Response minimization
- Student endpoints return only the authenticated student's data.
- Instructor endpoints return only assigned students' limited instructional data and the instructor's own reports.
- Management endpoints may return full case/finance/document fields and must be permission-checked and audited.
- Any attempt to access another student's ID returns HTTP 404 or 403 without revealing that the record exists.

### Per-role user experience requirements
- Student navigation contains only self-service functions: self-registration, own case, own documents, own fee/payment history and payment requests, own schedule, learning materials and own profile.
- Instructor navigation contains only their own schedule, assigned students' minimum instructional data, their own session reports, announcements and profile. No financial or identity-document actions are exposed.
- Management navigation contains the academy-wide registry, registration review, instructor assignment, class planning, document archive, financial receipts, reports and settings.
- The same person ID must be used as the ownership boundary for every personal page; never rely on a hidden form field, route parameter or client-side filter as authorization.

## Adapter status in this prototype
The local demo uses IndexedDB for case records, documents and payments, plus local browser storage for sample schedule assignments. Role-specific REST paths above define the intended production boundary; a real authentication service and server implementation are still required before switching `config.js` to `mode: 'api'`.

## Personal profile photo (v1.0)
- `GET /me/profile/avatar` — returns the signed-in user's own profile photo with the correct image content type; the server derives the user ID from the authenticated session.
- `POST /me/profile/avatar` — multipart upload with one `file` field. Accept only JPEG, PNG or WebP images up to 8 MiB; decode and re-encode to a square 512×512 image, strip metadata, verify the actual file signature, and store bytes in private object storage. Replace the previous avatar object and update `user_profile_avatars` transactionally.
- `DELETE /me/profile/avatar` — delete the signed-in user's own avatar object and metadata row. Return `204` when complete.
- Never accept `userId`, `role`, a storage key, or another account identifier from the browser as authorization. Student, instructor and admin accounts all use the same `/me` boundary.
- Apply rate limits, content scanning, ownership checks, and an audit record for upload/delete actions. Serve photos with a short private cache lifetime; do not expose object-storage URLs publicly.
- Apply migration `005_user_profile_avatar.sql` after the existing schema migrations.

The current local preview stores optimized profile pictures in IndexedDB on the active browser/device, keyed by the signed-in demo user ID. It does not upload images to a server. The routes above and migration define the production backend contract; the production server implementation is still required for cross-device synchronization.

## Personal profile photo (v1.0)
- `GET /me/profile/avatar` — returns the signed-in user's own profile photo with the correct image content type; the server derives the user ID from the authenticated session.
- `POST /me/profile/avatar` — multipart upload with one `file` field. Accept only JPEG, PNG or WebP images up to 8 MiB; decode and re-encode to a square 512×512 image, strip metadata, verify the actual file signature, and store bytes in private object storage. Replace the previous avatar object and update `user_profile_avatars` transactionally.
- `DELETE /me/profile/avatar` — delete the signed-in user's own avatar object and metadata row. Return `204` when complete.
- Never accept `userId`, `role`, a storage key, or another account identifier from the browser as authorization. Student, instructor and admin accounts all use the same `/me` boundary.
- Apply rate limits, content scanning, ownership checks, and an audit record for upload/delete actions. Serve photos with a short private cache lifetime; do not expose object-storage URLs publicly.
- Apply migration `005_user_profile_avatar.sql` after the existing schema migrations.

The current local preview stores optimized profile pictures in IndexedDB on the active browser/device, keyed by the signed-in demo user ID. It does not upload images to a server. The routes above and migration define the production backend contract; the production server implementation is still required for cross-device synchronization.
