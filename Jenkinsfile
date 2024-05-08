pipeline {
    agent { label 'nodejs' }
    stages {
        stage('NPM: Config') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'nexus_credential', passwordVariable: 'NEXUS_PASSWORD', usernameVariable: 'NEXUS_USERNAME')]) {
                    token = sh(returnStdout: true, script: "set +x && curl -s -k -H \"Accept: application/json\" -H \"Content-Type:application/json\" -X PUT --data '{\"name\": \"$NEXUS_USERNAME\", \"password\": \"$NEXUS_PASSWORD\"}' https://mirror.lcsc.csic.es/repository/anemui/-/user/org.couchdb.user:$NEXUS_USERNAME 2>&1 | grep -Po '(?<=\"token\":\")[^\"]*'")
                    sh "set +x && echo \"//mirror.lcsc.csic.es/repository/anemui/:_authToken=$token\" >> .npmrc"
                }
            }
        }
        stage('Build') { 
            steps {
                sh 'npm install' 
            }
        }
        stage('publish') { 
            steps {
                sh 'npm publish -ws' 
            }
        }
    }

}