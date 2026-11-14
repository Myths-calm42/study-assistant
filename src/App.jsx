
import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState('flashcards')
  const [activePage, setActivePage] = useState('dashboard')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Saved sessions are stored locally in this browser.
  const [savedSessions, setSavedSessions] = useState(() => {
    try {
      const stored = localStorage.getItem('studyAI_sessions_v1')
      const parsed = stored ? JSON.parse(stored) : []
      return Array.isArray(parsed) ? parsed.filter((session) =>
        session &&
        typeof session.id === 'string' &&
        typeof session.topic === 'string' &&
        ['flashcards', 'quiz'].includes(session.mode) &&
        session.data &&
        typeof session.data.title === 'string' &&
        Array.isArray(session.data.flashcards) &&
        Array.isArray(session.data.quiz)
      ) : []
    } catch {
      return []
    }
  })
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem('studyAI_sessions_v1', JSON.stringify(savedSessions))
      setStorageError('')
    } catch {
      setStorageError('Could not save sessions in this browser. Storage may be full or disabled.')
    }
  }, [savedSessions])

  // API states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [studyData, setStudyData] = useState(null)

  // Flashcard states
  const [currentCard, setCurrentCard] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  // Quiz states
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  // Retest states
  const [wrongQuestions, setWrongQuestions] = useState([])
  const [retestQuestions, setRetestQuestions] = useState([])
  const [remainingWrongQuestions, setRemainingWrongQuestions] = useState([])
  const [retestMode, setRetestMode] = useState(false)

  // Prevent older requests from replacing newer results
  const requestId = useRef(0)
  const controllerRef = useRef(null)

  // Derived study data
  const flashcards = studyData?.flashcards || []
  const quiz = studyData?.quiz || []
  const activeQuiz = retestMode ? retestQuestions : quiz

  const isQuizComplete =
    studyData && currentQuestion >= activeQuiz.length

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  // Generate study material
  const handleSubmit = async (e) => {
    e?.preventDefault()

    if (topic.trim().length < 10) {
      setError('Please enter at least 10 characters of study notes.')
      return
    }

    // Cancel any previous request
    controllerRef.current?.abort()

    const controller = new AbortController()
    controllerRef.current = controller

    const currentRequestId = ++requestId.current

    // 60-second request timeout
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 60000)

    setLoading(true)
    setError('')
    setStudyData(null)

    // Reset learning progress
    setCurrentCard(0)
    setShowAnswer(false)
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setAnswerSubmitted(false)
    setScore(0)
    setWrongQuestions([])
    setRetestQuestions([])
    setRemainingWrongQuestions([])
    setRetestMode(false)

    try {
      const response = await fetch(
        'http://localhost:5000/api/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            topic: topic.trim(),
            mode
          }),
          signal: controller.signal
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Failed to generate study material.'
        )
      }

      // Basic client-side response validation
      if (
        !result.data ||
        !Array.isArray(result.data.flashcards) ||
        !Array.isArray(result.data.quiz) ||
        typeof result.data.title !== 'string'
      ) {
        throw new Error(
          'The server returned an invalid study set.'
        )
      }

      // Ignore stale responses
      if (currentRequestId !== requestId.current) return

      setStudyData(result.data)

      const newSession = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        topic: topic.trim(),
        mode,
        data: result.data,
        createdAt: new Date().toISOString()
      }
      setSavedSessions((previous) => [newSession, ...previous])

    } catch (err) {
      if (currentRequestId !== requestId.current) return

      if (err.name === 'AbortError') {
        setError(
          'The request timed out or was cancelled. Please try again.'
        )
      } else {
        setError(
          err.message || 'Something went wrong. Please try again.'
        )
      }

    } finally {
      clearTimeout(timeoutId)

      if (currentRequestId === requestId.current) {
        setLoading(false)
      }
    }
  }

  // Open the saved sessions page.
  const openSavedSessions = () => {
    setActivePage('sessions')
    setIsMobileMenuOpen(false)
  }

  // Restore a previously saved study session.
  const loadSavedSession = (session) => {
    controllerRef.current?.abort()
    requestId.current += 1
    setLoading(false)
    setError('')
    setTopic(session.topic)
    setMode(session.mode)
    setStudyData(session.data)
    setActivePage(session.mode === 'quiz' ? 'quizzes' : 'flashcards')
    setIsMobileMenuOpen(false)

    // Start the restored session with fresh learning progress.
    setCurrentCard(0)
    setShowAnswer(false)
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setAnswerSubmitted(false)
    setScore(0)
    setWrongQuestions([])
    setRetestQuestions([])
    setRemainingWrongQuestions([])
    setRetestMode(false)
  }

  // Delete one saved session.
  const deleteSavedSession = (sessionId) => {
    setSavedSessions((previous) =>
      previous.filter((session) => session.id !== sessionId)
    )
  }

  // Sidebar navigation
  const openDashboard = () => {
    setActivePage('dashboard')
    setIsMobileMenuOpen(false)
  }

  const openFlashcards = () => {
    setActivePage('flashcards')
    setMode('flashcards')
    setShowAnswer(false)
    setIsMobileMenuOpen(false)
  }

  const openQuizzes = () => {
    setActivePage('quizzes')
    setMode('quiz')
    setIsMobileMenuOpen(false)
  }

  // Flashcard navigation
  const nextCard = () => {
    setShowAnswer(false)
    setCurrentCard((previous) => previous + 1)
  }

  const previousCard = () => {
    setShowAnswer(false)
    setCurrentCard((previous) => Math.max(0, previous - 1))
  }

  // Quiz answer handling
  const handleAnswer = (index) => {
    if (answerSubmitted) return
    setSelectedAnswer(index)
  }

  const submitAnswer = () => {
    if (selectedAnswer === null || answerSubmitted) return

    const question = activeQuiz[currentQuestion]

    if (selectedAnswer === question.correctAnswerIndex) {
      setScore((previous) => previous + 1)
    } else if (retestMode) {
      // Keep only questions answered incorrectly in this retest
      setRemainingWrongQuestions((previous) =>
        previous.includes(question) ? previous : [...previous, question]
      )
    } else {
      // Store questions answered incorrectly in the original quiz
      setWrongQuestions((previous) =>
        previous.includes(question) ? previous : [...previous, question]
      )
    }

    setAnswerSubmitted(true)
  }

  const nextQuestion = () => {
    setCurrentQuestion((previous) => previous + 1)
    setSelectedAnswer(null)
    setAnswerSubmitted(false)
  }

  // Start the first retest using questions missed in the original quiz
  const startRetest = () => {
    setRetestQuestions(wrongQuestions)
    setRemainingWrongQuestions([])
    setRetestMode(true)
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setAnswerSubmitted(false)
    setScore(0)
  }

  // Retest only the questions that were still answered incorrectly
  const retestRemaining = () => {
    setRetestQuestions(remainingWrongQuestions)
    setRemainingWrongQuestions([])
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setAnswerSubmitted(false)
    setScore(0)
  }

  // Restart the complete original quiz
  const restartQuiz = () => {
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setAnswerSubmitted(false)
    setScore(0)
    setWrongQuestions([])
    setRetestQuestions([])
    setRemainingWrongQuestions([])
    setRetestMode(false)
  }

  const pageTitle =
    activePage === 'dashboard'
      ? 'Study Dashboard'
      : activePage === 'flashcards'
        ? 'My Flashcards'
        : activePage === 'quizzes'
          ? 'My Quizzes'
          : 'Saved Sessions'

  return (
    <div className="app">

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>

        <h2 className="logo">
          StudyAI<span>.</span>
        </h2>

        <p className="menu-heading">MENU</p>

        <nav>

          <a
            href="#home"
            className={`nav-item ${
              activePage === 'dashboard' ? 'active' : ''
            }`}
            onClick={(e) => {
              e.preventDefault()
              openDashboard()
            }}
          >
            <span>⌂</span> Dashboard
          </a>

          <a
            href="#flashcards"
            className={`nav-item ${
              activePage === 'flashcards' ? 'active' : ''
            }`}
            onClick={(e) => {
              e.preventDefault()
              openFlashcards()
            }}
          >
            <span>▤</span> Flashcards
          </a>

          <a
            href="#quiz"
            className={`nav-item ${
              activePage === 'quizzes' ? 'active' : ''
            }`}
            onClick={(e) => {
              e.preventDefault()
              openQuizzes()
            }}
          >
            <span>◎</span> Quizzes
          </a>

          <a
            href="#saved-sessions"
            className={`nav-item ${activePage === 'sessions' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              openSavedSessions()
            }}
          >
            <span>◷</span> Saved Sessions
          </a>

        </nav>

        <div className="sidebar-bottom">
          <p>AI Powered Learning</p>
          <small>Learn smarter, not harder.</small>
        </div>

      </aside>

      {/* Main Content */}
      <main className="main-content">

        {/* Header */}
        <header className="topbar">

          <div>
            <p className="welcome">
              YOUR PERSONAL LEARNING SPACE
            </p>

            <h1>{pageTitle}</h1>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setIsMobileMenuOpen((previous) => !previous)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>

            <div className="profile">S</div>
          </div>

        </header>

        {/* Dashboard Content */}
        {activePage === 'dashboard' && (
          <>

            {/* Hero Section */}
            <section className="hero-section">

              <h2>What do you want to learn today?</h2>

              <p>
                Turn your notes and topics into interactive
                flashcards and quizzes using AI.
              </p>

            </section>

            {/* Topic Input */}
            <section className="input-section">

              <form onSubmit={handleSubmit}>

                <label htmlFor="topic">
                  Enter your topic or paste your study notes
                </label>

                <textarea
                  id="topic"
                  placeholder="Example: Explain Machine Learning, its types, algorithms and applications..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows="5"
                  maxLength={10000}
                />

                <div className="input-footer">

                  <span>
                    {topic.length} / 10000 characters
                  </span>

                  <button
                    type="submit"
                    disabled={loading || topic.trim().length < 10}
                  >
                    {loading
                      ? 'Generating...'
                      : 'Generate Study Set →'}
                  </button>

                </div>

              </form>

            </section>

            {storageError && (
              <p className="storage-warning" role="alert">{storageError}</p>
            )}

            {/* Learning Mode */}
            <section className="mode-section">

              <h3>Choose your learning mode</h3>

              <div className="mode-grid">

                <button
                  className={`mode-card ${
                    mode === 'flashcards' ? 'selected' : ''
                  }`}
                  onClick={() => setMode('flashcards')}
                  type="button"
                >
                  <span className="mode-icon">▤</span>
                  <h3>Flashcards</h3>
                  <p>Learn through questions and answers.</p>
                </button>

                <button
                  className={`mode-card ${
                    mode === 'quiz' ? 'selected' : ''
                  }`}
                  onClick={() => setMode('quiz')}
                  type="button"
                >
                  <span className="mode-icon">✎</span>
                  <h3>Quiz</h3>
                  <p>Test your knowledge with questions.</p>
                </button>

              </div>

            </section>

          </>
        )}

        {/* Results Area */}
        <section className="results-section" id="home">

          <h3>
            {activePage === 'dashboard'
              ? 'Your Study Session'
              : activePage === 'flashcards'
                ? 'Your Flashcards'
                : activePage === 'quizzes'
                  ? 'Your Quiz'
                  : 'Saved Study Sessions'}
          </h3>

          {/* Saved Sessions */}
          {activePage === 'sessions' && (
            <div className="saved-sessions">
              {storageError && (
                <p className="storage-warning" role="alert">{storageError}</p>
              )}

              {savedSessions.length === 0 ? (
                <div className="empty-state">
                  <span>◷</span>
                  <h3>No saved sessions yet</h3>
                  <p>Generate a study set and it will automatically appear here.</p>
                  <button type="button" onClick={openDashboard}>
                    Create a Study Set
                  </button>
                </div>
              ) : (
                <div className="saved-session-list">
                  {savedSessions.map((session) => (
                    <article className="saved-session-card" key={session.id}>
                      <div className="saved-session-info">
                        <span className="saved-session-mode">
                          {session.mode === 'quiz' ? 'QUIZ' : 'FLASHCARDS'}
                        </span>
                        <h3>{session.data.title}</h3>
                        <p className="saved-session-topic">{session.topic}</p>
                        <small>
                          Saved {new Date(session.createdAt).toLocaleString()}
                        </small>
                      </div>
                      <div className="saved-session-actions">
                        <button
                          type="button"
                          onClick={() => loadSavedSession(session)}
                        >
                          Load Session
                        </button>
                        <button
                          type="button"
                          className="delete-session-button"
                          onClick={() => deleteSavedSession(session.id)}
                          aria-label={`Delete ${session.data.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-state">
              <h3>Generating your study material...</h3>
              <p>AI is analyzing your notes. Please wait.</p>
            </div>
          )}

          {/* Error */}
          {activePage !== 'sessions' && !loading && error && (
            <div className="error-state" role="alert">

              <h3>Generation failed</h3>

              <p>{error}</p>

              <button
                onClick={handleSubmit}
                type="button"
              >
                Try Again
              </button>

            </div>
          )}

          {/* Empty State */}
          {activePage !== 'sessions' && !loading && !error && !studyData && (
            <div className="empty-state">

              <span>✧</span>

              <h3>
                {activePage === 'dashboard'
                  ? 'Your learning journey starts here'
                  : 'No study material available yet'}
              </h3>

              <p>
                {activePage === 'dashboard'
                  ? 'Enter a topic above to prepare your first AI-powered study session.'
                  : 'Please generate a study set from the Dashboard first.'}
              </p>

              {activePage !== 'dashboard' && (
                <button
                  type="button"
                  onClick={openDashboard}
                >
                  Go to Dashboard
                </button>
              )}

            </div>
          )}

          {/* Generated Study Material */}
          {activePage !== 'sessions' && !loading && !error && studyData && (
            <div className="study-results">

              <h2>{studyData.title}</h2>

              <p>
                {mode === 'flashcards'
                  ? `${flashcards.length} flashcards generated`
                  : `${quiz.length} quiz questions generated`}
              </p>

              {/* Flashcards */}
              {activePage !== 'quizzes' && mode === 'flashcards' && (
                <div className="flashcard-area" id="flashcards">

                  {flashcards.length === 0 ? (
                    <p>No flashcards were generated.</p>
                  ) : (
                    <>

                      <p>
                        Card {currentCard + 1} of {flashcards.length}
                      </p>

                      <div
                        className="flashcard"
                        onClick={() =>
                          setShowAnswer((previous) => !previous)
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (
                            e.key === 'Enter' ||
                            e.key === ' '
                          ) {
                            e.preventDefault()
                            setShowAnswer((previous) => !previous)
                          }
                        }}
                      >

                        <small>
                          {showAnswer ? 'ANSWER' : 'QUESTION'}
                        </small>

                        <h3>
                          {showAnswer
                            ? flashcards[currentCard].answer
                            : flashcards[currentCard].question}
                        </h3>

                        <p>Click the card to flip</p>

                      </div>

                      <div className="study-controls">

                        <button
                          type="button"
                          onClick={previousCard}
                          disabled={currentCard === 0}
                        >
                          ← Previous
                        </button>

                        <button
                          type="button"
                          onClick={nextCard}
                          disabled={
                            currentCard === flashcards.length - 1
                          }
                        >
                          Next →
                        </button>

                      </div>

                    </>
                  )}

                </div>
              )}

              {/* Quiz */}
              {activePage !== 'flashcards' && mode === 'quiz' && (
                <div className="quiz-area" id="quiz">

                  {activeQuiz.length === 0 ? (
                    <p>No quiz questions were generated.</p>
                  ) : isQuizComplete ? (

                    <div className="quiz-complete">

                      {(!retestMode && wrongQuestions.length === 0) ||
                      (retestMode && remainingWrongQuestions.length === 0) ? (
                        <>
                          <h3>Congratulations! 🎉</h3>
                          <h2>
                            Your score: {score} / {activeQuiz.length}
                          </h2>
                          <p>
                            {retestMode
                              ? 'Excellent work! You answered all the previously incorrect questions correctly.'
                              : 'Excellent! You answered every question correctly.'}
                          </p>
                        </>
                      ) : (
                        <>
                          <h3>{retestMode ? 'Retest completed!' : 'Quiz completed!'}</h3>
                          <h2>
                            Your score: {score} / {activeQuiz.length}
                          </h2>
                          <p>
                            {retestMode
                              ? `${remainingWrongQuestions.length} question(s) still need practice.`
                              : `You have ${wrongQuestions.length} incorrect question(s). Practise them again to improve your score.`}
                          </p>
                        </>
                      )}

                      <div className="quiz-actions">

                        {!retestMode && wrongQuestions.length > 0 && (
                          <button type="button" onClick={startRetest}>
                            Retest Wrong Answers ({wrongQuestions.length})
                          </button>
                        )}

                        {retestMode && remainingWrongQuestions.length > 0 && (
                          <button type="button" onClick={retestRemaining}>
                            Retest Remaining ({remainingWrongQuestions.length})
                          </button>
                        )}

                        <button type="button" onClick={restartQuiz}>
                          Restart Full Quiz
                        </button>

                        <button type="button" onClick={openDashboard}>
                          Dashboard
                        </button>

                      </div>

                    </div>

                  ) : (

                    <>

                      <p>
                        {retestMode ? 'Retest: ' : ''}
                        Question {currentQuestion + 1} of {activeQuiz.length}
                      </p>

                      <h3>
                        {activeQuiz[currentQuestion].question}
                      </h3>

                      <div className="quiz-options">

                        {activeQuiz[currentQuestion].options.map(
                          (option, index) => {

                            const isCorrect =
                              index ===
                              activeQuiz[currentQuestion].correctAnswerIndex

                            const isSelected =
                              selectedAnswer === index

                            let optionClass = ''

                            if (answerSubmitted && isCorrect) {
                              optionClass = 'correct'
                            } else if (answerSubmitted && isSelected) {
                              optionClass = 'incorrect'
                            } else if (isSelected) {
                              optionClass = 'selected'
                            }

                            return (
                              <button
                                key={index}
                                type="button"
                                className={`quiz-option ${optionClass}`}
                                onClick={() => handleAnswer(index)}
                                disabled={answerSubmitted}
                              >
                                {option}
                              </button>
                            )
                          }
                        )}

                      </div>

                      {/* Answer Explanation */}
                      {answerSubmitted && (
                        <div className="quiz-explanation">

                          <strong>
                            {selectedAnswer ===
                            activeQuiz[currentQuestion].correctAnswerIndex
                              ? 'Correct answer!'
                              : 'Incorrect answer.'}
                          </strong>

                          <p>
                            {activeQuiz[currentQuestion].explanation}
                          </p>

                        </div>
                      )}

                      {/* Quiz Controls */}
                      {!answerSubmitted ? (

                        <button
                          type="button"
                          onClick={submitAnswer}
                          disabled={selectedAnswer === null}
                        >
                          Submit Answer
                        </button>

                      ) : (

                        <button
                          type="button"
                          onClick={nextQuestion}
                        >
                          {currentQuestion === activeQuiz.length - 1
                            ? 'See Results'
                            : 'Next Question →'}
                        </button>

                      )}

                    </>
                  )}

                </div>
              )}

            </div>
          )}

        </section>

      </main>

    </div>
  )
}

export default App
