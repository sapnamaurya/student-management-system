# ScholarTrack – Student Management System
**Stack:** Flask (Python) · React · MySQL (XAMPP)
**Now with:** Login/Register authentication, Role-based dashboards (Admin & Teacher), Dark Navy & Blue theme

---

## 📁 Project Structure
```
student-management/
├── backend/
│   ├── app.py            ← Flask REST API (auth + role-based access)
│   ├── requirements.txt
│   └── setup_db.sql       ← Database schema + sample users/data
└── frontend/
    ├── package.json
    └── src/
        ├── App.js / App.css       ← Routing + dark navy theme
        ├── index.js
        ├── context/AuthContext.js  ← Global auth state
        ├── components/
        │   ├── Layout.js            ← Sidebar + topbar shell
        │   └── ProtectedRoute.js    ← Role-guarded routes
        ├── services/api.js
        └── pages/
            ├── Login.js
            ├── Register.js
            ├── Dashboard.js          ← Role-aware (admin sees more)
            ├── Students.js
            ├── StudentDetail.js
            ├── Courses.js
            ├── Grades.js
            └── admin/
                └── Teachers.js       ← Admin-only: manage teacher accounts
```

---

## ⚙️ STEP 1 — Set up the Database (XAMPP)

1. Start **XAMPP** → start **Apache** and **MySQL**
2. Open **phpMyAdmin** → `http://localhost/phpmyadmin`
3. Click **Import** tab → choose `backend/setup_db.sql` → click **Go**

This creates the `student_management` database with: `users`, `courses`, `students`, `grades` tables, plus seeded accounts and sample data.

---

## 🐍 STEP 2 — Run the Flask Backend

```bash
cd backend
python -m venv venv

# Activate it
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
python app.py                # Runs on http://localhost:5000
```

> ⚠️ If your MySQL password is not empty, edit `app.py`:
> `app.config['MYSQL_PASSWORD'] = 'your_password'`

---

## ⚛️ STEP 3 — Run the React Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm start                    # Opens http://localhost:3000
```

---

## 🔐 Login & Roles

You'll land on a **Login** screen first. Two roles exist:

| Role | What they can do |
|---|---|
| **Admin** | Full system access: view/manage **all** students, courses, grades, and **manage teacher accounts** (create, edit, disable, delete). Sees system-wide dashboard stats including "students per teacher". |
| **Teacher** | Manages **only their own** assigned students, courses, and grades. Cannot delete courses or manage other users. Dashboard shows only their own class stats. |

### Demo Accounts (seeded in `setup_db.sql`)
| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Teacher | `mcruz` | `teacher123` |
| Teacher | `jreyes` | `teacher123` |

You can also click **"Create one"** on the login page to register a brand-new Admin or Teacher account.

> Sessions are cookie-based (Flask `session`). Make sure your browser allows cookies on `localhost` and that you access the frontend via `http://localhost:3000` (not `127.0.0.1`) to match CORS settings.

---

## ✅ Features

| Feature | Details |
|---|---|
| **Auth** | Login, Register, Logout — session-based, password hashing via Werkzeug |
| **Role-based routing** | `/admin/*` and `/teacher/*` route trees, auto-redirect based on role |
| **Dashboard** | Stats cards + bar chart (enrollment) + pie chart (gender). Admin sees extra "Students per Teacher" table |
| **Students** | Full CRUD, search, filter by course. Teachers only see/manage their own students |
| **Student Detail** | Profile, grade records, color-coded scores, GPA average |
| **Courses** | Card layout, student count per course. Only Admin can delete a course |
| **Grades** | Table view, filter by student. Scoped to teacher's own students unless Admin |
| **Teachers (Admin only)** | Create/edit/disable/delete teacher & admin accounts, view assigned student counts |
| **Theme** | Professional dark navy sidebar + blue accents, light content area |

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Log in |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/logout` | session | Log out |
| GET | `/api/auth/me` | session | Current user |
| GET/PUT/DELETE | `/api/users` `/api/users/:id` | admin | Manage accounts |
| GET/POST/PUT/DELETE | `/api/students[/:id]` | session | Role-scoped CRUD |
| GET/POST/PUT | `/api/courses[/:id]` | session | Role-scoped |
| DELETE | `/api/courses/:id` | admin | Delete course |
| GET/POST/PUT/DELETE | `/api/grades[/:id]` | session | Role-scoped |
| GET | `/api/stats` | session | Dashboard stats (role-scoped) |

---

## 🛠️ Troubleshooting

**Login fails with "Invalid credentials"** → Make sure you imported `setup_db.sql` AFTER this update (it contains real password hashes). If you imported an older version, re-import it (drop & recreate the database first).

**CORS / cookies not working** → Access the app at `http://localhost:3000` exactly (not `127.0.0.1:3000`). The Flask CORS config explicitly allows `http://localhost:3000` with credentials.

**`mysqlclient` install fails on Windows** →
```bash
pip install pipwin
pipwin install mysqlclient
```
Or download the `.whl` from https://www.lfd.uci.edu/~gohlke/pythonlibs/#mysqlclient

**`npm install` fails** → Make sure Node.js ≥ 16 is installed: https://nodejs.org

**403 errors as a teacher** → Teachers can only access students/courses assigned to them (`teacher_id`). This is expected — log in as `admin` to see everything, or assign students to that teacher.


<!-- ai setup -->

