pipeline {
  agent any

  options {
    timestamps()
  }

  environment {
    IMAGE_NAME = "aceest-app"
    IMAGE_TAG  = "aceest-${BUILD_NUMBER}"

    // Jenkins "Configure System" -> SonarQube servers -> Name
    // Must match exactly, otherwise withSonarQubeEnv() fails.
    SONARQUBE_SERVER = "sonarqube"

    // Jenkins Global Tool Configuration name for SonarScanner
    // Change this to match your Jenkins tool name if different.
    SONAR_SCANNER_TOOL = "sonar-scanner"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Python: Unit Tests (PyUnit)') {
      steps {
        sh '''
          set -euxo pipefail
          python3 -m venv .venv
          . .venv/bin/activate
          python -m pip install --upgrade pip
          python -m pip install -r requirements.txt
          python -m unittest discover -s tests -p "test_*.py"
        '''
      }
    }

    stage('SonarQube: Static Analysis') {
      steps {
        withSonarQubeEnv("${SONARQUBE_SERVER}") {
          sh '''
            sonar-scanner
            set -euxo pipefail

            # Use SonarScanner installed/configured in Jenkins Global Tool Configuration
            SCANNER_HOME="$(tool "${SONAR_SCANNER_TOOL}")"

            if [ ! -x "${SCANNER_HOME}/bin/sonar-scanner" ]; then
              echo "ERROR: SonarScanner not found at ${SCANNER_HOME}/bin/sonar-scanner"
              echo "Check Jenkins -> Manage Jenkins -> Global Tool Configuration."
              echo "Set SONAR_SCANNER_TOOL in Jenkinsfile to the configured tool name."
              exit 2
            fi

            "${SCANNER_HOME}/bin/sonar-scanner" --version
            "${SCANNER_HOME}/bin/sonar-scanner"
          '''
        }
      }
    }

    stage('Docker: Build Image') {
      steps {
        sh '''
          set -euxo pipefail
          docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
          docker image ls ${IMAGE_NAME}:${IMAGE_TAG}
        '''
      }
    }

    stage('Docker: Smoke Test Container') {
      steps {
        sh '''
          set -euxo pipefail

          # Run container in background
          CID=$(docker run -d -p 5000:5000 ${IMAGE_NAME}:${IMAGE_TAG})

          # Give the app time to start
          sleep 3

          # Smoke test endpoints (requires curl available on Jenkins agent)
          curl -fsS http://localhost:5000/ | head -c 200
          curl -fsS http://localhost:5000/programs | head -c 200

          # Cleanup
          docker rm -f "$CID"
        '''
      }
    }
  }

  post {
    always {
      // Clean python venv created during build
      sh 'rm -rf .venv || true'
    }
    failure {
      echo 'Build failed. Check test output / docker build logs above.'
    }
  }
}
