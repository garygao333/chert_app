# Heroku Deployment Guide

## Files Created for Heroku

✅ **Procfile** - Tells Heroku how to run your app
✅ **requirements.txt** - Lists all Python dependencies  
✅ **runtime.txt** - Specifies Python version (3.13.5)
✅ **Updated .env** - Added production URL template

## Prerequisites

1. **Install Heroku CLI**:
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Or download from: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

## Deployment Steps

### 1. Initialize Git Repository (if not done)
```bash
cd /Users/garygao/Desktop/chertapp/backend
git init
git add .
git commit -m "Initial backend setup for Heroku"
```

### 2. Create Heroku App
```bash
heroku create your-app-name
# Example: heroku create chert-backend-api
```

### 3. Set Environment Variables on Heroku
```bash
# Copy your .env variables to Heroku
heroku config:set OPENAI_API_KEY="your-openai-api-key-here"
heroku config:set SUPABASE_URL="https://suiqpfnvfadscyvtgcjz.supabase.co"
heroku config:set SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1aXFwZm52ZmFkc2N5dnRnY2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTc5MDQsImV4cCI6MjA2OTA3MzkwNH0.c-Twnh7ZlO9dBFKpTye1VMciXfeXeczlWkyJAZurx4g"
heroku config:set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1aXFwZm52ZmFkc2N5dnRnY2p6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ5NzkwNCwiZXhwIjoyMDY5MDczOTA0fQ.kLg2Zh1Z7DbX8L1ZGoAnnyyI5dXUo2B5ingK1X_tZTA"
heroku config:set DATABASE_URL="postgresql://postgres:[@S08jj123lol]@db.suiqpfnvfadscyvtgcjz.supabase.co:5432/postgres"
heroku config:set DEBUG="false"
heroku config:set YOLO_VERSION="yolov8n"
heroku config:set YOLO_CONFIDENCE="0.25"
```

### 4. Deploy to Heroku
```bash
git push heroku main
```

### 5. View Your Deployed App
```bash
heroku open
# Or visit: https://your-app-name.herokuapp.com
```

### 6. Check Logs (if issues occur)
```bash
heroku logs --tail
```

## Update Frontend to Use Heroku URL

After your Heroku app is deployed:

1. **Get your Heroku app URL**:
   ```bash
   heroku apps:info
   # Look for "Web URL": https://your-app-name.herokuapp.com
   ```

2. **Update your app/.env file**:
   ```env
   # Comment out local development URL:
   # EXPO_PUBLIC_API_URL=http://192.168.7.214:8000
   
   # Uncomment and update with your Heroku URL:
   EXPO_PUBLIC_API_URL=https://your-app-name.herokuapp.com
   ```

3. **Restart your Expo development server** to pick up the new URL.

## Useful Heroku Commands

```bash
# View app status
heroku ps

# Scale app (ensure it's running)
heroku ps:scale web=1

# View environment variables
heroku config

# Add environment variable
heroku config:set KEY=value

# Remove environment variable
heroku config:unset KEY

# View recent logs
heroku logs --tail

# Access Heroku bash
heroku run bash

# Restart app
heroku restart
```

## Testing the Deployment

1. **Test health endpoint**:
   ```bash
   curl https://your-app-name.herokuapp.com/health
   ```

2. **Expected response**:
   ```json
   {"status":"healthy","timestamp":"2025-01-XX..."}
   ```

## Troubleshooting

- **Build fails**: Check `heroku logs` for Python package issues
- **App crashes**: Verify environment variables are set correctly
- **Timeout errors**: Your app may be sleeping (free Heroku apps sleep after 30min of inactivity)
- **Port issues**: Heroku automatically sets PORT environment variable, our code handles this correctly

## Production Considerations

1. **Use production-grade WSGI server** (already configured with uvicorn)
2. **Set DEBUG=false** in production
3. **Configure proper CORS origins** (currently set to "*" for development)
4. **Monitor usage** and upgrade Heroku plan if needed
5. **Set up database backups** for production data

## Cost Estimate
- **Hobby Plan**: $7/month (no sleeping, SSL certificates)
- **Free Plan**: $0/month (sleeps after 30min inactivity, limited hours)

## Next Steps After Deployment
1. Test all API endpoints work correctly
2. Update mobile app to use production URL  
3. Test full mobile app functionality
4. Set up monitoring/alerting if needed