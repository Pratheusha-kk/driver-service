import unittest

from app import app


class AceestAppTestCase(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_index_returns_health_message(self):
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.is_json, True)
        self.assertEqual(resp.get_json(), {"message": "ACEest Fitness & Gym API is running"})

    def test_programs_returns_expected_keys(self):
        resp = self.client.get("/programs")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.is_json, True)

        data = resp.get_json()
        self.assertIn("Fat Loss (FL)", data)
        self.assertIn("Muscle Gain (MG)", data)
        self.assertIn("Beginner (BG)", data)

    def test_programs_calorie_factors_are_integers(self):
        resp = self.client.get("/programs")
        self.assertEqual(resp.status_code, 200)

        data = resp.get_json()
        self.assertIsInstance(data["Fat Loss (FL)"]["calorie_factor"], int)
        self.assertIsInstance(data["Muscle Gain (MG)"]["calorie_factor"], int)
        self.assertIsInstance(data["Beginner (BG)"]["calorie_factor"], int)

    def test_programs_include_workout_and_diet(self):
        resp = self.client.get("/programs")
        self.assertEqual(resp.status_code, 200)

        data = resp.get_json()
        for program_name in ["Fat Loss (FL)", "Muscle Gain (MG)", "Beginner (BG)"]:
            self.assertIn("workout", data[program_name])
            self.assertIn("diet", data[program_name])
            self.assertIsInstance(data[program_name]["workout"], str)
            self.assertIsInstance(data[program_name]["diet"], str)

    def test_estimate_calories_endpoint(self):
        resp = self.client.get("/estimate-calories?program=Fat%20Loss%20(FL)&weight_kg=80")
        self.assertEqual(resp.status_code, 200)

        payload = resp.get_json()
        self.assertEqual(payload["program"], "Fat Loss (FL)")
        self.assertEqual(payload["calorie_factor"], 22)
        self.assertEqual(payload["calories_kcal"], 1760)


if __name__ == "__main__":
    unittest.main()
