import os

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service


def before_all(context):
    base_url = os.environ.get("BASE_URL", "http://127.0.0.1:5000/gui")
    context.base_url = base_url.rstrip("/")

    options = Options()
    # headless by default (can be overridden by HEADLESS=0)
    headless_env = os.environ.get("HEADLESS", "1").strip().lower()
    headless = headless_env not in ("0", "false", "no", "off")
    if headless:
        # For modern Chrome versions; if your image has an older Chrome, switch to "--headless"
        options.add_argument("--headless=new")

    options.add_argument("--window-size=1400,900")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    # Rely on chromedriver being on PATH (Selenium 4.6+ can often autodetect)
    service = Service()
    context.driver = webdriver.Chrome(service=service, options=options)
    context.driver.implicitly_wait(5)


def after_all(context):
    if hasattr(context, "driver") and context.driver:
        context.driver.quit()
