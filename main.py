import os
import json
import logging
from flask import Flask, render_template, jsonify, request

# Configure logging for debugging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "debug-me-if-you-can-secret-key")

@app.route('/')
def index():
    """Render the main game page"""
    return render_template('index.html')

@app.route('/api/level/<int:level>')
def get_level(level):
    """
    API endpoint to get level data
    Query parameter: lang (fr or en, defaults to fr)
    """
    lang = request.args.get('lang', 'fr')
    
    # Validate language parameter
    if lang not in ['fr', 'en']:
        lang = 'fr'
    
    # Validate level number
    if level < 1 or level > 5:
        return jsonify({'error': 'Invalid level number'}), 400
    
    try:
        # Load level data from JSON file
        file_path = f'levels/{lang}/level{level}.json'
        with open(file_path, 'r', encoding='utf-8') as f:
            level_data = json.load(f)
        
        # Remove the expected_fix from the response for security
        response_data = {
            'id': level_data['id'],
            'language': level_data['language'],
            'description': level_data['description'],
            'code': level_data['code'],
            'hint': level_data.get('hint', '')
        }
        
        return jsonify(response_data)
    
    except FileNotFoundError:
        app.logger.error(f"Level file not found: {file_path}")
        return jsonify({'error': 'Level not found'}), 404
    except json.JSONDecodeError:
        app.logger.error(f"Invalid JSON in file: {file_path}")
        return jsonify({'error': 'Invalid level data'}), 500
    except Exception as e:
        app.logger.error(f"Error loading level {level}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/validate/<int:level>', methods=['POST'])
def validate_level(level):
    """
    API endpoint to validate user's fix for a level
    Expected JSON payload: {'fix': 'user_fix', 'lang': 'fr|en'}
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    user_fix = data.get('fix', '').strip()
    lang = data.get('lang', 'fr')
    
    # Validate language parameter
    if lang not in ['fr', 'en']:
        lang = 'fr'
    
    # Validate level number
    if level < 1 or level > 5:
        return jsonify({'error': 'Invalid level number'}), 400
    
    try:
        # Load level data to get expected fix
        file_path = f'levels/{lang}/level{level}.json'
        with open(file_path, 'r', encoding='utf-8') as f:
            level_data = json.load(f)
        
        expected_fix = level_data['expected_fix'].strip()
        
        # Compare user fix with expected fix
        is_correct = user_fix == expected_fix
        
        if is_correct:
            message = "Bravo ! Niveau réussi !" if lang == 'fr' else "Great! Level completed!"
        else:
            message = "Erreur, recommence !" if lang == 'fr' else "Error, try again!"
        
        return jsonify({
            'correct': is_correct,
            'message': message
        })
    
    except FileNotFoundError:
        app.logger.error(f"Level file not found: {file_path}")
        return jsonify({'error': 'Level not found'}), 404
    except json.JSONDecodeError:
        app.logger.error(f"Invalid JSON in file: {file_path}")
        return jsonify({'error': 'Invalid level data'}), 500
    except Exception as e:
        app.logger.error(f"Error validating level {level}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
