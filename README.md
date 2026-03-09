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

This project includes a small **PyUnit** test suite using Python’s built-in `unittest` framework.

Run all tests:

```bash
source .venv/bin/activate
python -m unittest discover -s tests -p "test_*.py"
```

Run a single test module:

```bash
source .venv/bin/activate
python -m unittest tests.test_app
```

## Docker (containerization)

### Prerequisites

- Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- I am using Rancher Desktop

### Build the image

From the project root:

```bash
docker build -t aceest-app:latest .
```

### Run the container

```bash
docker run --rm -p 5000:5000 aceest-app:latest
```

Then open:

- http://localhost:5000
- http://localhost:5000/programs

### Run unit tests inside a container (optional)

This runs the test suite in an isolated container environment:

```bash
docker run --rm aceest-app:latest python -m unittest discover -s tests -p "test_*.py"
```

Run all tests:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

Run a single test module:

```bash
python -m unittest tests.test_app
```

## Jenkins (Pipeline)

This repo includes a `Jenkinsfile` that you can use in a Jenkins **Pipeline** job.

### Jenkins prerequisites (on the Jenkins agent)

- Python 3.x + `python3` available on PATH
- Docker installed and usable by the Jenkins agent user
- `curl` available (used for smoke testing endpoints)
- SonarQube CLI available on PATH as `sonar` (the pipeline prints `sonar --version`)

### SonarQube setup (server + secrets)

The pipeline runs `sonar analyze --file sonar-project.properties` and expects the following configuration:

1. Jenkins global config:

- Configure **Manage Jenkins → System → SonarQube servers**
- Add a server entry whose **Name** matches `SONARQUBE_SERVER` in the Jenkinsfile (default: `LocalSonar`)

2. Jenkins credentials:
   Create these credentials (type: **Secret text**):

- `sonarqube-url` — SonarQube server URL (example: `http://sonarqube:9000`)
- `sonarqube-token` — SonarQube user token

The Jenkinsfile binds them to environment variables:

- `SONAR_HOST_URL`
- `SONAR_TOKEN`

### How to hook this repo to Jenkins

1. In Jenkins, create a new item → **Pipeline**
2. Under **Pipeline** section:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: your GitHub repo URL
   - Branch: `main` (or the branch you want to build)
   - Script Path: `Jenkinsfile`
3. Save → **Build Now**

### What the Jenkins pipeline does

- Checks out code
- Runs SonarQube static analysis using `sonar-project.properties`
- Creates a Python venv and runs **PyUnit** tests
- Builds a Docker image tagged like `aceest-<build_number>`
- Runs the container and performs a basic smoke test on:
  - `GET /`
  - `GET /programs`
- Cleans up the test container and local venv
