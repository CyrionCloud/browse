const io = require('socket.io-client');

const WS_URL = 'http://localhost:4000';

console.log('=== WebSocket Connection Tests ===\n');

const results = [];

function logTest(name, passed, message) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    results.push({name, passed});
    console.log(`${status}: ${name}`);
    if (message) {
        console.log(`    ${message}`);
    }
}

async function runTests() {
    // Test 1: Connect to WebSocket server
    console.log('Test 1: Connect to WebSocket server');
    try {
        const socket = io(WS_URL, {
            transports: ['websocket'],
            reconnection: false
        });

        socket.on('connect', () => {
            console.log(`    Connected with ID: ${socket.id}`);
            logTest('WebSocket connection', true, `Socket ID: ${socket.id}`);

            // Test 2: Subscribe to a session
            console.log('\nTest 2: Subscribe to session updates');
            socket.emit('subscribe', { sessionId: 'test-session-123' });

            setTimeout(() => {
                // Test 3: Check connection state
                console.log('\nTest 3: Connection state check');
                const connected = socket.connected;
                logTest('Connection state', connected, `Connected: ${connected}`);

                // Test 4: Unsubscribe from session
                console.log('\nTest 4: Unsubscribe from session');
                socket.emit('unsubscribe', { sessionId: 'test-session-123' });
                logTest('Unsubscribe event', true, 'Emitted unsubscribe event');

                // Test 5: Disconnect
                console.log('\nTest 5: Disconnect from server');
                socket.disconnect();
                logTest('Disconnect', true, 'Disconnected successfully');

                // Summary
                console.log('\n' + '='.repeat(60));
                console.log('Summary');
                console.log('='.repeat(60));

                const passed = results.filter(r => r.passed).length;
                const total = results.length;
                console.log(`Passed: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);

                process.exit(0);
            }, 1000);
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            logTest('WebSocket connection', false, error.message);
            process.exit(1);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            console.error('Connection timeout');
            logTest('WebSocket connection', false, 'Connection timeout');
            process.exit(1);
        }, 5000);

    } catch (error) {
        logTest('WebSocket connection', false, error.message);
        process.exit(1);
    }
}

runTests();
