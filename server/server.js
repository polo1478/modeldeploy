import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 5002;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error(`[${new Date().toISOString()}] Error connecting to database:`, err);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] Connected to SQLite database`);
});

// Middleware
const corsOptions = {
  origin: ['http://localhost:4000', 'http://127.0.0.1:4000', 'https://modeldeploy.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root path - API documentation
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Datachemical Lab API Server',
    version: '1.0.0',
    endpoints: {
      '/health': 'Health check endpoint',
      '/api/variables': 'Get all variables',
      '/api/variables/:type': 'Get variables by type (Y or X)',
      '/api/optimization': 'Get or create optimization results',
      '/api/train': 'Train ML model',
      '/api/predict': 'Make predictions',
      '/api/optimize': 'Optimize parameters'
    },
    documentation: 'Available API endpoints are listed above'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Initialize database tables and sample data
function initializeDatabase() {
  console.log(`[${new Date().toISOString()}] Initializing database...`);
  
  // Create tables
  db.serialize(() => {
    // Variables table (Y and X variables)
    db.run(`CREATE TABLE IF NOT EXISTS variables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      unit TEXT,
      min_value REAL,
      max_value REAL,
      default_value REAL
    )`, (err) => {
      if (err) {
        console.error(`[${new Date().toISOString()}] Error creating variables table:`, err);
        return;
      }
      console.log(`[${new Date().toISOString()}] Variables table created or already exists`);
    });

    // Optimization results table
    db.run(`CREATE TABLE IF NOT EXISTS optimization_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      y_variable INTEGER,
      x_variables TEXT,
      parameters TEXT,
      result TEXT,
      score REAL,
      feature_importance TEXT,
      FOREIGN KEY(y_variable) REFERENCES variables(id)
    )`, (err) => {
      if (err) {
        console.error(`[${new Date().toISOString()}] Error creating optimization_results table:`, err);
        return;
      }
      console.log(`[${new Date().toISOString()}] Optimization results table created or already exists`);
    });

    // Insert sample data
    const sampleVariables = [
      { 
        name: '収率', 
        type: 'Y', 
        description: '目的生成物の収率',
        unit: '%',
        min_value: 0,
        max_value: 100,
        default_value: 50
      },
      { 
        name: '選択率', 
        type: 'Y', 
        description: '目的生成物の選択率',
        unit: '%',
        min_value: 0,
        max_value: 100,
        default_value: 80
      },
      { 
        name: '温度', 
        type: 'X', 
        description: '反応温度',
        unit: '°C',
        min_value: 50,
        max_value: 150,
        default_value: 100
      },
      { 
        name: '圧力', 
        type: 'X', 
        description: '反応圧力',
        unit: 'MPa',
        min_value: 1,
        max_value: 10,
        default_value: 5
      },
      { 
        name: '触媒量', 
        type: 'X', 
        description: '触媒使用量',
        unit: 'g',
        min_value: 0.1,
        max_value: 2.0,
        default_value: 1.0
      },
      { 
        name: '反応時間', 
        type: 'X', 
        description: '反応時間',
        unit: 'h',
        min_value: 1,
        max_value: 24,
        default_value: 12
      }
    ];

    // Sample optimization results
    const sampleResults = [
      {
        y_variable: 1, // 収率
        x_variables: JSON.stringify({
          '温度': 120,
          '圧力': 8,
          '触媒量': 1.5,
          '反応時間': 18
        }),
        parameters: JSON.stringify({
          'batch_size': 32,
          'learning_rate': 0.001,
          'epochs': 100
        }),
        result: JSON.stringify({
          'predicted_value': 85.6,
          'confidence': 0.92
        }),
        score: 0.89,
        feature_importance: JSON.stringify({
          '温度': 0.35,
          '圧力': 0.25,
          '触媒量': 0.22,
          '反応時間': 0.18
        })
      },
      {
        y_variable: 2, // 選択率
        x_variables: JSON.stringify({
          '温度': 100,
          '圧力': 5,
          '触媒量': 1.0,
          '反応時間': 12
        }),
        parameters: JSON.stringify({
          'batch_size': 32,
          'learning_rate': 0.001,
          'epochs': 100
        }),
        result: JSON.stringify({
          'predicted_value': 92.3,
          'confidence': 0.95
        }),
        score: 0.91,
        feature_importance: JSON.stringify({
          '温度': 0.30,
          '圧力': 0.28,
          '触媒量': 0.25,
          '反応時間': 0.17
        })
      }
    ];

    // Check if we need to insert sample data
    db.get('SELECT COUNT(*) as count FROM variables', (err, row) => {
      if (err) {
        console.error(`[${new Date().toISOString()}] Error checking variables count:`, err);
        return;
      }
      
      if (row.count === 0) {
        console.log(`[${new Date().toISOString()}] Inserting sample variables...`);
        const stmt = db.prepare('INSERT INTO variables (name, type, description, unit, min_value, max_value, default_value) VALUES (?, ?, ?, ?, ?, ?, ?)');
        sampleVariables.forEach(variable => {
          stmt.run(
            variable.name, 
            variable.type, 
            variable.description,
            variable.unit,
            variable.min_value,
            variable.max_value,
            variable.default_value,
            (err) => {
              if (err) {
                console.error(`[${new Date().toISOString()}] Error inserting sample variable:`, variable, err);
              }
            }
          );
        });
        stmt.finalize((err) => {
          if (err) {
            console.error(`[${new Date().toISOString()}] Error finalizing variables statement:`, err);
          } else {
            console.log(`[${new Date().toISOString()}] Sample variables inserted successfully`);
            
            // Insert sample optimization results
            console.log(`[${new Date().toISOString()}] Inserting sample optimization results...`);
            const resultStmt = db.prepare(`
              INSERT INTO optimization_results 
              (y_variable, x_variables, parameters, result, score, feature_importance) 
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            sampleResults.forEach(result => {
              resultStmt.run(
                result.y_variable,
                result.x_variables,
                result.parameters,
                result.result,
                result.score,
                result.feature_importance,
                (err) => {
                  if (err) {
                    console.error(`[${new Date().toISOString()}] Error inserting sample result:`, err);
                  }
                }
              );
            });
            
            resultStmt.finalize((err) => {
              if (err) {
                console.error(`[${new Date().toISOString()}] Error finalizing results statement:`, err);
              } else {
                console.log(`[${new Date().toISOString()}] Sample optimization results inserted successfully`);
              }
            });
          }
        });
      } else {
        console.log(`[${new Date().toISOString()}] Sample data already exists`);
      }
    });
  });
}

initializeDatabase();

// API Endpoints

// Get all variables
app.get('/api/variables', (req, res) => {
  db.all('SELECT * FROM variables', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get variables by type (Y or X)
app.get('/api/variables/:type', (req, res) => {
  const type = req.params.type.toUpperCase();
  console.log(`[${new Date().toISOString()}] Fetching variables of type: ${type}`);
  
  db.all('SELECT * FROM variables WHERE type = ?', [type], (err, rows) => {
    if (err) {
      console.error(`[${new Date().toISOString()}] Database error:`, err);
      res.status(500).json({ 
        error: err.message,
        timestamp: new Date().toISOString()
      });
      return;
    }
    console.log(`[${new Date().toISOString()}] Found ${rows.length} ${type} variables:`, rows);
    res.json(rows);
  });
});

// Create new optimization result
app.post('/api/optimization', (req, res) => {
  const { y_variable, x_variables, parameters, result } = req.body;
  
  db.run(
    'INSERT INTO optimization_results (y_variable, x_variables, parameters, result) VALUES (?, ?, ?, ?)',
    [y_variable, JSON.stringify(x_variables), JSON.stringify(parameters), JSON.stringify(result)],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        id: this.lastID,
        message: 'Optimization result saved successfully'
      });
    }
  );
});

// Get optimization results
app.get('/api/optimization', (req, res) => {
  console.log(`[${new Date().toISOString()}] Fetching optimization results`);
  
  db.all(`
    SELECT 
      opt.id,
      opt.timestamp,
      v.name as y_variable_name,
      opt.x_variables,
      opt.parameters,
      opt.result,
      opt.score,
      opt.feature_importance
    FROM optimization_results opt
    LEFT JOIN variables v ON opt.y_variable = v.id
    ORDER BY opt.timestamp DESC
  `, [], (err, rows) => {
    if (err) {
      console.error(`[${new Date().toISOString()}] Database error:`, err);
      res.status(500).json({ 
        error: err.message,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 如果没有结果，返回空数组
    if (!rows || rows.length === 0) {
      console.log(`[${new Date().toISOString()}] No optimization results found`);
      res.json([]);
      return;
    }

    // 尝试解析JSON字段
    const processedRows = rows.map(row => {
      try {
        return {
          ...row,
          x_variables: JSON.parse(row.x_variables || '[]'),
          parameters: JSON.parse(row.parameters || '{}'),
          result: JSON.parse(row.result || '{}'),
          feature_importance: JSON.parse(row.feature_importance || '{}')
        };
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error parsing JSON for row ${row.id}:`, error);
        return row;
      }
    });

    console.log(`[${new Date().toISOString()}] Found ${processedRows.length} optimization results`);
    res.json(processedRows);
  });
});

// ML Service Integration
app.post('/api/train', async (req, res) => {
  console.log('Received training request');
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/ml/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`ML service responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Training response:', data);
    res.json(data);
  } catch (error) {
    console.error('Error during training:', error);
    res.status(500).json({
      success: false,
      message: `Training failed: ${error.message}`
    });
  }
});

app.post('/api/predict', async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/ml/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/optimize', async (req, res) => {
  console.log('Received optimization request:', req.body);
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/ml/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      throw new Error(`ML service responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Optimization response:', data);
    
    if (data.success) {
      // Store optimization result in database
      const { optimal_parameters, predicted_value } = data;
      const stmt = db.prepare(
        'INSERT INTO optimization_results (y_variable, parameters, result, score, feature_importance) VALUES (?, ?, ?, ?, ?)'
      );
      stmt.run(
        req.body.y_variable,
        JSON.stringify(optimal_parameters),
        JSON.stringify({ predicted_value }),
        data.score,
        JSON.stringify(data.feature_importance)
      );
      stmt.finalize();
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error during optimization:', error);
    res.status(500).json({
      success: false,
      message: `Optimization failed: ${error.message}`
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Server is running on port ${port}`);
  console.log(`[${new Date().toISOString()}] CORS enabled for origins: ${JSON.stringify(corsOptions.origin)}`);
  console.log(`[${new Date().toISOString()}] ML Service URL: ${ML_SERVICE_URL}`);
  console.log(`[${new Date().toISOString()}] Server ready to accept connections`);
});

process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
});
