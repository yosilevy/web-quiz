const DEFAULT_QUIZ_URL = "./data/default-quiz-he.json";

const screens = {
  load: document.getElementById("screenLoad"),
  preWelcome: document.getElementById("screenPreWelcome"),
  quiz: document.getElementById("screenQuiz"),
  summary: document.getElementById("screenSummary")
};

const topControls = document.getElementById("topControls");
const scoreChip = document.getElementById("scoreChip");
const loadError = document.getElementById("loadError");
const quizNameBanner = document.getElementById("quizNameBanner");
const questionTitle = document.getElementById("questionTitle");
const questionImageWrap = document.getElementById("questionImageWrap");
const questionImage = document.getElementById("questionImage");
const answersGrid = document.getElementById("answersGrid");
const summaryText = document.getElementById("summaryText");

const btnLoadFile = document.getElementById("btnLoadFile");
const btnUseDefault = document.getElementById("btnUseDefault");
const fileInput = document.getElementById("fileInput");
const btnStartQuiz = document.getElementById("btnStartQuiz");
const btnQuickRestart = document.getElementById("btnQuickRestart");
const linkBackToLoad = document.getElementById("linkBackToLoad");
const linkRestart = document.getElementById("linkRestart");
const linkReload = document.getElementById("linkReload");

let activeQuiz = null;
let currentQuestionIndex = 0;
let score = 0;
let correctAnswers = 0;
let answerLocked = false;
let wrongFeedbackTimer = null;
let wrongFeedbackButton = null;
let wrongFeedbackText = "";

function setTopControlsVisible(isVisible) {
  topControls.hidden = !isVisible;
}

function clearWrongFeedback() {
  if (wrongFeedbackTimer) {
    clearTimeout(wrongFeedbackTimer);
    wrongFeedbackTimer = null;
  }

  if (wrongFeedbackButton) {
    wrongFeedbackButton.classList.remove("is-wrong");
    wrongFeedbackButton.textContent = wrongFeedbackText;
    wrongFeedbackButton = null;
    wrongFeedbackText = "";
  }
}

function showScreen(screenKey) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[screenKey].classList.add("active");
}

function updateScoreChip() {
  scoreChip.textContent = `ניקוד: ${score}`;
}

function resetProgress() {
  clearWrongFeedback();
  currentQuestionIndex = 0;
  score = 0;
  correctAnswers = 0;
  updateScoreChip();
}

function showError(message) {
  loadError.hidden = false;
  loadError.textContent = message;
}

function clearError() {
  loadError.hidden = true;
  loadError.textContent = "";
}

function validateQuizData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("מבנה JSON לא תקין.");
  }

  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("חסר שדה title תקין.");
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error("חייב להיות מערך questions עם לפחות שאלה אחת.");
  }

  data.questions.forEach((q, index) => {
    const prefix = `בשאלה ${index + 1}`;
    if (typeof q.question !== "string" || !q.question.trim()) {
      throw new Error(`${prefix} חסר טקסט שאלה.`);
    }
    if (!Array.isArray(q.answers) || q.answers.length < 2) {
      throw new Error(`${prefix} חייבות להיות לפחות 2 תשובות.`);
    }
    if (
      typeof q.correctIndex !== "number" ||
      !Number.isInteger(q.correctIndex) ||
      q.correctIndex < 0 ||
      q.correctIndex >= q.answers.length
    ) {
      throw new Error(`${prefix} ערך correctIndex לא תקין.`);
    }

    if (q.image !== undefined && (typeof q.image !== "string" || !q.image.trim())) {
      throw new Error(`${prefix} השדה image חייב להיות מחרוזת עם שם/נתיב תמונה.`);
    }
  });
}

function setQuestionImage(imagePath, questionText) {
  if (typeof imagePath === "string" && imagePath.trim()) {
    let resolvedPath = imagePath.trim();
    // Convert Windows absolute path (C:\\...) to a file URL.
    if (/^[a-zA-Z]:\\/.test(resolvedPath)) {
      resolvedPath = `file:///${resolvedPath.replace(/\\/g, "/")}`;
    }

    questionImage.src = resolvedPath;
    questionImage.alt = `תמונה לשאלה: ${questionText}`;
    questionImageWrap.hidden = false;
    return;
  }

  questionImage.removeAttribute("src");
  questionImage.alt = "תמונת שאלה";
  questionImageWrap.hidden = true;
}

function beginPreWelcome(quizData) {
  validateQuizData(quizData);
  activeQuiz = quizData;
  resetProgress();
  setTopControlsVisible(true);
  quizNameBanner.textContent = quizData.title;
  showScreen("preWelcome");
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function handleAnswerClick(button, isCorrect) {
  if (answerLocked) {
    return;
  }

  if (wrongFeedbackTimer) {
    clearWrongFeedback();
  }

  if (isCorrect) {
    answerLocked = true;
    button.classList.add("is-correct");
    button.textContent = "V";
    setTimeout(() => {
      score += 2;
      correctAnswers += 1;
      updateScoreChip();
      currentQuestionIndex += 1;

      if (currentQuestionIndex >= activeQuiz.questions.length) {
        showSummary();
      } else {
        renderQuestion();
      }

      answerLocked = false;
    }, 1000);
  } else {
    wrongFeedbackButton = button;
    wrongFeedbackText = button.textContent;
    button.classList.add("is-wrong");
    button.textContent = "X";
    wrongFeedbackTimer = setTimeout(() => {
      clearWrongFeedback();
    }, 2000);
  }
}

function renderQuestion() {
  const question = activeQuiz.questions[currentQuestionIndex];
  questionTitle.textContent = question.question;
  setQuestionImage(question.image, question.question);
  answersGrid.innerHTML = "";

  const answersWithMeta = question.answers.map((answerText, index) => ({
    text: answerText,
    correct: index === question.correctIndex
  }));

  const mixedAnswers = shuffled(answersWithMeta);
  const variants = shuffled(["1", "2", "3", "4", "5", "6"]);

  mixedAnswers.forEach((answer, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-btn";
    btn.dataset.variant = variants[idx % variants.length];
    btn.textContent = answer.text;
    btn.addEventListener("click", () => {
      handleAnswerClick(btn, answer.correct);
    });
    answersGrid.appendChild(btn);
  });
}

function showSummary() {
  const total = activeQuiz.questions.length;
  summaryText.textContent = `ענית נכון על ${correctAnswers} מתוך ${total}. כל הכבוד.`;
  showScreen("summary");
}

function startQuiz() {
  if (!activeQuiz) {
    showError("אין חידון פעיל כרגע.");
    return;
  }
  answerLocked = false;
  showScreen("quiz");
  renderQuestion();
}

async function loadDefaultQuiz() {
  const response = await fetch(DEFAULT_QUIZ_URL);
  if (!response.ok) {
    throw new Error("לא ניתן לטעון את חידון ברירת המחדל.");
  }
  return response.json();
}

btnLoadFile.addEventListener("click", () => {
  clearError();
  fileInput.click();
});

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  clearError();
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    beginPreWelcome(parsed);
  } catch (error) {
    showError(`שגיאה בטעינת הקובץ: ${error.message}`);
  } finally {
    fileInput.value = "";
  }
});

btnUseDefault.addEventListener("click", async () => {
  clearError();
  try {
    const data = await loadDefaultQuiz();
    beginPreWelcome(data);
  } catch (error) {
    showError(error.message);
  }
});

btnStartQuiz.addEventListener("click", () => {
  clearError();
  startQuiz();
});

linkBackToLoad.addEventListener("click", (event) => {
  event.preventDefault();
  activeQuiz = null;
  resetProgress();
  setTopControlsVisible(false);
  clearError();
  showScreen("load");
});

linkRestart.addEventListener("click", (event) => {
  event.preventDefault();
  resetProgress();
  startQuiz();
});

linkReload.addEventListener("click", (event) => {
  event.preventDefault();
  activeQuiz = null;
  resetProgress();
  setTopControlsVisible(false);
  clearError();
  showScreen("load");
});

btnQuickRestart.addEventListener("click", () => {
  if (!activeQuiz) {
    return;
  }
  clearError();
  resetProgress();
  startQuiz();
});

window.addEventListener("DOMContentLoaded", async () => {
  showScreen("load");
  setTopControlsVisible(false);
  questionImageWrap.hidden = true;
  questionImage.addEventListener("error", () => {
    questionImageWrap.hidden = true;
  });
  updateScoreChip();

  try {
    await loadDefaultQuiz();
  } catch (error) {
    showError("חידון ברירת המחדל לא נמצא. אפשר עדיין לטעון קובץ ידנית.");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Service worker registration failure is non-critical for quiz behavior.
    });
  }
});
