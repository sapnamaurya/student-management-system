-- ============================================================
-- Student Management System - Full Database (v2)
-- Run in phpMyAdmin or MySQL CLI
-- ============================================================

CREATE DATABASE IF NOT EXISTS student_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE student_management;

-- ─── USERS (Auth) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role ENUM('admin','teacher') NOT NULL DEFAULT 'teacher',
    avatar_initials VARCHAR(3),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── COURSES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    duration_years INT DEFAULT 4,
    department VARCHAR(100),
    teacher_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── STUDENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male','female','other'),
    address TEXT,
    course_id INT,
    teacher_id INT,
    year_level INT DEFAULT 1,
    status ENUM('active','inactive','graduated','dropped') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── GRADES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    grade DECIMAL(5,2) NOT NULL,
    units INT DEFAULT 3,
    semester VARCHAR(30),
    remarks VARCHAR(50),
    added_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── SAMPLE USERS ────────────────────────────────────────────
-- Password for admin account: admin123
-- Password for teacher accounts: teacher123
-- Hashes generated with werkzeug generate_password_hash(method='pbkdf2:sha256')

INSERT INTO users (username, email, password_hash, full_name, role, avatar_initials) VALUES
('admin', 'admin@school.edu',
 'pbkdf2:sha256:1000000$5Qc1tZYvtbSsLEAn$40db76690762aa37a31d3ae892d07ede11a06f23e12092d4f8f8e6937bdcbd1a',
 'System Administrator', 'admin', 'SA'),
('mcruz', 'mcruz@school.edu',
 'pbkdf2:sha256:1000000$i3Cbj2l5EuHDxEUl$b6aa860d72930d7ad4fb360b13d00f2ee02feefe5783c388fe294521e2a913f8',
 'Maria Cruz', 'teacher', 'MC'),
('jreyes', 'jreyes@school.edu',
 'pbkdf2:sha256:1000000$i3Cbj2l5EuHDxEUl$b6aa860d72930d7ad4fb360b13d00f2ee02feefe5783c388fe294521e2a913f8',
 'Jose Reyes', 'teacher', 'JR');

-- ─── SAMPLE COURSES ──────────────────────────────────────────
INSERT INTO courses (name, code, description, duration_years, department, teacher_id) VALUES
('Bachelor of Science in Computer Science', 'BSCS', 'Study of computation, algorithms, and software systems.', 4, 'College of Computing', 2),
('Bachelor of Science in Information Technology', 'BSIT', 'Focus on practical IT applications and systems management.', 4, 'College of Computing', 2),
('Bachelor of Science in Business Administration', 'BSBA', 'Foundation in business, management, and economics.', 4, 'College of Business', 3),
('Bachelor of Science in Nursing', 'BSN', 'Training for professional nursing practice.', 4, 'College of Health Sciences', 3),
('Bachelor of Education', 'BEd', 'Preparation for teaching across all grade levels.', 4, 'College of Education', 2);

-- ─── SAMPLE STUDENTS ─────────────────────────────────────────
INSERT INTO students (student_id, first_name, last_name, email, phone, date_of_birth, gender, address, course_id, teacher_id, year_level, status) VALUES
('2026-0001','Alice','Santos','alice.santos@school.edu','09171234567','2003-04-15','female','123 Rizal St, Manila',1,2,2,'active'),
('2026-0002','Ben','Reyes','ben.reyes@school.edu','09181234567','2002-08-22','male','456 Mabini Ave, QC',1,2,3,'active'),
('2026-0003','Clara','Gomez','clara.gomez@school.edu','09191234567','2003-11-10','female','789 Luna St, Makati',2,2,2,'active'),
('2026-0004','Dan','Cruz','dan.cruz@school.edu','09201234567','2001-06-05','male','321 Del Pilar St, Pasig',3,3,4,'active'),
('2026-0005','Eva','Lim','eva.lim@school.edu','09211234567','2002-03-18','female','654 Aguinaldo Blvd, Taguig',4,3,3,'active'),
('2025-0006','Frank','Tan','frank.tan@school.edu','09221234567','2001-09-30','male','987 Quezon Blvd, Manila',2,2,4,'active'),
('2025-0007','Grace','Villanueva','grace.v@school.edu','09231234567','2003-01-25','female','147 P. Burgos St, Caloocan',5,2,2,'active'),
('2022-0008','Hank','Dela Cruz','hank.dc@school.edu','09241234567','2000-07-12','male','258 Libertad St, Mandaluyong',1,2,4,'inactive'),
('2026-0009','Iris','Fernandez','iris.f@school.edu','09251234567','2003-05-08','female','369 Edsa, Pasay',3,3,1,'active'),
('2026-0010','Jake','Mendoza','jake.m@school.edu','09261234567','2002-12-20','male','741 España Blvd, Sampaloc',4,3,2,'active');

-- ─── SAMPLE GRADES ───────────────────────────────────────────
INSERT INTO grades (student_id, subject, grade, units, semester, remarks, added_by) VALUES
(1,'Programming 1',92.5,3,'2026-1st','Excellent',2),
(1,'Discrete Math',88.0,3,'2026-1st','Very Good',2),
(1,'Computer Organization',85.5,3,'2026-1st','Very Good',2),
(2,'Data Structures',90.0,3,'2026-1st','Excellent',2),
(2,'Algorithms',87.5,3,'2026-1st','Very Good',2),
(3,'Web Systems',94.0,3,'2026-1st','Excellent',2),
(3,'Database Systems',89.0,3,'2026-1st','Very Good',2),
(4,'Business Communication',91.0,3,'2026-1st','Excellent',3),
(5,'Anatomy & Physiology',86.0,3,'2026-1st','Very Good',3),
(6,'Advanced Web Dev',95.0,3,'2026-1st','Excellent',2);
