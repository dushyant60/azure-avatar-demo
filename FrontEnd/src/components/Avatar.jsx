import "./Avatar.css";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import { createAvatarSynthesizer, createWebRTCConnection, callAzureOpenAI, startSpeechRecognition } from "./Utility";
import { avatarAppConfig } from "./config";
import { useState, useRef } from "react";
// Import FontAwesome icons (assuming you have FontAwesome included in your project)
import { FaPlug, FaTimes, FaMicrophone, FaMicrophoneSlash, FaStop } from 'react-icons/fa'; 

export const Avatar = () => {
    const [avatarSynthesizer, setAvatarSynthesizer] = useState(null);
    const [recognitionService, setRecognitionService] = useState(null);
    const [mySpeechText, setMySpeechText] = useState("");
    const [recognizedText, setRecognizedText] = useState("");
    const [responseText, setResponseText] = useState("");
    const myAvatarVideoEleRef = useRef();
    const myAvatarAudioEleRef = useRef();
    const [microphoneButtonText, setMicrophoneButtonText] = useState("Start Microphone");
    const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
    const speechRecognizerRef = useRef(null);
    const [sessionActive, setSessionActive] = useState(false);
    const iceUrl = avatarAppConfig.iceUrl;
    const iceUsername = avatarAppConfig.iceUsername;
    const iceCredential = avatarAppConfig.iceCredential;

    const handleSpeechText = (event) => {
        setMySpeechText(event.target.value);
    };

    const handleOnTrack = (event) => {
        if (event.track.kind === 'video') {
            const mediaPlayer = myAvatarVideoEleRef.current;
            mediaPlayer.srcObject = event.streams[0];
            mediaPlayer.autoplay = true;
            mediaPlayer.playsInline = true;
        } else if (event.track.kind === 'audio') {
            const audioPlayer = myAvatarAudioEleRef.current;
            audioPlayer.srcObject = event.streams[0];
            audioPlayer.autoplay = true;
            audioPlayer.muted = true;
        }
    };

    const stopSpeaking = () => {
        if (avatarSynthesizer) {
            avatarSynthesizer.stopSpeakingAsync().then(() => {
                console.log("Stop speaking request sent.");
            }).catch((error) => console.error(error));
        }
    };

    const stopSession = () => {
        if (avatarSynthesizer) {
            avatarSynthesizer.stopSpeakingAsync().then(() => {
                console.log("Stop speaking request sent.");
                avatarSynthesizer.close();
            }).catch((error) => console.error(error));
        }
    };

    const startSession = () => {
        const peerConnection = createWebRTCConnection(iceUrl, iceUsername, iceCredential);
        peerConnection.ontrack = handleOnTrack;
        peerConnection.addTransceiver('video', { direction: 'sendrecv' });
        peerConnection.addTransceiver('audio', { direction: 'sendrecv' });

        const avatarSynthesizerInstance = createAvatarSynthesizer();
        setAvatarSynthesizer(avatarSynthesizerInstance);

        peerConnection.oniceconnectionstatechange = (e) => {
            if (peerConnection.iceConnectionState === 'connected') {
                console.log("Connected to Azure Avatar service");
            } else if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
                console.log("Azure Avatar service Disconnected");
            }
        };

        avatarSynthesizerInstance.startAvatarAsync(peerConnection).then(() => {
            console.log("Avatar started.");
        }).catch((error) => {
            console.error("Avatar failed to start. Error: " + error);
        });
    };

    const cleanText = (text) => {
        return text.replace(/[*_~`]/g, '').replace(/\[doc\d+\]/g, ''); // Add more patterns as needed
    };

    const handleSpeechRecognitionResult = async (userQuery) => {
        console.log("Speech recognition", userQuery);
        setRecognizedText(userQuery);
        const response = await callAzureOpenAI(userQuery);
        console.log(`Response from OpenAI: ${response}`);
        const cleanedResponse = cleanText(response);
        setResponseText(cleanedResponse);
    
        if (avatarSynthesizer) {
            const audioPlayer = myAvatarAudioEleRef.current;
            audioPlayer.muted = false;
            avatarSynthesizer.speakTextAsync(cleanedResponse).then((result) => {
                if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    console.log("Speech and avatar synthesized to video stream.");
                } else {
                    console.error("Unable to speak. Result ID: " + result.resultId);
                    if (result.reason === SpeechSDK.ResultReason.Canceled) {
                        const cancellationDetails = SpeechSDK.CancellationDetails.fromResult(result);
                        console.error(cancellationDetails.reason);
                        if (cancellationDetails.reason === SpeechSDK.CancellationReason.Error) {
                            console.error(cancellationDetails.errorDetails);
                        }
                    }
                }
            }).catch((error) => {
                console.error("Error synthesizing speech:", error);
                avatarSynthesizer.close();
            });
        }
    };

    const handleMicrophoneClick = () => {
        if (isMicrophoneActive) {
            setMicrophoneButtonText("Stopping...");
            speechRecognizerRef.current.stopContinuousRecognitionAsync(
                () => {
                    setMicrophoneButtonText("Start Microphone");
                    setIsMicrophoneActive(false);
                },
                (err) => {
                    console.log("Failed to stop continuous recognition:", err);
                    setMicrophoneButtonText("Start Microphone");
                    setIsMicrophoneActive(false);
                }
            );
            return;
        }

        setMicrophoneButtonText("Starting...");
        speechRecognizerRef.current = new SpeechSDK.SpeechRecognizer(
            SpeechSDK.SpeechConfig.fromSubscription(avatarAppConfig.azureSpeechServiceKey, avatarAppConfig.azureSpeechServiceRegion),
            SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
        );

        speechRecognizerRef.current.recognized = async (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                let userQuery = e.result.text.trim();
                if (userQuery === '') return;

                setMicrophoneButtonText("Stopping...");
                speechRecognizerRef.current.stopContinuousRecognitionAsync(
                    () => {
                        setMicrophoneButtonText("Start Microphone");
                        setIsMicrophoneActive(false);
                    },
                    (err) => {
                        console.log("Failed to stop continuous recognition:", err);
                        setMicrophoneButtonText("Start Microphone");
                        setIsMicrophoneActive(false);
                    }
                );

                handleSpeechRecognitionResult(userQuery);
            }
        };

        speechRecognizerRef.current.startContinuousRecognitionAsync(
            () => {
                setMicrophoneButtonText("Stop Microphone");
                setIsMicrophoneActive(true);
            },
            (err) => {
                console.log("Failed to start continuous recognition:", err);
                setMicrophoneButtonText("Start Microphone");
                setIsMicrophoneActive(false);
            }
        );
    };

    return (
        <div className="avatar-container">
            <div className="avatar-card">
                <div className="avatar-video-wrapper">
                    <video ref={myAvatarVideoEleRef} className="avatar-video"></video>
                    <audio ref={myAvatarAudioEleRef}></audio>

                    <div className="avatar-controls">
                    <button className="btn connect-btn" onClick={startSession}>
                        <FaPlug /> Connect
                    </button>
                    <button className="btn disconnect-btn" onClick={stopSession}>
                        <FaTimes /> Disconnect
                    </button>
                    <button className="btn mic-btn" onClick={handleMicrophoneClick}>
                        {isMicrophoneActive ? <FaMicrophoneSlash /> : <FaMicrophone />} {microphoneButtonText}
                    </button>
                    <button className="btn stop-btn" onClick={stopSpeaking}>
                        <FaStop /> Stop Speaking
                    </button>
                </div>
                </div>
              
                <div className="chat-section">
                    <div className="chat-bubble user-query">
                        <p>Recognized: {recognizedText}</p>
                    </div>
                    <div className="chat-bubble bot-response">
                        <p>Response: {responseText}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
