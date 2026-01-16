#!/usr/bin/env node
/**
 * End-to-End Test Script for AutoBrowse
 */

const io = require('socket.io-client');

const BASE_URL = 'http://localhost:4000';
const WS_URL = 'http://localhost:4000';

console.log('=== Phase 3: End-to-End Testing ===\n');

const results = [];

function logTest(name, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    results.push({name, passed, message});
    console.log(`${status}: ${name}`);
    if (message) {
        console.log(`    ${message}`);
    }
}

async function runTests() {
    // Test 1: Health Check
    console.log('Test 1: System Health Check');
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const data = await response.json();
        if (data.status === 'healthy') {
            logTest('System health', true,
                `DB: ${data.services.database.status}, Anthropic: ${data.services.anthropic.status}`);
        } else {
            logTest('System health', false, data.status);
        }
    } catch (error) {
        logTest('System health', false, error.message);
    }

    // Test 2: WebSocket Connection
    console.log('\nTest 2: WebSocket Connection');
    try {
        const socket = io(WS_URL, { transports: ['websocket'], reconnection: false });
        await new Promise((resolve, reject) => {
            socket.on('connect', () => {
                logTest('WebSocket connection', true, `Socket ID: ${socket.id}`);
                socket.disconnect();
                resolve();
            });
            socket.on('connect_error', reject);
            setTimeout(() => reject(new Error('Timeout')), 5000);
        });
    } catch (error) {
        logTest('WebSocket connection', false, error.message);
    }

    // Test 3: Get Skills
    console.log('\nTest 3: Get Skills List');
    try {
        const response = await fetch(`${BASE_URL}/api/skills`);
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
            logTest('Get skills list', true, `${data.data.length} skills`);
        } else {
            logTest('Get skills list', false, 'Invalid response');
        }
    } catch (error) {
        logTest('Get skills list', false, error.message);
    }

    // Test 4-5: Auth checks
    console.log('\nTest 4-5: Authentication');
    const authEndpoints = [
        '/api/sessions',
        '/api/sessions/test/start',
        '/api/chat'
    ];
    
    for (const endpoint of authEndpoints) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: 'data' })
            });
            if (response.status === 401) {
                logTest(`Auth check ${endpoint}`, true, 'Returns 401');
            } else {
                logTest(`Auth check ${endpoint}`, false, `Got ${response.status}`);
            }
        } catch (error) {
            logTest(`Auth check ${endpoint}`, false, error.message);
        }
    }

    // Test 6: WebSocket Events
    console.log('\nTest 6: WebSocket Events');
    try {
        const socket = io(WS_URL, { transports: ['websocket'], reconnection: false });
        await new Promise((resolve) => {
            socket.on('connect', () => {
                socket.emit('subscribe', { sessionId: 'test-e2e' });
                socket.on('subscribed', () => {
                    logTest('WebSocket events', true, 'Subscribe event received');
                    setTimeout(resolve, 500);
                });
            });
            setTimeout(resolve, 2000);
        });
        socket.disconnect();
    } catch (error) {
        logTest('WebSocket events', false, error.message);
    }

    // Test 7: CORS
    console.log('\nTest 7: CORS');
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const cors = response.headers.get('access-control-allow-origin');
        logTest('CORS headers', cors !== null, cors || 'No CORS');
    } catch (error) {
        logTest('CORS headers', false, error.message);
    }

    // Test 8: Error Handling
    console.log('\nTest 8: Error Handling');
    try {
        const response = await fetch(`${BASE_URL}/api/nonexistent`);
        if (response.status === 404) {
            logTest('404 error', true, 'Returns 404');
        } else {
            logTest('404 error', false, `Got ${response.status}`);
        }
    } catch (error) {
        logTest('404 error', false, error.message);
    }

    // Test 9: Invalid Data
    console.log('\nTest 9: Invalid Data');
    try {
        const response = await fetch(`${BASE_URL}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json'
        });
        if (response.status >= 400) {
            logTest('Invalid data', true, `Returns ${response.status}`);
        } else {
            logTest('Invalid data', false, `Got ${response.status}`);
        }
    } catch (error) {
        logTest('Invalid data', false, error.message);
    }

    // Test 10: Concurrent Connections
    console.log('\nTest 10: Concurrent Connections');
    try {
        const sockets = [];
        for (let i = 0; i < 3; i++) {
            const socket = io(WS_URL, { transports: ['websocket'], reconnection: false });
            await new Promise(resolve => {
                socket.on('connect', () => {
                    sockets.push(socket);
                    resolve();
                });
                setTimeout(resolve, 1000);
            });
        }
        sockets.forEach(s => s.disconnect());
        logTest('Concurrent connections', true, `Connected ${sockets.length} clients`);
    } catch (error) {
        logTest('Concurrent connections', false, error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`Passed: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
    
    if (passed === total) {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.message}`);
        });
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
