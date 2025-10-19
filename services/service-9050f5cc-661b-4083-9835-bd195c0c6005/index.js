const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: "Service ready",
        serviceId: "9050f5cc-661b-4083-9835-bd195c0c6005",
        endpoint: `http://localhost:3000/9050f5cc-661b-4083-9835-bd195c0c6005`,
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
        function saludar() {
            return 'Hola mundo desde JavaScript';
        }
        
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
