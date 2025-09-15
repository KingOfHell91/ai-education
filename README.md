# Memora - Coding & Technical Details

---

## 🛠 Tech Stack
- **Frontend:** React, HTML, CSS, JavaScript
- **Backend (later):** Node.js or Python (Flask/FastAPI)
- **Database (later):** PostgreSQL / MongoDB
- **AI Integration:** OpenAI API or equivalent
- **Hosting/Deployment:** Web-first (Vercel, Netlify), wrapped into desktop/mobile apps later.

---

## 📅 Roadmap

### Beginner-Friendly Lean Roadmap
**Month 1:**
- Setup environment & create basic “Hello World” note editor.

**Month 2:**
- Add multiple notes & simple folder structure.
- Store data in localStorage.
- Implement import/export (TXT).

**Month 3:**
- Add first AI feature (chat or summary).
- Prepare beta test with pilot school.

**Month 4+ (Optional):**
- Improve UX, teacher dashboard, quiz generator.
- Explore cloud backend & database.

---

## 📊 Success Metrics (Coding-focused)
- **Month 3 Goal:** Working MVP with AI feature.

---

## 🚀 Quick Start (Local Notes Prototype)

A zero-setup notes prototype is included for Month 1–2 goals (folders, notes, edit, local save).

### Run it
1. Open `index.html` in your browser (double-click the file). No install, no server.

### Features
- Create, rename, delete folders
- Create, rename, delete notes
- Move notes between folders (dropdown)
- Edit note content with autosave
- Search notes (title and content)
- Data persists in `localStorage`

### Files
- `index.html`: React app (via CDN) for folders/notes UI and localStorage logic
- `styles.css`: Minimal dark theme styling

### Next steps (Month 2+)
- Export/Import (TXT/JSON)
- Keyboard shortcuts (e.g., Ctrl+N, Ctrl+F)
- Rich text/Markdown preview