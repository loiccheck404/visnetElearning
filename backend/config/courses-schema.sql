-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    thumbnail_url VARCHAR(500),
    level VARCHAR(50) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    language VARCHAR(50) DEFAULT 'English',
    price DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT false,
    duration_hours INTEGER,
    enrollment_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    video_url VARCHAR(500),
    duration_minutes INTEGER,
    order_index INTEGER NOT NULL,
    is_preview BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    progress INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Lesson Progress Table
CREATE TABLE IF NOT EXISTS lesson_progress (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,
    UNIQUE(enrollment_id, lesson_id)
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, student_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id);

-- Insert default categories
INSERT INTO categories (name, description, slug) VALUES
    ('Web Development', 'Learn web development technologies', 'web-development'),
    ('Mobile Development', 'Build mobile applications', 'mobile-development'),
    ('Data Science', 'Data analysis and machine learning', 'data-science'),
    ('Design', 'UI/UX and graphic design', 'design'),
    ('Business', 'Business and entrepreneurship skills', 'business'),
    ('Marketing', 'Digital marketing strategies', 'marketing')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample courses
/*
INSERT INTO courses (title, slug, description, short_description, instructor_id, category_id, level, status, is_featured) VALUES
    ('Introduction to Angular', 'intro-angular', 'Learn Angular framework from scratch', 'Master Angular development', 2, 1, 'beginner', 'published', true),
    ('Advanced TypeScript', 'advanced-typescript', 'Deep dive into TypeScript features', 'Advanced TypeScript patterns', 2, 1, 'advanced', 'published', false),
    ('Node.js Masterclass', 'nodejs-masterclass', 'Complete Node.js backend development', 'Build scalable backend apps', 2, 1, 'intermediate', 'draft', false)
ON CONFLICT (slug) DO NOTHING;
*/