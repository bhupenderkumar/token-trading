import time
from dotenv import load_dotenv
from config import JOB_INTERVAL_SECONDS
from llm import get_llm_decision

load_dotenv()

def get_trade_data():
    """
    Placeholder function to get trade data.
    In a real application, this would fetch data from an API or other source.
    """
    print("Fetching trade data...")
    # For now, return some mock data
    return {
        "trades": [
            {"id": 1, "token": "BTC", "amount": 0.5, "price": 60000},
            {"id": 2, "token": "ETH", "amount": 10, "price": 4000},
        ],
        "market_sentiment": "bullish"
    }

def run_job():
    """
    Runs the trading decision job.
    """
    print("Starting trading decision job...")
    while True:
        trade_data = get_trade_data()
        decision = get_llm_decision(trade_data)

        if decision:
            print("LLM decision: TRADE")
            # TODO: Implement trading logic here
        else:
            print("LLM decision: DO NOT TRADE")

        print(f"Waiting for {JOB_INTERVAL_SECONDS} seconds...")
        time.sleep(JOB_INTERVAL_SECONDS)

if __name__ == "__main__":
    run_job()
