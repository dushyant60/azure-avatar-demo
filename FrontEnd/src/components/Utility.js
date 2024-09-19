
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import { avatarAppConfig } from "./config";

const { cogSvcRegion, cogSvcSubKey, voiceName, avatarCharacter, avatarStyle, avatarBackgroundColor, azureOpenAIEndpoint, azureOpenAIKey, azureSpeechServiceKey, azureSpeechServiceRegion } = avatarAppConfig;

export const createWebRTCConnection = (iceServerUrl, iceServerUsername, iceServerCredential) => {
    return new RTCPeerConnection({
        iceServers: [{
            urls: [iceServerUrl],
            username: iceServerUsername,
            credential: iceServerCredential
        }]
    });
};

export const createAvatarSynthesizer = () => {
    const speechSynthesisConfig = SpeechSDK.SpeechConfig.fromSubscription(cogSvcSubKey, cogSvcRegion);
    speechSynthesisConfig.speechSynthesisVoiceName = voiceName;

    const videoFormat = new SpeechSDK.AvatarVideoFormat();
    videoFormat.setCropRange(new SpeechSDK.Coordinate(600, 50), new SpeechSDK.Coordinate(1320, 1080));

    const avatarConfig = new SpeechSDK.AvatarConfig(avatarCharacter, avatarStyle, videoFormat);
    avatarConfig.backgroundColor = avatarBackgroundColor;
    const avatarSynthesizer = new SpeechSDK.AvatarSynthesizer(speechSynthesisConfig, avatarConfig);

    avatarSynthesizer.avatarEventReceived = (s, e) => {
        const offsetMessage = e.offset === 0 ? "" : `, offset from session start: ${e.offset / 10000}ms.`;
        console.log(`[${new Date().toISOString()}] Event received: ${e.description}${offsetMessage}`);
    };

    return avatarSynthesizer;
};

// export const callAzureOpenAI = async (userSpeechText) => {
//     const fallbackText = "नमस्ते, मैं एआई असिस्टेंट हूं आपकी मदद कैसे करें";
//     try {
//     //   const response = await fetch(`https://azureopenaiol.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2023-06-01-preview`, {
//         const response = await fetch(`https://web-dpxjzr3ghqbg4-docker-testversion.azurewebsites.net/api/conversation`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         //   'api-key': 'fdb12bb67a764cd2b74676dd5afa58d3',
//         },
//         body: JSON.stringify({
//         //   messages: [
//         //     { role: 'system', content: 'You are an AI assistant that helps people find information.' },
//         //     { role: 'user', content: userSpeechText }
//         //   ],
//         //   max_tokens: 150
//         conversation_id:conversation_id,
//         messages: userSpeechText,
//         })
//       });
  
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
  
//       const data = await response.json();
//       return data.choices[0].message.content;
//     } catch (error) {
//       console.error("API call failed:", error);
//       return fallbackText;
//     }
//   };
  
// Utility function to generate a UUID
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  export const callAzureOpenAI = async (userSpeechText) => {
    const fallbackText = "नमस्ते, मैं एआई असिस्टेंट हूं आपकी मदद कैसे करें";
    try {
      const conversationId = generateUUID(); // Generate a random UUID for the conversation ID
  
      const response = await fetch(`https://web-dpxjzr3ghqbg4-docker-testversion.azurewebsites.net/api/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId, // Use the generated conversation ID
          messages: [
            {
              role: 'user',
              content: userSpeechText // Include the user's message
            }
          ]
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      // Extract and return the specific content from the API response
      const content = data.choices[0].messages.find(message => message.role === 'assistant')?.content || fallbackText;
      return content;
    } catch (error) {
      console.error("API call failed:", error);
      return fallbackText;
    }
  };
    

let isRecognitionStarted = false;

export const startSpeechRecognition = (onResult) => {
    console.log('Start recognition', onResult);
    if (isRecognitionStarted) return; // Prevent starting recognition if it's already running

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(azureSpeechServiceKey, azureSpeechServiceRegion);
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            onResult(e.result.text);
        } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
            console.log("No speech could be recognized.");
        } else if (e.result.reason === SpeechSDK.ResultReason.Canceled) {
            const cancellationDetails = SpeechSDK.CancellationDetails.fromResult(e.result);
            console.error(`Speech Recognition canceled: ${cancellationDetails.reason}`);
            if (cancellationDetails.reason === SpeechSDK.CancellationReason.Error) {
                console.error(cancellationDetails.errorDetails);
            }
        }
    };

    recognizer.startContinuousRecognitionAsync();

    // Set the flag to true once recognition starts
    isRecognitionStarted = true;

    // Optional: Reset the flag when recognition is stopped or canceled
    recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.Canceled) {
            isRecognitionStarted = false;
        }
    };
};
