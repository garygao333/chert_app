# Testing the Voice AI Integration

## Prerequisites

1. **Backend Setup**: 
   - Make sure your Supabase database is populated with the sample data
   - Start the backend server: `python start.py` (from the backend directory)
   - Ensure your `.env` file has the correct credentials

2. **Environment Variables**: 
   Make sure your `.env` file in the backend contains:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   REPLICATE_API_TOKEN=your_replicate_token
   ```

## Testing the DataRecordingScreen Integration

### 1. Voice Recording Test
1. Navigate to a project in your app
2. Go to the "Data Recording" screen
3. Press and hold the microphone button
4. Speak archaeological observations like:
   - "I found a ceramic sherd, about 5 cm in diameter, reddish-brown color"
   - "This is a stone tool, obsidian material, 3 cm long"
   - "Bronze fibula, well preserved, with decorative patterns"
5. Release the button and wait for AI processing

**Expected Results:**
- Transcription appears as user message
- AI responds with structured data extraction
- Current record fields are populated
- Confidence scores are displayed

### 2. Text Input Test
1. Type archaeological observations in the text box
2. Press send
3. Observe AI analysis and data extraction

### 3. Photo Processing Test
1. Press the camera button
2. Take a photo of an archaeological artifact (or any object)
3. Wait for computer vision analysis
4. Check extracted information

### 4. Data Commit Test
1. After recording some data (voice, text, or photo)
2. Review the "Current Record" section
3. Press "Commit Record"
4. Verify data is saved to Supabase

## Backend Features Now Active

✅ **LangGraph Voice Agent**: 4-node workflow (Intent → Plan → Execute → Write)
✅ **OpenAI Integration**: GPT-4o for reasoning, Whisper for transcription
✅ **Computer Vision**: YOLO object detection + GPT-4o classification
✅ **Supabase Database**: Full CRUD operations with audit trails
✅ **Real-time Processing**: Live audio transcription and analysis
✅ **Confidence Scoring**: AI confidence levels for all extractions
✅ **Multi-modal Input**: Voice, text, and image processing
✅ **Structured Output**: Archaeological data mapped to database schema

## Troubleshooting

### If Backend Connection Fails:
- Check that the backend server is running on port 8000
- Verify network connectivity (use `http://your-ip:8000` instead of localhost on mobile)
- Check console logs for API errors

### If Voice Recording Fails:
- Ensure microphone permissions are granted
- Check device audio settings
- Try on a physical device (simulators may have audio issues)

### If Image Processing Fails:
- Ensure camera permissions are granted
- Check internet connection (for Replicate API)
- Verify image quality and lighting

## Next Steps

1. **Test with Real Data**: Use actual archaeological artifacts and contexts
2. **Database Review**: Check your Supabase dashboard to see committed records
3. **Workflow Customization**: Modify the voice agent prompts for your specific needs
4. **Field Testing**: Test the app in actual archaeological field conditions

## API Endpoints Available

- `POST /voice/process` - Full voice processing with LangGraph
- `POST /voice/transcribe` - Simple audio transcription
- `POST /image/process` - Computer vision analysis
- `GET /projects` - List all projects
- `POST /projects` - Create new project
- `POST /data-records` - Create data records
- `GET /audit-log` - View audit trail

Your archaeological data collection app is now powered by AI! 🏛️🤖
