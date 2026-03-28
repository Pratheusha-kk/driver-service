import os

from selenium import webdriver
from selenium.webdriver.chrome.options import Options


def before_all(context):
    base_url = os.environ.get("BASE_URL", "http://127.0.0.1:5000/gui")
    context.base_url = base_url.rstrip("/")

    options = Options()
    # headless by default (can be overridden by HEADLESS=0)
    headless_env = os.environ.get("HEADLESS", "1").strip().lower()
    headless = headless_env not in ("0", "false", "no", "off")
    if 0:
        options.add_argument("--headless=new")

    options.add_argument("--window-size=1400,900")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    context.driver = webdriver.Chrome(options=options)
    context.driver.implicitly_wait(5)


def after_all(context):
    if hasattr(context, "driver") and context.driver:
        context.driver.quit()
