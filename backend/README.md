# Python Backend for Trading Bot

This backend is a Python application using FastAPI to provide an API for managing Solana tokens. It also includes a module for getting trading decisions from an LLM via OpenRouter.

## Setup

1.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Environment Variables:**
    Create a `.env` file in this directory and add your OpenRouter API key:
    ```
    OPENROUTER_API_KEY=your_openrouter_api_key
    ```

3.  **Run Locally:**
    You can run the FastAPI server locally by running:
    ```bash
    uvicorn main:app --reload
    ```
    The API will be available at `http://127.0.0.1:8000`.

## API Documentation

FastAPI automatically generates API documentation. Once the server is running, you can access it at:
-   **Swagger UI**: `http://127.0.0.1:8000/docs`
-   **ReDoc**: `http://127.0.0.1:8000/redoc`

## Deployment

This FastAPI application can be deployed to various platforms, including AWS (e.g., on EC2, ECS, or using a container service like App Runner).

## Trading Decision Job

The `job.py` script runs a continuous loop to fetch trading data and get a decision from the LLM every minute.

To run the job:
```bash
python job.py
```
