pipeline {
    agent { label 'nodejs' }
    /*
        Require credentials named "nexus_credential"
        in a local machine execute
        "npm login --scope=@lcsc --registry=https://mirror.lcsc.csic.es/repository/anemui/"
        # user: anemui
        # pw: You should already know

        In Jenkins upload your ~/.npmrc
    */
    stages {
        stage('Configure Build') {
            steps {
//                checkout scm
                sh 'npm run setVersion'
            }
        }
        stage('Build') { 
            steps {
                sh 'npm install' 
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