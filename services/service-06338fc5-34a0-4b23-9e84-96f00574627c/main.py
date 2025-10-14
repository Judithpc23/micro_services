from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        "message": "Service ready",
        "serviceId": "06338fc5-34a0-4b23-9e84-96f00574627c",
        "endpoint": f"http://localhost:3000/06338fc5-34a0-4b23-9e84-96f00574627c",
        "status": "running"
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/execute', methods=['GET', 'POST'])
def execute():
    try:
        params = {}
        if request.method == 'POST':
            params.update(request.get_json() or {})
        params.update(request.args.to_dict())
    
        for key, value in params.items():
            locals()[key] = value

        # Ejecutar el código personalizado del usuario
        # Roble Microservice - Python
        # This service can interact with your Roble database
        
        def main():
            # Example: Read all records from the table
            records = read_data()
            print(f"Found {len(records)} records")
            
            # Process the records as needed
            for record in records:
                print(f"Record ID: {record.get('_id')}")
                print(f"Data: {record}")
            
            return {
                "message": "Roble microservice executed successfully",
                "records_count": len(records),
                "status": "completed"
            }
        
        # Available helper functions:
        # - read_data(filters=None): Read records from the table
        # - insert_data(records): Insert new records
        # - update_data(record_id, updates): Update a specific record
        # - delete_data(record_id): Delete a specific record
        
        # Si el código define una función, ejecutarla automáticamente
        result = "Execution completed"
        
        # Buscar funciones definidas y ejecutarlas
        local_vars = locals()
        for name, obj in local_vars.items():
            if callable(obj) and not name.startswith('_') and name != 'execute':
                try:
                    result = obj()
                    break  # Ejecutar solo la primera función encontrada
                except Exception as func_error:
                    result = f"Error ejecutando función {name}: {str(func_error)}"
                    break
        
        return jsonify({
            "success": True,
            "result": result,
            "params": params
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)
