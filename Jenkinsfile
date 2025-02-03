pipeline {
//    agent { label 'nodejs' }
    agent {
        docker {
            image 'node:lts-buster-slim'
            args '-p 3000:3000'
        }
    }
    /*
        Require credentials named "nexus_credential"
        in a local machine execute
        "npm login --scope=@lcsc --registry=https://mirror.lcsc.csic.es/repository/anemui/"
        # user: anemui
        # pw: You should already know

        In Jenkins upload your ~/.npmrc
    */
    stages {
        stage('Prepare Build') { 
            steps {
                sh 'npm install' 
            }
        }
        stage('Configure Build') {
            steps {
//                checkout scm
                sh 'npm run setVersion'
            }
        }

        stage('Publish') { 
            environment {
                NEXUS_FILE = credentials('nexus_credential')
            }
            steps {
                sh 'cp $NEXUS_FILE .npmrc'
                sh 'npm publish -ws' 
            }
        }
    }

}
