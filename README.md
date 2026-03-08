# aceest-app

ACEest Fitness & Gym — a minimal Flask web API used as the base application for the DevOps assignment (version control, testing, Docker, CI/CD).

## What this project contains

- **Flask API** (`app.py`)
- **Dependencies** (`requirements.txt`)
- **Unit tests (PyUnit)** (`tests/test_app.py`)
- Currently exposed endpoints:
  - `GET /` — health check message
  - `GET /programs` — sample fitness programs with calorie factors

## Prerequisites

- **Python 3.x** (recommended: 3.10+)
- `pip`
- macOS / Linux / Windows (commands below show macOS/Linux; Windows notes included)

## Local setup (run on localhost)

### 1) Create and activate a virtual environment

macOS / Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

Windows (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2) Install dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 3) Run the application

```bash
python app.py
```

The app will start on:

- http://localhost:5000

## API Usage

### Health check

```bash
curl http://localhost:5000/
```

Expected response:

```json
{ "message": "ACEest Fitness & Gym API is running" }
```

### Programs list

```bash
curl http://localhost:5000/programs
```

Example response (trimmed):

```json
{
  "Fat Loss (FL)": { "description": "Fat loss program", "calorie_factor": 22 },
  "Muscle Gain (MG)": {
    "description": "Muscle gain program",
    "calorie_factor": 35
  },
  "Beginner (BG)": { "description": "Beginner program", "calorie_factor": 26 }
}
```

## Running unit tests (unittest / PyUnit)

Run all tests:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

Run a single test module:

```bash
python -m unittest tests.test_app
```
