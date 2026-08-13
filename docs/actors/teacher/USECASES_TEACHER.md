# 👩‍🏫 Teacher — Use Cases

> Detailed use cases for the Teacher.  
> Feature list: [FEATURES_TEACHER.md](./FEATURES_TEACHER.md)  
> Permissions: [PERMISSIONS_TEACHER.md](./PERMISSIONS_TEACHER.md)

---

## UC-T-001: Create a class and share the enrollment code

**Actor**: Teacher  
**Precondition**: The account has been approved by an admin (active)

**Main Flow**:
1. Teacher opens Classes → "Create a new class"
2. Enters: class name, HSK level, description
3. System creates the Class with an auto-generated 8-char `enrollmentCode`
4. Teacher shares the code with students (copy / QR)
5. Students enter the code → a ClassEnrollment is created

---

## UC-T-002: Create a Listening question

**Actor**: Teacher  
**Precondition**: Logged in, active

**Main Flow**:
1. Teacher opens the Question Bank → "Create question"
2. Selects skill = `listening` and a subType (e.g. `multiple_choice_single`)
3. Uploads an audio file (MP3/WAV, max 10MB → Supabase Storage)
4. Enters the transcript, options, correct answer, and explanation
5. Selects an HSK level → Save
6. The question appears in the bank, ready to use in an Assignment

---

## UC-T-003: Create an Assignment and give it to a class

**Actor**: Teacher

**Main Flow**:
1. Teacher opens Assignments → "Create new"
2. Selects a type: `homework` or `mock_test`
3. If mock_test: enters timeLimitMinutes
4. Picks questions from the bank (filtered by skill, HSK level)
5. Selects the class + dueDate → Publish
6. System creates the Assignment; students receive a `new_assignment` notification

---

## UC-T-004: Grade a Writing submission with AI

**Actor**: Teacher  
**Trigger**: A new submission needs grading

**Main Flow**:
1. Teacher opens Grading → filters to "needs grading"
2. Opens the submission → reads the student's writing answer
3. Clicks "AI Suggest" → the system calls the Gemini API
4. Gemini returns: a suggested score (0–10) + reasoning
5. Teacher reviews it → enters the final score + feedback → Save
6. Attempt status: `submitted → graded`
7. The student receives a `graded` notification

---

## UC-T-005: Log a class session and submit it for payroll approval

**Actor**: Teacher

**Main Flow**:
1. Teacher opens Sessions → "Start session"
2. Enters: date, startTime, topic, notes
3. Marks attendance for each student (present / absent_excused / absent_unexcused)
4. Ends the session → enters actualEndTime
5. Submits → session status = `completed_pending`
6. The admin is notified, reviews it → Approve / Reject (with a reason if rejected)
7. Teacher receives a `session_approved` or `session_rejected` notification

---

## UC-T-006: View class statistics (Class Analytics Dashboard)

**Actor**: Teacher  
**Precondition**: The class has at least one assignment and one submission

**Main Flow**:
1. Teacher opens Classes → selects a class → the "Statistics" tab
2. Views the dashboard, which shows:
   - Average score per assignment (charted over time)
   - Score distribution (histogram) per assignment
   - Class-wide submission rate
3. Reviews the list of struggling students (score below the threshold)
4. Selects a student → views their skill breakdown: scores across Listening / Reading / Writing

**Notes**: This dashboard merges F6.1–F6.3 and F8.3 into a single view.

---

## UC-T-007: Create and manage Lessons in a class

**Actor**: Teacher  
**Precondition**: A class exists, account is active

**Main Flow**:
1. Teacher opens Classes → selects a class → the "Lessons" tab
2. Clicks "Add lesson" → enters a title and description, uploads a document / video link
3. System creates the Lesson attached to the class
4. Teacher orders the lessons (drag-and-drop or by entering an index)
5. Attaches an Assignment to a Lesson: picks an existing assignment → links it
6. Students in the class see the lessons in the order that was set

**Alternative**: Teacher edits / deletes a lesson (before students attempt any attached work)  
**Note**: The Lesson ↔ Assignment relationship (1:N or M:N) and the Lesson entity definition must be settled before building.
