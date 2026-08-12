# 🎓 Student — Use Cases

> Detailed use cases for the Student.  
> Feature list: [FEATURES_STUDENT.md](./FEATURES_STUDENT.md)  
> Permissions: [PERMISSIONS_STUDENT.md](./PERMISSIONS_STUDENT.md)

---

## UC-S-001: Join a class with an enrollment code

**Actor**: Student  
**Precondition**: Account is active and the student has an enrollment code from the teacher

**Main Flow**:
1. Student opens Classes → "Join class"
2. Enters the 8-char code → the system validates it (class is active, code is correct)
3. System creates a `ClassEnrollment` (status=active)
4. The class appears in the student's list; they can view lessons and assignments

**Error**: Code does not exist → 404. Class already archived → 400.

---

## UC-S-002: Take a Mock Test

**Actor**: Student  
**Precondition**: Assignment type=mock_test, status=published, no attempt yet

**Main Flow**:
1. Student opens Assignments → sees the timed assignment
2. Clicks "Start" → the system creates an Attempt (status=in_progress) and starts the countdown
3. Student works through the test: selecting answers, filling in blanks
4. Every 2 seconds: AttemptAnswer auto-saves → no data loss if the network drops
5. Student navigates via the sidebar (marks: not answered / answered / flagged)
6. When time runs out the system auto-submits. Alternatively the student clicks "Submit" early
7. Attempt status = `submitted`; the student sees the MCQ results immediately

---

## UC-S-003: Review vocabulary with SRS

**Actor**: Student

**Main Flow**:
1. Student opens Flashcards → picks an HSK level
2. System loads cards where `nextReviewDate <= now`
3. Student sees the front (hanzi) → flips → sees pinyin + meaning + example
4. Rates it: **Again** / **Hard** / **Good** / **Easy**
5. SM-2 recalculates: easeFactor, repetitionsCount, nextReviewDate
6. Repeats until no cards remain due
7. Dashboard shows: streak, cards reviewed today, retention rate

---

## UC-S-004: View results and feedback

**Actor**: Student  
**Trigger**: Receives a "your work has been graded" notification

**Main Flow**:
1. Student opens Assignments → finds the graded work
2. Views the total score + grade band
3. Reviews each question: their answer vs. the correct answer + the teacher's feedback
4. (Writing) Reads the detailed comments + the writing score

---

## UC-S-005: View a Lesson in a class

**Actor**: Student  
**Precondition**: Already joined the class (enrollment active)

**Main Flow**:
1. Student opens Classes → selects a class → the "Lessons" tab
2. System lists the lessons in order (the ordering the teacher set)
3. Student picks a lesson → views the content (document / video / description)
4. If the lesson has attached assignments → a link to the matching Assignment is shown
5. The student can click straight through to the assignment from the lesson screen

**Note**: The Lesson entity's definition must be settled (see the open questions in implementation_plan.md) before building.

---

## UC-S-006: Self-practice by skill (Skill Drill)

**Actor**: Student  
**Precondition**: Logged in, account active

**Main Flow**:
1. Student opens "Practice" → picks a skill: Reading / Listening / Writing
2. Picks an HSK level (1–9) and a difficulty (easy / medium / hard)
3. System randomly selects matching questions from the question bank
4. Student answers the questions — **not** officially graded
5. After each question: the correct answer + explanation are shown immediately
6. At the end of the session: a summary (X correct out of Y)

**Note**: Skill Drill results are not written to the grade record and do not affect GPA or ranking.

---

## UC-S-007: Join and play a real-time Quiz Room

**Actor**: Student  
**Precondition**: A quiz room is open (the teacher has created one and shared the code)  
**Dependency**: WebSocket infrastructure

**Main Flow**:
1. Student opens "Quiz Room" → enters the room code
2. System validates it → the student enters the waiting room and sees the players joining
3. The host starts → questions appear simultaneously for all players
4. Each question has a countdown; the student picks an answer before time runs out
5. Answering **correctly and quickly** → a higher score (speed bonus)
6. After each question: the live leaderboard updates the rankings
7. When the room ends: final ranks + each player's total score are shown

**Error**: Room code does not exist → 404. Room already started → joining mid-game is not allowed.  
**Note**: Who creates the room and where the questions come from must be settled before building (see the open questions).
