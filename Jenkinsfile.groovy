/*
	依赖 gcc 4.8+: https://gist.github.com/stephenturner/e3bc5cfacc2dc67eca8b devtoolset-2-binutils
	依赖 python27: https://gist.github.com/dalegaspi/dec44117fa5e7597a559
*/

node {
	def NodejsLabel = params?.NodejsLabel ?: 'nodejs v4'
	timestamps {
		stage('Preparation') {
			if (params?.WsCleanup) {
				step([$class: 'WsCleanup']);
			}
			git branch: 'custom', url: "https://github.com/snadn/firekylin.git"
		}
		stage('Build') {
			nodejs(nodeJSInstallationName: NodejsLabel) {
				sh """
					#!/bin/bash

					which yarn && alias npm=yarn;

					node --version;
					npm --version;

					npm install -d;
					npm run release online;
					mv pkg/*.tgz pkg/${JOB_BASE_NAME}.tgz;
				"""
			}
		}
		stage('Artifacts') {
			archiveArtifacts 'pkg/*.tgz'
		}
		if (params?.deployTarget) {
			stage('Deploy') {
				build job: 'deploy-midway', parameters: [string(name: 'upstreamProjectName', value: "${JOB_NAME}"), string(name: 'deployTarget', value: "${deployTarget}")], propagate: false
			}
		}
	}
}
