-- Create users table with all necessary fields
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    avatar_url VARCHAR(500),
    bio TEXT,
    phone VARCHAR(20),
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, is_active) 
VALUES ('admin@visnet.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKzEm.8ywYZJR5wO', 'System', 'Administrator', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- Student Activities Table for tracking student actions
CREATE TABLE IF NOT EXISTS student_activities (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_data JSONB,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_activities_student ON student_activities(student_id);
CREATE INDEX IF NOT EXISTS idx_student_activities_course ON student_activities(course_id);
