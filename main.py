import os
import json
import logging
from flask import Flask, render_template, jsonify, request

# 🪵 Logging configuration
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

# 🚀 Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "debug-me-if-you-can-secret-key")

# 🔧 Normalize code for comparison (trim, flatten spaces, remove \n)
def normalize(code: str) -> str:
    return ' '.join(code.strip().split())

# 🧩 Route principale — page du jeu
@app.route('/')
def index():
    return render_template('index.html')

# 📥 API : Chargement d’un niveau
@app.route('/api/level/<int:level>')
def get_level(level: int):
    lang = request.args.get('lang', 'fr')
    lang = lang if lang in ['fr', 'en'] else 'fr'

    if level < 1 or level > 6:
        return jsonify({'error': 'Invalid level number'}), 400

    file_path = os.path.join('levels', lang, f'level{level}.json')

    try:
        with open(file_path, encoding='utf-8') as f:
            level_data = json.load(f)

        # Réponse sans expected_fix
        return jsonify({
            'id': level_data['id'],
            'language': level_data['language'],
            'description': level_data['description'],
            'code': level_data['code'],
            'hint': level_data.get('hint', '')
        })

    except FileNotFoundError:
        logging.error(f"Level file not found: {file_path}")
        return jsonify({'error': 'Level not found'}), 404
    except json.JSONDecodeError:
        logging.error(f"Invalid JSON in level file: {file_path}")
        return jsonify({'error': 'Invalid level data'}), 500
    except Exception as e:
        logging.exception(f"Error while loading level {level}")
        return jsonify({'error': 'Internal server error'}), 500

# ✅ API : Validation d’un niveau
@app.route('/api/validate/<int:level>', methods=['POST'])
def validate_level(level: int):
    data = request.get_json()
    if not data or 'fix' not in data:
        return jsonify({'error': 'No fix provided'}), 400

    user_fix = data.get('fix', '')
    lang = data.get('lang', 'fr')
    lang = lang if lang in ['fr', 'en'] else 'fr'

    if level < 1 or level > 6:
        return jsonify({'error': 'Invalid level number'}), 400

    file_path = os.path.join('levels', lang, f'level{level}.json')

    try:
        with open(file_path, encoding='utf-8') as f:
            level_data = json.load(f)

        expected_fix = level_data.get('expected_fix', '')

        # Compare user fix with expected fix (normalize whitespace and handle common variations)
        def normalize_code(code):
            # Strip whitespace and normalize line endings
            code = code.strip().replace('\r\n', '\n').replace('\r', '\n')
            # For SQL specifically, ensure semicolon at end if missing
            if level == 4 and not code.endswith(';'):
                code += ';'
            return code
        
        user_fix_normalized = normalize_code(user_fix)
        expected_fix_normalized = normalize_code(expected_fix)
        
        is_correct = user_fix_normalized == expected_fix_normalized

        message = (
            "Bravo ! Niveau réussi !" if lang == 'fr' else "Great! Level completed!"
        ) if is_correct else (
            "Erreur, recommence !" if lang == 'fr' else "Error, try again!"
        )

        return jsonify({
            'correct': is_correct,
            'message': message
        })

    except FileNotFoundError:
        logging.error(f"Level file not found: {file_path}")
        return jsonify({'error': 'Level not found'}), 404
    except json.JSONDecodeError:
        logging.error(f"Invalid JSON in level file: {file_path}")
        return jsonify({'error': 'Invalid level data'}), 500
    except Exception as e:
        logging.exception(f"Error while validating level {level}")
        return jsonify({'error': 'Internal server error'}), 500

# 🟢 Démarrage local ou Railway
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
