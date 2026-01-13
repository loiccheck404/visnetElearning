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