# Chert - AI-Powered Archaeological Data Collection

Chert is an AI-powered data collection system designed for archaeological field work. It features a React Native frontend and a Python FastAPI backend with LangGraph voice agents.

## Features

- 🎤 **Voice-Driven Data Collection**: Use natural language to record archaeological data
- 🤖 **AI-Powered Workflows**: LangGraph agents automatically create data collection workflows
- 📸 **Computer Vision**: Automatic object detection and classification of artifacts
- 🗄️ **Database Integration**: Connect to existing databases via Supabase proxy
- 📱 **Mobile-First**: React Native app optimized for field work
- 🔄 **Audit Trail**: Complete rollback capabilities with detailed audit logs

## Architecture

- **Frontend**: React Native with Expo
- **Backend**: FastAPI with Python
- **AI/ML**: OpenAI GPT-4o, Whisper, LangGraph, YOLO via Replicate
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Cross-platform mobile app + cloud API

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Expo CLI (`npm install -g @expo/cli`)
- OpenAI API Key
- Supabase account
- (Optional) Replicate API key for computer vision

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and configuration
   ```

3. **Set up Supabase database**:
   - Create a new Supabase project
   - Run the SQL schema from `backend/schema.sql` in your Supabase SQL editor
   - Copy your Supabase URL and anon key to the `.env` file

4. **Start the backend server**:
   ```bash
   python start.py
   ```

   The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

### Frontend Setup

1. **Navigate to app directory**:
   ```bash
   cd app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase configuration
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

5. **Run on device/simulator**:
   - iOS: Press `i` in terminal or scan QR code with Expo Go
   - Android: Press `a` in terminal or scan QR code with Expo Go
   - Web: Press `w` in terminal

## Environment Configuration

### Backend (.env)

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Optional
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
REPLICATE_API_TOKEN=your_replicate_token_here
DATABASE_URL=your_external_db_connection_string

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

### Frontend (.env)

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_DEV_MODE=true
```

## Usage

### Creating a Project

1. Open the app and navigate to "Projects"
2. Tap "Create New Project"
3. Fill in project details and database connection information
4. The system will analyze your database schema automatically

### Recording Data with Voice

1. Select a project and tap "Start Recording"
2. Press and hold the microphone button
3. Speak naturally: "Please record a new bag-dump of fine-ware pottery sherds"
4. The AI agent will:
   - Parse your intent
   - Create a workflow plan
   - Guide you through photo capture
   - Analyze images for objects
   - Allow you to confirm/correct detections
   - Commit data to your database

### Example Voice Commands

- "Record a new bag-dump of pottery sherds"
- "Add a ceramic rim sherd, 3cm diameter, reddish-brown color"
- "Document this stone tool with measurements"
- "Create entries for these bone fragments"

## AI Agent Workflow

The LangGraph voice agent follows this process:

1. **Intent Parsing**: Understands what you want to record
2. **Planning**: Creates a step-by-step workflow
3. **Execution**: Guides data collection with human-in-the-loop verification
4. **Writing**: Commits verified data to database with audit trail

## API Documentation

When the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

Key endpoints:
- `POST /voice/process` - Process voice input with full workflow
- `POST /voice/transcribe` - Simple transcription only
- `POST /image/process` - Computer vision analysis
- `GET /projects/{id}/schema` - Get database schema
- `POST /audit/{commit_id}/rollback` - Rollback changes

## Database Schema

The system creates these tables in Supabase:

- `projects` - Project configurations and database connections
- `data_records` - All recorded data with metadata
- `activity_logs` - User activity tracking
- `audit_log` - Detailed change tracking for rollbacks
- `samples` - Demo table for archaeological samples

## Rollback System

Every data commit creates an audit record that enables instant rollback:

```bash
# Via API
POST /audit/{commit_id}/rollback

# The system will:
# 1. Identify all affected rows
# 2. Remove the changes
# 3. Log the rollback action
```

## Development

### Project Structure

```
chertapp/
├── app/                 # React Native frontend
│   ├── components/      # Reusable UI components
│   ├── page/           # Screen components
│   ├── services/       # API and Supabase clients
│   └── types/          # TypeScript type definitions
├── backend/            # Python FastAPI backend
│   ├── main.py         # FastAPI application
│   ├── voice_agent.py  # LangGraph AI agent
│   ├── supabase_client.py # Database operations
│   ├── models.py       # Pydantic models
│   └── schema.sql      # Database schema
└── README.md
```

### Adding New AI Tools

The voice agent is built with LangGraph and can be extended with new tools:

1. Add tool function to `voice_agent.py`
2. Register tool in the workflow
3. Update plan templates to use new tool
4. Test with voice commands

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## Troubleshooting

### Backend Issues

- **Import errors**: Run `pip install -r requirements.txt`
- **Environment errors**: Check `.env` file configuration
- **Database errors**: Verify Supabase connection and schema

### Frontend Issues

- **Package errors**: Run `npm install` and restart Expo
- **API connection**: Check `EXPO_PUBLIC_API_URL` in `.env`
- **Supabase errors**: Verify Supabase configuration

### Common Solutions

1. **"Module not found" errors**: Clear cache with `expo r -c`
2. **API timeouts**: Ensure backend is running on correct port
3. **Audio recording issues**: Check device permissions

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review API documentation at `/docs`
- Open an issue on GitHub