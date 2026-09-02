# IEV Student Activity Tracking System --- Final Simple Database Design

## 1. Project Goal

Build a simple student activity tracking portal for IEV where:

-   Each student has a profile and one venture.
-   Each venture has 6 major activities:
    1.  Workshop
    2.  Mentoring
    3.  Summer Internship
    4.  Capstone
    5.  Demo Day
    6.  Startup Conclave
-   Admin controls activity creation, dates, status, Drive links,
    assignments, and data management.
-   Students can view their own activity data.
-   Completed activities are **view-only for students**.
-   Active activities can allow student submissions/uploads where
    required.
-   Faculty and mentors can review mentoring work and provide
    rating/feedback.
-   Actual files are stored in **Google Drive**, not MongoDB.
-   MongoDB stores metadata, relationships, permissions/mapping, and
    Google Drive file references.
-   **Do NOT use Supabase or Cloudinary** for this architecture unless a
    future requirement explicitly needs them.

------------------------------------------------------------------------

# 2. Recommended Architecture

``` text
                    NEXT.JS PORTAL
                          |
             +------------+------------+
             |                         |
          MongoDB                 Google Drive API
             |                         |
      Metadata / Mapping          Actual Files
      Users / Students            PDF / PPT
      Ventures                    Excel
      Activities                  Recordings
      Reviews
      Dates
      Drive File IDs
             |
             +------------+
                          |
                    Access Control
                          |
               +----------+----------+
               |                     |
             STUDENT               ADMIN
          Own data only          All data
          View completed         Manage everything
          Upload active          Upload/Edit/Map
```

### Storage rule

**MongoDB:** - User information - Student information - Venture
information - Activity information - Dates/status - Workshop sessions
and attendance - Mentoring sessions - Faculty/mentor reviews - Drive
folder/file IDs - Student-to-file mappings - Submission metadata

**Google Drive:** - PDFs - PPT/PPTX - DOC/DOCX - Excel files -
Recordings - Existing reports - Existing internship files - Existing
capstone files - Startup Conclave files

Do not store the actual binary files inside MongoDB.

------------------------------------------------------------------------

# 3. Roles

## ADMIN

Admin has full control.

Admin can:

-   Create/manage activities
-   Set/change activity dates
-   Set start/end time where applicable
-   Change activity status
-   Create workshop sessions
-   Manage attendance
-   Create/manage mentoring sessions
-   Assign faculty and mentors
-   Add/edit reviews if required by business rules
-   Add Drive folder links
-   Sync/read Drive files
-   Map Drive files to students
-   Manage completed activity resources
-   View all students' files
-   Manage Demo Day mocks
-   View all submissions
-   Generate reports later if required

## STUDENT

Student can:

-   View own profile
-   View own venture
-   View activities
-   View completed activity data
-   View own Drive resources through the portal
-   Upload files for active activities where allowed
-   Submit PPTs for Demo Day mocks
-   Upload PPT/PDF for mentoring sessions
-   View faculty/mentor feedback

Student must NOT be able to:

-   Edit completed activities
-   Delete completed activity resources
-   See another student's private files/submissions
-   Change activity dates
-   Change activity status
-   Change faculty/mentor assignment

## FACULTY

Faculty can:

-   View assigned students
-   View mentoring submissions
-   Review mentoring work
-   Give rating
-   Give feedback

## MENTOR

Mentor can:

-   View assigned students
-   View mentoring submissions
-   Review mentoring work
-   Give rating
-   Give feedback

------------------------------------------------------------------------

# 4. Collection: `users`

Used for login and role management.

``` js
{
  _id,

  name,
  email,

  role: "ADMIN" | "STUDENT" | "FACULTY" | "MENTOR",

  status,

  createdAt,
  updatedAt
}
```

If OTP login is used, OTP-related authentication fields can be added
according to the existing authentication implementation.

------------------------------------------------------------------------

# 5. Collection: `students`

Student-specific information.

``` js
{
  _id,

  userId,

  rollNumber,
  batch,


  background,
  strengths,
  weakness,

  createdAt,
  updatedAt
}
```

### Relationship

``` text
users._id
    |
    v
students.userId
```

------------------------------------------------------------------------

# 6. Collection: `student_ventures`

Stores the venture belonging to a student.

``` js
{
  _id,

  studentId,

  ventureName,
  industry,

  problemStatement,
  solution,

  facultyId,
  mentorId,

  status,

  createdAt,
  updatedAt
}
```

### Relationship

``` text
Student
   |
   v
Student Venture
```

A student venture can be connected to the six activities.

------------------------------------------------------------------------

# 7. Collection: `venture_activities`

This is the main activity/master collection.

``` js
{
  _id,

  ventureId,

  name,

  type:
    "WORKSHOP" |
    "MENTORING" |
    "SUMMER_INTERNSHIP" |
    "CAPSTONE" |
    "DEMO_DAY" |
    "STARTUP_CONCLAVE",

  description,

  date,
  startTime,
  endTime,

  status:
    "UPCOMING" |
    "ONGOING" |
    "COMPLETED",

  createdAt,
  updatedAt
}
```

## Important date rule

There should be **no hard-coded date windows**.

Admin controls:

-   date
-   start time
-   end time
-   status

Dates can be changed later by Admin.

------------------------------------------------------------------------

# 8. Workshop

## Collection: `workshops`

Workshop requires:

-   Workshop creation
-   Sessions
-   Participation/attendance
-   Reports

``` js
{
  _id,

  activityId,

  title,
  description,

  sessions: [
    {
      _id,

      title,
      date,
      startTime,
      endTime,

      speaker,
      venue,

      participants: [
        {
          studentId,
          attendance
        }
      ]
    }
  ],

  reports: [
    {
      title,
      driveFolderId,
      driveUrl
    }
  ],

  createdAt,
  updatedAt
}
```

## Admin workflow

``` text
Admin
  |
  +-- Create Workshop
  |
  +-- Add Session
  |
  +-- Set Date/Time
  |
  +-- Manage Attendance
  |
  +-- Add/View Reports
```

------------------------------------------------------------------------

# 9. Mentoring

Mentoring requires:

-   Student
-   Faculty
-   Mentor
-   Sessions
-   Student PPT/PDF uploads
-   Faculty review
-   Mentor review
-   Rating
-   Feedback

## Collection: `mentorings`

``` js
{
  _id,

  activityId,

  assignments: [
    {
      studentId,
      facultyId,
      mentorId
    }
  ],

  sessions: [
    {
      _id,

      studentId,

      date,
      startTime,
      endTime,

      topic,

      files: [
        {
          driveFileId,
          fileName,
          fileType,
          driveUrl
        }
      ],

      facultyReview: {
        facultyId,
        rating,
        feedback,
        reviewedAt
      },

      mentorReview: {
        mentorId,
        rating,
        feedback,
        reviewedAt
      }
    }
  ],

  createdAt,
  updatedAt
}
```

## Mentoring student flow

``` text
Student Login
      |
      v
Mentoring
      |
      v
Session
      |
      v
Upload PPT/PDF
      |
      v
Google Drive
      |
      v
Faculty Review
      |
      v
Mentor Review
      |
      v
Rating + Feedback
```

Actual PPT/PDF files go to Google Drive.

MongoDB stores the file reference.

------------------------------------------------------------------------

# 10. Google Drive Strategy

Google Drive is the file storage system.

The portal should use the **Google Drive API**.

MongoDB stores:

``` text
activityId
studentId
sessionId (when applicable)
driveFileId
fileName
fileType
driveUrl
access
```

The actual file stays in Google Drive.

------------------------------------------------------------------------

# 11. Common Collection: `activity_resources`

This is a key part of the design.

It is used for student-specific resources from activities where the
existing Drive structure contains files for many students.

``` js
{
  _id,

  activityId,
  studentId,

  category,

  // Examples:
  // REPORT_1
  // REPORT_2
  // REPORT_3
  // CAPSTONE_REPORT_1
  // CAPSTONE_REPORT_2
  // STARTUP_CONCLAVE
  // OTHER

  driveFileId,
  fileName,
  fileType,
  driveUrl,

  access: "VIEW",

  createdAt,
  updatedAt
}
```

## Why this collection is needed

Suppose Google Drive contains:

``` text
Summer Internship
  |
  +-- Report 1
  |     +-- Komal.pdf
  |     +-- Rahul.pdf
  |     +-- Aman.pdf
  |
  +-- Report 2
  |     +-- Komal.pdf
  |     +-- Rahul.pdf
  |
  +-- Report 3
        +-- Komal.pdf
        +-- Rahul.pdf
```

The student should NOT be given direct access to the whole folder.

Instead, MongoDB maps:

``` text
Drive File              Student
-----------------------------------
Komal_Report1.pdf       Komal
Rahul_Report1.pdf       Rahul
Komal_Report2.pdf       Komal
Rahul_Report2.pdf       Rahul
```

When Komal logs in:

``` text
WHERE studentId = Komal
```

Only Komal's resources are returned.

------------------------------------------------------------------------

# 12. Summer Internship

Summer Internship is already completed.

Existing structure:

``` text
Summer Internship
    |
    +-- Report 1
    |     +-- all students' PDFs
    |
    +-- Report 2
    |     +-- all students' PDFs
    |
    +-- Report 3
          +-- all students' PDFs
```

## Collection: `summer_internships`

``` js
{
  _id,

  activityId,

  title,

  driveFolderId,
  driveUrl,

  status: "COMPLETED",

  reports: [
    {
      name: "Report 1",
      driveFolderId,
      driveUrl
    },
    {
      name: "Report 2",
      driveFolderId,
      driveUrl
    },
    {
      name: "Report 3",
      driveFolderId,
      driveUrl
    }
  ],

  createdAt,
  updatedAt
}
```

Individual student files are mapped using:

``` text
activity_resources
```

## Student access

Student can:

-   View own Report 1
-   View own Report 2
-   View own Report 3

Student cannot:

-   Edit
-   Delete
-   Upload into completed internship
-   See another student's file

Admin can manage all resources.

------------------------------------------------------------------------

# 13. Capstone

Capstone is already completed.

Requirements:

-   Challenge
-   Submission information
-   Drive link
-   Two report folders
-   One Excel sheet
-   Student-specific files/resources
-   View-only for students

## Collection: `capstones`

``` js
{
  _id,

  activityId,

  challenge: {
    title,
    description,
    instructions
  },

  driveFolderId,
  driveUrl,

  reports: [
    {
      name: "Report 1",
      driveFolderId,
      driveUrl
    },
    {
      name: "Report 2",
      driveFolderId,
      driveUrl
    }
  ],

  excelFile: {
    driveFileId,
    fileName,
    driveUrl
  },

  status: "COMPLETED",

  createdAt,
  updatedAt
}
```

Student-specific capstone files are stored in:

``` text
activity_resources
```

Students get VIEW access only through the portal.

------------------------------------------------------------------------

# 14. Demo Day

Demo Day is an active/future activity.

There are:

1.  Mock 1 --- December
2.  Mock 2 --- January
3.  Mock 3 --- February
4.  Final Demo Day

Dates must NOT be hard-coded. Admin sets the actual dates.

Students submit their own PPT through the portal.

## Collection: `demo_days`

``` js
{
  _id,

  activityId,

  rounds: [
    {
      _id,

      type: "MOCK_1",

      date,

      driveFolderId,
      driveUrl,

      submissions: [
        {
          studentId,

          driveFileId,
          fileName,
          fileType,
          driveUrl,

          submittedAt,

          status
        }
      ]
    },

    {
      _id,

      type: "MOCK_2",

      date,

      driveFolderId,
      driveUrl,

      submissions: []
    },

    {
      _id,

      type: "MOCK_3",

      date,

      driveFolderId,
      driveUrl,

      submissions: []
    },

    {
      _id,

      type: "FINAL",

      date,

      driveFolderId,
      driveUrl,

      submissions: []
    }
  ],

  createdAt,
  updatedAt
}
```

## Demo Day flow

``` text
Student Login
      |
      v
Demo Day
      |
      v
Mock 1
      |
      v
Upload PPT
      |
      v
Next.js Backend
      |
      v
Google Drive
      |
      v
Admin's Demo Day Folder
```

Drive structure:

``` text
Demo Day
  |
  +-- Mock 1
  |     +-- Student A.pptx
  |     +-- Student B.pptx
  |
  +-- Mock 2
  |
  +-- Mock 3
  |
  +-- Final
```

Students must not see other students' submissions.

------------------------------------------------------------------------

# 15. Startup Conclave

Startup Conclave is already completed.

Requirements:

-   One-day activity
-   Completed
-   Drive folder
-   PDFs of all students
-   Student-specific view-only access

## Collection: `startup_conclaves`

``` js
{
  _id,

  activityId,

  title,
  description,

  date,
  startTime,
  endTime,

  driveFolderId,
  driveUrl,

  status: "COMPLETED",

  createdAt,
  updatedAt
}
```

Student-specific PDFs/resources are mapped using:

``` text
activity_resources
```

Students can view only their own resources.

Admin can view/manage everything.

------------------------------------------------------------------------

# 16. Completed Activity Access Rule

The following activities are completed:

``` text
Summer Internship     COMPLETED
Capstone              COMPLETED
Startup Conclave      COMPLETED
```

For completed activities:

### Student

``` text
View       YES
Upload    NO
Edit       NO
Delete     NO
```

### Admin

``` text
View       YES
Upload     YES
Edit       YES
Delete     YES
Map files  YES
Change link YES
```

This should be enforced on the **backend**, not only by hiding buttons
in the frontend.

------------------------------------------------------------------------

# 17. Active Activity Access Rule

## Mentoring

Student:

``` text
View session       YES
Upload PPT/PDF     YES
View own files     YES
View feedback     YES
Edit review        NO
```

Faculty:

``` text
View assigned students    YES
View submissions          YES
Give rating               YES
Give feedback             YES
```

Mentor:

``` text
View assigned students    YES
View submissions          YES
Give rating               YES
Give feedback             YES
```

## Demo Day

Student:

``` text
View round                YES
Submit PPT                YES
View own submission       YES
View other students       NO
```

Admin:

``` text
View all                  YES
Manage rounds             YES
Set dates                 YES
View all submissions      YES
Manage Drive folders      YES
```

------------------------------------------------------------------------

# 18. Admin Drive Management

Admin should have a page like:

``` text
ADMIN
 |
 +-- Activities
       |
       +-- Summer Internship
       |      |
       |      +-- Drive Folder
       |      +-- Report 1
       |      +-- Report 2
       |      +-- Report 3
       |      +-- Student File Mapping
       |
       +-- Capstone
       |      |
       |      +-- Challenge
       |      +-- Report 1
       |      +-- Report 2
       |      +-- Excel
       |      +-- Student File Mapping
       |
       +-- Demo Day
       |      |
       |      +-- Mock 1
       |      +-- Mock 2
       |      +-- Mock 3
       |      +-- Final
       |
       +-- Startup Conclave
              |
              +-- Drive Folder
              +-- Student File Mapping
```

------------------------------------------------------------------------

# 19. Drive File Mapping

Because existing Drive folders contain files for multiple students,
Admin needs a mapping interface.

Example:

``` text
DRIVE FILE MAPPING

File                     Student
-----------------------------------------
Komal_Report1.pdf        Komal Sinha
Rahul_Report1.pdf        Rahul Sharma
Aman_Report1.pdf         Aman Kumar
Unknown_Report.pdf       [Select Student]

                         [Assign]
```

After assignment:

``` text
activity_resources
```

stores:

``` text
activityId
studentId
driveFileId
fileName
driveUrl
```

This mapping is permanent until Admin changes it.

------------------------------------------------------------------------

# 20. Student Portal

Student dashboard:

``` text
MY PROFILE
---------------------------
Name
Roll Number
Batch
Background
Strengths
Weakness


MY VENTURE
---------------------------
Venture Name
Industry
Problem Statement
Solution
Faculty
Mentor


ACTIVITIES
---------------------------

1. Workshop
   Sessions
   Attendance
   Reports

2. Mentoring
   Sessions
   Upload PPT/PDF
   Faculty Feedback
   Mentor Feedback

3. Summer Internship
   Report 1 [View]
   Report 2 [View]
   Report 3 [View]

4. Capstone
   Challenge
   Report 1 [View]
   Report 2 [View]
   Excel [View]

5. Demo Day
   Mock 1 [Submit PPT]
   Mock 2 [Submit PPT]
   Mock 3 [Submit PPT]
   Final

6. Startup Conclave
   My PDF [View]
```

------------------------------------------------------------------------

# 21. Critical Student Data Security Rule

Never expose the entire Drive folder URL to students when that folder
contains other students' files.

Bad:

``` text
Student -> Full Drive Folder
```

Correct:

``` text
Student Login
     |
     v
Backend gets logged-in studentId
     |
     v
Query activity_resources
WHERE studentId = loggedInStudentId
     |
     v
Return only that student's Drive files
```

The backend should verify ownership before returning a file/resource.

------------------------------------------------------------------------

# 22. Recommended File Access

For completed activities, use portal-controlled viewing.

Conceptually:

``` text
Student
   |
   v
Portal
   |
   v
Backend authorization
   |
   v
Check studentId + resource ownership
   |
   v
Google Drive file
```

Do not rely only on a public Drive folder URL for privacy.

If the Google Workspace setup allows it, keep Drive files/folders
restricted and let the backend/API control access.

------------------------------------------------------------------------

# 23. Complete Database Overview

``` text
users
  |
  +---- students
            |
            +---- student_ventures
                     |
                     +---- venture_activities
                              |
                              +---- workshops
                              |       |
                              |       +-- sessions[]
                              |       +-- participants[]
                              |       +-- reports[]
                              |
                              +---- mentorings
                              |       |
                              |       +-- assignments[]
                              |       +-- sessions[]
                              |              |
                              |              +-- files[]
                              |              +-- facultyReview
                              |              +-- mentorReview
                              |
                              +---- summer_internships
                              |       |
                              |       +-- Drive folders
                              |       +-- Report 1
                              |       +-- Report 2
                              |       +-- Report 3
                              |
                              +---- capstones
                              |       |
                              |       +-- challenge
                              |       +-- Report 1
                              |       +-- Report 2
                              |       +-- Excel
                              |
                              +---- demo_days
                              |       |
                              |       +-- Mock 1
                              |       +-- Mock 2
                              |       +-- Mock 3
                              |       +-- Final
                              |
                              +---- startup_conclaves
                                      |
                                      +-- Drive folder

activity_resources
  |
  +-- student-specific Drive file mappings
  +-- Summer Internship
  +-- Capstone
  +-- Startup Conclave
  +-- other activity resources when needed
```

------------------------------------------------------------------------

# 24. Final Collection List

Keep the database simple. Recommended collections:

``` text
1. users
2. students
3. student_ventures
4. venture_activities
5. workshops
6. mentorings
7. summer_internships
8. capstones
9. demo_days
10. startup_conclaves
11. activity_resources
```

Do not create separate collections for every individual PDF/PPT/report.

------------------------------------------------------------------------

# 25. Important Design Principles

### Principle 1 --- Google Drive is file storage

Do not duplicate existing Drive files into another storage system.

### Principle 2 --- MongoDB stores metadata

MongoDB should know:

``` text
Who?
What?
Which activity?
Which session?
Which file?
Where is the Drive file?
What access does the student have?
```

### Principle 3 --- Student ownership must be explicit

Every student-specific resource should have:

``` text
studentId
```

### Principle 4 --- Completed activities are immutable for students

Completed:

``` text
Summer Internship
Capstone
Startup Conclave
```

are view-only for students.

### Principle 5 --- Admin controls dates

Never hard-code activity dates.

### Principle 6 --- Backend authorization is mandatory

Do not depend only on frontend button visibility.

### Principle 7 --- Avoid unnecessary services

Current architecture:

``` text
Next.js
MongoDB
Google Drive API
```

No Supabase.

No Cloudinary.

------------------------------------------------------------------------

# 26. Implementation Guidance for Claude

When implementing this system:

1.  Preserve the existing backend foundation if it already exists.
2.  Do not recreate the database foundation unnecessarily.
3.  Use MongoDB/Mongoose for the above collections.
4.  Use Google Drive API for actual file storage.
5.  Store Google Drive `fileId` and `folderId` in MongoDB.
6.  Build Admin CRUD for activities and dates.
7.  Build student-specific resource authorization.
8.  Build Drive file mapping for existing files.
9.  Implement mentoring upload flow.
10. Implement faculty and mentor reviews.
11. Implement Demo Day mock submission flow.
12. Make completed activities view-only for students.
13. Ensure students cannot access another student's Drive resources.
14. Keep the database simple and avoid unnecessary collections.
15. Validate all permissions on the server/backend.
16. Do not introduce Supabase or Cloudinary unless a new requirement
    explicitly requires them.

------------------------------------------------------------------------

# 27. Most Important Business Flow

``` text
ADMIN
  |
  +--> Creates/Manages Activities
  |
  +--> Sets Dates
  |
  +--> Adds Drive Folder Links
  |
  +--> Maps Existing Drive Files to Students
  |
  +--> Manages Sessions/Attendance/Reviews
  |
  +--> Views All Data


STUDENT
  |
  +--> Login
  |
  +--> View Profile
  |
  +--> View Venture
  |
  +--> View 6 Activities
  |
  +--> Completed Activity -> VIEW ONLY
  |
  +--> Mentoring -> Upload PPT/PDF
  |
  +--> Demo Day -> Submit PPT
  |
  +--> View Own Feedback
  |
  +--> View Own Drive Resources Only
```

This is the final simplified architecture for the current requirements.
