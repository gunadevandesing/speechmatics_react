import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { createMicrophoneSession } from "./AudioRecorder";
import { createScreenSession } from "./ScreenRecorder";

const transcription_config = {
  language: "en",
  diarization: "speaker",
  operating_point: "enhanced",
  // enable_partials: true,
  max_delay: 1,
};
const nullValues = [null, undefined, ""];

function App() {
  const sessionRef = useRef({});
  const screenSessionRef = useRef({});

  const [conversation, setConversation] = useState([]);
  const [transcriptConfig, setTranscriptConfig] =
    useState(transcription_config);
  const [status, setStatus] = useState("stopped");

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleMessage = useCallback((type, text) => {
    console.log({ type, text });
    setConversation((prevConversation) => {
      const lastMessageIndex = prevConversation.length - 1;
      let lastMessageFrom = prevConversation[lastMessageIndex]?.type ?? "";

      if (lastMessageFrom === "") {
        return [...prevConversation, { type, text }];
      } else {
        if (lastMessageFrom === type) {
          let lastMessage = { ...prevConversation[lastMessageIndex] };
          lastMessage.text += text;
          let newConversation = [...prevConversation];
          newConversation[lastMessageIndex] = lastMessage;
          return newConversation;
        } else {
          return [...prevConversation, { type, text }];
        }
      }
    });
  }, []);

  const handelMicrophoneTranscription = (micMessage) => {
    if (
      !nullValues.includes(micMessage) &&
      !["", "."].includes(micMessage.trim())
    ) {
      handleMessage("Agent", micMessage);
    }
  };

  const handelScreenTranscription = (speakerMessage) => {
    if (
      !nullValues.includes(speakerMessage) &&
      !["", "."].includes(speakerMessage.trim())
    ) {
      handleMessage("User", speakerMessage);
    }
  };

  const startTranscription = async () => {
    await (async () => {
      sessionRef.current = await createMicrophoneSession(
        transcriptConfig,
        handelMicrophoneTranscription
      );
      screenSessionRef.current = await createScreenSession(
        transcriptConfig,
        handelScreenTranscription
      );
    })();

    setStatus("started");
  };

  const stopTranscription = async () => {
    sessionRef?.current?.session.stop();
    sessionRef?.current?.stopMediaRecorder();
    screenSessionRef?.current?.speakerSession?.stop();
    screenSessionRef?.current?.stopMediaRecorder();

    sessionRef.current = {};
    screenSessionRef.current = {};
    setStatus("stopped");
  };

  const handleReset = () => {
    sessionRef.current = {};
    screenSessionRef.current = {};
    setConversation([]);
  };

  return (
    <>
      <div className="action-buttons">
        <select
          disabled={status === "started"}
          onChange={(e) => {
            setTranscriptConfig((prevConfig) => ({
              ...prevConfig,
              language: e.target.value,
            }));
          }}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
        <button
          type="button"
          onClick={startTranscription}
          disabled={status === "started"}
        >
          Start
        </button>
        <button
          type="button"
          onClick={stopTranscription}
          disabled={status === "stopped"}
        >
          Stop
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={status === "started"}
        >
          Reset
        </button>
      </div>
      <div
        className="conversation-container"
        id="chat-container"
        ref={containerRef}
      >
        {conversation.map((message, index) => (
          <div key={index} className={message.type}>
            <strong>{message.type}: </strong>
            <span>{message.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
