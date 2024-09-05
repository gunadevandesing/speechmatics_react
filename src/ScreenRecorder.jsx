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

  session.addListener("RecognitionStarted", () => {
    console.log("RecognitionStarted");
  });

  session.addListener("Error", (error) => {
    console.log("session error", error);
  });

  session.addListener("AddTranscript", async (message) => {
    // console.log("AddTranscript", message);
    await messageHandler(message?.metadata?.transcript);
  });

  session.addListener("EndOfTranscript", () => {
    console.log("EndOfTranscript");
  });

  session.start({ transcription_config }).then(async () => {
    //setup audio stream
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.start(1000);

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        await session.sendAudio(event.data);
      }
    };
  });
  function stopMediaRecorder() {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
  }
  return { session, stopMediaRecorder };
}
