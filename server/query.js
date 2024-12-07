const sqlite3 = require('sqlite3').verbose();

// Connect to database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');

    // Query variables table
    console.log('\n=== Variables ===');
    db.all('SELECT * FROM variables', [], (err, rows) => {
        if (err) {
            console.error('Error querying variables:', err);
            return;
        }
        console.log('Variables table:');
        console.table(rows);

        // Query optimization_results table
        console.log('\n=== Optimization Results ===');
        db.all('SELECT * FROM optimization_results', [], (err, rows) => {
            if (err) {
                console.error('Error querying optimization_results:', err);
                return;
            }
            console.log('Optimization_results table:');
            console.table(rows);

            // Close database connection
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                    return;
                }
                console.log('Database connection closed');
            });
        });
    });
});
