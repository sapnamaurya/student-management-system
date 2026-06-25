from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
import MySQLdb, functools, os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # reads backend/.env into environment variables

ai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
AI_MODEL = "gpt-4o-mini"  # cheap + fast, plenty good for these tasks

app = Flask(__name__)
app.secret_key = 'sms_secret_key_change_in_production'
CORS(app, supports_credentials=True, origins=['http://localhost:3000'])

app.config['MYSQL_HOST'] = os.environ.get('MYSQLHOST', 'localhost')
app.config['MYSQL_PORT'] = int(os.environ.get('MYSQLPORT', 3306))
app.config['MYSQL_USER'] = os.environ.get('MYSQLUSER', 'root')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQLPASSWORD', '')
app.config['MYSQL_DB'] = os.environ.get('MYSQLDATABASE', 'student_management')
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'
mysql = MySQL(app)

# ─── AUTH HELPERS ─────────────────────────────────────────────

def login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        if session.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

def current_user():
    return {'id': session.get('user_id'), 'role': session.get('role'), 'name': session.get('full_name')}

# ─── AUTH ROUTES ──────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    cur = mysql.connection.cursor()
    cur.execute('SELECT * FROM users WHERE (username=%s OR email=%s) AND is_active=1', (username, username))
    user = cur.fetchone()
    cur.close()
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
    session['user_id'] = user['id']
    session['role'] = user['role']
    session['full_name'] = user['full_name']
    session['username'] = user['username']
    return jsonify({
        'id': user['id'], 'username': user['username'],
        'full_name': user['full_name'], 'role': user['role'],
        'email': user['email'], 'avatar_initials': user['avatar_initials']
    })

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['username', 'email', 'password', 'full_name']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400
    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    initials = ''.join([w[0].upper() for w in data['full_name'].split()[:2]])
    hashed = generate_password_hash(data['password'], method='pbkdf2:sha256')
    cur = mysql.connection.cursor()
    try:
        cur.execute('''INSERT INTO users (username, email, password_hash, full_name, role, avatar_initials)
                       VALUES (%s,%s,%s,%s,%s,%s)''',
                    (data['username'], data['email'], hashed, data['full_name'],
                     data.get('role', 'teacher'), initials))
        mysql.connection.commit()
        new_id = cur.lastrowid
        cur.close()
        return jsonify({'message': 'Account created', 'id': new_id}), 201
    except MySQLdb.IntegrityError:
        return jsonify({'error': 'Username or email already exists'}), 409

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'})

@app.route('/api/auth/me', methods=['GET'])
def me():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    cur = mysql.connection.cursor()
    cur.execute('SELECT id, username, email, full_name, role, avatar_initials FROM users WHERE id=%s', (session['user_id'],))
    user = cur.fetchone()
    cur.close()
    return jsonify(user)

# ─── USERS (admin only) ───────────────────────────────────────

@app.route('/api/users', methods=['GET'])
@admin_required
def get_users():
    cur = mysql.connection.cursor()
    cur.execute('''SELECT u.id, u.username, u.email, u.full_name, u.role, u.avatar_initials, u.is_active, u.created_at,
                   COUNT(s.id) as student_count
                   FROM users u LEFT JOIN students s ON s.teacher_id = u.id
                   GROUP BY u.id ORDER BY u.created_at DESC''')
    users = cur.fetchall()
    cur.close()
    return jsonify(users)

@app.route('/api/users/<int:id>', methods=['PUT'])
@admin_required
def update_user(id):
    data = request.get_json()
    cur = mysql.connection.cursor()
    if data.get('password'):
        hashed = generate_password_hash(data['password'], method='pbkdf2:sha256')
        cur.execute('UPDATE users SET full_name=%s, email=%s, role=%s, is_active=%s, password_hash=%s WHERE id=%s',
                    (data['full_name'], data['email'], data['role'], data.get('is_active', True), hashed, id))
    else:
        cur.execute('UPDATE users SET full_name=%s, email=%s, role=%s, is_active=%s WHERE id=%s',
                    (data['full_name'], data['email'], data['role'], data.get('is_active', True), id))
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'User updated'})

@app.route('/api/users/<int:id>', methods=['DELETE'])
@admin_required
def delete_user(id):
    if id == session.get('user_id'):
        return jsonify({'error': 'Cannot delete yourself'}), 409
    cur = mysql.connection.cursor()
    cur.execute('DELETE FROM users WHERE id=%s', (id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'User deleted'})

# ─── STUDENTS ────────────────────────────────────────────────

@app.route('/api/students', methods=['GET'])
@login_required
def get_students():
    search = request.args.get('search', '')
    course_id = request.args.get('course_id', '')
    u = current_user()
    base = '''SELECT s.*, c.name as course_name, c.code as course_code,
              u.full_name as teacher_name FROM students s
              LEFT JOIN courses c ON s.course_id = c.id
              LEFT JOIN users u ON s.teacher_id = u.id'''
    conditions, params = [], []
    if u['role'] == 'teacher':
        conditions.append('s.teacher_id=%s'); params.append(u['id'])
    if search:
        conditions.append('(s.first_name LIKE %s OR s.last_name LIKE %s OR s.email LIKE %s OR s.student_id LIKE %s)')
        params += [f'%{search}%'] * 4
    if course_id:
        conditions.append('s.course_id=%s'); params.append(course_id)
    where = (' WHERE ' + ' AND '.join(conditions)) if conditions else ''
    cur = mysql.connection.cursor()
    cur.execute(base + where + ' ORDER BY s.created_at DESC', params)
    students = cur.fetchall()
    cur.close()
    return jsonify(students)

@app.route('/api/students/<int:id>', methods=['GET'])
@login_required
def get_student(id):
    u = current_user()
    cur = mysql.connection.cursor()
    cur.execute('''SELECT s.*, c.name as course_name, c.code as course_code, u.full_name as teacher_name
                   FROM students s LEFT JOIN courses c ON s.course_id=c.id
                   LEFT JOIN users u ON s.teacher_id=u.id WHERE s.id=%s''', (id,))
    student = cur.fetchone()
    cur.close()
    if not student:
        return jsonify({'error': 'Not found'}), 404
    if u['role'] == 'teacher' and student['teacher_id'] != u['id']:
        return jsonify({'error': 'Access denied'}), 403
    return jsonify(student)

@app.route('/api/students', methods=['POST'])
@login_required
def create_student():
    data = request.get_json()
    u = current_user()
    for f in ['first_name', 'last_name', 'email', 'student_id']:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400
    teacher_id = u['id'] if u['role'] == 'teacher' else data.get('teacher_id', u['id'])
    cur = mysql.connection.cursor()
    try:
        cur.execute('''INSERT INTO students (student_id,first_name,last_name,email,phone,date_of_birth,
                       gender,address,course_id,teacher_id,year_level,status)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
                    (data['student_id'], data['first_name'], data['last_name'], data['email'],
                     data.get('phone'), data.get('date_of_birth'), data.get('gender'),
                     data.get('address'), data.get('course_id'), teacher_id,
                     data.get('year_level', 1), data.get('status', 'active')))
        mysql.connection.commit()
        return jsonify({'message': 'Student created', 'id': cur.lastrowid}), 201
    except MySQLdb.IntegrityError:
        return jsonify({'error': 'Student ID or email already exists'}), 409

@app.route('/api/students/<int:id>', methods=['PUT'])
@login_required
def update_student(id):
    data = request.get_json()
    u = current_user()
    cur = mysql.connection.cursor()
    cur.execute('SELECT teacher_id FROM students WHERE id=%s', (id,))
    s = cur.fetchone()
    if not s: return jsonify({'error': 'Not found'}), 404
    if u['role'] == 'teacher' and s['teacher_id'] != u['id']:
        return jsonify({'error': 'Access denied'}), 403
    teacher_id = s['teacher_id'] if u['role'] == 'teacher' else data.get('teacher_id', s['teacher_id'])
    try:
        cur.execute('''UPDATE students SET first_name=%s,last_name=%s,email=%s,phone=%s,
                       date_of_birth=%s,gender=%s,address=%s,course_id=%s,teacher_id=%s,year_level=%s,status=%s
                       WHERE id=%s''',
                    (data['first_name'], data['last_name'], data['email'], data.get('phone'),
                     data.get('date_of_birth'), data.get('gender'), data.get('address'),
                     data.get('course_id'), teacher_id, data.get('year_level', 1),
                     data.get('status', 'active'), id))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Updated'})
    except MySQLdb.IntegrityError:
        return jsonify({'error': 'Email already in use'}), 409

@app.route('/api/students/<int:id>', methods=['DELETE'])
@login_required
def delete_student(id):
    u = current_user()
    cur = mysql.connection.cursor()
    cur.execute('SELECT teacher_id FROM students WHERE id=%s', (id,))
    s = cur.fetchone()
    if not s: return jsonify({'error': 'Not found'}), 404
    if u['role'] == 'teacher' and s['teacher_id'] != u['id']:
        return jsonify({'error': 'Access denied'}), 403
    cur.execute('DELETE FROM students WHERE id=%s', (id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'Deleted'})

# ─── COURSES ─────────────────────────────────────────────────

@app.route('/api/courses', methods=['GET'])
@login_required
def get_courses():
    u = current_user()
    cur = mysql.connection.cursor()
    if u['role'] == 'teacher':
        cur.execute('''SELECT c.*, COUNT(s.id) as student_count, u.full_name as teacher_name
                       FROM courses c LEFT JOIN students s ON c.id=s.course_id
                       LEFT JOIN users u ON c.teacher_id=u.id
                       WHERE c.teacher_id=%s GROUP BY c.id ORDER BY c.name''', (u['id'],))
    else:
        cur.execute('''SELECT c.*, COUNT(s.id) as student_count, u.full_name as teacher_name
                       FROM courses c LEFT JOIN students s ON c.id=s.course_id
                       LEFT JOIN users u ON c.teacher_id=u.id
                       GROUP BY c.id ORDER BY c.name''')
    courses = cur.fetchall()
    cur.close()
    return jsonify(courses)

@app.route('/api/courses', methods=['POST'])
@login_required
def create_course():
    data = request.get_json()
    u = current_user()
    if not data.get('name') or not data.get('code'):
        return jsonify({'error': 'Name and code required'}), 400
    teacher_id = u['id'] if u['role'] == 'teacher' else data.get('teacher_id', u['id'])
    cur = mysql.connection.cursor()
    try:
        cur.execute('''INSERT INTO courses (name,code,description,duration_years,department,teacher_id)
                       VALUES (%s,%s,%s,%s,%s,%s)''',
                    (data['name'], data['code'], data.get('description'),
                     data.get('duration_years', 4), data.get('department'), teacher_id))
        mysql.connection.commit()
        return jsonify({'message': 'Course created', 'id': cur.lastrowid}), 201
    except MySQLdb.IntegrityError:
        return jsonify({'error': 'Course code already exists'}), 409

@app.route('/api/courses/<int:id>', methods=['PUT'])
@login_required
def update_course(id):
    data = request.get_json()
    u = current_user()
    cur = mysql.connection.cursor()
    cur.execute('SELECT teacher_id FROM courses WHERE id=%s', (id,))
    c = cur.fetchone()
    if not c: return jsonify({'error': 'Not found'}), 404
    if u['role'] == 'teacher' and c['teacher_id'] != u['id']:
        return jsonify({'error': 'Access denied'}), 403
    teacher_id = c['teacher_id'] if u['role'] == 'teacher' else data.get('teacher_id', c['teacher_id'])
    cur.execute('''UPDATE courses SET name=%s,code=%s,description=%s,duration_years=%s,department=%s,teacher_id=%s
                   WHERE id=%s''',
                (data['name'], data['code'], data.get('description'),
                 data.get('duration_years', 4), data.get('department'), teacher_id, id))
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'Updated'})

@app.route('/api/courses/<int:id>', methods=['DELETE'])
@admin_required
def delete_course(id):
    cur = mysql.connection.cursor()
    cur.execute('SELECT COUNT(*) as c FROM students WHERE course_id=%s', (id,))
    if cur.fetchone()['c'] > 0:
        return jsonify({'error': 'Cannot delete: students enrolled'}), 409
    cur.execute('DELETE FROM courses WHERE id=%s', (id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'Deleted'})

# ─── GRADES ──────────────────────────────────────────────────

@app.route('/api/grades', methods=['GET'])
@login_required
def get_grades():
    student_id = request.args.get('student_id')
    u = current_user()
    cur = mysql.connection.cursor()
    if student_id:
        cur.execute('''SELECT g.*, s.first_name, s.last_name, s.student_id as student_code
                       FROM grades g JOIN students s ON g.student_id=s.id
                       WHERE g.student_id=%s ORDER BY g.created_at DESC''', (student_id,))
    elif u['role'] == 'teacher':
        cur.execute('''SELECT g.*, s.first_name, s.last_name, s.student_id as student_code
                       FROM grades g JOIN students s ON g.student_id=s.id
                       WHERE s.teacher_id=%s ORDER BY g.created_at DESC''', (u['id'],))
    else:
        cur.execute('''SELECT g.*, s.first_name, s.last_name, s.student_id as student_code
                       FROM grades g JOIN students s ON g.student_id=s.id
                       ORDER BY g.created_at DESC''')
    grades = cur.fetchall()
    cur.close()
    return jsonify(grades)

@app.route('/api/grades', methods=['POST'])
@login_required
def create_grade():
    data = request.get_json()
    u = current_user()
    for f in ['student_id', 'subject', 'grade', 'semester']:
        if data.get(f) is None:
            return jsonify({'error': f'{f} is required'}), 400
    cur = mysql.connection.cursor()
    cur.execute('''INSERT INTO grades
               (student_id,subject,grade,units,semester,remarks)
               VALUES (%s,%s,%s,%s,%s,%s)''',
            (
                data['student_id'],
                data['subject'],
                data['grade'],
                data.get('units', 3),
                data['semester'],
                data.get('remarks')
            ))
    mysql.connection.commit()
    return jsonify({'message': 'Grade added', 'id': cur.lastrowid}), 201

@app.route('/api/grades/<int:id>', methods=['PUT'])
@login_required
def update_grade(id):
    data = request.get_json()
    cur = mysql.connection.cursor()
    cur.execute('''UPDATE grades SET subject=%s,grade=%s,units=%s,semester=%s,remarks=%s WHERE id=%s''',
                (data['subject'], data['grade'], data.get('units', 3), data['semester'], data.get('remarks'), id))
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'Updated'})

@app.route('/api/grades/<int:id>', methods=['DELETE'])
@login_required
def delete_grade(id):
    cur = mysql.connection.cursor()
    cur.execute('DELETE FROM grades WHERE id=%s', (id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'Deleted'})

# ─── STATS ───────────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    u = current_user()
    cur = mysql.connection.cursor()
    if u['role'] == 'teacher':
        cur.execute('SELECT COUNT(*) as total FROM students WHERE teacher_id=%s', (u['id'],))
        total_students = cur.fetchone()['total']
        cur.execute("SELECT COUNT(*) as total FROM students WHERE teacher_id=%s AND status='active'", (u['id'],))
        active_students = cur.fetchone()['total']
        cur.execute('SELECT COUNT(*) as total FROM courses WHERE teacher_id=%s', (u['id'],))
        total_courses = cur.fetchone()['total']
        cur.execute('''SELECT AVG(g.grade) as avg FROM grades g
                       JOIN students s ON g.student_id=s.id WHERE s.teacher_id=%s''', (u['id'],))
        avg_grade = cur.fetchone()['avg'] or 0
        cur.execute('''SELECT c.name, COUNT(s.id) as count FROM courses c
                       LEFT JOIN students s ON c.id=s.course_id
                       WHERE c.teacher_id=%s GROUP BY c.id ORDER BY count DESC LIMIT 5''', (u['id'],))
        top_courses = cur.fetchall()
        cur.execute('''SELECT COUNT(*) as total FROM grades g
                       JOIN students s ON g.student_id=s.id WHERE s.teacher_id=%s''', (u['id'],))
        total_grades = cur.fetchone()['total']
        cur.execute('''SELECT s.gender, COUNT(*) as count FROM students s
                       WHERE s.teacher_id=%s GROUP BY s.gender''', (u['id'],))
        gender_dist = cur.fetchall()
    else:
        cur.execute('SELECT COUNT(*) as total FROM students')
        total_students = cur.fetchone()['total']
        cur.execute("SELECT COUNT(*) as total FROM students WHERE status='active'")
        active_students = cur.fetchone()['total']
        cur.execute('SELECT COUNT(*) as total FROM courses')
        total_courses = cur.fetchone()['total']
        cur.execute('SELECT AVG(grade) as avg FROM grades')
        avg_grade = cur.fetchone()['avg'] or 0
        cur.execute('''SELECT c.name, COUNT(s.id) as count FROM courses c
                       LEFT JOIN students s ON c.id=s.course_id
                       GROUP BY c.id ORDER BY count DESC LIMIT 5''')
        top_courses = cur.fetchall()
        cur.execute('SELECT COUNT(*) as total FROM grades')
        total_grades = cur.fetchone()['total']
        cur.execute('SELECT COUNT(*) as total FROM users WHERE role="teacher"')
        total_teachers = cur.fetchone()['total']
        cur.execute('SELECT gender, COUNT(*) as count FROM students GROUP BY gender')
        gender_dist = cur.fetchall()
        cur.execute('''SELECT u.full_name, COUNT(s.id) as count FROM users u
                       LEFT JOIN students s ON s.teacher_id=u.id
                       WHERE u.role="teacher" GROUP BY u.id ORDER BY count DESC''')
        teacher_stats = cur.fetchall()

    cur.close()
    result = {
        'total_students': total_students,
        'active_students': active_students,
        'total_courses': total_courses,
        'avg_grade': round(float(avg_grade), 2),
        'total_grades': total_grades,
        'top_courses': top_courses,
        'gender_distribution': gender_dist,
    }
    if u['role'] == 'admin':
        result['total_teachers'] = total_teachers
        result['teacher_stats'] = teacher_stats
    return jsonify(result)

# ─── GEN AI FEATURES ─────────────────────────────────────────

@app.route('/api/ai/student-summary/<int:id>', methods=['POST'])
@login_required
def ai_student_summary(id):
    u = current_user()

    # 1. Fetch the student (respecting the same role rules as everywhere else)
    cur = mysql.connection.cursor()
    cur.execute('''SELECT s.*, c.name as course_name FROM students s
                   LEFT JOIN courses c ON s.course_id=c.id WHERE s.id=%s''', (id,))
    student = cur.fetchone()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    if u['role'] == 'teacher' and student['teacher_id'] != u['id']:
        return jsonify({'error': 'Access denied'}), 403

    # 2. Fetch their grades
    cur.execute('SELECT subject, grade, units, semester FROM grades WHERE student_id=%s ORDER BY semester', (id,))
    grades = cur.fetchall()
    cur.close()

    if not grades:
        return jsonify({'error': 'This student has no grades yet — add some first.'}), 400

    # 3. Build a clean text summary of the data to hand to the AI
    grades_text = "\n".join(
        f"- {g['subject']} ({g['semester']}): {g['grade']}/100, {g['units']} units"
        for g in grades
    )
    avg = sum(float(g['grade']) for g in grades) / len(grades)

    prompt = f"""You are an academic advisor assistant helping a teacher understand a student's performance.

Student: {student['first_name']} {student['last_name']}
Course: {student.get('course_name') or 'Not enrolled in a course'}
Year Level: {student['year_level']}
Overall average: {avg:.2f}/100

Grade records:
{grades_text}

Write a short, professional performance summary (3-5 sentences) for this student that:
1. Notes their overall academic standing
2. Highlights their strongest subject(s)
3. Flags any subject(s) that need attention (below 75)
4. Gives one practical, encouraging suggestion

Write it as if for a teacher's private notes — clear and direct, not flowery. Do not repeat the raw numbers I already gave you, interpret them."""

    try:
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            max_tokens=350,
            messages=[{"role": "user", "content": prompt}],
        )
        summary_text = response.choices[0].message.content
        return jsonify({'summary': summary_text})
    except Exception as e:
        return jsonify({'error': f'AI request failed: {str(e)}'}), 500


@app.route('/api/ai/report-comment/<int:id>', methods=['POST'])
@login_required
def ai_report_comment(id):
    u = current_user()
    data = request.get_json() or {}
    tone = data.get('tone', 'encouraging')  # encouraging | formal | concise

    cur = mysql.connection.cursor()
    cur.execute('SELECT * FROM students WHERE id=%s', (id,))
    student = cur.fetchone()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    if u['role'] == 'teacher' and student['teacher_id'] != u['id']:
        return jsonify({'error': 'Access denied'}), 403

    cur.execute('SELECT subject, grade FROM grades WHERE student_id=%s', (id,))
    grades = cur.fetchall()
    cur.close()

    if not grades:
        return jsonify({'error': 'No grades available for this student.'}), 400

    grades_text = ", ".join(f"{g['subject']}: {g['grade']}" for g in grades)
    avg = sum(float(g['grade']) for g in grades) / len(grades)

    tone_instructions = {
        'encouraging': 'warm and motivating, while still being honest about areas to improve',
        'formal': 'formal and objective, suitable for an official transcript',
        'concise': 'extremely brief — exactly one sentence',
    }

    prompt = f"""Write a report card comment for {student['first_name']} {student['last_name']}.
Grades: {grades_text}. Average: {avg:.2f}.
Tone: {tone_instructions.get(tone, tone_instructions['encouraging'])}.
Output ONLY the comment text, no preamble, no quotation marks, 1-2 sentences max."""

    try:
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        return jsonify({'comment': response.choices[0].message.content.strip()})
    except Exception as e:
        return jsonify({'error': f'AI request failed: {str(e)}'}), 500


@app.route('/api/ai/chat', methods=['POST'])
@login_required
def ai_chat():
    u = current_user()
    data = request.get_json() or {}
    question = (data.get('message') or '').strip()
    history = data.get('history', [])  # [{role: 'user'|'assistant', content: '...'}]

    if not question:
        return jsonify({'error': 'Message is required'}), 400

    # Build a role-scoped data snapshot — teachers only see their own data,
    # exactly like every other endpoint in this app.
    cur = mysql.connection.cursor()
    if u['role'] == 'teacher':
        cur.execute('''SELECT s.first_name, s.last_name, s.student_id, s.status, s.year_level,
                       c.name as course_name,
                       (SELECT AVG(grade) FROM grades WHERE student_id=s.id) as avg_grade
                       FROM students s LEFT JOIN courses c ON s.course_id=c.id
                       WHERE s.teacher_id=%s''', (u['id'],))
    else:
        cur.execute('''SELECT s.first_name, s.last_name, s.student_id, s.status, s.year_level,
                       c.name as course_name,
                       (SELECT AVG(grade) FROM grades WHERE student_id=s.id) as avg_grade
                       FROM students s LEFT JOIN courses c ON s.course_id=c.id''')
    rows = cur.fetchall()
    cur.close()

    data_lines = "\n".join(
        f"- {r['first_name']} {r['last_name']} ({r['student_id']}): "
        f"course={r['course_name'] or 'none'}, year={r['year_level']}, "
        f"status={r['status']}, avg_grade={round(float(r['avg_grade']), 1) if r['avg_grade'] else 'no grades yet'}"
        for r in rows
    ) or "No students found."

    system_prompt = f"""You are a helpful assistant inside a Student Management System, talking to a logged-in {u['role']}.
You can only see the data below — never claim knowledge of students outside this list.
Answer questions about these students concisely. If asked something unrelated to this data
or to the app, politely redirect to student/course/grade topics.

Current data snapshot ({u['role']} view):
{data_lines}"""

    messages = (
        [{"role": "system", "content": system_prompt}]
        + history[-10:]
        + [{"role": "user", "content": question}]
    )  # keep context short

    try:
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            max_tokens=400,
            messages=messages,
        )
        return jsonify({'reply': response.choices[0].message.content})
    except Exception as e:
        return jsonify({'error': f'AI request failed: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)