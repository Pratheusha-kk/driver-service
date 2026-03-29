import requests
from behave import given, then, when
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def _assert_running(base_url: str):
    # Simple health-check by hitting the home page
    resp = requests.get(f"{base_url}", timeout=50)
    resp.raise_for_status()


def _click_nav_link(context, link_text: str):
    driver = context.driver
    wait = WebDriverWait(driver, 10)
    # Match <a> by visible link text
    link = wait.until(EC.element_to_be_clickable((By.LINK_TEXT, link_text)))
    link.click()


@given("the app is running")
def step_app_running(context):
    _assert_running(context.base_url)


@when("I open the home page")
def step_open_home(context):
    # base_url already includes /gui (see features/environment.py)
    # Use it as-is to avoid ending up at /gui/ (trailing slash).
    context.driver.get(context.base_url)


@then("I should see the home page")
def step_see_home(context):
    driver = context.driver
    wait = WebDriverWait(driver, 15)

    # Explicit waits to ensure the page is fully ready:
    # - DOM readyState is "complete"
    # - home-specific header is visible
    # - title contains expected branding
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "h1")))
    wait.until(lambda d: "ACEest" in (d.title or ""))

    assert "ACEest Fitness & Gym" in driver.page_source or "ACEest" in (driver.title or "")


@when('I click the "{tab_name}" tab')
def step_click_tab(context, tab_name):
    _click_nav_link(context, tab_name)


@then("I should see the programs page")
def step_see_programs(context):
    driver = context.driver
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "body")))
    assert "Programs" in (driver.title or "") or "Programs" in driver.page_source


@then("I should see the calories page")
def step_see_calories(context):
    driver = context.driver
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "body")))
    assert "Calories" in (driver.title or "") or "Calories" in driver.page_source
