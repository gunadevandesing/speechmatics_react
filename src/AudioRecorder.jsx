import { RealtimeSession } from "speechmatics";
import { getJwt } from "./utils/auth";

//create a function to create a new session and return it
export async function createMicrophoneSession(
  transcription_config,
  messageHandler
) {
  const session = new RealtimeSession({
    apiKey: async () => {
      const response = await getJwt();
      return response;
    },
  });
  let mediaRecorder;
  let microphoneSource;

  session.addListener("RecognitionStarted", () => {
    console.log("RecognitionStarted");
  });

  session.addListener("Error", (error) => {
    console.log("session error", error);
    alert("Something went wrong in Agent audio");
  });

  session.addListener("AddTranscript", (message) => {
    messageHandler(message?.metadata?.transcript);
  });

  session.addListener("EndOfTranscript", () => {
    console.log("EndOfTranscript");
  });

  session.start({ transcription_config }).then(async () => {
    //setup audio stream
    let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let audioContext = new AudioContext();
    let destination = audioContext.createMediaStreamDestination();

    microphoneSource = audioContext.createMediaStreamSource(stream);
    microphoneSource.connect(destination);

    mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 16000,
    });

    mediaRecorder.start(1000);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        session.sendAudio(event.data);
      }
    };
  });

  function stopMediaRecorder() {
    if (mediaRecorder) {
      mediaRecorder?.stop();
      mediaRecorder?.stream?.getTracks()?.forEach((track) => track?.stop());
      mediaRecorder = null;

      microphoneSource.disconnect();
      microphoneSource?.mediaStream
        ?.getTracks()
        ?.forEach((track) => track?.stop());
      microphoneSource = null;
    }
  }
  return { session, stopMediaRecorder };
}
