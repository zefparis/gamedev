import os
import json
import logging
from flask import Flask, render_template, jsonify, request, redirect, url_for, send_file
from cert_generator import CertificateGenerator

# 🪵 Logging configuration
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

# 🚀 Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "debug-me-if-you-can-secret-key")

# Initialize certificate generator
cert_generator = CertificateGenerator()

# 🔧 Normalize code for comparison (trim, flatten spaces, remove \n)
def normalize(code: str) -> str:
    return ' '.join(code.strip().split())

# 🧩 Route principale — page du jeu
@app.route('/')
def index():
    recruiter_mode = request.args.get('mode') == 'recruiter'
    return render_template('index.html', recruiter_mode=recruiter_mode)

# 🧠 Route pour le mode recruteur
@app.route('/recruiter-mode')
def recruiter_mode():
    return redirect(url_for('index', mode='recruiter'))

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
            # Normalize indentation - convert any whitespace to consistent 4 spaces
            lines = code.split('\n')
            normalized_lines = []
            for line in lines:
                if line.strip():  # If line has content
                    # Count leading whitespace
                    stripped = line.lstrip()
                    indent_count = len(line) - len(stripped)
                    # Convert to 4-space indentation if indented
                    if indent_count > 0:
                        line = '    ' + stripped  # Always use 4 spaces for indentation
                    else:
                        line = stripped
                normalized_lines.append(line)
            code = '\n'.join(normalized_lines)
            
            # For SQL specifically, ensure semicolon at end if missing
            if level == 4 and not code.endswith(';'):
                code += ';'
            return code
        
        user_fix_normalized = normalize_code(user_fix)
        expected_fix_normalized = normalize_code(expected_fix)
        
        # Check exact match first
        is_correct = user_fix_normalized == expected_fix_normalized
        
        # If not exact match, try case-insensitive comparison for more flexibility
        if not is_correct:
            is_correct = user_fix_normalized.lower() == expected_fix_normalized.lower()

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

# 📄 Route de certification
@app.route('/certify', methods=['GET', 'POST'])
def certify():
    if request.method == 'POST':
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        player_name = data.get('name', '').strip()
        player_stats = data.get('stats', {})
        
        if not player_name:
            return jsonify({'error': 'Name is required'}), 400
        
        if not player_stats or not player_stats.get('recruiterMode'):
            return jsonify({'error': 'Invalid stats or not in recruiter mode'}), 400
        
        # Check for cheating
        if player_stats.get('copyPasteDetected', False):
            return jsonify({
                'error': 'cheating_detected',
                'message': '🚫 Comportement suspect détecté (copier/coller). Certificat refusé.'
            }), 400
        
        try:
            cert_hash, pdf_path = cert_generator.generate_certificate(player_name, player_stats)
            
            return jsonify({
                'success': True,
                'hash': cert_hash,
                'download_url': f'/download/{cert_hash}',
                'verify_url': f'/verify/{cert_hash}'
            })
        
        except Exception as e:
            logging.exception("Error generating certificate")
            return jsonify({'error': 'Certificate generation failed'}), 500
    
    return render_template('certify.html')

# 📥 Route de téléchargement du certificat
@app.route('/download/<cert_hash>')
def download_certificate(cert_hash):
    try:
        cert_data = cert_generator.verify_certificate(cert_hash)
        if not cert_data:
            return "Certificat introuvable", 404
        
        # Find PDF file with this hash
        for filename in os.listdir('certs'):
            if filename.startswith('certificat-') and cert_hash[:8] in filename and filename.endswith('.pdf'):
                pdf_path = os.path.join('certs', filename)
                return send_file(pdf_path, as_attachment=True, 
                               download_name=f"certificat-{cert_data['name']}-{cert_hash[:8]}.pdf")
        
        return "Fichier PDF introuvable", 404
    
    except Exception as e:
        logging.exception("Error downloading certificate")
        return "Erreur lors du téléchargement", 500

# 🔐 Route de vérification
@app.route('/verify/<cert_hash>')
def verify_certificate(cert_hash):
    cert_data = cert_generator.verify_certificate(cert_hash)
    
    if not cert_data:
        return render_template('verify.html', 
                             verified=False, 
                             message="Certificat introuvable ou invalide")
    
    return render_template('verify.html', 
                         verified=True, 
                         cert_data=cert_data,
                         message="Ce certificat est vérifié et authentique")

# 🟢 Démarrage local ou Railway
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
