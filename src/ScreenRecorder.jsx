import { RealtimeSession } from "speechmatics";
import { getJwt } from "./utils/auth";

//create a function to create a new session and return it
export async function createScreenSession(
  transcription_config,
  messageHandler
) {
  const speakerSession = new RealtimeSession({
    apiKey: async () => {
      const response = await getJwt();
      return response;
    },
  });
  let speakerMediaRecorder;
  let speakerSource;
  let speakerAudio = [];

  speakerSession.addListener("RecognitionStarted", () => {
    console.log("RecognitionStarted");
  });

  speakerSession.addListener("Error", (error) => {
    console.log("session error", error);
    alert("Something went wrong in User audio");
  });

  speakerSession.addListener("AddTranscript", async (message) => {
    await messageHandler(message?.metadata?.transcript);
  });

  speakerSession.addListener("EndOfTranscript", () => {
    console.log("EndOfTranscript");
  });

  speakerSession.start({ transcription_config }).then(async () => {
    //setup audio stream
    const speakerStream = await navigator.mediaDevices.getDisplayMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression:true,
      },
    });

    let speakerAudioContext = new AudioContext();
    let speakerDestination = speakerAudioContext.createMediaStreamDestination();

    speakerSource = speakerAudioContext.createMediaStreamSource(speakerStream);
    speakerSource.connect(speakerDestination);

    speakerMediaRecorder = new MediaRecorder(speakerDestination.stream, {
      mimeType: "audio/webm",
    });

    speakerMediaRecorder.start(1000);

    speakerMediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        speakerSession.sendAudio(event.data);
        speakerAudio.push(event.data);
      }
    };
  });
  function stopMediaRecorder() {
    if (speakerMediaRecorder) {
      speakerMediaRecorder?.stop();
      speakerMediaRecorder?.stream
        ?.getTracks()
        ?.forEach((track) => track?.stop());
      speakerMediaRecorder = null;

      speakerSource?.disconnect();
      speakerSource?.mediaStream
        ?.getTracks()
        ?.forEach((track) => track?.stop());
      speakerSource = null;

      // const blob = new Blob(speakerAudio, { type: "audio/webm" });
      // const url = URL.createObjectURL(blob);

      // const a = document.createElement("a");
      // a.href = url;
      // a.download = "speaker.webm";
      // a.click();
      // URL.revokeObjectURL(url);
      speakerAudio = [];
    }
  }
  return { speakerSession, stopMediaRecorder };
}
