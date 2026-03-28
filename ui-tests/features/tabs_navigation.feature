Feature: Tab navigation
  As a user
  I want to click each tab in the navbar
  So that I can navigate between pages and see the correct UI

  Scenario: Click each tab and validate the destination page renders
    Given the app is running
    When I open the home page
    Then I should see the home page

