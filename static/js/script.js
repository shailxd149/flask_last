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
      genres: selectedGenres,
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
        const taskId = data.task_id;
        if (taskId) {
          // begin polling; pollForResult will clear spinner + re-enable button
          pollForResult(taskId);
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
  const interval = setInterval(() => {
    fetch(`/get-task-result/${taskId}`)
      .then((res) => {
        if (res.status === 202) return null; // still processing
        if (!res.ok) throw new Error("Polling failed");
        return res.json();
      })
      .then((json) => {
        if (!json) return; // still pending
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

function handleSubmitResponse(response) {
  // 1. Normalize track array (adjust path if your API differs)
  const tracks = response.tracks || response.data?.data || [];

  // 2. Grab our DOM elements
  const outputContainer = document.getElementById("outputContainer");
  const lyricsPanel = document.getElementById("lyricsPanel");
  const lyricsContent = document.getElementById("lyricsContent");
  const closeLyricsBtn = document.getElementById("closeLyricsBtn");

  // Close lyrics panel
  closeLyricsBtn.addEventListener("click", () => {
    lyricsPanel.classList.add("hidden");
  });

  // 3. Clear any previous content
  outputContainer.innerHTML = "";

  // 4. Render each track as a <figure>
  tracks.forEach((track) => {
    const figure = document.createElement("figure");
    figure.className = "track-block";

    figure.innerHTML = `
      <figcaption>
        🎧 <strong>${track.title}</strong>
        ${track.tags ? `— <em>${track.tags}</em>` : ""}
      </figcaption>
      <audio controls src="${track.audio_url}"></audio>
      <a href="${track.audio_url}" download>Download</a>
    `;

    outputContainer.appendChild(figure);
  });

  // 5. If the first track carries a `prompt` (lyrics), show the panel
  const firstLyrics = tracks[0]?.prompt || "";
  if (firstLyrics) {
    lyricsContent.textContent = firstLyrics;
    lyricsPanel.classList.remove("hidden");
  }
}

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

// 🧱 Modular collectors
function collectLyricsBlock() {
  const lyricsInput = document.getElementById("lyricsInput");
  const lyrics = lyricsInput?.value.trim() || "";

  return { lyrics };
}
function collectInstrumentalBlock() {
  const instrumentalToggle = document.getElementById("instrumentalToggle");
  const instrumentalOnly = instrumentalToggle?.checked || false;
  return { instrumentalOnly };
}
function collectStylesBlock() {
  const stylePromptInput = document.getElementById("stylePromptInput");
  const stylePrompt = stylePromptInput?.value.trim() || "";

  return { stylePrompt };
}
function collectAdvancedControls() {
  const advancedToggle = document.getElementById("advancedToggle");
  const showAdvanced = advancedToggle?.checked || false;

  return { showAdvanced };
}
function collectWeirdnessControls() {
  const weirdnessSlider = document.getElementById("weirdnessSlider");

  const weirdness = parseInt(weirdnessSlider?.value, 10) || 50;

  return { weirdness };
}
function collectstyleInfluenceControls() {
  const styleSlider = document.getElementById("styleSlider");
  const styleInfluence = parseInt(styleSlider?.value, 10) || 50;
  return { styleInfluence };
}
function collectSongTitle() {
  const songTitleInput = document.getElementById("songTitle");
  const title = songTitleInput?.value.trim() || "";
  return { title };
}
const submitBtn = document.getElementById("customSubmitBtn");
const spinner = document.getElementById("section-spinner"); // or "custom-spinner" if that's the correct ID

//submit event listnere
// 🚀 Submit handler
submitBtn.addEventListener("click", () => {
  const lyricsBlock = collectLyricsBlock();
  const styleBlock = collectStylesBlock();

  // if (!lyricsBlock && !styleBlock) {
  //   alert("Please enter lyrics or style prompt.");
  //   return;
  // }
  if (!lyricsBlock.lyrics.trim() && !styleBlock.stylePrompt.trim()) {
    alert("Please enter lyrics or style prompt.");
    return;
  }

  const advancedBlock = collectAdvancedControls();
  const weirdIndex = collectWeirdnessControls();
  const styleInfluenceIndex = collectstyleInfluenceControls();
  const titleBlock = collectSongTitle();

  const blocks = [
    lyricsBlock,
    styleBlock,
    advancedBlock,
    weirdIndex,
    styleInfluenceIndex,
    titleBlock,
  ];
  //const payload = Object.assign({}, ...blocks.filter(Boolean));
  const payload = Object.assign({}, ...blocks);

  console.log("📤 Submitting custom payload:", payload);

  showSpinner();
  submitBtn.disabled = true;

  fetch("/generate-custom", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Network error");
      return res.json();
    })
    .then((data) => {
      console.log("✅ Custom response received:", data);
      handleSubmitResponse(data);
      resetFields();
      updateSubmitState();
    })
    .catch((err) => {
      console.error("❌ Custom submission failed:", err);
      alert("Something went wrong. Please try again.");
    })
    .finally(() => {
      hideSpinner();
      submitBtn.disabled = false;
    });
});
// ⏳ Spinner control
function showSpinner() {
  spinner.style.display = "block";
}

function hideSpinner() {
  spinner.style.display = "none";
}

// 🧼 Reset fields
function resetFields() {
  lyricsInput.value = "";
  instrumentalToggle.checked = false;
  stylePromptInput.value = "";
  weirdnessSlider.value = 50;
  styleSlider.value = 50;
  advancedToggle.checked = false;
  songTitleInput.value = "";
}
