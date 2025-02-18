const awsConfig = {
    Auth: {
        region: 'us-east-2', // Your AWS region
        userPoolId: 'us-east-2_gTIMP0U0T', // From Cognito UserPool output
        userPoolWebClientId: '6bmsjsb2s1j53le2041v581ane', // From Cognito UserPoolClient output
        mandatorySignIn: true,
        authenticationFlowType: 'USER_PASSWORD_AUTH'
    },
    API: {
        endpoints: [{
            name: 'sftMadnessApi',
            endpoint: 'https://3696l9ld38.execute-api.us-east-2.amazonaws.com/Prod', // From API Gateway output
            region: 'us-east-2'
        }]
    }
};

export default awsConfig;