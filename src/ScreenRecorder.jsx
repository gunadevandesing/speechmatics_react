import { RealtimeSession } from "speechmatics";
import { getJwt } from "./utils/auth";

//create a function to create a new session and return it
export async function createScreenSession(
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
  let audioContext = new AudioContext();
  let destination = audioContext.createMediaStreamDestination();
  let speakerSource;

  session.addListener("RecognitionStarted", () => {
    console.log("RecognitionStarted");
  });

  session.addListener("Error", (error) => {
    console.log("session error", error);
    alert("Something went wrong in User audio");
  });

  session.addListener("AddTranscript", async (message) => {
    await messageHandler(message?.metadata?.transcript);
  });

  session.addListener("EndOfTranscript", () => {
    console.log("EndOfTranscript");
  });

  session.start({ transcription_config }).then(async () => {
    //setup audio stream
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
    });

    speakerSource = audioContext.createMediaStreamSource(stream);
    speakerSource.connect(destination);

    mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: "audio/webm",
    });

    mediaRecorder.start(1000);

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        await session.sendAudio(event.data);
      }
    };
  });
  function stopMediaRecorder() {
    if (mediaRecorder) {
      mediaRecorder?.stop();
      mediaRecorder?.stream?.getTracks()?.forEach((track) => track?.stop());

      speakerSource?.disconnect();
      speakerSource?.mediaStream
        ?.getTracks()
        ?.forEach((track) => track?.stop());

      audioContext?.close();
      mediaRecorder = null;
      speakerSource = null;
    }
  }
  return { session, stopMediaRecorder };
}
