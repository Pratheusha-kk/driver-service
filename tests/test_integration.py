import os
import signal
import subprocess
import time
import unittest

import requests


class AceestIntegrationTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """
        Start the Flask app as a real process and test it over HTTP.

        Notes:
        - Uses the existing app.py entrypoint (python app.py), which starts the server on 0.0.0.0:5000.
        - Polls for readiness before running tests.
        """
        cls.base_url = os.environ.get("ACEEST_BASE_URL", "http://127.0.0.1:5000")

        env = os.environ.copy()
        env.setdefault("FLASK_ENV", "testing")

        # Start server process
        cls.proc = subprocess.Popen(
            ["python", "app.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            text=True,
        )

        # Wait for server readiness
        deadline = time.time() + 15
        last_err = None
        while time.time() < deadline:
            try:
                r = requests.get(f"{cls.base_url}/", timeout=1)
                if r.status_code == 200:
                    return
            except Exception as e:
                last_err = e
            time.sleep(0.25)

        # If we're here, server never became ready. Tear down process and raise.
        try:
            cls._terminate_proc()
        finally:
            raise RuntimeError(f"Server did not become ready in time. Last error: {last_err}")

    @classmethod
    def _terminate_proc(cls):
        if getattr(cls, "proc", None) is None:
            return

        if cls.proc.poll() is not None:
            return

        try:
            cls.proc.send_signal(signal.SIGTERM)
            cls.proc.wait(timeout=5)
        except Exception:
            try:
                cls.proc.kill()
            except Exception:
                pass
            try:
                cls.proc.wait(timeout=2)
            except Exception:
                pass

    @classmethod
    def tearDownClass(cls):
        cls._terminate_proc()

        # Drain output to avoid resource warnings (best effort)
        try:
            if cls.proc.stdout:
                cls.proc.stdout.close()
            if cls.proc.stderr:
                cls.proc.stderr.close()
        except Exception:
            pass

    def test_index_over_http(self):
        resp = requests.get(f"{self.base_url}/", timeout=2)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("Content-Type", "").split(";")[0], "application/json")
        self.assertEqual(resp.json(), {"message": "ACEest Fitness & Gym API is running"})

    def test_programs_over_http(self):
        resp = requests.get(f"{self.base_url}/programs", timeout=2)
        self.assertEqual(resp.status_code, 200)

        data = resp.json()
        self.assertIn("Fat Loss (FL)", data)
        self.assertIn("Muscle Gain (MG)", data)
        self.assertIn("Beginner (BG)", data)

        self.assertIsInstance(data["Fat Loss (FL)"]["calorie_factor"], int)
        self.assertIsInstance(data["Muscle Gain (MG)"]["calorie_factor"], int)
        self.assertIsInstance(data["Beginner (BG)"]["calorie_factor"], int)


if __name__ == "__main__":
    unittest.main()
