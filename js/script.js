const recordButton = document.getElementById("recordButton")
const audioCheckbox = document.getElementById("audioCheckBox")
const micCheckbox = document.getElementById("micCheckBox")
const videoCheckbox = document.getElementById("videoCheckBox")
const slider = document.getElementById("qualityPresets")
audioCheckbox.addEventListener("change",disableRecordIfNothingChecked)
micCheckbox.addEventListener("change",disableRecordIfNothingChecked)
videoCheckbox.addEventListener("change",disableRecordIfNothingChecked)
let mediarecorder = null
let isRecording = false
let selectedPreset = "MEDIUM"
let mimeType = "video/webm;codecs=vp8,opus"
const PRESETS = {
    LOW: {
        name: "LOW",
        audioBitsPerSecond: 32000,
        videoBitsPerSecond: 500000,
        frameRate: 15,
        sampleRate: 22000
    },
    MEDIUM: {
        name: "MEDIUM",
        audioBitsPerSecond: 64000,
        videoBitsPerSecond: 2500000,
        frameRate: 30,
        sampleRate: 44100
    },
    HIGH: {
        name: "HIGH",
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 5000000,
        frameRate: 60,
        sampleRate: 64000
    }
}

function disableRecordIfNothingChecked(){
    if (!audioCheckbox.checked  && !micCheckbox.checked && !videoCheckbox.checked)
        recordButton.disabled = true
    else   
        recordButton.disabled = false
}

function appendDate (string = ""){
    const actualDate = new Date()
    const months = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"]
    const month = months[actualDate.getMonth()]
    const day = actualDate.getDate()
    const year = actualDate.getFullYear()
    const hours = actualDate.getHours()
    const minutes = actualDate.getMinutes()
    const seconds = actualDate.getSeconds()

    const stringDate = ` ${month}-${day}-${year}_${hours}-${minutes}-${seconds}`

    return string+stringDate
}

slider.addEventListener("input", (event) => {
    switch (event.target.value) {
        case "0": selectedPreset = PRESETS.LOW.name
            break
        case "1": selectedPreset = PRESETS.MEDIUM.name
            break
        case "2": selectedPreset = PRESETS.HIGH.name
            break
        default:
            break
    }
});

//Returns the stream to record based on user selection.
async function setupStream () {
    let micStream = null
    let videoStream = null
    try {
        if (videoCheckbox.checked || audioCheckbox.checked)
            videoStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: { ideal: PRESETS[selectedPreset].frameRate }},
                audio: audioCheckbox.checked,
                preferCurrentTab: false,
                selfBrowserSurface: "include",
                systemAudio: "include",
                surfaceSwitching: "include",
                monitorTypeSurfaces: "include",
            })

        if (micCheckbox.checked){ 
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: PRESETS[selectedPreset].sampleRate
                },
            })
        }


        if (videoCheckbox.checked && micCheckbox.checked)
            return new MediaStream([...videoStream.getTracks(),...micStream.getTracks()])
        if (videoCheckbox.checked && !micCheckbox.checked)
            return videoStream
        if (!videoCheckbox.checked && audioCheckbox.checked && !micCheckbox.checked)
            return new MediaStream ([...videoStream.getAudioTracks()])
        if (!videoCheckbox.checked && audioCheckbox.checked && micCheckbox.checked)
            return new MediaStream ([...videoStream.getAudioTracks(),...micStream.getTracks()])
        if (!videoCheckbox.checked && !audioCheckbox.checked && micCheckbox.checked)
            return micStream

    } catch (err) {
        console.log(`Something went wrong while setting up the stream.`)
        console.error(err)

        //Free possible used resources
        if(videoStream) 
            videoStream.getTracks().forEach((mediaStreamTrack)=>{mediaStreamTrack.stop()})
        if(micStream) 
            micStream.getTracks().forEach((mediaStreamTrack)=>{mediaStreamTrack.stop()}) 
    }
}

//Start/Stop recording when button is clicked.
recordButton.addEventListener("click", async () => {
    if(!isRecording){
        let mediaStreamToRecord = null
        mediaStreamToRecord = await setupStream()

        if (mediaStreamToRecord){ 
            mediarecorder = new MediaRecorder(mediaStreamToRecord,{
                mimeType: mimeType,
                audio: true,
                systemAudio: true,
                audioBitsPerSecond: PRESETS[selectedPreset].audioBitsPerSecond,
                videoBitsPerSecond: PRESETS[selectedPreset].videoBitsPerSecond,
            })

            //If any of the streamTracks ended for whatever reason, then stop recording.
            mediaStreamToRecord.getTracks().forEach((track)=>{
                track.addEventListener("ended", ()=>{
                    mediarecorder.stop()
                })
            })

            //Since we recorded everything in a single chunk, we can download the recording
            mediarecorder.addEventListener("dataavailable", (e) => {
                const link = document.createElement("a")
                link.href = URL.createObjectURL(e.data)
                link.download = appendDate("capture")
                link.click()
            })

            function stopAllTracks(){
                mediaStreamToRecord.getTracks().forEach((track)=>{
                    track.stop()
                })
                isRecording = false
                updateUI()
            }
            mediarecorder.addEventListener("stop", stopAllTracks)
            mediarecorder.addEventListener("error", stopAllTracks)

            if(mediarecorder.stream.getTracks().length > 0){
                mediarecorder.start() // All will be record in one big chunk, so dataavailable event will be called only once.
                isRecording = true
                updateUI()
            }
            
        }
        else{
            console.log(`Can't record, something went wrong setting up the stream.`)
            isRecording = false
            updateUI()
        }
    }
    else{
        //Currently recording
        if (mediarecorder) 
            mediarecorder.stop()        

        isRecording = false
        updateUI()
    }
})

function updateUI (){
    if(isRecording){
        audioCheckbox.disabled = true
        micCheckbox.disabled = true
        videoCheckbox.disabled = true
        slider.disabled = true
        recordButton.textContent = "Stop Recording"
        recordButton.classList.add("recordingAnimation") 
    }
    else{
        audioCheckbox.disabled = false
        micCheckbox.disabled = false
        videoCheckbox.disabled = false
        slider.disabled = false
        recordButton.textContent = "Start Recording"
        recordButton.classList.remove("recordingAnimation") 
    }
}
