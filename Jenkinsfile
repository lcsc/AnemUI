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
        stage('NPM: Config') {
            environment {
                NEXUS_FILE = credentials('nexus_credential')
            }
            steps {
                checkout scm
                sh 'echo $NEXUS_FILE'
                sh 'pwd && ls'
                sh 'more $NEXUS_FILE'
                sh 'cp $NEXUS_FILE .npmrc'
            }
        }
        stage('Build') { 
            steps {
                sh 'npm install' 
            }
        }
        stage('Publish') { 
            steps {
                sh 'npm publish -ws' 
            }
        }
    }

}