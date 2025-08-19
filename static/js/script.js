function setActive(button) {
  const buttons = document.querySelectorAll(".nav-button");
  buttons.forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");
}

// ⚙️ Toggle visibility of settings dropdown
function toggleSettings() {
  const menu = document.getElementById("settingsMenu");

  // Toggle between 'block' and 'none'
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// 🧠 Handle LLM model selection
function selectLLM(model) {
  // Log selected model (can be used for backend or UI updates)
  console.log("LLM model selected:", model);
}

// Allow multiple genre selection
document.querySelectorAll(".genre-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("selected");
  });
});
function fetchWithTimeout(url, timeout = 5000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeout)
    ),
  ]);
}
document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("submitBtn");
  const genreButtons = document.querySelectorAll(".genre-btn");
  const spinner = document.getElementById("section-spinner");

  submitBtn.addEventListener("click", () => {
    const promptText = document.getElementById("songPrompt").value.trim();
    const selectedGenres = Array.from(
      document.querySelectorAll(".genre-btn.selected")
    ).map((btn) => btn.dataset.genre);

    if (!promptText && selectedGenres.length === 0) {
      alert("Please enter a prompt or select at least one genre.");
      return;
    }

    const payload = {
      prompt: promptText,
      style: selectedGenres,
    };

    console.log("📤 Submitting to API:", payload);

    // show spinner + disable button
    spinner.style.display = "block";
    submitBtn.disabled = true;

    fetch("/api/simple-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then((data) => {
        console.log("✅ Task started:", data);
        const taskId = data.response?.data?.taskId;
        console.log("🎯 Extracted taskId:", taskId);
        if (taskId) {
          console.log("we are calling pollforTask");
          // begin polling; pollForResult will clear spinner + re-enable button
          pollForResult(taskId);
          console.log("we are past pollforTask");
        } else {
          spinner.style.display = "none";
          submitBtn.disabled = false;
          alert("Failed to start generation (no task_id).");
        }
      })
      .catch((err) => {
        console.error("❌ Submission failed:", err);
        spinner.style.display = "none";
        submitBtn.disabled = false;
        alert("Something went wrong. Please try again.");
      });
  });
});
function pollForResult(taskId) {
  console.log("polling started", taskId);
  let attempts = 0;
  const maxAttempts = 50;
  const interval = setInterval(() => {
    if (attempts >= maxAttempts) {
      console.log("⏹️ Max polling attempts reached.");

      // Final fetch before exit
      fetch(`/get-task-result/${taskId}`)
        .then((res) => {
          if (!res.ok) {
            console.warn(`⚠️ Final fetch failed with status ${res.status}`);
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (!data) return;
          const tracks = Array.isArray(data) ? data : Object.values(data);
          handleSubmitResponse(tracks); // ✅ Final render
        });

      clearInterval(interval);
      return;
    }

    attempts++;
    console.log(`⏳ Poll attempt ${attempts}/${maxAttempts}`);

    fetchWithTimeout(`/get-task-result/${taskId}`, 5000)
      .then((res) => {
        console.log("📡 Response status:", res.status);
        if (res.status === 202) {
          console.log("we have 202 status and we are returning null");
          return null;
        }
        if (!res.ok) throw new Error("Polling failed");
        return res.json();
      })
      .then((json) => {
        console.log("we are getting to json part", json);
        if (!json || json.status !== "done") return; // still pending
        clearInterval(interval);
        console.log("🎉 Generation ready:", json);
        handleSubmitResponse(json); // your existing renderer
        document.getElementById("section-spinner").style.display = "none";
        document.getElementById("submitBtn").disabled = false;
      })
      .catch((err) => {
        clearInterval(interval);
        console.error("Polling error:", err);
        document.getElementById("section-spinner").style.display = "none";
        document.getElementById("submitBtn").disabled = false;
        alert("Error fetching results. Try again later.");
      });
  }, 3000);
}
function handleSubmitResponse(jsonArray) {
  jsonArray.forEach((entry) => {
    if (
      entry.audio_url &&
      entry.audio_url.trim() !== ""
    ) {
      console.log("We are geting this object in if statement passing block",entry.audio_url);
      // Check if card already exists
      const imageUrl =
        (entry.image_url || "").trim() ||
        "https://via.placeholder.com/100x100.png?text=No+Cover";
      const duration = entry.duration;
      const audioUrl = entry.audio_url.trim();
      const title = (entry.title || "Untitled Track").trim();
      const tags = entry.tags;
      document.getElementById("trackCard").style.display = "none";
      const existing = document.querySelector(
        `.track-card[data-audio-url="${entry.audio_url}"]`
      );
      if (existing) return; // Skip duplicate

      const card = document.createElement("div");
      card.className = "track-card";
      card.setAttribute("data-audio-url", entry.audio_url); // Unique marker

      card.innerHTML = `
        <h4 class="track-title">${title}</h4>
        <div class="track-row">
          <img src="${imageUrl}" alt="Track Image" class="track-image" />
          <audio controls class="track-audio">
            <source src="${audioUrl}" type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
        <a href="${audioUrl}" download class="download-link">Download</a>
        <button class="lyrics-link">Lyrics</button>
      `;

      document.getElementById("outputContainer").appendChild(card);
      card.scrollIntoView({ behavior: "smooth" });
    }
  });
}
// 🎚️ Toggle visibility of lyrics input section based on instrumental checkbox
// 🎚️ Toggle visibility of lyrics textarea based on instrumental checkbox
document
  .getElementById("instrumentalToggle")
  .addEventListener("change", function () {
    const lyricsInput = document.getElementById("lyricsInput");
    if (this.checked) {
      // ✅ Instrumental mode ON — hide lyrics textarea
      lyricsInput.style.display = "none";
    } else {
      // 🎤 Instrumental mode OFF — show lyrics textarea
      lyricsInput.style.display = "block";
    }
  });
document
  .getElementById("advancedToggle")
  .addEventListener("change", function () {
    const advancedSection = document.getElementById("advanced-section");
    if (this.checked) {
      // 🔓 Checkbox ON — show advanced sliders
      advancedSection.style.display = "block";
    } else {
      // 🔒 Checkbox OFF — hide advanced sliders
      advancedSection.style.display = "none";
    }
  });
// 🎛️ Live update slider values with two decimal places
const weirdnessSlider = document.getElementById("weirdnessSlider");
const weirdnessValue = document.getElementById("weirdnessValue");

const styleSlider = document.getElementById("styleSlider");
const styleValue = document.getElementById("styleValue");

// Initial sync
weirdnessValue.textContent = parseFloat(weirdnessSlider.value).toFixed(2);
styleValue.textContent = parseFloat(styleSlider.value).toFixed(2);

// Update on input
weirdnessSlider.addEventListener("input", () => {
  weirdnessValue.textContent = parseFloat(weirdnessSlider.value).toFixed(2);
});

styleSlider.addEventListener("input", () => {
  styleValue.textContent = parseFloat(styleSlider.value).toFixed(2);
});

// ✅ Define globally so HTML onclick can access it
function switchMode(mode) {
  console.log("Switching to:", mode);

  const simpleTabContent = document.getElementById("simple-tab-content");
  const customTabContent = document.getElementById("custom-tab-content");

  if (!simpleTabContent || !customTabContent) {
    console.warn("Tab content elements not found in DOM.");
    return;
  }

  const tabButtons = document.querySelectorAll(".mode-switch .tab");

  tabButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.textContent.trim().toLowerCase() === mode) {
      btn.classList.add("active");
    }
  });

  if (mode === "simple") {
    simpleTabContent.style.display = "block";
    customTabContent.style.display = "none";
  } else {
    simpleTabContent.style.display = "none";
    customTabContent.style.display = "block";
  }
}

// ✅ Only one DOMContentLoaded block
document.addEventListener("DOMContentLoaded", () => {
  switchMode("simple");
});
// 🎨 Style Tag Selection
const styleTags = document.querySelectorAll(".style-tag");

styleTags.forEach((tag) => {
  tag.addEventListener("click", () => {
    tag.classList.toggle("selected");
  });
});
// 🎨 Real-Time Sync: Style Tags → Prompt Input

document.addEventListener("DOMContentLoaded", function () {
  const styleButtons = document.querySelectorAll(".style-tag");
  const stylePromptInput = document.getElementById("stylePromptInput");

  function updateStylePrompt() {
    // Get user-typed styles
    const typed = stylePromptInput.value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Get selected tags
    const selectedTags = Array.from(styleButtons)
      .filter((b) => b.classList.contains("active"))
      .map((b) => b.textContent.trim());

    // Merge and deduplicate
    const combined = Array.from(new Set([...typed, ...selectedTags]));

    // Filter out any tags that were unselected
    const final = combined.filter(
      (style) =>
        selectedTags.includes(style) || !styleButtonsText.includes(style)
    );

    stylePromptInput.value = final.join(", ");
  }

  // Cache all tag texts for filtering
  const styleButtonsText = Array.from(styleButtons).map((b) =>
    b.textContent.trim()
  );

  styleButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      this.classList.toggle("active");
      updateStylePrompt();
    });
  });

  stylePromptInput.addEventListener("blur", updateStylePrompt);

  // Clear button logic
  const clearBtn = document.getElementById("clearStylePrompt");
  clearBtn.addEventListener("click", function () {
    stylePromptInput.value = "";
    const styleButtons = document.querySelectorAll(".style-tag");
    for (let i = 0; i < styleButtons.length; i++) {
      styleButtons[i].classList.remove("active");
    }
  });
});
//custom payload submit request handleing
document.addEventListener("DOMContentLoaded", () => {
  const custommSubmitBtn = document.getElementById("customSubmitBtn");
  const customSpinner = document.getElementById("custom-spinner");
  custommSubmitBtn.addEventListener("click", () => {
    //lyrics block collections
    const lyricsInput = document.getElementById("lyricsInput");
    const lyrics = lyricsInput?.value.trim() || "";
    //style block collection
    const stylePromptInput = document.getElementById("stylePromptInput");
    const stylePrompt = stylePromptInput?.value.trim() || "";
    if (!lyrics.trim() && !stylePrompt.trim()) {
      alert("Please enter lyrics and style prompt.");
      return;
    }
    const instrumentalToggle = document.getElementById("instrumentalToggle");
    const instrumentalOnly = instrumentalToggle?.checked || false;
    const weirdnessSlider = document.getElementById("weirdnessSlider");

    const weirdness = parseFloat(weirdnessSlider?.value) || 0.5;
    const styleSlider = document.getElementById("styleSlider");
    const styleInfluence = parseFloat(styleSlider?.value) || 0.5;
    const songTitleInput = document.getElementById("songTitle");
    const title = songTitleInput?.value.trim() || "";

    const payload = {
      prompt: lyrics,
      style: stylePrompt,
      title: title,
      customMode: true,
      instrumental: instrumentalOnly,
      styleWeight: styleInfluence,
      weirdnessConstraint: weirdness,
    };

    console.log("📤 Submitting custom load to API:", payload);

    // show spinner + disable button
    customSpinner.style.display = "block";
    custommSubmitBtn.disabled = true;

    fetch("/api/simple-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then((data) => {
        console.log("✅ Custom Task started:", data);
        const taskId = data.response?.data?.taskId;
        console.log("🎯 Extracted custom taskId:", taskId);
        if (taskId) {
          console.log("we are calling pollforTask custom load");
          // begin polling; pollForResult will clear spinner + re-enable button
          pollForResult(taskId);
          console.log("we are past custom pollforTask");
        } else {
          customSpinner.style.display = "none";
          custommSubmitBtn.disabled = false;
          alert("Failed to start generation (no task_id).");
        }
      })
      .catch((err) => {
        console.error("❌ Submission failed:", err);
        customSpinner.style.display = "none";
        custommSubmitBtn.disabled = false;
        alert("Something went wrong. Please try again.");
      });
  });
});
document.getElementById("lyricsLink").addEventListener("click", () => {
  const lyricsPanel = document.getElementById("lyricsPanel");
  const lyricsBody = document.getElementById("lyricsBody");

  // Inject lyrics content (can be dynamic later)
  lyricsBody.textContent = `Muse in the Wires\nFrom A to Z (Extended)\n\nVerse 1...\nChorus...\nBridge...`;

  lyricsPanel.style.display = "flex";
});

document.getElementById("closeLyrics").addEventListener("click", () => {
  document.getElementById("lyricsPanel").style.display = "none";
});

