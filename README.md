# Adaptive Math Tutoring Assistant

## Overview
The **Adaptive Math Tutoring Assistant** is an AI-powered, personalized learning tool initially focused on preparing users for Mathematics Abitur exams. The tool functions as a digital tutor, capable of both checking solutions to problems and generating tailored exercises. Its design emphasizes adaptability through user profiles, error tracking, and guided hints, creating a highly individualized learning journey.

## Core Features

### Input Options

1. **Image / Screenshot Input**
   - Upload a picture of a math problem (with or without a solution).
   - If a problem and solution are uploaded:
     - The system checks correctness of the solution.
     - If correct, it will _[planned]_ evaluate if a better or more efficient solution process exists.
   - If a solution is incorrect, the user has several options:
     - Retry solving it on their own.
     - Request **Hint Level 1**: The system gives approximate feedback on which part of the solution seems problematic.
     - If still unresolved, request **Hint Level 2**: A more specific indication of the mistake.
     - The exact solution can be displayed at any point if desired.

2. **Generated Task Input**
   - Request a math problem from a chosen category.
     - Specify topic (Functions, Integration, Geometry, etc.)
     - Specify difficulty (easy, medium, challenging)
     - Specify task type (conceptual understanding, word problem, pure calculation)
   - Users may attempt the problem inside the platform.
   - Hints and solutions follow the same stepped structure as above.

### Solving Environment

- **Digital Workspace**:
  - Write solutions via keyboard, stylus, touch drawing, or text input.
  - Special character support for mathematical notation (roots, integrals, fractions, etc.).
  - Workspace is always accessible during task solving.

### Adaptive User Profiles

- Each user profile stores:
  - Metadata (region/state, grade level, skill indicators)
  - Preferences for individualized exercise generation
- Profiles allow the tutor to adjust:
  - Task difficulty
  - Solution approaches
  - Exam-relevant content selection

### Error Tracking & Personal Database

- The system tracks:
  - All solved problems and solution attempts
  - Recurring errors and weaknesses
  - Data-driven customization of future tasks
- Provides analytic insights on progress and learning patterns

### Topic-Based Task Folder Structure

- For each predefined topic category, the system creates a dedicated folder.
- All processed tasks, solution attempts, and related files are saved in these topic folders.
- New topic folders are created only when a task from a previously unseen topic category appears.
- The AI automatically categorizes each user request into its corresponding topic to ensure organized storage and progress tracking.

## Planned Features

- **Optimized Solution Suggestions**
  - If a correct solution is given, the system suggests a simpler, faster, or more elegant alternative.

- **Practice Exams (Probeklausur)**
  - The tool generates personalized mock exams to measure progress and simulate test environments, using profile data.

- **Progressive Difficulty Scaling**
  - Task complexity automatically adapts to the user’s learning curve.

- **Advanced Analytics Dashboard**
  - Visual overview of strengths, weaknesses, and topic mastery over time.

- **Multi-Subject Tutoring Expansion**
  - Extendable beyond Mathematics for additional subjects.

## Deployment & Technology Stack

- The project is initially released as a website.
- The mobile app will serve as a simple access point redirecting users to the website.
- No native app development at the start; focus is on a responsive web application.

### Technologies Used

- **Frontend**  
  - HTML, CSS for layout and styling  
  - JavaScript with frameworks like React, Vue, or Angular for UI and interactive features  
  - Optional WebAssembly for performance-critical math UI components  

- **Backend**  
  - Python (Flask/Django) or Node.js to handle server logic, AI processing, task and solution management  
  - Python ML frameworks such as TensorFlow or PyTorch for AI models  

- **Database**  
  - SQL or NoSQL (e.g., PostgreSQL, MongoDB) for user profiles, error tracking, and task storage  

- **Other Components**  
  - OCR libraries like Tesseract or OpenCV for extracting math problems from images  
  - REST or GraphQL APIs for frontend-backend communication  

## Installation & Usage
*(to be updated during implementation)*

- Clone repository
- Install dependencies
- Start backend tutoring service
- Access via Cursor IDE interface

## Contribution

Pull requests and contributions are welcome! Areas needing help:  
- Math problem OCR and parsing  
- AI-driven solution verification  
- User database and error tracking  
- Task generation engine  
- UI/UX for digital workspace  

## License

_To be determined by project owner_

---

## Suggestions for Further Improvement

- Add a roadmap file (ROADMAP.md) with milestone versions (e.g., MVP, v0.1, v0.2, etc.).
- Include demos/screenshots showing typical workflows (upload, hint, solve, feedback).
- Define data privacy policy given per-user learning data collection.
- Create a technical architecture diagram for the input pipeline (OCR → Parsing → Reasoning → Feedback).
- Outline quality assurance/testing strategies for verifying hint and solution correctness.
