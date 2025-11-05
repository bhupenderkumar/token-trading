import os
from openrouter import Client

def get_llm_decision(data):
    """
    Gets a trading decision from the LLM.
    """
    client = Client(api_key=os.getenv("OPENROUTER_API_KEY"))

    # Example prompt, to be refined
    prompt = f"""
    Given the following trade data, should I execute a trade?
    Respond with only "yes" or "no".

    Data: {data}
    """

    try:
        response = client.chat.completions.create(
            model="openrouter/auto",  # Or a specific model
            messages=[
                {"role": "system", "content": "You are a trading advisor."},
                {"role": "user", "content": prompt},
            ],
        )
        decision = response.choices[0].message.content.strip().lower()
        return decision == "yes"
    except Exception as e:
        print(f"Error getting LLM decision: {e}")
        return False
