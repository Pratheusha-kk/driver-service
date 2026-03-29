pipeline {
  agent any

  options {
    timestamps()
  }

  environment {
    IMAGE_NAME = "aceest-app"
    IMAGE_TAG  = "aceest-${BUILD_NUMBER}"

    // Semantic version for main branch deployments, e.g. v1, v2, ...
    VERSION_TAG = ""

    // Jenkins "Configure System" -> SonarQube servers -> Name
    // Must match exactly, otherwise withSonarQubeEnv() fails.
    SONARQUBE_SERVER = "LocalSonar"

    // SonarScanner CLI must be available on the Jenkins agent.
    // Either install it so `sonar-scanner` is on PATH, or configure it in Jenkins tools and adjust pipeline accordingly.
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
          sh '''
            set -euxo pipefail
            export PATH="/opt:$PATH"
            sonar --version
            # Only install secrets once, not every build
            sonar plugins list || sonar install secrets
            ls -al
            sonar analyze --file sonar-project.properties
          '''
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

    stage('UI Tests') {
      environment {
        UI_IMAGE_NAME     = "${IMAGE_NAME}:${IMAGE_TAG}"
        UI_CONTAINER_NAME = "aceest-ui-tests"
        UI_BASE_URL       = "http://127.0.0.1:5000/gui"
        UI_HEALTH_URL     = "http://127.0.0.1:5000/health"
      }
      steps {
        sh '''
          set -euxo pipefail

          # Build the app image (re-use main image/tag)
          docker build -t "${UI_IMAGE_NAME}" .

          # Clean up any stale container
          docker rm -f "${UI_CONTAINER_NAME}" 2>/dev/null || true

          # Run the app container in the background
          docker run -d --name "${UI_CONTAINER_NAME}" -p 5000:5000 "${UI_IMAGE_NAME}"

          cleanup() {
            docker logs "${UI_CONTAINER_NAME}" || true
            docker rm -f "${UI_CONTAINER_NAME}" 2>/dev/null || true
          }
          trap cleanup EXIT

          # --- Check container status + HTTP /health endpoint ---

          # Wait briefly for container to transition to running
          sleep 5

          STATUS=$(docker inspect -f '{{.State.Status}}' "${UI_CONTAINER_NAME}")
          echo "Container status: ${STATUS}"
          if [ "${STATUS}" != "running" ]; then
            echo "ERROR: UI container is not running (status=${STATUS})"
            exit 1
          fi

          # Check health endpoint from Jenkins node
          MAX_RETRIES=30
          SLEEP_SEC=1
          TARGET_URL="${UI_HEALTH_URL}"

          echo "Checking app health at ${TARGET_URL} ..."

          if command -v curl >/dev/null 2>&1; then
            for i in $(seq 1 "$MAX_RETRIES"); do
              if curl -fsS "${TARGET_URL}" >/dev/null 2>&1; then
                echo "Health endpoint OK on attempt $i"
                break
              fi
              echo "Health not ready yet (attempt $i/$MAX_RETRIES). Retrying in $SLEEP_SEC sec..."
              sleep "$SLEEP_SEC"
              if [ "$i" -eq "$MAX_RETRIES" ]; then
                echo "ERROR: Health endpoint did not become ready in time"
                exit 1
              fi
            done
          elif command -v wget >/dev/null 2>&1; then
            for i in $(seq 1 "$MAX_RETRIES"); do
              if wget -qO- "${TARGET_URL}" >/dev/null 2>&1; then
                echo "Health endpoint OK on attempt $i"
                break
              fi
              echo "Health not ready yet (attempt $i/$MAX_RETRIES). Retrying in $SLEEP_SEC sec..."
              sleep "$SLEEP_SEC"
              if [ "$i" -eq "$MAX_RETRIES" ]; then
                echo "ERROR: Health endpoint did not become ready in time"
                exit 1
              fi
            done
          else
            echo "ERROR: Neither curl nor wget is available to check app health."
            exit 1
          fi

          # --- Run UI automation on the Jenkins agent against the containerized app ---

          # Create and activate a venv on the agent for UI tests
          python3 -m venv .venv-ui
          . .venv-ui/bin/activate
          python -m pip install --upgrade pip

          # Install UI test requirements on the agent (includes behave, selenium, webdriver-manager, etc.)
          python -m pip install -r ui-tests/requirements.txt

          # Run behave from the ui-tests directory, pointing to the app in the container
          cd ui-tests
          BASE_URL="${UI_BASE_URL}" python -m behave
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

    stage('Docker: Push Image to Artifactory (Stage)') {
      when {
        expression {
          // Push to stage repo for all non-main branches
          return env.BRANCH_NAME != 'main'
        }
      }
      environment {
        ARTIFACTORY_REGISTRY   = 'trial5okz6u.jfrog.io' // Docker registry host, no protocol, no trailing slash
        ARTIFACTORY_REPO_STAGE = 'docker-local'         // stage / non-main branches
        ARTIFACTORY_CRED_ID    = 'jfrogcred'
      }
      steps {
        script {
          // For non-main branches, use IMAGE_TAG (aceest-<build#>)
          String artifactoryTag = env.IMAGE_TAG

          withCredentials([
            usernamePassword(
              credentialsId: env.ARTIFACTORY_CRED_ID,
              usernameVariable: 'ART_USER',
              passwordVariable: 'ART_PASS'
            )
          ]) {
            sh """
              set -euxo pipefail

              LOCAL_IMAGE="\${IMAGE_NAME}:\${IMAGE_TAG}"
              REMOTE_IMAGE="\${ARTIFACTORY_REGISTRY}/${ARTIFACTORY_REPO_STAGE}/\${IMAGE_NAME}:${artifactoryTag}"

              # Tag local image with remote registry/repo + chosen tag
              docker tag "\${LOCAL_IMAGE}" "\${REMOTE_IMAGE}"

              # Login to Artifactory Docker registry (note: no https:// in registry name)
              echo "\${ART_PASS}" | docker login "\${ARTIFACTORY_REGISTRY}" \\
                --username "\${ART_USER}" --password-stdin

              # Push image
              docker push "\${REMOTE_IMAGE}"

              # (Optional) logout
              docker logout "\${ARTIFACTORY_REGISTRY}" || true
            """
          }
        }
      }
    }

    stage('Deploy to Azure Web App (Stage)') {
      when {
        expression {
          // Deploy to stage when the branch is NOT main (e.g. feature branches / PR builds)
          return env.BRANCH_NAME != 'main'
        }
      }
      environment {
        // Jenkins credentials: secret text containing SP JSON (tenant, appId, password, subscription)
        AZURE_CRED_ID = 'azure-sp-credentials'

        // Azure resource details for STAGING
        AZURE_RESOURCE_GROUP = 'rg-aceest'        // TODO: replace with your stage RG
        AZURE_WEBAPP_NAME    = 'aceest-webapp-stage'    // TODO: replace with your stage Web App name

        // Container registry / image - from Artifactory docker-local
        AZURE_CONTAINER_REGISTRY_SERVER = 'trial5okz6u.jfrog.io'
        AZURE_CONTAINER_IMAGE_NAME      = 'docker-local/aceest-app' // repo/image path
        // Always deploy the exact tag we pushed to docker-local for this build
        AZURE_CONTAINER_IMAGE_TAG       = "${IMAGE_TAG}"

        // Reuse existing JFrog Docker credentials from Jenkins
        ARTIFACTORY_CRED_ID = 'jfrogcred'
      }
      steps {
        withCredentials([
          string(credentialsId: env.AZURE_CRED_ID, variable: 'AZURE_SP_JSON'),
          usernamePassword(
            credentialsId: env.ARTIFACTORY_CRED_ID,
            usernameVariable: 'REG_USER',
            passwordVariable: 'REG_PASS'
          )
        ]) {
          script {
            // For non-main branches, VERSION_TAG is already IMAGE_TAG, so we just resolve deployTag
            String deployTag = env.AZURE_CONTAINER_IMAGE_TAG?.trim()
            if (!deployTag) {
              deployTag = env.IMAGE_TAG   // aceest-<BUILD_NUMBER> for stage
            }

            sh """
              set -euxo pipefail

              # Write SP JSON to a temp file
              SP_FILE=\$(mktemp)
              echo "\${AZURE_SP_JSON}" > "\${SP_FILE}"

              # Adapt to both {tenant,appId,password,subscription} and
              # {tenantId,clientId,clientSecret,subscriptionId} shapes.
              TENANT=\$(jq -r '.tenant // .tenantId' "\${SP_FILE}")
              APPID=\$(jq -r '.appId // .clientId' "\${SP_FILE}")
              PASSWORD=\$(jq -r '.password // .clientSecret' "\${SP_FILE}")
              SUBSCRIPTION=\$(jq -r '.subscription // .subscriptionId' "\${SP_FILE}")

              # Login to Azure using service principal
              az login --service-principal \\
                --username "\${APPID}" \\
                --password "\${PASSWORD}" \\
                --tenant "\${TENANT}"

              az account set --subscription "\${SUBSCRIPTION}"

              # Construct image reference (deployTag injected by Groovy)
              IMAGE="\${AZURE_CONTAINER_REGISTRY_SERVER}/\${AZURE_CONTAINER_IMAGE_NAME}:${deployTag}"

              echo "Deploying image to Azure Stage Web App: \${IMAGE}"

              # Configure Stage Web App to use this container image and private registry credentials
              az webapp config container set \\
                --resource-group "${AZURE_RESOURCE_GROUP}" \\
                --name "${AZURE_WEBAPP_NAME}" \\
                --docker-custom-image-name "\${IMAGE}" \\
                --docker-registry-server-url "https://\${AZURE_CONTAINER_REGISTRY_SERVER}" \\
                --docker-registry-server-user "\${REG_USER}" \\
                --docker-registry-server-password "\${REG_PASS}" \\
                --settings WEBSITES_PORT=5000 WEBSITES_CONTAINER_START_TIME_LIMIT=600

              # Restart the Web App to ensure new image is pulled
              az webapp restart --resource-group "${AZURE_RESOURCE_GROUP}" --name "${AZURE_WEBAPP_NAME}"

              rm -f "\${SP_FILE}"
            """
          }
        }
      }
    }

     stage('Docker: Push Image to Artifactory (Prod)') {
      when {
        expression {
          // Push to prod repo only for main branch (i.e. MR merged to main)
          return env.BRANCH_NAME == 'main'
        }
      }
      environment {
        ARTIFACTORY_REGISTRY  = 'trial5okz6u.jfrog.io'
        ARTIFACTORY_REPO_PROD = 'docker-prod'
        ARTIFACTORY_CRED_ID   = 'jfrogcred'
        // Optional override: provide a specific prod tag, else semantic v<BUILD_NUMBER>
        ARTIFACTORY_IMAGE_TAG = ''
      }
      steps {
        script {
          // Ensure semantic version for main builds, e.g. v1, v2, ...
          if (!env.VERSION_TAG?.trim()) {
            env.VERSION_TAG = "v${env.BUILD_NUMBER}"
          }

          String requestedTag = env.ARTIFACTORY_IMAGE_TAG?.trim()
          String artifactoryTag = requestedTag ? requestedTag : env.VERSION_TAG

          withCredentials([
            usernamePassword(
              credentialsId: env.ARTIFACTORY_CRED_ID,
              usernameVariable: 'ART_USER',
              passwordVariable: 'ART_PASS'
            )
          ]) {
            sh """
              set -euxo pipefail

              LOCAL_IMAGE="\${IMAGE_NAME}:\${IMAGE_TAG}"
              REMOTE_IMAGE="\${ARTIFACTORY_REGISTRY}/${ARTIFACTORY_REPO_PROD}/\${IMAGE_NAME}:${artifactoryTag}"

              # Tag local image with remote registry/repo + chosen tag
              docker tag "\${LOCAL_IMAGE}" "\${REMOTE_IMAGE}"

              # Login to Artifactory Docker registry (note: no https:// in registry name)
              echo "\${ART_PASS}" | docker login "\${ARTIFACTORY_REGISTRY}" \\
                --username "\${ART_USER}" --password-stdin

              # Push image
              docker push "\${REMOTE_IMAGE}"

              # (Optional) logout
              docker logout "\${ARTIFACTORY_REGISTRY}" || true
            """
          }
        }
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
