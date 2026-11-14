# StudyAI – AI-Powered Study Assistant

StudyAI is an AI-powered learning application that transforms user-provided study notes into interactive flashcards and multiple-choice quizzes. It helps students understand concepts, test their knowledge, and revise incorrect answers through an interactive learning experience.

**Live Demo:** https://study-assistant-psi-ashen.vercel.app/

**GitHub Repository:** https://github.com/Myths-calm42/study-assistant

---

## Features

- **AI-Powered Content Generation:** Converts free-form study notes into structured learning materials using Google Gemini.
- **Interactive Flashcards:** Learn concepts through question-and-answer cards.
- **Multiple-Choice Quizzes:** Test understanding with four-option questions and explanations.
- **Wrong Answer Retesting:** Practice incorrect answers again to reinforce learning.
- **Saved Sessions:** Automatically saves generated study sets in browser localStorage.
- **Session Management:** Load and delete previously generated study sessions.
- **Input Validation:** Validates user input before sending requests to the backend.
- **AI Response Validation:** Uses Zod to validate the structure of AI-generated JSON.
- **Error Handling:** Handles malformed JSON, empty responses, API failures, timeouts, and temporary service unavailability.
- **Responsive Interface:** Supports desktop, tablet, and mobile screens.

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript |
| Styling | CSS3 |
| Backend | Node.js, Express.js |
| AI Integration | Google Gemini API |
| Validation | Zod |
| Storage | Browser localStorage |
| Deployment | Vercel, Render |
| Version Control | Git, GitHub |

## Application Architecture

```text
                 User
                   |
                   v
          React Frontend (Vite)
                   |
                   v
          Express Backend (Render)
                   |
                   v
             Gemini API
                   |
                   v
          Structured JSON Response
                   |
                   v
          Zod Response Validation
                   |
                   v
          Interactive Learning UI
             /           \
            v             v
        Flashcards       Quizzes
                           |
                           v
                    Wrong Answer
                       Retest

          Browser localStorage
                   |
                   v
             Saved Sessions
```

## Project Structure

```text
study-assistant/
│
├── public/
│
├── server/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env
│
├── src/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js and npm
- Google Gemini API key
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Myths-calm42/study-assistant.git

cd study-assistant
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Configure the Backend

Navigate to the server directory:

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
```

Replace `your_gemini_api_key` with your actual Google Gemini API key.

### 4. Start the Backend

From the `server` directory:

```bash
npm start
```

The backend will run at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

### 5. Configure the Frontend

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### 6. Start the Frontend

Open another terminal in the project root:

```bash
npm run dev
```

Open the application:

```text
http://localhost:5173
```

## API Endpoints

### Health Check

**GET** `/api/health`

Checks whether the backend service is running.

### Generate Study Material

**POST** `/api/generate`

Request body:

```json
{
  "topic": "Database Management System concepts...",
  "mode": "flashcards"
}
```

Supported modes:

- `flashcards`
- `quiz`

The backend sends the notes to Gemini and validates the returned JSON structure before sending the response to the frontend.

## AI Integration and Data Handling

StudyAI uses the Google Gemini API to generate educational content from user-provided notes.

The application follows a structured data-handling workflow:

1. Accepts free-form study notes from the user.
2. Validates the input using Zod.
3. Sends a structured prompt to Gemini.
4. Requests JSON-formatted output.
5. Parses the generated JSON response.
6. Validates the response against the expected schema.
7. Sends validated data to the React frontend.
8. Displays the generated content through interactive learning components.

The backend also includes retry handling for temporary Gemini service unavailability.

## Error Handling

The application handles several failure scenarios:

- Invalid or insufficient user input.
- Empty AI responses.
- Malformed JSON responses.
- Incorrect AI response structures.
- Invalid API credentials.
- Backend connection failures.
- Request timeouts and cancellations.
- Temporary Gemini service unavailability.

The frontend provides appropriate error messages and retry options where applicable.

## Saved Sessions and Storage

StudyAI uses browser localStorage to save generated study sets.

Users can:

- Automatically save generated study sessions.
- View previously saved sessions.
- Load an existing session.
- Delete saved sessions.

**Storage limitation:** Saved sessions are stored locally in the user's browser. They are not synchronized across devices or browsers and may be lost if browser storage is cleared.

## Deployment

The application uses separate hosting services for the frontend and backend.

| Component | Platform |
|---|---|
| React Frontend | Vercel |
| Express Backend | Render |
| AI Service | Google Gemini API |

**Live Application:** https://study-assistant-psi-ashen.vercel.app/

**Backend Health Check:** https://study-assistant-5f4a.onrender.com/api/health

The Gemini API key is stored as a backend environment variable and is not exposed through the frontend.

## Security Considerations

- API credentials are stored in backend environment variables.
- Environment files are excluded from Git using `.gitignore`.
- The frontend communicates with the backend through HTTP API requests.
- CORS is configured to allow the local development frontend and deployed application.
- User input and AI-generated responses are validated before processing.

## Limitations

- Saved sessions are browser-specific and do not support cloud synchronization.
- The application does not currently provide user authentication.
- AI-generated content may require verification for academic accuracy.
- The free Render instance may experience cold-start delays after periods of inactivity.
- Generation depends on Gemini API availability and applicable usage limits.

## Future Improvements

- User authentication and cloud-based session storage.
- Export flashcards and quizzes as PDF.
- Support for document and PDF uploads.
- Additional learning modes.
- AI-generated summaries and personalized revision plans.
- Progress tracking and learning analytics.

## AI Usage Note

Google Gemini API is used to generate structured flashcards and multiple-choice quizzes from user-provided study notes.

AI assistance was also used during development for implementation guidance, debugging, and improving error handling. The application logic, frontend integration, backend configuration, testing, and deployment were implemented and tested as part of this project.

## Author

**Vikrant Kumar**

M.Tech – Data Science and Engineering

National Institute of Technology Silchar

- GitHub: https://github.com/Myths-calm42
- LinkedIn: https://www.linkedin.com/in/vikrant-kumar11022003/

---

*Built to make learning more interactive, structured, and effective.*