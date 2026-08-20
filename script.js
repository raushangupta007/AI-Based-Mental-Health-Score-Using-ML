(() => {
  "use strict";

  const API_BASE = "https://ai-based-mental-health-score-using-ml.onrender.com";

  const form = document.getElementById("predict-form");
  const submitBtn = document.getElementById("submit-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const recalcBtn = document.getElementById("recalc-btn");
  const errorRetryBtn = document.getElementById("error-retry-btn");

  const stateIdle = document.getElementById("state-idle");
  const stateLoading = document.getElementById("state-loading");
  const stateResult = document.getElementById("state-result");
  const stateError = document.getElementById("state-error");

  const scoreNumberEl = document.getElementById("score-number");
  const scoreBandEl = document.getElementById("score-band");
  const scoreContextEl = document.getElementById("score-context");
  const gaugeFill = document.getElementById("gauge-fill");
  const errorLabelEl = document.getElementById("error-label");
  const errorCopyEl = document.getElementById("error-copy");

  const GAUGE_ARC_LENGTH = 236; // Math.PI * 75

  // Stress Segmented Button Selection
  const segGroup = document.getElementById("stress_level_group");
  const stressHiddenInput = document.getElementById("stress_level");

  segGroup.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      segGroup.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      stressHiddenInput.value = btn.dataset.value;
      clearFieldError(stressHiddenInput);
    });
  });

  // Error Message Helpers
  function fieldWrapper(input) {
    return input.closest(".field");
  }

  function setFieldError(input, msg) {
    const wrap = fieldWrapper(input);
    if (!wrap) return;
    wrap.classList.add("field-error");
    const msgEl = wrap.querySelector(".error-msg");
    if (msgEl) msgEl.textContent = msg;
  }

  function clearFieldError(input) {
    const wrap = fieldWrapper(input);
    if (!wrap) return;
    wrap.classList.remove("field-error");
    const msgEl = wrap.querySelector(".error-msg");
    if (msgEl) msgEl.textContent = "";
  }

  function clearAllErrors() {
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("field-error"));
    form.querySelectorAll(".error-msg").forEach((m) => (m.textContent = ""));
  }

  // Switch Active Result State
  function showState(name) {
    stateIdle.hidden = true;
    stateLoading.hidden = true;
    stateResult.hidden = true;
    stateError.hidden = true;

    if (name === "idle") stateIdle.hidden = false;
    else if (name === "loading") stateLoading.hidden = false;
    else if (name === "result") stateResult.hidden = false;
    else if (name === "error") stateError.hidden = false;
  }

  // Input Validation
  function validate(payload) {
    const errors = [];
    const numeric = [
      ["age", 10, 100],
      ["avg_daily_usage_hours", 0, 24],
      ["daily_unlocks", 0, Infinity],
      ["study_hours", 0, 24],
      ["physical_activity_hours", 0, 24],
      ["sleep_hours_per_night", 0, 24],
    ];

    numeric.forEach(([key, min, max]) => {
      const input = document.getElementById(key);
      const val = payload[key];
      if (val === "" || val === null || Number.isNaN(val)) {
        errors.push([input, "Required"]);
      } else if (val < min || val > max) {
        errors.push([input, `Range: ${min}–${max === Infinity ? "0+" : max}`]);
      }
    });

    ["gender", "country", "academic_level", "most_used_platform", "purpose_of_use"].forEach((key) => {
      const input = document.getElementById(key);
      if (!payload[key] || String(payload[key]).trim() === "") {
        errors.push([input, "Required"]);
      }
    });

    if (!payload.stress_level) {
      errors.push([stressHiddenInput, "Select stress level"]);
    }

    return errors;
  }

  function collectPayload() {
    const fd = new FormData(form);
    return {
      age: fd.get("age") === "" ? NaN : parseInt(fd.get("age"), 10),
      gender: fd.get("gender") || "",
      country: (fd.get("country") || "").trim(),
      academic_level: fd.get("academic_level") || "",
      most_used_platform: fd.get("most_used_platform") || "",
      purpose_of_use: fd.get("purpose_of_use") || "",
      avg_daily_usage_hours: fd.get("avg_daily_usage_hours") === "" ? NaN : parseFloat(fd.get("avg_daily_usage_hours")),
      daily_unlocks: fd.get("daily_unlocks") === "" ? NaN : parseInt(fd.get("daily_unlocks"), 10),
      study_hours: fd.get("study_hours") === "" ? NaN : parseFloat(fd.get("study_hours")),
      physical_activity_hours: fd.get("physical_activity_hours") === "" ? NaN : parseFloat(fd.get("physical_activity_hours")),
      sleep_hours_per_night: fd.get("sleep_hours_per_night") === "" ? NaN : parseFloat(fd.get("sleep_hours_per_night")),
      stress_level: fd.get("stress_level") || "",
    };
  }

  function renderResult(score) {
    const clamped = Math.max(0, Math.min(10, score));
    scoreNumberEl.textContent = score.toFixed(2);

    if (clamped < 4) {
      scoreBandEl.textContent = "Strained";
      scoreBandEl.className = "score-badge strained";
      scoreContextEl.textContent = "Higher stress indicators. Prioritize rest, sleep, and limited screen time.";
    } else if (clamped < 7) {
      scoreBandEl.textContent = "Balanced";
      scoreBandEl.className = "score-badge balanced";
      scoreContextEl.textContent = "Steady rhythm. Minor adjustments can further improve wellness.";
    } else {
      scoreBandEl.textContent = "Resilient";
      scoreBandEl.className = "score-badge strong";
      scoreContextEl.textContent = "Excellent habits and strong baseline stability. Keep it up!";
    }

    // Animate arc
    gaugeFill.style.transition = "none";
    gaugeFill.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);
    requestAnimationFrame(() => {
      gaugeFill.style.transition = "stroke-dashoffset 1s ease-out";
      const offset = GAUGE_ARC_LENGTH * (1 - clamped / 10);
      gaugeFill.style.strokeDashoffset = String(offset);
    });

    showState("result");
  }

  function renderError(title, msg) {
    errorLabelEl.textContent = title;
    errorCopyEl.textContent = msg;
    showState("error");
  }

  function resetAll() {
    form.reset();
    clearAllErrors();
    segGroup.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
    stressHiddenInput.value = "";
    showState("idle");
  }

  // Submit Handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors();

    const payload = collectPayload();
    const errors = validate(payload);

    if (errors.length > 0) {
      errors.forEach(([input, msg]) => input && setFieldError(input, msg));
      errors[0][0]?.focus?.();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
    showState("loading");

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        renderError("Prediction Failed", `Server returned error (${res.status}).`);
        return;
      }

      const data = await res.json();
      if (typeof data.predicted_mental_health_score !== "number") {
        renderError("Invalid Data", "Score could not be retrieved.");
        return;
      }

      renderResult(data.predicted_mental_health_score);
    } catch (err) {
      renderError("Network Error", "Could not connect to the backend server.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
    }
  });

  // Real-time error clearing
  form.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => clearFieldError(el));
    el.addEventListener("change", () => clearFieldError(el));
  });

  // Buttons wiring
  refreshBtn.addEventListener("click", resetAll);
  recalcBtn.addEventListener("click", () => showState("idle"));
  errorRetryBtn.addEventListener("click", () => showState("idle"));
})();
