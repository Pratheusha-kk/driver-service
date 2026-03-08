from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    return jsonify({"message": "ACEest Fitness & Gym API is running"})

@app.route("/programs")
def programs():
    return jsonify({
        "Fat Loss (FL)": {
            "description": "Fat loss program",
            "calorie_factor": 22
        },
        "Muscle Gain (MG)": {
            "description": "Muscle gain program",
            "calorie_factor": 35
        },
        "Beginner (BG)": {
            "description": "Beginner program",
            "calorie_factor": 26
        },
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
