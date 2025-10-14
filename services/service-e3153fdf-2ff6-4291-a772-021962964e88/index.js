const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: "Service ready",
        serviceId: "e3153fdf-2ff6-4291-a772-021962964e88",
        endpoint: `http://localhost:3000/e3153fdf-2ff6-4291-a772-021962964e88`,
        status: "running"
    });
});

app.get('/health', (req, res) => {
    res.json({ status: "healthy" });
});

app.all('/execute', (req, res) => {
    try {
        const params = { ...req.body, ...req.query };

        // Make parameters available as local variables
        Object.keys(params).forEach(key => {
            eval(key + " = params['" + key + "']");
        });
        
        // Aquí va tu código personalizado:
        // Roble Microservice - JavaScript
        // This service can interact with your Roble database
        
        async function main() {
            try {
                // Example: Read all records from the table
                const records = await readData();
                console.log(`Found ${records.length} records`);
                
                // Process the records as needed
                for (const record of records) {
                    console.log(`Record ID: ${record._id}`);
                    console.log('Data:', record);
                }
                
                return {
                    message: 'Roble microservice executed successfully',
                    recordsCount: records.length,
                    status: 'completed'
                };
            } catch (error) {
                console.error('Error in microservice:', error);
                return {
                    message: 'Error executing microservice',
                    error: error.message,
                    status: 'error'
                };
            }
        }
        
        // Available helper functions:
        // - readData(filters): Read records from the table
        // - insertData(records): Insert new records  
        // - updateData(recordId, updates): Update a specific record
        // - deleteData(recordId): Delete a specific record
        
        res.json({
            success: true,
            result: "Execution completed",
            params: params
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
