
const { getDatabase } = require('./src/database/schema');
const { format } = require('date-fns');

async function checkData() {
    try {
        const db = getDatabase(); // This might fail if not initialized properly in standalone script, 
        // better to use the app context or just inject logs. 
        // Actually, since I can't easily run a standalone node script with expo-sqlite (it needs native runtime), 
        // I will use console.log in the actual app code instead.
    } catch (e) {
        console.error(e);
    }
}
