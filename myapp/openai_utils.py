import os
import base64
import openai
from typing import Optional

# You can also load from environment variables directly via Heroku config vars
openai.api_key = os.environ.get("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY")

def analyze_image_with_openai(base64_image: str, text: Optional[str] = None) -> str:
    """
    Send the base64 image (and optional text prompt) to a GPT-4 vision endpoint.
    Returns the model's text description.
    """
    context_text = "You are Son, a concise yet informative vision assistant for the visually impaired. Start descriptions with 'I see'"
    user_text = text if text else "What do you see in this image?"

    # Set up the messages array
    messages = [
        {
            "role": "system",
            "content": context_text
        },
        {
            "role": "user", 
            "content": [
                {
                    "type": "text",
                    "text": user_text
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}",
                        "detail": "low"
                    }
                }
            ]
        }
    ]

    # Make the call
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=300
    )

    # Grabbing the text from the first choice
    result = response.choices[0].message.content
    return result