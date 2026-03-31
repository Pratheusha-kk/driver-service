# aceest-app

ACEest Fitness & Gym — a minimal Flask web **app + API** used as the base application for the DevOps assignment (version control, testing, Docker, CI/CD, and basic UI + API testing).

## What this project contains

- **Flask application** (`app.py`)
  - JSON API endpoints
  - HTML GUI using Jinja2 templates (`templates/`, `static/styles.css`)
- **Dependencies** (`requirements.txt`)
- **Unit and integration tests (unittest / PyUnit)** (`tests/`)
- **UI tests (BDD with Behave + Selenium)** (`ui-tests/`)
- **Dockerfile** for containerization
- **Jenkinsfile** for CI pipeline
- **SonarQube** configuration (`sonar-project.properties`)

---

## Application features

### JSON API endpoints

- `GET /`  
  Health message for the API.

  ```bash
  curl http://localhost:5000/
  ```

  Response:

  ```json
  { "message": "ACEest Fitness & Gym API is running" }
  ```

- `GET /health`  
  Simple health probe for monitoring.

  ```bash
  curl http://localhost:5000/health
  ```

  Example response:

  ```json
  { "status": "healthy" }
  ```

- `GET /programs`  
  Returns the full catalog of programs with description, workout, diet, color, and calorie factor.

  ```bash
  curl http://localhost:5000/programs
  ```

- `GET /programs/<program_name>`  
  Returns details of a single program.

  ```bash
  curl "http://localhost:5000/programs/Fat Loss (FL)"
  ```

- `GET /estimate-calories`  
  Estimates calories based on a selected program and body weight in kg.

  **Query parameters:**
  - `program` — one of the keys in the `PROGRAMS` catalog (e.g. `Fat Loss (FL)`)
  - `weight_kg` — number > 0

  **Example:**

  ```bash
  curl "http://localhost:5000/estimate-calories?program=Fat%20Loss%20(FL)&weight_kg=80"
  ```

  Example response:

  ```json
  {
    "program": "Fat Loss (FL)",
    "weight_kg": 80,
    "calorie_factor": 22,
    "calories_kcal": 1760
  }
  ```

### Web GUI (HTML)

The app also exposes a simple HTML GUI over the same data:

- `GET /gui`  
  Home page with navigation tiles for browsing programs and estimating calories.

- `GET /gui/programs`  
  Grid view of all programs (name, description, color).

- `GET /gui/programs/<program_name>`  
  Detailed page for a specific program (workout + diet details).

- `GET /gui/calories`  
  Calorie estimator web form:
  - Select a program
  - Enter weight (kg)
  - View calculated calories and inputs

---

## Prerequisites

- **Python 3.x** (recommended: 3.10+)
- `pip`
- macOS / Linux / Windows (commands below show macOS/Linux; Windows notes included)
- (Optional) **Docker** if you want to build and run the container
- (Optional) **Google Chrome** + **ChromeDriver** (or compatible browser/driver) for UI tests

---

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
- http://127.0.0.1:5000

---

## API Usage (quick examples)

### Health

```bash
curl http://localhost:5000/
curl http://localhost:5000/health
```

### Programs

```bash
curl http://localhost:5000/programs
curl "http://localhost:5000/programs/Fat Loss (FL)"
```

### Estimate calories (API)

```bash
curl "http://localhost:5000/estimate-calories?program=Beginner%20(BG)&weight_kg=70"
```

---

## Web GUI usage

Once the app is running:

- Home: http://localhost:5000/gui
- Programs list: http://localhost:5000/gui/programs
- Program detail: click any program from the list
- Calorie estimator: http://localhost:5000/gui/calories

---

## Running tests

### 1) Unit + integration tests (unittest / PyUnit)

This project includes unit tests and a small integration test suite using Python’s built-in `unittest` framework.

Activate your virtualenv, then:

Run all tests:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

Run a single test module:

```bash
python -m unittest tests.test_app
python -m unittest tests.test_integration
```

### 2) UI tests (Behave + Selenium)

UI tests are located under `ui-tests/` and use **Behave** (Cucumber-style BDD) with Selenium.

#### Setup

1. (Recommended) Create/activate a virtualenv
2. Install UI test dependencies:

   ```bash
   pip install -r ui-tests/requirements.txt
   ```

3. Ensure Chrome + ChromeDriver (or another supported browser/driver) are installed and on your PATH.

#### Run the app

In one terminal:

```bash
python app.py
```

By default the UI tests expect the app at `http://127.0.0.1:5000`.

#### Run UI tests

In another terminal:

```bash
behave ui-tests/features
```

You can override the base URL:

```bash
BASE_URL=http://127.0.0.1:5000 behave ui-tests/features
```

Notes:

- Uses headless Chrome by default (configured in `ui-tests/features/environment.py`).

---

## Docker (containerization)

### Prerequisites

- Docker Desktop (macOS/Windows) or Docker Engine (Linux)

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
- http://localhost:5000/gui
- http://localhost:5000/programs
- http://localhost:5000/estimate-calories?program=Beginner%20(BG)&weight_kg=70

### Run unit tests inside a container (optional)

This runs the Python test suite in an isolated container environment:

```bash
docker run --rm aceest-app:latest python -m unittest discover -s tests -p "test_*.py"
```

---

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
  - `GET /health`
  - `GET /programs`
  - `GET /estimate-calories`
- Cleans up the test container and local venv
