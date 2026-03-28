# UI Tests (Cucumber / Behave)

This folder contains UI automation tests written using **Behave** (Cucumber for Python) + **Selenium**.

## Setup

1. Create/activate a virtualenv (recommended)
2. Install dependencies:

```bash
pip install -r ui-tests/requirements.txt
```

## Run the app

In a separate terminal, start the Flask app:

```bash
python app.py
```

By default, these tests assume the app is running at: `http://127.0.0.1:5000`

## Run UI tests

```bash
behave ui-tests/features
```

## Notes

- Uses headless Chrome by default.
- You can override the base URL:

```bash
BASE_URL=http://127.0.0.1:5000 behave ui-tests/features
```
