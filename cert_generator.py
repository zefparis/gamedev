import json
import hashlib
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas

class CertificateGenerator:
    def __init__(self, certs_dir="certs"):
        self.certs_dir = certs_dir
        os.makedirs(certs_dir, exist_ok=True)
    
    def calculate_scores(self, player_stats):
        """Calculate logic and speed scores based on performance"""
        total_attempts = sum(level.get('attempts', 1) for level in player_stats['levels'].values())
        hints_used = sum(1 for level in player_stats['levels'].values() if level.get('hint_used', False))
        total_time = player_stats.get('totalTime', 0)
        
        # Logic Score (0-100): Based on attempts and hints
        # Perfect score: 1 attempt per level, no hints
        max_levels = len(player_stats['levels'])
        logic_score = max(0, 100 - (total_attempts - max_levels) * 10 - hints_used * 15)
        logic_score = min(100, logic_score)
        
        # Speed Score (0-100): Based on time (assuming 60s average per level is 50%)
        average_time_per_level = total_time / max_levels if max_levels > 0 else 0
        speed_score = max(0, 100 - (average_time_per_level - 30) * 2)
        speed_score = min(100, speed_score)
        
        return int(logic_score), int(speed_score)
    
    def generate_hash(self, player_stats):
        """Generate SHA256 hash of player stats"""
        stats_json = json.dumps(player_stats, sort_keys=True)
        return hashlib.sha256(stats_json.encode()).hexdigest()
    
    def generate_certificate(self, player_name, player_stats):
        """Generate PDF certificate and JSON verification file"""
        cert_hash = self.generate_hash(player_stats)
        logic_score, speed_score = self.calculate_scores(player_stats)
        
        # Certificate data
        cert_data = {
            'name': player_name,
            'date': datetime.now().isoformat(),
            'stats': player_stats,
            'logic_score': logic_score,
            'speed_score': speed_score,
            'hash': cert_hash,
            'verified': True
        }
        
        # Save JSON verification file
        json_path = os.path.join(self.certs_dir, f"{cert_hash}.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(cert_data, f, indent=2, ensure_ascii=False)
        
        # Generate PDF certificate
        pdf_path = os.path.join(self.certs_dir, f"certificat-{player_name}-{cert_hash[:8]}.pdf")
        self._create_pdf_certificate(pdf_path, cert_data)
        
        return cert_hash, pdf_path
    
    def _create_pdf_certificate(self, pdf_path, cert_data):
        """Create the actual PDF certificate"""
        doc = SimpleDocTemplate(pdf_path, pagesize=A4)
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.darkgreen
        )
        
        normal_center = ParagraphStyle(
            'NormalCenter',
            parent=styles['Normal'],
            alignment=TA_CENTER,
            spaceAfter=12
        )
        
        # Build certificate content
        story = []
        
        # Header
        story.append(Paragraph("🎓 CERTIFICAT PROFESSIONNEL", title_style))
        story.append(Paragraph("Debug Me If You Can - Mode Recruteur", subtitle_style))
        story.append(Spacer(1, 30))
        
        # Name
        story.append(Paragraph(f"<b>Candidat :</b> {cert_data['name']}", normal_center))
        story.append(Spacer(1, 20))
        
        # Date
        date_str = datetime.fromisoformat(cert_data['date']).strftime("%d/%m/%Y à %H:%M")
        story.append(Paragraph(f"<b>Date de certification :</b> {date_str}", normal_center))
        story.append(Spacer(1, 30))
        
        # Performance table
        performance_data = [
            ['Métrique', 'Score', 'Évaluation'],
            ['Score de Logique', f"{cert_data['logic_score']}/100", self._get_grade(cert_data['logic_score'])],
            ['Score de Vitesse', f"{cert_data['speed_score']}/100", self._get_grade(cert_data['speed_score'])],
            ['Temps Total', f"{cert_data['stats']['totalTime']}s", ""],
            ['Niveaux Complétés', f"{len(cert_data['stats']['levels'])}/6", ""]
        ]
        
        # Add special mention for level 6
        if '6' in cert_data['stats']['levels']:
            performance_data.append(['🧠 Niveau Impossible', 'Réussi', '⭐ Mention Spéciale'])
        
        performance_table = Table(performance_data)
        performance_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(performance_table)
        story.append(Spacer(1, 30))
        
        # Validation info
        story.append(Paragraph(f"<b>Hash de Vérification :</b> {cert_data['hash']}", styles['Normal']))
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"<b>URL de Vérification :</b> /verify/{cert_data['hash']}", styles['Normal']))
        story.append(Spacer(1, 30))
        
        # Footer
        story.append(Paragraph("Ce certificat atteste de la réussite du test de débogage", normal_center))
        story.append(Paragraph("en mode recruteur sans assistance d'IA.", normal_center))
        story.append(Spacer(1, 20))
        story.append(Paragraph("🔐 Certificat vérifié et authentique", normal_center))
        
        doc.build(story)
    
    def _get_grade(self, score):
        """Convert numeric score to letter grade"""
        if score >= 90:
            return "Excellent"
        elif score >= 80:
            return "Très Bien"
        elif score >= 70:
            return "Bien"
        elif score >= 60:
            return "Satisfaisant"
        else:
            return "À améliorer"
    
    def verify_certificate(self, cert_hash):
        """Verify a certificate by hash"""
        json_path = os.path.join(self.certs_dir, f"{cert_hash}.json")
        
        if not os.path.exists(json_path):
            return None
        
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                cert_data = json.load(f)
            return cert_data
        except (json.JSONDecodeError, FileNotFoundError):
            return None