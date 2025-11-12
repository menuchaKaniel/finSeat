// Quick test for environment variables
console.log('🧪 Environment Variable Test:');
console.log('REACT_APP_AWS_ACCESS_KEY_ID:', process.env.REACT_APP_AWS_ACCESS_KEY_ID ? 'SET ✅' : 'NOT SET ❌');
console.log('REACT_APP_AWS_SECRET_ACCESS_KEY:', process.env.REACT_APP_AWS_SECRET_ACCESS_KEY ? 'SET ✅' : 'NOT SET ❌');
console.log('REACT_APP_AWS_SESSION_TOKEN:', process.env.REACT_APP_AWS_SESSION_TOKEN ? 'SET ✅' : 'NOT SET ❌');
console.log('REACT_APP_AWS_DEFAULT_REGION:', process.env.REACT_APP_AWS_DEFAULT_REGION);

// List all REACT_APP_ env vars
const reactEnvVars = Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'));
console.log('All REACT_APP_ vars:', reactEnvVars);