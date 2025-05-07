import { BaseModule } from './base-module.js';

export class Quiz extends BaseModule {
    constructor(app) {
        super(app);
        this.state = {
            initialized: false,
            currentQuestion: null,
            questions: [],
            score: 0,
            totalQuestions: 0,
            questionCount: 10,
            timeLeft: 60,
            timer: null,
            category: 'numbers',
            difficulty: 'easy',
            isRunning: false,
            hasStarted: false,
            isPaused: false,
            currentQuestionIndex: 0,
            userAnswers: [],
            streak: 0,
            maxStreak: 0,
            errors: [],
            showErrors: false,
            isTyping: false,
            hintUsed: false
        };

        // Initialize difficulty levels
        this.difficultyLevels = {
            easy: { display: 'Easy', multiplier: 1 },
            medium: { display: 'Medium', multiplier: 1.5 },
            hard: { display: 'Hard', multiplier: 2 }
        };

        // Initialize categories
        this.categories = {
            numbers: { display: 'Numbers' },
            animals: { display: 'Animals' },
            food: { display: 'Food' },
            colors: { display: 'Colors' },
            phrases: { display: 'Phrases' }
        };
    }

    initialize() {
        super.initialize();
        this.setupUI();
        this.loadQuestions();
    }

    loadQuestions() {
        const wordBank = this.app.modules.wordBank;
        if (!wordBank) {
            console.error('Word bank not initialized');
            return;
        }

        this.state.questions = wordBank.data[this.state.category] || [];
        this.state.totalQuestions = this.state.questions.length;
        this.shuffleQuestions();
    }

    shuffleQuestions() {
        if (!this.state.questions) return;

        this.state.questions = this.state.questions
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);
    }

    setupUI() {
        const quizContainer = document.getElementById('quiz-container');
        if (!quizContainer) {
            console.error('Quiz container not found');
            return;
        }

        quizContainer.innerHTML = this.generateQuizControls();
        this.setupEventListeners();
    }

    generateQuizControls() {
        return `
            <div class="quiz-controls">
                <div class="category-select">
                    <label for="category">Category:</label>
                    <select id="category" class="category-select">
                        ${Object.entries(this.categories).map(([key, value]) =>
                            `<option value="${key}" ${key === this.state.category ? 'selected' : ''}>${value.display}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="difficulty-select">
                    <label for="difficulty">Difficulty:</label>
                    <select id="difficulty" class="difficulty-select">
                        ${Object.entries(this.difficultyLevels).map(([key, value]) =>
                            `<option value="${key}" ${key === this.state.difficulty ? 'selected' : ''}>${value.display}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="question-count-select">
                    <label for="question-count">Questions:</label>
                    <select id="question-count" class="question-count-select">
                        <option value="5" ${this.state.questionCount === 5 ? 'selected' : ''}>5 Questions</option>
                        <option value="10" ${this.state.questionCount === 10 ? 'selected' : ''}>10 Questions</option>
                        <option value="15" ${this.state.questionCount === 15 ? 'selected' : ''}>15 Questions</option>
                    </select>
                </div>

                <button class="start-quiz" data-type="typing">
                    <span class="icon">📝</span>
                    Typing
                </button>
                <button class="start-quiz" data-type="multiple-choice">
                    <span class="icon">📊</span>
                    Multiple Choice
                </button>
                <button class="start-quiz" data-type="matching">
                    <span class="icon">🔄</span>
                    Matching
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        // Category selection
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.state.category = e.target.value;
                this.loadQuestions();
                this.updateUI();
            });
        }

        // Difficulty selection
        const difficultySelect = document.getElementById('difficulty');
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                this.state.difficulty = e.target.value;
                this.loadQuestions();
                this.updateUI();
            });
        }

        // Question count selection
        const questionCountSelect = document.getElementById('question-count');
        if (questionCountSelect) {
            questionCountSelect.addEventListener('change', (e) => {
                this.state.questionCount = parseInt(e.target.value);
                this.updateUI();
            });
        }

        // Start quiz buttons
        document.querySelectorAll('.start-quiz').forEach(button => {
            button.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.startQuiz(type);
            });
        });
    }

    startQuiz(type) {
        if (this.state.isRunning) {
            return;
        }

        this.state.hasStarted = true;
        this.state.isRunning = true;
        this.state.currentQuestionIndex = 0;
        this.state.score = 0;
        this.state.timeLeft = 60;
        this.state.userAnswers = [];
        this.state.type = type;

        this.startTimer();
        this.showQuestion(type);
    }

    showQuestion(type) {
        const question = this.state.questions[this.state.currentQuestionIndex];
        if (!question) {
            this.endQuiz();
            return;
        }

        this.state.currentQuestion = question;

        const quizContainer = document.getElementById('quiz-container');
        if (!quizContainer) {
            console.error('Quiz container not found');
            return;
        }

        quizContainer.innerHTML = this.generateQuestion(type);
        this.updateProgressBar();
        this.updateUI();
    }

    generateQuestion(type) {
        const question = this.state.currentQuestion;
        const prompt = this.getQuestionPrompt();

        if (type === 'multiple-choice') {
            const options = this.generateMultipleChoiceOptions(question);
            return `
                <div class="question-container">
                    <div class="question-header">
                        <h2>Question ${this.state.currentQuestionIndex + 1}/${this.state.totalQuestions}</h2>
                        ${this.generateHeader()}
                    </div>
                    <div class="question-content">
                        <div class="question-prompt">
                            ${prompt}
                        </div>
                        <div class="options-container">
                            ${options}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Default to typing question
            return `
                <div class="question-container">
                    <div class="question-header">
                        <h2>Question ${this.state.currentQuestionIndex + 1}/${this.state.totalQuestions}</h2>
                        ${this.generateHeader()}
                    </div>
                    <div class="question-content">
                        <div class="question-prompt">
                            ${prompt}
                        </div>
                        <div class="typing-input">
                            <input type="text" id="answer-input" placeholder="Type your answer...">
                            <button class="submit-answer">Submit</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    generateHeader() {
        return `
            <div class="timer">Time: ${this.state.timeLeft}s</div>
            <div class="score">Score: ${this.state.score}/${this.state.totalQuestions}</div>
            <div class="streak">Streak: ${this.state.streak}</div>
            <div id="progress-bar-container">
                <div id="progress-bar"></div>
                <div id="progress-text">${this.state.currentQuestionIndex + 1}/${this.state.totalQuestions}</div>
            </div>
        `;
    }

    getQuestionPrompt() {
        const question = this.state.currentQuestion;
        if (!question) return '';

        const difficulty = this.difficultyLevels[this.state.difficulty];

        if (difficulty.multiplier === 1) {
            return `
                <div class="kanji">${question.word}</div>
                <div class="reading">${question.reading}</div>
            `;
        } else if (difficulty.multiplier === 1.5) {
            return `
                <div class="kanji">${question.word}</div>
            `;
        } else {
            return `
                <div class="meaning">${question.meaning}</div>
            `;
        }
    }

    generateMultipleChoiceOptions(question) {
        const options = [];
        const randomWords = this.shuffleQuestions(this.state.questions, 3);

        options.push(question);
        randomWords.forEach(randomWord => {
            if (!options.includes(randomWord)) {
                options.push(randomWord);
            }
        });

        return options
            .map(word => `
                <button class="answer-option" data-answer="${word.reading}">
                    ${word.reading}
                </button>
            `)
            .join('');
    }

    setupAnswerEventListeners(type) {
        if (type === 'multiple-choice') {
            document.querySelectorAll('.answer-option').forEach(button => {
                button.addEventListener('click', (e) => {
                    this.checkAnswer(e.target.dataset.answer);
                });
            });
        } else if (type === 'typing') {
            const input = document.getElementById('answer-input');
            const submitButton = document.querySelector('.submit-answer');

            if (input && submitButton) {
                submitButton.addEventListener('click', () => {
                    this.checkAnswer(input.value);
                    input.value = '';
                });

                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.checkAnswer(input.value);
                        input.value = '';
                    }
                });
            }
        }
    }

    checkAnswer(userAnswer) {
        const correctAnswer = this.state.currentQuestion.reading.toLowerCase();
        const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer;

        if (isCorrect) {
            this.state.score++;
            this.state.streak++;
            this.state.maxStreak = Math.max(this.state.maxStreak, this.state.streak);
        } else {
            this.state.streak = 0;
            this.state.errors.push({
                question: this.state.currentQuestion,
                userAnswer: userAnswer,
                correctAnswer: correctAnswer
            });
        }

        this.state.userAnswers.push({
            question: this.state.currentQuestion,
            userAnswer: userAnswer,
            isCorrect: isCorrect
        });

        this.state.currentQuestionIndex++;

        if (this.state.currentQuestionIndex < this.state.totalQuestions && this.state.currentQuestionIndex < this.state.questionCount) {
            this.showQuestion(this.state.type);
        } else {
            this.endQuiz();
        }
    }

    startTimer() {
        if (this.state.timer) clearInterval(this.state.timer);

        this.state.timeLeft = 60;
        this.updateTimerDisplay();

        this.state.timer = setInterval(() => {
            if (this.state.timeLeft <= 0) {
                clearInterval(this.state.timer);
                this.endQuiz();
                return;
            }
            this.state.timeLeft--;
            this.updateTimerDisplay();
        }, 1000);
    }

    updateTimerDisplay() {
        const timerElements = document.querySelectorAll('.timer');
        timerElements.forEach(el => {
            el.textContent = `Time: ${this.state.timeLeft}s`;
        });
    }

    updateProgressBar() {
        const progress = ((this.state.currentQuestionIndex) / Math.min(this.state.totalQuestions, this.state.questionCount)) * 100;
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${this.state.currentQuestionIndex + 1}/${Math.min(this.state.totalQuestions, this.state.questionCount)}`;
        }
    }

    updateUI() {
        this.loadQuestions();
        this.updateProgressBar();
        const currentScore = document.getElementById('current-score');
        const totalScore = document.getElementById('total-score');
        const currentStreak = document.getElementById('current-streak');
        const maxStreak = document.getElementById('max-streak');

        if(currentScore) currentScore.textContent = this.state.score;
        if(totalScore) totalScore.textContent = Math.min(this.state.totalQuestions, this.state.questionCount);
        if(currentStreak) currentStreak.textContent = this.state.streak;
        if(maxStreak) maxStreak.textContent = this.state.maxStreak;
    }

    endQuiz() {
        if (this.state.timer) clearInterval(this.state.timer);
        this.state.isRunning = false;

        const quizContainer = document.getElementById('quiz-container');
        if (quizContainer) {
            const questionsCount = Math.min(this.state.totalQuestions, this.state.questionCount);
            const percentage = ((this.state.score / questionsCount) * 100).toFixed(1);
            const timeTaken = 60 - this.state.timeLeft;

            quizContainer.innerHTML = `
                <div class="quiz-results">
                    <h2>Quiz Complete!</h2>
                    <div class="results-stats">
                        <p>Score: ${this.state.score}/${questionsCount} (${percentage}%)</p>
                        <p>Category: ${this.categories[this.state.category].display}</p>
                        <p>Difficulty: ${this.difficultyLevels[this.state.difficulty].display}</p>
                        <p>Time: ${timeTaken}s</p>
                        <p>Max Streak: ${this.state.maxStreak}</p>
                    </div>
                    <div class="review-section">
                        <h3>Review Incorrect Answers</h3>
                        <div class="errors-list">
                            ${
                                this.state.errors.length ? 
                                this.state.errors.map(error => `
                                    <div class="error-item">
                                        <div class="question">${error.question.word}</div>
                                        <div class="user-answer">Your Answer: ${error.userAnswer}</div>
                                        <div class="correct-answer">Correct: ${error.correctAnswer}</div>
                                    </div>
                                `).join('') :
                                '<p>No errors to review!</p>'
                            }
                        </div>
                    </div>
                    <button class="retry-quiz">Retry Quiz</button>
                </div>
            `;

            const retryButton = quizContainer.querySelector('.retry-quiz');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    this.state.isRunning = false;
                    this.setupUI();
                });
            }
        }
    }

    showErrors() {
        const errors = this.state.errors;
        if (errors.length === 0) {
            this.app.modules.utils.showNotification('No errors to review!', 'success');
            return;
        }

        const errorModal = document.createElement('div');
        errorModal.className = 'error-modal';
        errorModal.innerHTML = `
            <div class="modal-content">
                <h3>Review Your Errors</h3>
                <div class="errors-list">
                    ${errors.map(error => `
                        <div class="error-item">
                            <p>Question: ${error.question.word}</p>
                            <p>Your Answer: ${error.userAnswer}</p>
                            <p>Correct Answer: ${error.correctAnswer}</p>
                        </div>
                    `).join('')}
                </div>
                <button class="close-btn">Close</button>
            </div>
        `;

        document.body.appendChild(errorModal);

        errorModal.querySelector('.close-btn').addEventListener('click', () => {
            errorModal.remove();
        });
    }
}

export default Quiz;
