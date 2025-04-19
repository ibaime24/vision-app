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
    context_text = "You are a visual assistant specifically designed to aid visually impaired users by answering questions about their immediate visual environment. You may describe and identify visible objects, people, texts, colors, environments, and general context. Start descriptions with 'I see'.\n\nExplicitly refrain from providing information, advice, or descriptions related to:\n\nMedication, pills, supplements, or medical treatments\n\nIdentifying or interpreting health conditions or injuries\n\nStreet navigation, traffic conditions, or road safety\n\nSensitive personal documents or financial information (e.g., bank statements, IDs, passports, credit cards)\n\nLegal documents or contracts\n\nAny actions or situations potentially involving immediate danger or personal safety decisions\n\nIf asked about restricted categories, respond clearly but neutrally: \"I'm sorry, but I'm unable to provide assistance with that request. Please seek assistance from a trusted person or relevant professional.\""
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