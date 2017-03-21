node {
	timestamps {
		stage('Preparation') {
			// step([$class: 'WsCleanup']);
			git branch: 'custom', url: "https://github.com/snadn/firekylin.git"
		}
		stage('Build') {
			sh """
				#!/bin/bash

				PATH="/root/.nvm/versions/node/v4.5.0/bin:$PATH"

				echo clean
				git clean -d -f -- ""
				rm -rf pkg

				echo install
				npm install

				echo release online
				npm run release online
				mv pkg/*.tgz pkg/${JOB_NAME}.tgz
			"""
		}
		stage('Artifacts') {
			archiveArtifacts 'pkg/*.tgz'
		}
		stage('Deploy') {
			build job: 'deploy-midway', parameters: [string(name: 'upstreamProjectName', value: "${JOB_NAME}")], propagate: false
		}
	}
}