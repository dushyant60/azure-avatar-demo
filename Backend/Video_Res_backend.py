from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
 
app = FastAPI()
 
# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to allow specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
API_ENDPOINT = 'https://8f77-4-247-150-104.ngrok-free.app/api/conversation'
CONVERSATION_ID = '7e5a4f25-4ff8-4632-b9b3-3306d6f4a17d'
 
@app.post("/analyze/")
async def analyze(request: Request):
    data = await request.json()
    frame = data.get('frame')
    user_prompt = data.get('prompt', "")
    # print(frame)
    if not frame:
        raise HTTPException(status_code=400, detail="No frames received")
 
    if not user_prompt:
        raise HTTPException(status_code=400, detail="No user prompt provided")
 
    # Analyze frames and user prompt with the model
    description = await analyze_frames_with_gpt(frame, user_prompt)
    return {"message": description}
 
async def analyze_frames_with_gpt(frame, user_prompt):
    SYSTEM_PROMPT = 'Based on the images and the knowledge store data that you have, answer to user queries..'
 
    image_content ={
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{frame}",
                "detail": "low"
            }
        }
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": [
            {"type": "text", "text": user_prompt},
            image_content
        ]}
    ]
    print(messages)
    
 
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                API_ENDPOINT,
                json={
                    "conversation_id": CONVERSATION_ID,
                    "messages": messages
                },
                timeout=90.0  # Set a timeout of 30 seconds
            )
            response.raise_for_status()  # Raise an exception for HTTP errors
            response_data = response.json()
           
            # Log the full response data
            print("Full Response Data:", response_data)
 
            if response_data and response_data.get('choices'):
                bot_message = response_data['choices'][0]['messages'][1]['content']
                return bot_message
            else:
                return f"Unexpected response structure: {response_data}"
        except httpx.TimeoutException:
            return "Request timed out. The server took too long to respond."
        except httpx.HTTPStatusError as e:
            return f"HTTP error occurred: {e.response.status_code} - {e.response.text}"
        except httpx.RequestError as e:
            return f"An error occurred while requesting: {str(e)}"
        except Exception as e:
            return f"An unexpected error occurred: {str(e)}"
 
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=7000)