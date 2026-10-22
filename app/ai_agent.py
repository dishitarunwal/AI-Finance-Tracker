import google.generativeai as genai
import os
import json
from dotenv import load_dotenv
from .config import settings
# Load environment variables
load_dotenv()

# Configure the Gemini API
api_key = os.getenv("GEMINI_API_KEY")   
if not api_key:
    raise ValueError("GEMINI_API_KEY is not set in .env file")

genai.configure(api_key=api_key)

def predict_category(description: str) -> dict:
    """
    Analyzes a transaction description using Gemini 1.5 Flash.
    Returns a dictionary with:
      - 'id': The predicted Category ID (1-7) or 0 if unknown.
      - 'confidence': A float between 0.0 and 1.0 indicating certainty.
    """
    try:
        # Use the Flash model for speed and cost-efficiency
        model = genai.GenerativeModel(settings.gemini_model_name)
        
        # The Prompt: Explicitly asks for JSON format with a confidence score
        prompt = f"""
        You are a financial AI assistant. Your task is to categorize a bank transaction description into one of the following ID categories:
        
        1: Food & Dining (Groceries, Restaurants, Fast Food)
        2: Transportation (Uber, Gas, Flight, Bus, Train)
        3: Utilities (Rent, Electricity, Internet, Phone)
        4: Shopping (Clothes, Electronics, Home Goods, Amazon)
        5: Entertainment (Movies, Games, Netflix, Events)
        6: Healthcare (Doctor, Pharmacy, Gym)
        7: Income (Salary, Freelance, Deposit, Refund)
        
        Transaction Description: "{description}"
        
        Rules:
        1. Analyze the description context.
        2. Assign the most appropriate Category ID (1-7).
        3. Provide a Confidence Score between 0.0 and 1.0 (e.g., 0.95 for clear matches like "Walmart", 0.4 for vague ones).
        4. If the description is completely unrecognizable or random text, return ID 0 and Confidence 0.0.
        
        Output Format:
        Return ONLY a raw JSON object. Do not include markdown formatting (like ```json).
        Example: {{"id": 2, "confidence": 0.95}}
        """
        
        # Generate response
        response = model.generate_content(prompt)
    except Exception as e:
        print(f"⚠️ Primary Model {settings.gemini_model_name} failed. Retrying with fallback...")
        # 2. Fallback to a stable alias if the specific version fails
        try:
            fallback_model = genai.GenerativeModel('gemini-2.0-flash')
            response = fallback_model.generate_content(prompt)
        except Exception as e2:
             print(f"❌ Critical AI Failure: {e2}")
             return {"id": 0, "confidence": 0.0}
    
    try:
        # Clean the response text (remove potential markdown wrappers)
        raw_text = response.text.strip().replace("```json", "").replace("```", "")
        
        # Parse JSON
        result = json.loads(raw_text)
        
        # Safety checks to ensure keys exist
        category_id = int(result.get("id", 0))
        confidence = float(result.get("confidence", 0.0))
        
        return {"id": category_id, "confidence": confidence}

    except json.JSONDecodeError:
        print(f"❌ AI Error: Could not parse JSON response for '{description}'")
        return {"id": 0, "confidence": 0.0}
        
    except Exception as e:
        print(f"❌ AI Critical Error: {str(e)}")
        return {"id": 0, "confidence": 0.0}

# --- Quick Test Block (Runs only if you execute this file directly) ---
if __name__ == "__main__":
    test_descriptions = [
        "Uber ride to airport",
        "McDonalds",
        "Payment for AWS Server", # Tricky one
        "Salary Credited"
    ]
    
    print("--- 🧪 Testing AI Agent ---")
    for desc in test_descriptions:
        prediction = predict_category(desc)
        print(f"Input: '{desc}' -> Output: {prediction}")