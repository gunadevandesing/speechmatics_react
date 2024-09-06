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
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
    });

    let audioContext = new AudioContext();
    let destination = audioContext.createMediaStreamDestination();

    speakerSource = audioContext.createMediaStreamSource(stream);
    speakerSource.connect(destination);

    speakerMediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: "audio/webm",
    });

    speakerMediaRecorder.start(1000);

    speakerMediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        speakerSession.sendAudio(event.data);
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
    }
  }
  return { speakerSession, stopMediaRecorder };
}
