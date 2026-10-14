// ==========================================================================
// CONFIGURATION & CONSTANTS
// ==========================================================================
const API_BASE = "https://mental-wellbeing-score.onrender.com";
const PREDICT_URL = `${API_BASE}/predict`;

// Circle circumference for r=92 (matches CSS)
// Circumference = 2 * PI * r = 2 * 3.14159 * 92 = 578.05
const GAUGE_CIRCUMFERENCE = 578.05;

// Expected ML output range (assumed 0-10)
const SCORE_MIN = 0;
const SCORE_MAX = 10;

// Slider fields config for decimals rendering
const SLIDER_FIELDS = [
  { id: "age", decimals: 0 },
  { id: "avg_daily_usage_hours", decimals: 1 },
  { id: "study_hours", decimals: 1 },
  { id: "physical_activity_hours", decimals: 1 },
  { id: "sleep_hours_per_night", decimals: 1 }
];

// Friendly names for form elements (used for mapping server response errors)
const FIELD_LABELS = {
  age: "Age",
  gender: "Gender",
  country: "Country",
  academic_level: "Academic level",
  most_used_platform: "Platform",
  purpose_of_use: "Reason for use",
  avg_daily_usage_hours: "Daily usage hours",
  daily_unlocks: "Phone unlocks",
  study_hours: "Study hours",
  physical_activity_hours: "Activity hours",
  sleep_hours_per_night: "Sleep hours",
  stress_level: "Stress level"
};

// State variables
let lastPredictedScore = null;
let lowerIsGood = true; // Default interpretation toggle state

// ==========================================================================
// DOM ELEMENT REFERENCES
// ==========================================================================
const form = document.getElementById("predict-form");
const errorBanner = document.getElementById("error-banner");
const errorTitle = document.getElementById("error-title");
const errorMessage = document.getElementById("error-message");
const troubleshootingChecklist = document.getElementById("troubleshooting-checklist");

const submitBtnDesktop = document.getElementById("submit-btn-desktop");
const submitBtnMobile = document.getElementById("submit-btn-mobile");
const resetButton = document.getElementById("reset-button");

const resultScoreVal = document.getElementById("result-score-val");
const resultBadge = document.getElementById("result-badge");
const resultSummary = document.getElementById("result-summary");
const gaugeCircle = document.getElementById("gauge-progress-circle");
const directionToggle = document.getElementById("direction-toggle");
const directionLabel = document.getElementById("direction-label");

// ==========================================================================
// FORM SYNC & SLIDER DECORATIONS
// ==========================================================================
function updateSliderProgress(input, decimals, outputEl) {
  const val = parseFloat(input.value);
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  const pct = ((val - min) / (max - min)) * 100;
  
  // Set inline property for CSS gradient styling
  input.style.setProperty("--range-pct", `${pct}%`);
  
  if (outputEl) {
    outputEl.textContent = val.toFixed(decimals) + (decimals > 0 && input.id !== "age" ? "h" : "");
  }
}

// Initialize all slider track fills and readout updates
SLIDER_FIELDS.forEach(({ id, decimals }) => {
  const input = document.getElementById(id);
  const output = document.getElementById(`${id}-out`);
  if (!input) return;

  const update = () => updateSliderProgress(input, decimals, output);
  input.addEventListener("input", update);
  update(); // Initial load styling
});

// Format Country Name (Title Case) when user finishes typing
const countryInput = document.getElementById("country");
if (countryInput) {
  countryInput.addEventListener("blur", () => {
    let val = countryInput.value.trim();
    if (val) {
      // Capitalize first letter of each word to match standard datalist / top_countries casing
      countryInput.value = val
        .toLowerCase()
        .replace(/\b[a-z]/g, (char) => char.toUpperCase());
    }
  });
}

// ==========================================================================
// CLIENT-SIDE VALIDATION
// ==========================================================================
function clearFieldError(fieldId) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  const fieldContainer = errorEl ? errorEl.closest(".field") : null;
  
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.remove("is-visible");
  }
  if (fieldContainer) {
    fieldContainer.classList.remove("has-error");
  }
}

// Focus failed field cleanly
function setFieldError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  const fieldContainer = errorEl ? errorEl.closest(".field") : null;
  
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add("is-visible");
  }
  if (fieldContainer) {
    fieldContainer.classList.add("has-error");
  }
}

function clearAllErrors() {
  errorBanner.hidden = true;
  troubleshootingChecklist.hidden = true;
  document.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
    el.classList.remove("is-visible");
  });
  document.querySelectorAll(".field").forEach((el) => {
    el.classList.remove("has-error");
  });
}

// Checks ranges and types client-side to prevent 422 errors
function validateFormPayload(payload) {
  let firstFailedElement = null;
  
  // 1. Age
  if (isNaN(payload.age) || payload.age < 10 || payload.age > 100) {
    setFieldError("age", "Age must be an integer between 10 and 100.");
    if (!firstFailedElement) firstFailedElement = "age";
  } else {
    clearFieldError("age");
  }

  // 2. Gender
  if (!payload.gender) {
    setFieldError("gender", "Please select your gender.");
    if (!firstFailedElement) firstFailedElement = "gender";
  } else {
    clearFieldError("gender");
  }

  // 3. Country
  if (!payload.country || payload.country.trim() === "") {
    setFieldError("country", "Country field is required.");
    if (!firstFailedElement) firstFailedElement = "country";
  } else {
    clearFieldError("country");
  }

  // 4. Academic level
  if (!payload.academic_level) {
    setFieldError("academic_level", "Please select an academic level.");
    if (!firstFailedElement) firstFailedElement = "academic_level";
  } else {
    clearFieldError("academic_level");
  }

  // 5. Platform
  if (!payload.most_used_platform) {
    setFieldError("most_used_platform", "Please select a platform.");
    if (!firstFailedElement) firstFailedElement = "most_used_platform";
  } else {
    clearFieldError("most_used_platform");
  }

  // 6. Purpose of use
  if (!payload.purpose_of_use) {
    setFieldError("purpose_of_use", "Please choose your purpose of use.");
    if (!firstFailedElement) firstFailedElement = "purpose_of_use";
  } else {
    clearFieldError("purpose_of_use");
  }

  // 7. Screen time
  if (isNaN(payload.avg_daily_usage_hours) || payload.avg_daily_usage_hours < 6 || payload.avg_daily_usage_hours > 24) {
    setFieldError("avg_daily_usage_hours", "Daily usage must be between 6.0 and 24.0 hours.");
    if (!firstFailedElement) firstFailedElement = "avg_daily_usage_hours";
  } else {
    clearFieldError("avg_daily_usage_hours");
  }

  // 8. Daily unlocks
  const unlocksInputVal = document.getElementById("daily_unlocks").value.trim();
  if (unlocksInputVal === "") {
    setFieldError("daily_unlocks", "Phone unlocks field is required (cannot be blank).");
    if (!firstFailedElement) firstFailedElement = "daily_unlocks";
  } else if (isNaN(payload.daily_unlocks) || payload.daily_unlocks < 0) {
    setFieldError("daily_unlocks", "Phone unlocks must be 0 or a positive number.");
    if (!firstFailedElement) firstFailedElement = "daily_unlocks";
  } else {
    clearFieldError("daily_unlocks");
  }

  // 9. Study Hours
  if (isNaN(payload.study_hours) || payload.study_hours < 0 || payload.study_hours > 24) {
    setFieldError("study_hours", "Study hours must be between 0.0 and 24.0 hours.");
    if (!firstFailedElement) firstFailedElement = "study_hours";
  } else {
    clearFieldError("study_hours");
  }

  // 10. Physical Activity Hours
  if (isNaN(payload.physical_activity_hours) || payload.physical_activity_hours < 0 || payload.physical_activity_hours > 24) {
    setFieldError("physical_activity_hours", "Physical activity hours must be between 0.0 and 24.0 hours.");
    if (!firstFailedElement) firstFailedElement = "physical_activity_hours";
  } else {
    clearFieldError("physical_activity_hours");
  }

  // 11. Sleep Hours
  if (isNaN(payload.sleep_hours_per_night) || payload.sleep_hours_per_night < 0 || payload.sleep_hours_per_night > 24) {
    setFieldError("sleep_hours_per_night", "Sleep hours must be between 0.0 and 24.0 hours.");
    if (!firstFailedElement) firstFailedElement = "sleep_hours_per_night";
  } else {
    clearFieldError("sleep_hours_per_night");
  }

  // 12. Stress level
  if (!payload.stress_level) {
    setFieldError("stress_level", "Please select a stress level.");
    if (!firstFailedElement) firstFailedElement = "stress_level";
  } else {
    clearFieldError("stress_level");
  }

  return firstFailedElement;
}

// ==========================================================================
// DATA ACQUISITION & NORMALIZATION
// ==========================================================================
function collectFormData() {
  const age = parseInt(document.getElementById("age").value, 10);
  
  const genderEl = document.querySelector('input[name="gender"]:checked');
  const gender = genderEl ? genderEl.value : null;
  
  const country = document.getElementById("country").value.trim();
  
  const academicLevelEl = document.querySelector('input[name="academic_level"]:checked');
  const academic_level = academicLevelEl ? academicLevelEl.value : null;
  
  const platformEl = document.querySelector('input[name="most_used_platform"]:checked');
  const most_used_platform = platformEl ? platformEl.value : null;
  
  const purposeEl = document.querySelector('input[name="purpose_of_use"]:checked');
  const purpose_of_use = purposeEl ? purposeEl.value : null;
  
  const avg_daily_usage_hours = parseFloat(document.getElementById("avg_daily_usage_hours").value);
  
  const unlocksVal = document.getElementById("daily_unlocks").value.trim();
  const daily_unlocks = unlocksVal !== "" ? parseInt(unlocksVal, 10) : NaN;
  
  const study_hours = parseFloat(document.getElementById("study_hours").value);
  const physical_activity_hours = parseFloat(document.getElementById("physical_activity_hours").value);
  const sleep_hours_per_night = parseFloat(document.getElementById("sleep_hours_per_night").value);
  
  const stressLevelEl = document.querySelector('input[name="stress_level"]:checked');
  const stress_level = stressLevelEl ? stressLevelEl.value : null;

  return {
    age,
    gender,
    country,
    academic_level,
    most_used_platform,
    purpose_of_use,
    avg_daily_usage_hours,
    daily_unlocks,
    study_hours,
    physical_activity_hours,
    sleep_hours_per_night,
    stress_level
  };
}

// ==========================================================================
// RESULT VISUALIZATION
// ==========================================================================
function renderScoreOutput(score) {
  lastPredictedScore = score;
  const clampedScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
  
  // Percentage for ring fill
  const percentage = (clampedScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const dashOffset = GAUGE_CIRCUMFERENCE * (1 - percentage);
  
  // Trigger SVG circle drawing
  gaugeCircle.style.strokeDashoffset = dashOffset;
  
  // Text display inside gauge
  resultScoreVal.textContent = score.toFixed(2);
  
  // Determine categories depending on direction interpretation (higher is better vs lower is better)
  let ratingClass = "";
  let statusBadgeText = "";
  let descriptionText = "";
  let gradientColor = "";

  if (lowerIsGood) {
    // LOWER SCORE = BETTER (Distress model)
    if (clampedScore < 3.5) {
      ratingClass = "status-healthy";
      statusBadgeText = "Low Distress / Stable";
      descriptionText = "Your screen habits and rhythms suggest a highly balanced profile with minimal stress markers. Excellent alignment!";
      gradientColor = "url(#healthyGradient)";
    } else if (clampedScore <= 6.5) {
      ratingClass = "status-warning";
      statusBadgeText = "Moderate Distress";
      descriptionText = "Your habits are fairly balanced, though some minor adjustments to sleep patterns or daily usage could improve wellbeing.";
      gradientColor = "url(#warningGradient)";
    } else {
      ratingClass = "status-severe";
      statusBadgeText = "Severe Distress / Alert";
      descriptionText = "The model flags a higher distress profile. Consider increasing sleep, prioritizing off-screen activity, and seeking support if needed.";
      gradientColor = "url(#warningGradient)";
    }
  } else {
    // HIGHER SCORE = BETTER (Wellbeing index model)
    if (clampedScore > 6.5) {
      ratingClass = "status-healthy";
      statusBadgeText = "Thriving";
      descriptionText = "Your estimated wellbeing score is robust. Your screen habits, sleep, and physical activity support strong mental health.";
      gradientColor = "url(#healthyGradient)";
    } else if (clampedScore >= 3.5) {
      ratingClass = "status-warning";
      statusBadgeText = "Fairly Balanced";
      descriptionText = "Moderate estimated wellbeing. Fine-tuning physical activity and reducing screen locks might boost your score.";
      gradientColor = "url(#warningGradient)";
    } else {
      ratingClass = "status-severe";
      statusBadgeText = "Needs Attention";
      descriptionText = "Estimated wellbeing sits on the lower end. Focus on core routines: higher sleep hours, offline study, and structured breaks.";
      gradientColor = "url(#warningGradient)";
    }
  }

  // Update ring color based on status
  gaugeCircle.style.stroke = gradientColor;

  // Render elements
  resultBadge.className = `score-badge ${ratingClass}`;
  resultBadge.textContent = statusBadgeText;
  resultSummary.textContent = descriptionText;
  
  // Reveal card state with custom class
  const card = document.querySelector(".result-card");
  card.classList.remove("is-revealing");
  requestAnimationFrame(() => {
    card.classList.add("is-revealing");
  });

  resetButton.hidden = false;
}

function resetVisualScore() {
  gaugeCircle.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
  gaugeCircle.style.stroke = "url(#warningGradient)";
  resultScoreVal.textContent = "—";
  resultBadge.className = "score-badge";
  resultBadge.textContent = "Idle";
  resultSummary.textContent = "Configure your habits and click the button to trigger the machine learning model prediction.";
  resetButton.hidden = true;
  lastPredictedScore = null;
}

// ==========================================================================
// SUBMIT & API CALL HANDLERS
// ==========================================================================
function setFormLoading(isLoading) {
  const btns = [submitBtnDesktop, submitBtnMobile];
  btns.forEach((btn) => {
    if (!btn) return;
    btn.disabled = isLoading;
    const label = btn.querySelector(".btn-submit__label");
    if (isLoading) {
      label.innerHTML = `<span class="spinner-element"></span><span>Calculating Aura…</span>`;
    } else {
      label.innerHTML = btn.id.includes("desktop") ? "Calculate Analysis" : "Get Mental Health Analysis";
    }
  });
}

function displayGlobalError(title, msgHtml, showTroubleshooting = false) {
  errorTitle.textContent = title;
  errorMessage.innerHTML = msgHtml;
  errorBanner.hidden = false;
  troubleshootingChecklist.hidden = !showTroubleshooting;
  
  // Scroll form container to top to make banner visible
  document.querySelector(".form-container").scrollIntoView({ behavior: "smooth" });
}

function handleServerValidationErrors(details) {
  let errorMsgs = [];
  details.forEach((item) => {
    // FastAPI locations: ["body", "field_name"] -> get last item
    const field = item.loc && item.loc[item.loc.length - 1];
    const label = FIELD_LABELS[field] || field;
    if (field) {
      setFieldError(field, `${label}: ${item.msg}`);
      errorMsgs.push(`<strong>${label}</strong>: ${item.msg}`);
    }
  });
  
  const msgHtml = errorMsgs.length > 0 
    ? "The server rejected the following inputs:<br><ul style='margin-top: 8px; margin-left: 16px; display: flex; flex-direction: column; gap: 4px;'>" + 
      errorMsgs.map(m => `<li>${m}</li>`).join("") + "</ul>"
    : "The FastAPI server rejected some parameters. Please correct the highlighted errors.";
    
  displayGlobalError("Validation Error", msgHtml);
}

async function handleSubmit(event) {
  event.preventDefault();
  clearAllErrors();
  
  const payload = collectFormData();
  const firstInvalidField = validateFormPayload(payload);
  
  if (firstInvalidField) {
    displayGlobalError("Form Validation Alert", "Please fill in all required inputs and correct fields marked in red.");
    const failedEl = getFirstFailedFieldElement(firstInvalidField);
    if (failedEl) failedEl.focus();
    return;
  }

  setFormLoading(true);

  try {
    const response = await fetch(PREDICT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 422) {
      const data = await response.json();
      handleServerValidationErrors(data.detail || []);
    } else if (response.status === 500) {
      displayGlobalError(
        "Server Internal Error (500)",
        "The server encountered an error processing the model. This usually happens if the model file 'Mental_Health_Model.pkl' is missing on the server, or there's a library mismatch.",
        true
      );
    } else if (!response.ok) {
      displayGlobalError(
        `Unexpected Error (${response.status})`,
        `The backend returned an unexpected status code: ${response.status}.`
      );
    } else {
      const result = await response.json();
      if (typeof result.predicted_mental_health_score !== "undefined") {
        renderScoreOutput(result.predicted_mental_health_score);
      } else {
        displayGlobalError(
          "API Schema Mismatch",
          "Success response received but 'predicted_mental_health_score' was not found in the payload."
        );
      }
    }
  } catch (err) {
    console.error("API Call failed:", err);
    displayGlobalError(
      "Connection Failure",
      `Unable to connect to the FastAPI backend at ${API_BASE}. Please verify that the server is online and CORS/Mixed-Content rules are not blocking the request.`,
      true
    );
  } finally {
    setFormLoading(false);
  }
}

// Gets the DOM element for the field ID to focus it
function getFirstFailedFieldElement(id) {
  if (["gender", "academic_level", "most_used_platform", "purpose_of_use", "stress_level"].includes(id)) {
    return document.querySelector(`input[name="${id}"]`);
  }
  return document.getElementById(id);
}

// ==========================================================================
// INTERACTIVE TOGGLE & INITIALIZATION
// ==========================================================================
directionToggle.addEventListener("change", (e) => {
  lowerIsGood = !e.target.checked;
  directionLabel.textContent = lowerIsGood 
    ? "Lower Score = Good (Distress Index)" 
    : "Higher Score = Good (Wellbeing Index)";
    
  // Re-render the score dynamically if it exists
  if (lastPredictedScore !== null) {
    renderScoreOutput(lastPredictedScore);
  }
});

// Reset event
resetButton.addEventListener("click", () => {
  form.reset();
  resetVisualScore();
  clearAllErrors();
  
  // Reset custom range fills
  SLIDER_FIELDS.forEach(({ id, decimals }) => {
    const input = document.getElementById(id);
    const output = document.getElementById(`${id}-out`);
    if (input) {
      updateSliderProgress(input, decimals, output);
    }
  });
});

// Bind main submit handler
form.addEventListener("submit", handleSubmit);
