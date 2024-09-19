import React, { useState } from 'react';  
import styled from 'styled-components';  
  
const Container = styled.div`  
  background-color: rgba(255, 255, 255, 0.8);  
  padding: 20px;  
  border-radius: 10px;  
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);  
  text-align: center;  
  max-width: 500px;  
  width: 100%; 
  margin: auto; 
`;  
  
const Heading = styled.h1`  
  color: #007bff;  
  font-size: 2.5rem;  
  margin-bottom: 20px;  
`;  
  
const StyledVideo = styled.video`  
  border: 4px solid #fff;  
  border-radius: 12px;  
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);  
`;  
  
const StyledButton = styled.button`  
  margin: 10px 0;  
  padding: 12px;  
  border: none;  
  border-radius: 6px;  
  font-size: 16px;  
  width: 100%;  
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);  
  transition: all 0.3s ease;  
  background-color: #007bff;  
  color: white;  
  font-weight: bold;  
  text-transform: uppercase;  
  letter-spacing: 1px;  
  &:hover {  
    background-color: #0056b3;  
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);  
    transform: translateY(-3px);  
  }  
`;  
  
const StyledTextarea = styled.textarea`  
  margin: 10px 0;  
  padding: 12px;  
  border: 1px solid #ccc;  
  border-radius: 6px;  
  resize: none;  
  font-size: 14px;  
  box-sizing: border-box;  
  height: 80px;  
  width: 100%;  
`;  
  
const Status = styled.div`  
  margin-top: 20px;  
  font-size: 18px;  
  color: #333;  
`;  
  
const VideoUploadAndAnalyze = () => {  
  const [videoSrc, setVideoSrc] = useState('');  
  const [userPrompt, setUserPrompt] = useState('');  
  const [status, setStatus] = useState('');  
  const videoRef = React.createRef();  
  const canvas = document.createElement('canvas');  
  const ctx = canvas.getContext('2d');  
  
  const handleVideoUpload = (event) => {  
    const file = event.target.files[0];  
    if (file) {  
      const url = URL.createObjectURL(file);  
      setVideoSrc(url);  
      setStatus('Video loaded. You can now enter a prompt.');  
    }  
  };  
  
  const handleSend = async () => {  
    if (!videoRef.current || videoRef.current.ended) {  
      setStatus('No video playing. Please upload a video.');  
      return;  
    }  
  
    if (!userPrompt) {  
      setStatus('User prompt is empty. Please enter a question.');  
      return;  
    }  
  
    // Capture the current frame  
    canvas.width = videoRef.current.videoWidth;  
    canvas.height = videoRef.current.videoHeight;  
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);  
    const capturedFrame = canvas.toDataURL('image/jpeg').split(',')[1]; // Base64 encoded frame  
  
    setStatus('Sending data...');  
    setUserPrompt(''); // Clear the textbox  
  
    // Send the captured frame and user prompt to the backend  
    fetch('http://localhost:7000/analyze/', {  
      method: 'POST',  
      headers: {  
        'Content-Type': 'application/json',  
      },  
      body: JSON.stringify({ frame: capturedFrame, prompt: userPrompt }), 
    })  
      .then(response => response.json())  
      .then(data => {  
        setStatus(data.message);  
      })  
      .catch(error => {  
        setStatus('Error sending data.');  
        console.error('Error:', error);  
      });  
  };  
  
  return (  
    <Container>  
      <Heading>Video Upload and Analyze</Heading>  
      <input type="file" accept="video/*" onChange={handleVideoUpload} />  
      <StyledVideo ref={videoRef} src={videoSrc} width="440" height="380" controls muted/>  
      <StyledTextarea  
        value={userPrompt}  
        onChange={(e) => setUserPrompt(e.target.value)}  
        placeholder="Enter your question here..."  
      />  
      <StyledButton onClick={handleSend}>Send</StyledButton>  
      <Status>{status}</Status>  
    </Container>  
  );  
};  
  
export default VideoUploadAndAnalyze;  
