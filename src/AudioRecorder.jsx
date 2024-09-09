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
  let micMediaRecorder;
  let microphoneSource;
  let microphoneAudio = [];

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

    let audioDevices = await navigator.mediaDevices.enumerateDevices();
    
    let microphoneDevices = audioDevices.filter(
      (device) => device?.kind === "audioinput"
    );
console.log({microphoneDevices})
    let defaultDevice = microphoneDevices.find(
      (device) => device?.deviceId === "default"
    );

    let micDevice = microphoneDevices.find(
      (device) => device?.label === defaultDevice?.label?.split("Default - ")[1]
    );  

console.log({micDevice});
    let micStream = await navigator.mediaDevices.getUserMedia({ audio: 
      {
        deviceId:micDevice?.deviceId ?? undefined,
        echoCancellation: true,
        noiseSuppression:true,
        autoGainControl:true,
      }
     });

     let micAudioContext = new AudioContext();
     let micDestination = micAudioContext.createMediaStreamDestination();

     microphoneSource = micAudioContext.createMediaStreamSource(micStream);
     microphoneSource.connect(micDestination);

     micMediaRecorder = new MediaRecorder(micDestination.stream, {
      mimeType: "audio/webm",
    });

    micMediaRecorder.start(1000);

    micMediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        session.sendAudio(event.data);
        microphoneAudio.push(event.data);
      }
    };
  });

  function stopMediaRecorder() {
    if (micMediaRecorder) {
      micMediaRecorder?.stop();
      micMediaRecorder?.stream?.getTracks()?.forEach((track) => track?.stop());
      micMediaRecorder = null;

       microphoneSource.disconnect();
       microphoneSource?.mediaStream
         ?.getTracks()
         ?.forEach((track) => track?.stop());
       microphoneSource = null;

      // const blob = new Blob(microphoneAudio, { type: "audio/webm" });
      // const url = URL.createObjectURL(blob);

      // const a = document.createElement("a");
      // a.href = url;
      // a.download = "mic.webm";
      // a.click();
      // URL.revokeObjectURL(url);
      microphoneAudio = [];

    }
  }
  return { session, stopMediaRecorder };
}
