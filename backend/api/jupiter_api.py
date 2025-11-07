import requests

JUPITER_LITE_TOKENS_URL = "https://quote-api.jup.ag/v6/tokens"

def get_all_jupiter_tokens():
	"""
	Fetch all token details from Jupiter Lite API.
	Returns:
		list: List of token details (dicts)
	"""
	try:
		response = requests.get(JUPITER_LITE_TOKENS_URL)
		response.raise_for_status()
		return response.json()
	except Exception as e:
		return {"error": str(e)}
