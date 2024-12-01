const audioFileExts = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm", ".flac", ".mp4"]
document.getElementById("zipInput").addEventListener("change", handleZipUpload);

async function handleZipUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        console.error("No file selected.");
        return;
    }

    console.log("File selected:", file.name);

    const originalFileName = file.name.replace(".zip", "");
    let zip;

    try {
        zip = await JSZip.loadAsync(file);
        console.log("ZIP file loaded successfully.");
    } catch (error) {
        alert("Failed to load zip file", error);
        console.error("Failed to load ZIP file:", error);
        return;
    }

    const susFiles = [];
    const audioFiles = [];
    const fileListDiv = document.getElementById("fileList");
    fileListDiv.innerHTML = "";

    Object.keys(zip.files).forEach((fileName) => {
        if (fileName.endsWith(".sus")) {
            susFiles.push(fileName);
        } else if (audioFileExts.some(ext => fileName.endsWith(ext))) {
            audioFiles.push(fileName);
        }
    });

    console.log("SUS files found:", susFiles);
    console.log("Audio files found:", audioFiles);

    if (!susFiles.length || !audioFiles.length) {
        fileListDiv.innerHTML = "<p>No SUS or audio files found in the ZIP!</p>";
        return;
    }

    susFiles.forEach((susFile) => {
        const div = document.createElement("div");
        div.className = "file-entry";
        div.innerHTML = `
        <label>
        ${susFile}
        <select data-sus="${susFile}">
        <option value="">Select an audio file</option>
        ${audioFiles.map(file => `<option value="${file}">${file}</option>`).join("")}
        </select>
        Offset
        <input type="number" placeholder="Offset" data-offset="${susFile}" value="0" step="0.02" style="width: 80px;" />
        </label>
        `;
        fileListDiv.appendChild(div);
    });

    audioFiles.forEach(async (audioFile) => {
        const audioBlob = await zip.files[audioFile].async("blob");
        const audioURL = URL.createObjectURL(audioBlob);

        const audioDiv = document.createElement("div");
        audioDiv.className = "file-entry";
        audioDiv.innerHTML = `
        <label>${audioFile}</label>
        <audio controls>
        <source src="${audioURL}"4>
        Your browser does not support the audio element.
        </audio>
        `;
        fileListDiv.appendChild(audioDiv);
    });


    const downloadButton = document.getElementById("downloadAll");
    downloadButton.style.display = "block";
    downloadButton.onclick = () => downloadPatchedFiles(zip, susFiles, originalFileName);
}

// Shamefully stolen from Umiguri Discord
async function downloadPatchedFiles(zip, susFiles, originalFileName) {
    const patchedZip = new JSZip();
    const selects = document.querySelectorAll("select");
    for (const select of selects) {
        const susFileName = select.getAttribute("data-sus");
        const selectedAudio = select.value;

        if (!selectedAudio) continue;

        const offsetInput = document.querySelector(`input[data-offset="${susFileName}"]`);
        const waveOffset = offsetInput ? parseFloat(offsetInput.value) || 0 : 0;

        let susContent;
        try {
            susContent = await zip.files[susFileName].async("string");
        } catch (error) {
            console.error(`Failed to read SUS file: ${susFileName}`, error);
            continue;
        }

        const patchedContent = susContent
        .replace(/^#WAVE .*$/mg, `#WAVE "${selectedAudio}"`)
        .replace(/^#WAVEOFFSET .*$/mg, `#WAVEOFFSET ${waveOffset}`);

        patchedZip.file(susFileName, patchedContent);
    }

    try {
        const zipBlob = await patchedZip.generateAsync({ type: "blob" });
        const patchedFileName = `${originalFileName} [Sus Patched].zip`;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(zipBlob);
        a.download = patchedFileName;
        a.click();
        console.log("Patched ZIP file created and download started.");
    } catch (error) {
        console.error("Failed to generate patched ZIP file:", error);
    }
}
