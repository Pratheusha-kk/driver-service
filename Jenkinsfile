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
    SONARQUBE_SERVER = "LocalSonar"

    // Jenkins Global Tool Configuration name for SonarScanner (case-sensitive).
    // Set this to the exact tool name configured in: Manage Jenkins -> Global Tool Configuration.
    // If you don't have a tool configured, the pipeline will fall back to `sonar-scanner` on PATH.
    SONAR_SCANNER_TOOL = "sonar-scanner"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('SonarQube: Static Analysis') {
      steps {
        script {
          // Resolve SonarScanner from Jenkins Global Tool Configuration if present; otherwise fall back to PATH
          def scannerHome = null
          try {
            scannerHome = tool(env.SONAR_SCANNER_TOOL)
          } catch (Exception e) {
            scannerHome = null
          }

          if (scannerHome) {
            echo "Using SonarScanner from Jenkins tool '${env.SONAR_SCANNER_TOOL}': ${scannerHome}"
          } else {
            echo "WARN: No Jenkins tool named '${env.SONAR_SCANNER_TOOL}' found. Falling back to 'sonar-scanner' on PATH."
          }

          withSonarQubeEnv("${SONARQUBE_SERVER}") {
            if (scannerHome) {
              withEnv(["SCANNER_HOME=${scannerHome}"]) {
                sh '''
                  set -euxo pipefail
                  "${SCANNER_HOME}/bin/sonar-scanner" --version
                  "${SCANNER_HOME}/bin/sonar-scanner"
                '''
              }
            } else {
              sh '''
                set -euxo pipefail

                if ! command -v sonar-scanner >/dev/null 2>&1; then
                  echo "ERROR: SonarScanner is not available."
                  echo "Fix ONE of the following on the Jenkins agent:"
                  echo "  1) Install SonarScanner CLI so 'sonar-scanner' is on PATH, OR"
                  echo "  2) Configure SonarScanner under Manage Jenkins -> Global Tool Configuration"
                  echo "     and set SONAR_SCANNER_TOOL in Jenkinsfile to that exact tool name."
                  exit 2
                fi

                sonar-scanner --version
                sonar-scanner
              '''
            }
          }
        }
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
