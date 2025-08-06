# Overview

Debug Me If You Can is a progressive debugging game built with Flask that challenges developers to fix common programming errors across 6 levels covering HTML, JavaScript, Python, SQL, Regex, and an "Impossible" level. The application features bilingual support (French/English), dark mode terminal-style interface, progress tracking, instant feedback validation, and a special challenge level designed to test unconventional thinking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Technology Stack**: Pure HTML5, Vanilla JavaScript, and Tailwind CSS (via CDN)
- **Design Pattern**: Single Page Application (SPA) with dynamic content loading
- **UI Framework**: Tailwind CSS with dark mode terminal theme using JetBrains Mono font
- **State Management**: Client-side JavaScript class (`DebugGame`) managing game state, level progression, and language switching
- **Responsive Design**: Mobile-first approach using Tailwind's responsive utilities

## Backend Architecture  
- **Framework**: Flask (Python) with minimal REST API design
- **Architecture Pattern**: Simple MVC structure with template rendering and JSON API endpoints
- **Session Management**: Flask sessions with environment-configurable secret key
- **Error Handling**: JSON error responses with HTTP status codes
- **Logging**: Python logging module configured for debugging

## Data Storage
- **Primary Storage**: File-based JSON storage (no database required)
- **Structure**: Organized by language (`/levels/fr/` and `/levels/en/`) with 6 levels each including a special "Impossible" level 6
- **Data Schema**: Each level contains id, language, description, code, expected_fix, and hint fields
- **Special Features**: Level 6 is an "impossible" challenge with intentionally misleading expected solutions to test unconventional thinking
- **Security**: Expected fixes are filtered out from API responses to prevent cheating

## Internationalization
- **Languages**: French (default) and English
- **Implementation**: Language-specific JSON files loaded dynamically based on user selection
- **API Design**: Language parameter passed as query string (`?lang=fr|en`)

# External Dependencies

## Core Dependencies
- **Flask**: Web framework for Python backend
- **Tailwind CSS**: Utility-first CSS framework loaded via CDN
- **JetBrains Mono**: Monospace font for terminal aesthetic loaded from Google Fonts

## Development Dependencies
- **Python 3.8+**: Runtime environment
- **pip**: Package management for Python dependencies

## Deployment Platform
- **Railway**: Cloud platform optimized for with dynamic port configuration
- **Environment Variables**: PORT and SESSION_SECRET for deployment flexibility

## Static Assets
- **CDN Resources**: Tailwind CSS and Google Fonts loaded from external CDNs
- **Local Assets**: Custom CSS and JavaScript files served from Flask static directory